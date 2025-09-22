import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function sanitizeEnv(v?: string | null) { if (!v) return undefined as any; const t=v.trim().replace(/^['"]|['"]$/g, ""); if(!t||t.toLowerCase()==='undefined'||t.toLowerCase()==='null') return undefined as any; return t; }
function createFetchWithTimeout(defaultMs=7000){ return async (input:any, init?:any)=>{ const controller=new AbortController(); const id=setTimeout(()=>controller.abort(), init?.timeout ?? defaultMs); try{ const res=await fetch(input,{...init, signal:controller.signal}); return res as any; } finally{ clearTimeout(id); } }; }
function getAdminClient(){ const url=sanitizeEnv(process.env.VITE_SUPABASE_URL||process.env.SUPABASE_URL); const key=sanitizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY); if(!url||!key) return null; return createClient(url,key,{auth:{persistSession:false},global:{fetch:createFetchWithTimeout(8000)} as any}); }
function getAnonClientWithToken(token:string){ const url=sanitizeEnv(process.env.SUPABASE_URL||(process.env as any).VITE_SUPABASE_URL); const anon=sanitizeEnv((process.env as any).SUPABASE_ANON_KEY||(process.env as any).VITE_SUPABASE_ANON_KEY); if(!url||!anon) return null as any; return createClient(url,anon,{auth:{persistSession:false},global:{headers:{Authorization:`Bearer ${token}`},fetch:createFetchWithTimeout(7000)} as any}); }
async function ensureAdmin(req:VercelRequest,res:VercelResponse){ const auth=(req.headers?.authorization as string)||''; const token=auth.startsWith('Bearer ')?auth.slice(7):auth; if(!token) return res.status(401).json({error:'Não autorizado: token não fornecido.'}); const userClient=getAnonClientWithToken(token); if(!userClient) return res.status(500).json({error:'Configuração Supabase ausente (URL/ANON).'}); const {data:userData,error:getUserErr}=await userClient.auth.getUser(); if(getUserErr) return res.status(401).json({error:'Token inválido ou problema na autenticação.'}); const userId=(userData?.user as any)?.id ?? null; if(!userId) return res.status(401).json({error:'Token inválido.'}); const profResp=await userClient.from('profiles').select('id,perfil').eq('id',userId).maybeSingle(); if((profResp as any)?.error) return res.status(401).json({error:'Token inválido ou sem permissão para acessar perfil.'}); const perfilLower=((((profResp as any).data ?? profResp) as any)?.perfil ?? '').toLowerCase(); if(perfilLower!=='administrador') return res.status(403).json({error:'Acesso proibido: somente administradores.'}); const admin=getAdminClient(); const db=admin ?? userClient; return {admin,db} as const; }
function isMissingTableOrColumn(err:any){ const msg=(err && (err.message||String(err)))||''; const code=String((err as any)?.code||''); return /42P01/.test(code) || /42703/.test(code) || /relation .* does not exist/i.test(msg) || /Could not find the table/i.test(msg) || /Could not find the '.*' column/i.test(msg); }
function buildPermissionCandidates(name: string): string[] {
  const c = new Set<string>();
  const base = String(name || '').trim();
  if (!base) return [];
  c.add(base);
  c.add(base.toLowerCase());
  if (base.includes('process:')) c.add(base.replace('process:', 'processo:'));
  if (base.includes('processo:')) c.add(base.replace('processo:', 'process:'));
  if (/:ver$/.test(base)) c.add(base.replace(/:ver$/, ':ver_todos'));
  if (/:ver_todos$/.test(base)) c.add(base.replace(/:ver_todos$/, ':ver'));
  if (/:finalizar$/.test(base)) c.add(base.replace(/:finalizar$/, ':editar'));
  if (/:editar$/.test(base)) c.add(base.replace(/:editar$/, ':finalizar'));
  return Array.from(c);
}

async function findPermissionId(db: any, permissionName: string) {
  const candidates = buildPermissionCandidates(permissionName);
  console.info('[profile-permissions] lookup candidates', { permissionName, candidates });
  try {
    const { data: byName, error: e1 } = await db.from('permissions').select('id,name,permission').in('name', candidates).limit(1);
    if (e1) console.error('[profile-permissions] by name error', e1);
    const id1 = Array.isArray(byName) && byName[0]?.id;
    if (id1) {
      console.info('[profile-permissions] matched by name', { id: id1, row: byName?.[0] });
      return id1;
    }
  } catch (e) {
    console.error('[profile-permissions] by name exception', e);
  }
  try {
    const { data: byPerm, error: e2 } = await db.from('permissions').select('id,name,permission').in('permission', candidates).limit(1);
    if (e2) console.error('[profile-permissions] by permission error', e2);
    const id2 = Array.isArray(byPerm) && byPerm[0]?.id;
    if (id2) {
      console.info('[profile-permissions] matched by permission', { id: id2, row: byPerm?.[0] });
      return id2;
    }
  } catch (e) {
    console.error('[profile-permissions] by permission exception', e);
  }
  try {
    const orParts = candidates.flatMap((n) => [`name.eq.${n}`, `permission.eq.${n}`]).join(',');
    const { data } = await db.from('permissions').select('id,name,permission').or(orParts).limit(1);
    const id3 = Array.isArray(data) && data[0]?.id;
    console.info('[profile-permissions] fallback or result', { count: Array.isArray(data) ? data.length : 0, id3, orParts });
    if (id3) return id3;
  } catch (e) {
    console.error('[profile-permissions] fallback or exception', e);
  }
  return null;
}
async function insertProfilePermissionFlexible(db: any, perfilKey: string, permissionName: string) {
  let lastErr: any = null;
  console.info('[profile-permissions] insert start', { perfilKey, permissionName });
  try {
    const { error } = await db.from('profile_permissions').insert({ perfil: perfilKey, permission: permissionName } as any);
    if (!error) return;
    lastErr = error;
    console.warn('[profile-permissions] insert text(perfil,permission) failed', error);
  } catch (e) { lastErr = e; console.warn('[profile-permissions] insert text(perfil,permission) exception', e); }
  try {
    const { error } = await db.from('profile_permissions').insert({ profile_name: perfilKey, permission: permissionName } as any);
    if (!error) return;
    lastErr = error;
    console.warn('[profile-permissions] insert text(profile_name,permission) failed', error);
  } catch (e) { lastErr = e; console.warn('[profile-permissions] insert text(profile_name,permission) exception', e); }
  try {
    const permId = await findPermissionId(db, permissionName);
    if (!permId) throw new Error('permission not found');
    try {
      const { error } = await db.from('profile_permissions').insert({ perfil: perfilKey, permission_id: permId } as any);
      if (!error) return;
      lastErr = error;
      console.warn('[profile-permissions] insert id(perfil,permission_id) failed', error);
    } catch (e) { lastErr = e; console.warn('[profile-permissions] insert id(perfil,permission_id) exception', e); }
    try {
      const { error } = await db.from('profile_permissions').insert({ profile_name: perfilKey, permission_id: permId } as any);
      if (!error) return;
      lastErr = error;
      console.warn('[profile-permissions] insert id(profile_name,permission_id) failed', error);
    } catch (e) { lastErr = e; console.warn('[profile-permissions] insert id(profile_name,permission_id) exception', e); }
  } catch (e) { lastErr = e; console.error('[profile-permissions] permission id resolution failed', e); }
  throw lastErr;
}

async function bulkUpdateProfilePermissions(db: any, perfilKey: string, permissionNames: string[]) {
  const admin = getAdminClient();
  const client = admin ?? db;
  console.info('[profile-permissions] bulk update start', { perfilKey, count: permissionNames.length });
  const { data: existingByName, error: eByName } = await client.from('permissions').select('id,name,permission').in('name', permissionNames);
  if (eByName) throw eByName;
  // Fallback: also try matching by permission column for any not found by name
  const foundNames = new Set((existingByName || []).map((p: any) => p.name));
  const remaining = permissionNames.filter((p) => !foundNames.has(p));
  let all = existingByName || [];
  if (remaining.length > 0) {
    const { data: byPerm, error: eByPerm } = await client.from('permissions').select('id,name,permission').in('permission', remaining);
    if (eByPerm) throw eByPerm;
    all = all.concat(byPerm || []);
  }
  if (all.length !== permissionNames.length) {
    console.warn('[profile-permissions] bulk permission not found', { expected: permissionNames, matched: all.map((p:any)=>p.name||p.permission) });
    throw new Error('permission not found');
  }
  const ids = all.map((p: any) => p.id);
  // Delete old relations (cover both possible column names)
  await client.from('profile_permissions').delete().eq('perfil', perfilKey);
  await client.from('profile_permissions').delete().eq('profile_name', perfilKey);
  // Insert new relations with permission_id (try both possible profile columns, first one should succeed depending on schema)
  const rowsPerfil = ids.map((id: string) => ({ perfil: perfilKey, permission_id: id }));
  const rowsProfileName = ids.map((id: string) => ({ profile_name: perfilKey, permission_id: id }));
  let insErr: any = null;
  try { const { error } = await client.from('profile_permissions').insert(rowsPerfil as any); if (!error) insErr = null; else insErr = error; } catch (e) { insErr = e; }
  if (insErr) {
    const { error } = await client.from('profile_permissions').insert(rowsProfileName as any);
    if (error) throw error;
  }
}
async function deleteProfilePermissionFlexible(db: any, perfilKey: string, permissionName: string) {
  let lastErr: any = null;
  console.info('[profile-permissions] delete start', { perfilKey, permissionName });
  try {
    const { error } = await db.from('profile_permissions').delete().eq('perfil', perfilKey).eq('permission', permissionName);
    if (!error) return;
    lastErr = error;
    console.warn('[profile-permissions] delete text(perfil,permission) failed', error);
  } catch (e) { lastErr = e; console.warn('[profile-permissions] delete text(perfil,permission) exception', e); }
  try {
    const { error } = await db.from('profile_permissions').delete().eq('profile_name', perfilKey).eq('permission', permissionName);
    if (!error) return;
    lastErr = error;
    console.warn('[profile-permissions] delete text(profile_name,permission) failed', error);
  } catch (e) { lastErr = e; console.warn('[profile-permissions] delete text(profile_name,permission) exception', e); }
  try {
    const permId = await findPermissionId(db, permissionName);
    if (!permId) throw new Error('permission not found');
    try {
      const { error } = await db.from('profile_permissions').delete().eq('perfil', perfilKey).eq('permission_id', permId);
      if (!error) return;
      lastErr = error;
      console.warn('[profile-permissions] delete id(perfil,permission_id) failed', error);
    } catch (e) { lastErr = e; console.warn('[profile-permissions] delete id(perfil,permission_id) exception', e); }
    try {
      const { error } = await db.from('profile_permissions').delete().eq('profile_name', perfilKey).eq('permission_id', permId);
      if (!error) return;
      lastErr = error;
      console.warn('[profile-permissions] delete id(profile_name,permission_id) failed', error);
    } catch (e) { lastErr = e; console.warn('[profile-permissions] delete id(profile_name,permission_id) exception', e); }
  } catch (e) { lastErr = e; console.error('[profile-permissions] permission id resolution failed', e); }
  throw lastErr;
}
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
    // Support bulk replacement: { profile_name: string (or perfil), permissions: string[] }
    const body: any = req.body || {};
    const perfilKey = body.profile_name || body.perfil || '';
    const permsArray = Array.isArray(body.permissions) ? body.permissions : null;
    if (perfilKey && permsArray) {
      try {
        await bulkUpdateProfilePermissions(ctx.admin || db, perfilKey, permsArray);
        return res.json({ message: 'Permissões atualizadas com sucesso!' });
      } catch (e: any) {
        const msg = isMissingTableOrColumn(e) ? 'Tabela/coluna permissions/profile_permissions ausente.' : (e?.message || String(e));
        return res.status(400).json({ error: msg });
      }
    }
    const { perfil, permission } = body as any;
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
