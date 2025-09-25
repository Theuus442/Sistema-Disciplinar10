import { createClient } from '@supabase/supabase-js';

function sanitizeEnv(v?: string | null) { if (!v) return undefined as any; const t=v.trim().replace(/^['"]|['"]$/g, ""); if(!t||t.toLowerCase()==='undefined'||t.toLowerCase()==='null') return undefined as any; return t; }
function createFetchWithTimeout(defaultMs=7000){ return async (input:any, init?:any)=>{ const controller=new AbortController(); const id=setTimeout(()=>controller.abort(), init?.timeout ?? defaultMs); try{ const res=await fetch(input,{...init, signal:controller.signal}); return res as any; } finally{ clearTimeout(id); } }; }
function getAdminClient(){ const url=sanitizeEnv(process.env.VITE_SUPABASE_URL||process.env.SUPABASE_URL); const key=sanitizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY); if(!url||!key) return null; return createClient(url,key,{auth:{persistSession:false},global:{fetch:createFetchWithTimeout(8000)} as any}); }
function getAnonClientWithToken(token:string){ const url=sanitizeEnv(process.env.SUPABASE_URL||(process.env as any).VITE_SUPABASE_URL); const anon=sanitizeEnv((process.env as any).SUPABASE_ANON_KEY||(process.env as any).VITE_SUPABASE_ANON_KEY); if(!url||!anon) return null as any; return createClient(url,anon,{auth:{persistSession:false},global:{headers:{Authorization:`Bearer ${token}`},fetch:createFetchWithTimeout(7000)} as any}); }
async function ensureAdmin(req:any,res:any){ const auth=(req.headers?.authorization as string)||''; const token=auth.startsWith('Bearer ')?auth.slice(7):auth; if(!token) return res.status(401).json({error:'Não autorizado: token não fornecido.'}); const userClient=getAnonClientWithToken(token); if(!userClient) return res.status(500).json({error:'Configuração Supabase ausente (URL/ANON).'}); const {data:userData,error:getUserErr}=await userClient.auth.getUser(); if(getUserErr) return res.status(401).json({error:'Token inválido ou problema na autenticação.'}); const userId=(userData?.user as any)?.id ?? null; if(!userId) return res.status(401).json({error:'Token inválido.'}); const profResp=await userClient.from('profiles').select('id,perfil').eq('id',userId).maybeSingle(); if((profResp as any)?.error) return res.status(401).json({error:'Token inválido ou sem permissão para acessar perfil.'}); const perfilLower=((((profResp as any).data ?? profResp) as any)?.perfil ?? '').toLowerCase(); if(perfilLower!=='administrador') return res.status(403).json({error:'Acesso proibido: somente administradores.'}); const admin=getAdminClient(); const db=admin ?? userClient; return {admin,db} as const; }

function isMissingTableOrColumn(err:any){ const msg=(err && (err.message||String(err)))||''; const code=String((err as any)?.code||''); return /42P01/.test(code)||/42703/.test(code)||/relation .* does not exist/i.test(msg)||/Could not find the table/i.test(msg)||/Could not find the '.*' column/i.test(msg); }

export default async function handler(req: any, res: any){
  const ctx = await ensureAdmin(req,res) as any; if(!ctx) return; const db = ctx.db;
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({error:'Method Not Allowed'}); }
  const body = (req.body as any)||{}; const idParam = (req.query as any)?.userId || (req.query as any)?.id || body.userId; const userId = String(idParam||'').trim(); if(!userId) return res.status(400).json({error:'userId requerido'});
  const overrides = Array.isArray(body?.overrides) ? body.overrides as any[] : [];
  for (const o of overrides) { if(!o?.permission_name || (o.action!=='grant' && o.action!=='revoke')) return res.status(400).json({error:'Invalid override item'}); }

  const rowsA = overrides.map((o)=>({ user_id: userId, permission_name: o.permission_name, action: o.action }));
  const rowsB = overrides.map((o)=>({ user_id: userId, permission: o.permission_name, action: o.action }));
  const attempts = [
    async () => { await db.from('user_permission_overrides').delete().eq('user_id', userId); const { error } = await db.from('user_permission_overrides').insert(rowsA as any); if (error) throw error; },
    async () => { await db.from('user_permission_overrides').delete().eq('user_id', userId); const { error } = await db.from('user_permission_overrides').insert(rowsB as any); if (error) throw error; },
    async () => { await db.from('user_overrides').delete().eq('user_id', userId); const { error } = await db.from('user_overrides').insert(rowsA as any); if (error) throw error; },
    async () => { await db.from('user_overrides').delete().eq('user_id', userId); const { error } = await db.from('user_overrides').insert(rowsB as any); if (error) throw error; },
  ];
  for (const fn of attempts) { try { await fn(); return res.json({ ok: true }); } catch {} }

  try {
    const grants = overrides.filter((o)=>o.action==='grant').map((o)=>o.permission_name);
    const revokes = overrides.filter((o)=>o.action==='revoke').map((o)=>o.permission_name);
    for (const p of grants){ try{ await db.from('user_permissions').insert({ user_id: userId, permission: p } as any);} catch (e:any){ if(isMissingTableOrColumn(e)){ await db.from('profile_permissions').insert({ perfil: `user:${userId}`, permission: p } as any).catch(()=>{}); } } }
    for (const p of revokes){ try{ await db.from('user_permissions').delete().eq('user_id', userId).eq('permission', p);} catch (e:any){ if(isMissingTableOrColumn(e)){ await db.from('profile_permissions').delete().eq('perfil', `user:${userId}`).eq('permission', p).catch(()=>{}); } } }
    return res.status(200).json({ ok: true, warning: 'Revogações podem não ser aplicadas sem a tabela user_permission_overrides.' });
  } catch (e:any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
