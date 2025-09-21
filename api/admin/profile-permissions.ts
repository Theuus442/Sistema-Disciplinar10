import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function sanitizeEnv(v?: string | null) { if (!v) return undefined as any; const t=v.trim().replace(/^['"]|['"]$/g, ""); if(!t||t.toLowerCase()==='undefined'||t.toLowerCase()==='null') return undefined as any; return t; }
function createFetchWithTimeout(defaultMs=7000){ return async (input:any, init?:any)=>{ const controller=new AbortController(); const id=setTimeout(()=>controller.abort(), init?.timeout ?? defaultMs); try{ const res=await fetch(input,{...init, signal:controller.signal}); return res as any; } finally{ clearTimeout(id); } }; }
function getAdminClient(){ const url=sanitizeEnv(process.env.VITE_SUPABASE_URL||process.env.SUPABASE_URL); const key=sanitizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY); if(!url||!key) return null; return createClient(url,key,{auth:{persistSession:false},global:{fetch:createFetchWithTimeout(8000)} as any}); }
function getAnonClientWithToken(token:string){ const url=sanitizeEnv(process.env.SUPABASE_URL||(process.env as any).VITE_SUPABASE_URL); const anon=sanitizeEnv((process.env as any).SUPABASE_ANON_KEY||(process.env as any).VITE_SUPABASE_ANON_KEY); if(!url||!anon) return null as any; return createClient(url,anon,{auth:{persistSession:false},global:{headers:{Authorization:`Bearer ${token}`},fetch:createFetchWithTimeout(7000)} as any}); }
async function ensureAdmin(req:VercelRequest,res:VercelResponse){ const auth=(req.headers?.authorization as string)||''; const token=auth.startsWith('Bearer ')?auth.slice(7):auth; if(!token) return res.status(401).json({error:'Não autorizado: token não fornecido.'}); const userClient=getAnonClientWithToken(token); if(!userClient) return res.status(500).json({error:'Configuração Supabase ausente (URL/ANON).'}); const {data:userData,error:getUserErr}=await userClient.auth.getUser(); if(getUserErr) return res.status(401).json({error:'Token inválido ou problema na autenticação.'}); const userId=(userData?.user as any)?.id ?? null; if(!userId) return res.status(401).json({error:'Token inválido.'}); const profResp=await userClient.from('profiles').select('id,perfil').eq('id',userId).maybeSingle(); if((profResp as any)?.error) return res.status(401).json({error:'Token inválido ou sem permissão para acessar perfil.'}); const perfilLower=((((profResp as any).data ?? profResp) as any)?.perfil ?? '').toLowerCase(); if(perfilLower!=='administrador') return res.status(403).json({error:'Acesso proibido: somente administradores.'}); const admin=getAdminClient(); const db=admin ?? userClient; return {admin,db} as const; }
function isMissingTableOrColumn(err:any){ const msg=(err && (err.message||String(err)))||''; const code=String((err as any)?.code||''); return /42P01/.test(code) || /42703/.test(code) || /relation .* does not exist/i.test(msg) || /Could not find the table/i.test(msg) || /Could not find the '.*' column/i.test(msg); }
async function insertProfilePermissionFlexible(db:any, perfilKey:string, permissionName:string){ let lastErr:any=null; try{ const {error}=await db.from('profile_permissions').insert({perfil:perfilKey,permission:permissionName} as any); if(!error) return; lastErr=error; }catch(e){ lastErr=e; } try{ const {error}=await db.from('profile_permissions').insert({profile_name:perfilKey,permission:permissionName} as any); if(!error) return; lastErr=error; }catch(e){ lastErr=e; } try{ const {data}=await db.from('permissions').select('id,name,permission').or(`name.eq.${permissionName},permission.eq.${permissionName}`).limit(1); const permId=Array.isArray(data) && data[0]?.id; if(!permId) throw new Error('permission not found'); try{ const {error}=await db.from('profile_permissions').insert({perfil:perfilKey,permission_id:permId} as any); if(!error) return; lastErr=error; }catch(e){ lastErr=e; } try{ const {error}=await db.from('profile_permissions').insert({profile_name:perfilKey,permission_id:permId} as any); if(!error) return; lastErr=error; }catch(e){ lastErr=e; } }catch(e){ lastErr=e; } throw lastErr; }
async function deleteProfilePermissionFlexible(db:any, perfilKey:string, permissionName:string){ let lastErr:any=null; try{ const {error}=await db.from('profile_permissions').delete().eq('perfil',perfilKey).eq('permission',permissionName); if(!error) return; lastErr=error; }catch(e){ lastErr=e; } try{ const {error}=await db.from('profile_permissions').delete().eq('profile_name',perfilKey).eq('permission',permissionName); if(!error) return; lastErr=error; }catch(e){ lastErr=e; } try{ const {data}=await db.from('permissions').select('id,name,permission').or(`name.eq.${permissionName},permission.eq.${permissionName}`).limit(1); const permId=Array.isArray(data) && data[0]?.id; if(!permId) throw new Error('permission not found'); try{ const {error}=await db.from('profile_permissions').delete().eq('perfil',perfilKey).eq('permission_id',permId); if(!error) return; lastErr=error; }catch(e){ lastErr=e; } try{ const {error}=await db.from('profile_permissions').delete().eq('profile_name',perfilKey).eq('permission_id',permId); if(!error) return; lastErr=error; }catch(e){ lastErr=e; } }catch(e){ lastErr=e; } throw lastErr; }
async function readProfilePermissionsFlexible(db:any){
  try{ const {data,error}=await db.from('profile_permissions').select('perfil, permission'); if(!error && Array.isArray(data)){ const by: Record<string, string[]> = {}; for(const r of data as any[]){ const p=r.perfil||'unknown'; const perm=r.permission||''; if(!perm) continue; (by[p]=by[p]||[]).push(perm); } if(Object.keys(by).length) return by; } }catch{}
  try{ const {data,error}=await db.from('profile_permissions').select('profile_name, permission'); if(!error && Array.isArray(data)){ const by: Record<string, string[]> = {}; for(const r of data as any[]){ const p=r.profile_name||'unknown'; const perm=r.permission||''; if(!perm) continue; (by[p]=by[p]||[]).push(perm); } if(Object.keys(by).length) return by; } }catch{}
  try{ const {data,error}=await db.from('profile_permissions').select('perfil, profile_name, permission, permission_id, permissions ( name, permission )'); if(!error && Array.isArray(data)){ const by: Record<string, string[]> = {}; for(const r of data as any[]){ const p=r.perfil||r.profile_name||'unknown'; const perm=r.permission||r?.permissions?.name||r?.permissions?.permission||''; if(!perm) continue; (by[p]=by[p]||[]).push(perm); } return by; } }catch{}
  return {} as Record<string,string[]>;
}

export default async function handler(req: VercelRequest, res: VercelResponse){
  const ctx = await ensureAdmin(req,res) as any; if(!ctx) return; const db = ctx.db;

  if (req.method === 'GET') {
    try {
      const by = await readProfilePermissionsFlexible(db);
      return res.json(by);
    } catch (e:any) {
      return res.status(500).json({ error: e?.message || String(e) });
    }
  }

  if (req.method === 'POST') {
    const { perfil, permission } = req.body as any;
    if (!perfil || !permission) return res.status(400).json({ error: 'perfil and permission required' });
    try {
      await insertProfilePermissionFlexible(db, perfil, permission);
      return res.json({ ok: true });
    } catch (e:any) {
      const msg = isMissingTableOrColumn(e) ? 'Tabela/coluna permissions/profile_permissions ausente.' : (e?.message || String(e));
      return res.status(400).json({ error: msg });
    }
  }

  if (req.method === 'DELETE') {
    const { perfil, permission } = req.body as any;
    if (!perfil || !permission) return res.status(400).json({ error: 'perfil and permission required' });
    try {
      await deleteProfilePermissionFlexible(db, perfil, permission);
      return res.json({ ok: true });
    } catch (e:any) {
      const msg = isMissingTableOrColumn(e) ? 'Tabela/coluna permissions/profile_permissions ausente.' : (e?.message || String(e));
      return res.status(400).json({ error: msg });
    }
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'Method Not Allowed' });
}
