import { createClient } from '@supabase/supabase-js';

function sanitizeEnv(v?: string | null) { if (!v) return undefined as any; const t=v.trim().replace(/^['"]|['"]$/g, ""); if(!t||t.toLowerCase()==='undefined'||t.toLowerCase()==='null') return undefined as any; return t; }
function createFetchWithTimeout(defaultMs=7000){ return async (input:any, init?:any)=>{ const controller=new AbortController(); const id=setTimeout(()=>controller.abort(), init?.timeout ?? defaultMs); try{ const res=await fetch(input,{...init, signal:controller.signal}); return res as any; } finally{ clearTimeout(id); } }; }
function getAdminClient(){ const url=sanitizeEnv(process.env.VITE_SUPABASE_URL||process.env.SUPABASE_URL); const key=sanitizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY); if(!url||!key) return null; return createClient(url,key,{auth:{persistSession:false},global:{fetch:createFetchWithTimeout(8000)} as any}); }
function getAnonClientWithToken(token:string){ const url=sanitizeEnv(process.env.SUPABASE_URL||(process.env as any).VITE_SUPABASE_URL); const anon=sanitizeEnv((process.env as any).SUPABASE_ANON_KEY||(process.env as any).VITE_SUPABASE_ANON_KEY); if(!url||!anon) return null as any; return createClient(url,anon,{auth:{persistSession:false},global:{headers:{Authorization:`Bearer ${token}`},fetch:createFetchWithTimeout(7000)} as any}); }
async function ensureAdmin(req:any,res:any){ const auth=(req.headers?.authorization as string)||''; const token=auth.startsWith('Bearer ')?auth.slice(7):auth; if(!token) return res.status(401).json({error:'Não autorizado: token não fornecido.'}); const userClient=getAnonClientWithToken(token); if(!userClient) return res.status(500).json({error:'Configuração Supabase ausente (URL/ANON).'}); const {data:userData,error:getUserErr}=await userClient.auth.getUser(); if(getUserErr) return res.status(401).json({error:'Token inválido ou problema na autenticação.'}); const userId=(userData?.user as any)?.id ?? null; if(!userId) return res.status(401).json({error:'Token inválido.'}); const profResp=await userClient.from('profiles').select('id,perfil').eq('id',userId).maybeSingle(); if((profResp as any)?.error) return res.status(401).json({error:'Token inválido ou sem permissão para acessar perfil.'}); const perfilLower=((((profResp as any).data ?? profResp) as any)?.perfil ?? '').toLowerCase(); if(perfilLower!=='administrador') return res.status(403).json({error:'Acesso proibido: somente administradores.'}); const admin=getAdminClient(); const db=admin ?? userClient; return {admin,db} as const; }
function isMissingTableOrColumn(err:any){ const msg=(err && (err.message||String(err)))||''; const code=String((err as any)?.code||''); return /42P01/.test(code) || /42703/.test(code) || /relation .* does not exist/i.test(msg) || /Could not find the table/i.test(msg) || /Could not find the '.*' column/i.test(msg); }
function buildPermissionCandidates(name: string): string[]{ const c=new Set<string>(); const base=String(name||'').trim(); if(!base) return []; c.add(base); if(base.includes('process:')) c.add(base.replace('process:','processo:')); if(base.includes('processo:')) c.add(base.replace('processo:','process:')); if(/:ver$/.test(base)) c.add(base.replace(/:ver$/, ':ver_todos')); if(/:ver_todos$/.test(base)) c.add(base.replace(/:ver_todos$/, ':ver')); if(/:finalizar$/.test(base)) c.add(base.replace(/:finalizar$/, ':editar')); if(/:editar$/.test(base)) c.add(base.replace(/:editar$/, ':finalizar')); return Array.from(c); }

async function findPermissionId(db: any, permissionName: string){
  const candidates = buildPermissionCandidates(permissionName);
  try{ const {data} = await db.from('permissions').select('id,name,permission').in('name', candidates).limit(1); const id1 = Array.isArray(data) && data[0]?.id; if(id1) return id1; }catch{}
  try{ const {data} = await db.from('permissions').select('id,name,permission').in('permission', candidates).limit(1); const id2 = Array.isArray(data) && data[0]?.id; if(id2) return id2; }catch{}
  try{ const orParts=candidates.flatMap((n)=>[`name.eq.${n}`,`permission.eq.${n}`]).join(','); const {data} = await db.from('permissions').select('id,name,permission').or(orParts).limit(1); const id3 = Array.isArray(data) && data[0]?.id; if(id3) return id3; }catch{}
  return null;
}

async function ensurePermissionId(db:any, permissionName:string){
  let id = await findPermissionId(db, permissionName);
  if(id) return id;
  try{ await db.from('permissions').insert({ name: permissionName, permission: permissionName } as any); }catch{}
  id = await findPermissionId(db, permissionName);
  if(!id) throw new Error(`permission not found: ${permissionName}`);
  return id;
}

async function insertProfilePermissionFlexible(db:any, perfilKey:string, permissionName:string){ let lastErr:any=null; try{ const {error}=await db.from('profile_permissions').insert({perfil:perfilKey,permission:permissionName} as any); if(!error) return; lastErr=error; }catch(e){ lastErr=e; } try{ const {error}=await db.from('profile_permissions').insert({profile_name:perfilKey,permission:permissionName} as any); if(!error) return; lastErr=error; }catch(e){ lastErr=e; } try{ const permId = await ensurePermissionId(db, permissionName); try{ const {error}=await db.from('profile_permissions').insert({perfil:perfilKey,permission_id:permId} as any); if(!error) return; lastErr=error; }catch(e){ lastErr=e; } try{ const {error}=await db.from('profile_permissions').insert({profile_name:perfilKey,permission_id:permId} as any); if(!error) return; lastErr=error; }catch(e){ lastErr=e; } }catch(e){ lastErr=e; } throw lastErr; }
async function deleteProfilePermissionFlexible(db:any, perfilKey:string, permissionName:string){ let lastErr:any=null; try{ const {error}=await db.from('profile_permissions').delete().eq('perfil',perfilKey).eq('permission',permissionName); if(!error) return; lastErr=error; }catch(e){ lastErr=e; } try{ const {error}=await db.from('profile_permissions').delete().eq('profile_name',perfilKey).eq('permission',permissionName); if(!error) return; lastErr=error; }catch(e){ lastErr=e; } try{ const permId = await findPermissionId(db, permissionName); if(!permId) throw new Error('permission not found'); try{ const {error}=await db.from('profile_permissions').delete().eq('perfil',perfilKey).eq('permission_id',permId); if(!error) return; lastErr=error; }catch(e){ lastErr=e; } try{ const {error}=await db.from('profile_permissions').delete().eq('profile_name',perfilKey).eq('permission_id',permId); if(!error) return; lastErr=error; }catch(e){ lastErr=e; } }catch(e){ lastErr=e; } throw lastErr; }

export default async function handler(req: VercelRequest, res: VercelResponse){
  const ctx = await ensureAdmin(req,res) as any; if(!ctx) return; const db = ctx.db;

  if (req.method === 'POST') {
    const { userId, permission } = req.body as any;
    if (!userId || !permission) return res.status(400).json({ error: 'userId and permission required' });
    try {
      const { error } = await db.from('user_permissions').insert({ user_id: userId, permission });
      if (error) throw error;
      return res.json({ ok: true });
    } catch (e: any) {
      if (isMissingTableOrColumn(e)) {
        try { await insertProfilePermissionFlexible(db, `user:${userId}`, permission); return res.json({ ok: true }); } catch (fbErr:any) { return res.status(400).json({ error: fbErr?.message || String(fbErr) }); }
      }
      return res.status(400).json({ error: e?.message || String(e) });
    }
  }

  if (req.method === 'DELETE') {
    const { userId, permission } = req.body as any;
    if (!userId || !permission) return res.status(400).json({ error: 'userId and permission required' });
    try {
      const { error } = await db.from('user_permissions').delete().eq('user_id', userId).eq('permission', permission);
      if (error) throw error;
      return res.json({ ok: true });
    } catch (e: any) {
      if (isMissingTableOrColumn(e)) {
        try { await deleteProfilePermissionFlexible(db, `user:${userId}`, permission); return res.json({ ok: true }); } catch (fbErr:any) { return res.status(400).json({ error: fbErr?.message || String(fbErr) }); }
      }
      return res.status(400).json({ error: e?.message || String(e) });
    }
  }

  res.setHeader('Allow', 'POST, DELETE');
  return res.status(405).json({ error: 'Method Not Allowed' });
}
