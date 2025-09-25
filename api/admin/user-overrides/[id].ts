import { createClient } from '@supabase/supabase-js';

function sanitizeEnv(v?: string | null) { if (!v) return undefined as any; const t=v.trim().replace(/^['"]|['"]$/g, ""); if(!t||t.toLowerCase()==='undefined'||t.toLowerCase()==='null') return undefined as any; return t; }
function createFetchWithTimeout(defaultMs=7000){ return async (input:any, init?:any)=>{ const controller=new AbortController(); const id=setTimeout(()=>controller.abort(), init?.timeout ?? defaultMs); try{ const res=await fetch(input,{...init, signal:controller.signal}); return res as any; } finally{ clearTimeout(id); } }; }
function getAdminClient(){ const url=sanitizeEnv(process.env.VITE_SUPABASE_URL||process.env.SUPABASE_URL); const key=sanitizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY); if(!url||!key) return null; return createClient(url,key,{auth:{persistSession:false},global:{fetch:createFetchWithTimeout(8000)} as any}); }
function getAnonClientWithToken(token:string){ const url=sanitizeEnv(process.env.SUPABASE_URL||(process.env as any).VITE_SUPABASE_URL); const anon=sanitizeEnv((process.env as any).SUPABASE_ANON_KEY||(process.env as any).VITE_SUPABASE_ANON_KEY); if(!url||!anon) return null as any; return createClient(url,anon,{auth:{persistSession:false},global:{headers:{Authorization:`Bearer ${token}`},fetch:createFetchWithTimeout(7000)} as any}); }
async function ensureAdmin(req:any,res:any){ const auth=(req.headers?.authorization as string)||''; const token=auth.startsWith('Bearer ')?auth.slice(7):auth; if(!token) return res.status(401).json({error:'Não autorizado: token não fornecido.'}); const userClient=getAnonClientWithToken(token); if(!userClient) return res.status(500).json({error:'Configuração Supabase ausente (URL/ANON).'}); const {data:userData,error:getUserErr}=await userClient.auth.getUser(); if(getUserErr) return res.status(401).json({error:'Token inválido ou problema na autenticação.'}); const userId=(userData?.user as any)?.id ?? null; if(!userId) return res.status(401).json({error:'Token inválido.'}); const profResp=await userClient.from('profiles').select('id,perfil').eq('id',userId).maybeSingle(); if((profResp as any)?.error) return res.status(401).json({error:'Token inválido ou sem permissão para acessar perfil.'}); const perfilLower=((((profResp as any).data ?? profResp) as any)?.perfil ?? '').toLowerCase(); if(perfilLower!=='administrador') return res.status(403).json({error:'Acesso proibido: somente administradores.'}); const admin=getAdminClient(); const db=admin ?? userClient; return {admin,db} as const; }

function isMissingTableOrColumn(err:any){ const msg=(err && (err.message||String(err)))||''; const code=String((err as any)?.code||''); return /42P01/.test(code)||/42703/.test(code)||/relation .* does not exist/i.test(msg)||/Could not find the table/i.test(msg)||/Could not find the '.*' column/i.test(msg); }

export default async function handler(req: any, res: any){
  const ctx = await ensureAdmin(req,res) as any; if(!ctx) return; const db = ctx.db;
  if (req.method !== 'GET') { res.setHeader('Allow','GET'); return res.status(405).json({error:'Method Not Allowed'}); }
  const idParam = (req.query as any)?.id; const userId = Array.isArray(idParam) ? idParam[0] : idParam; if(!userId) return res.status(400).json({error:'userId requerido'});
  const trySelects = [
    async () => db.from('user_permission_overrides').select('permission_name, action').eq('user_id', userId),
    async () => db.from('user_permission_overrides').select('permission, action').eq('user_id', userId),
    async () => db.from('user_overrides').select('permission_name, action').eq('user_id', userId),
    async () => db.from('user_overrides').select('permission, action').eq('user_id', userId),
  ];
  for (const fn of trySelects){ try{ const {data,error}=await fn(); if(!error && Array.isArray(data)) { const list=(data as any[]).map((r:any)=>({ permission_name: r.permission_name||r.permission, action: (r.action||'').toLowerCase()==='revoke'?'revoke':'grant' })).filter((r)=>r.permission_name); return res.json(list); } } catch{}
  }
  try{ const { data, error } = await db.from('user_permissions').select('permission').eq('user_id', userId); if(!error && Array.isArray(data)) { return res.json((data as any[]).map((r:any)=>({ permission_name: r.permission, action: 'grant' as const }))); } }catch{}
  return res.json([]);
}
