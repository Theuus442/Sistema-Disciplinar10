import { createClient } from '@supabase/supabase-js';

function sanitizeEnv(v?: string | null) {
  if (!v) return undefined as any;
  const t = v.trim().replace(/^['"]|['"]$/g, "");
  if (!t || t.toLowerCase() === "undefined" || t.toLowerCase() === "null") return undefined as any;
  return t;
}

function getAdminClient(): SupabaseClient | null {
  const url = sanitizeEnv(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
  const serviceKey = sanitizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function getAnonClientWithToken(token: string): SupabaseClient | null {
  const url = sanitizeEnv(process.env.SUPABASE_URL || (process.env as any).VITE_SUPABASE_URL);
  const anon = sanitizeEnv((process.env as any).SUPABASE_ANON_KEY || (process.env as any).VITE_SUPABASE_ANON_KEY);
  if (!url || !anon) return null;
  return createClient(url, anon, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } as any });
}

async function ensureAdmin(req: any, res: any) {
  const auth = (req.headers?.authorization as string) || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  if (!token) { res.status(401).json({ error: 'Não autorizado: token não fornecido.' }); return null; }
  const userClient = getAnonClientWithToken(token);
  if (!userClient) { res.status(500).json({ error: 'Configuração Supabase ausente (URL/ANON).' }); return null; }
  let userId: string | null = null;
  try {
    const { data, error } = await userClient.auth.getUser();
    if (error) { res.status(401).json({ error: 'Token inválido ou problema na autenticação.' }); return null; }
    userId = (data?.user as any)?.id ?? null;
  } catch { res.status(401).json({ error: 'Token inválido ou problema na autenticação.' }); return null; }
  if (!userId) { res.status(401).json({ error: 'Token inválido.' }); return null; }
  let profile: any = null;
  try {
    const profResp = await userClient.from('profiles').select('id,perfil').eq('id', userId).maybeSingle();
    profile = (profResp as any).data ?? profResp;
  } catch { res.status(401).json({ error: 'Token inválido ou sem permissão para acessar perfil.' }); return null; }
  if ((profile?.perfil ?? '').toLowerCase() !== 'administrador') {
    res.status(403).json({ error: 'Acesso proibido: somente administradores.' });
    return null;
  }
  const admin = getAdminClient();
  const db = admin ?? userClient;
  return { db };
}

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

async function findPermissionId(db: SupabaseClient, permissionName: string) {
  const candidates = buildPermissionCandidates(permissionName);
  try {
    const { data } = await db.from('permissions').select('id').in('name', candidates).limit(1);
    const id1 = Array.isArray(data) && (data as any)[0]?.id;
    if (id1) return id1;
  } catch {}
  try {
    const { data } = await db.from('permissions').select('id').in('permission', candidates).limit(1);
    const id2 = Array.isArray(data) && (data as any)[0]?.id;
    if (id2) return id2;
  } catch {}
  try {
    const orParts = candidates.flatMap((n) => [`name.eq.${n}`, `permission.eq.${n}`]).join(',');
    const { data } = await db.from('permissions').select('id').or(orParts).limit(1);
    const id3 = Array.isArray(data) && (data as any)[0]?.id;
    if (id3) return id3;
  } catch {}
  return null;
}

async function ensurePermissionId(db: SupabaseClient, permissionName: string) {
  let id = await findPermissionId(db, permissionName);
  if (id) return id;
  try {
    await db.from('permissions').insert({ name: permissionName, permission: permissionName } as any);
  } catch {}
  id = await findPermissionId(db, permissionName);
  if (!id) throw new Error(`permission not found: ${permissionName}`);
  return id;
}

async function insertProfilePermissionFlexible(db: SupabaseClient, perfilKey: string, permissionName: string) {
  try {
    const { error } = await db.from('profile_permissions').insert({ perfil: perfilKey, permission: permissionName } as any);
    if (!error) return;
  } catch {}
  try {
    const { error } = await db.from('profile_permissions').insert({ profile_name: perfilKey, permission: permissionName } as any);
    if (!error) return;
  } catch {}
  const permId = await ensurePermissionId(db, permissionName);
  try {
    const { error } = await db.from('profile_permissions').insert({ perfil: perfilKey, permission_id: permId } as any);
    if (!error) return;
  } catch {}
  const { error: e2 } = await db.from('profile_permissions').insert({ profile_name: perfilKey, permission_id: permId } as any);
  if (e2) throw e2;
}

async function deleteProfilePermissionFlexible(db: SupabaseClient, perfilKey: string, permissionName: string) {
  try {
    const { error } = await db.from('profile_permissions').delete().eq('perfil', perfilKey).eq('permission', permissionName);
    if (!error) return;
  } catch {}
  try {
    const { error } = await db.from('profile_permissions').delete().eq('profile_name', perfilKey).eq('permission', permissionName);
    if (!error) return;
  } catch {}
  const permId = await findPermissionId(db, permissionName);
  if (!permId) throw new Error(`permission not found: ${permissionName}`);
  try {
    const { error } = await db.from('profile_permissions').delete().eq('perfil', perfilKey).eq('permission_id', permId);
    if (!error) return;
  } catch {}
  const { error: e2 } = await db.from('profile_permissions').delete().eq('profile_name', perfilKey).eq('permission_id', permId);
  if (e2) throw e2;
}

async function readProfilePermissionsFlexible(db: SupabaseClient): Promise<Record<string, string[]>> {
  try {
    const { data, error } = await db.from('profile_permissions').select('perfil, permission');
    if (!error && Array.isArray(data)) {
      const by: Record<string, string[]> = {};
      for (const r of data as any[]) {
        const p = (r as any).perfil || 'unknown';
        const perm = (r as any).permission || '';
        if (!perm) continue;
        (by[p] = by[p] || []).push(perm);
      }
      if (Object.keys(by).length) return by;
    }
  } catch {}
  try {
    const { data, error } = await db.from('profile_permissions').select('profile_name, permission');
    if (!error && Array.isArray(data)) {
      const by: Record<string, string[]> = {};
      for (const r of data as any[]) {
        const p = (r as any).profile_name || 'unknown';
        const perm = (r as any).permission || '';
        if (!perm) continue;
        (by[p] = by[p] || []).push(perm);
      }
      if (Object.keys(by).length) return by;
    }
  } catch {}
  try {
    const { data, error } = await db.from('profile_permissions').select('perfil, profile_name, permission, permission_id, permissions ( name, permission )');
    if (!error && Array.isArray(data)) {
      const by: Record<string, string[]> = {};
      for (const r of data as any[]) {
        const p = (r as any).perfil || (r as any).profile_name || 'unknown';
        const perm = (r as any).permission || (r as any)?.permissions?.name || (r as any)?.permissions?.permission || '';
        if (!perm) continue;
        (by[p] = by[p] || []).push(perm);
      }
      return by;
    }
  } catch {}
  return {};
}

export default async function handler(req: any, res: any) {
  try {
    const ctx = await ensureAdmin(req, res);
    if (!ctx) return;
    const db = ctx.db;

    if (req.method === 'GET') {
      const by = await readProfilePermissionsFlexible(db);
      return res.status(200).json(by);
    }

    if (req.method === 'POST') {
      const body = (req.body as any) || {};
      // Shape A: toggle single permission from frontend { perfil, permission }
      if (body.perfil && body.permission) {
        try {
          await insertProfilePermissionFlexible(db, body.perfil, body.permission);
          return res.status(200).json({ ok: true });
        } catch (e: any) {
          const msg = e?.message || String(e);
          return res.status(400).json({ error: msg });
        }
      }
      // Shape B: bulk update { profile_name, permissions: string[] }
      const profile_name: string | undefined = body.profile_name;
      const permissionsFromFrontend: string[] | undefined = Array.isArray(body.permissions) ? body.permissions : undefined;
      if (!profile_name || !permissionsFromFrontend) {
        return res.status(400).json({ error: 'Dados de entrada inválidos.' });
      }
      if (permissionsFromFrontend.length === 0) {
        await db.from('profile_permissions').delete().eq('profile_name', profile_name);
        await db.from('profile_permissions').delete().eq('perfil', profile_name);
        return res.status(200).json({ message: 'Permissões limpas com sucesso.' });
      }
      let { data: permissionsFromDb, error: findError } = await db
        .from('permissions')
        .select('id, name, permission')
        .in('name', permissionsFromFrontend);
      if (findError) return res.status(500).json({ error: 'Falha ao validar permissões.' });
      let foundNames = (permissionsFromDb || []).map((p: any) => p.name || p.permission).filter(Boolean);
      const missing = permissionsFromFrontend.filter((p) => !foundNames.includes(p));
      if (missing.length) {
        // seed missing
        for (const m of missing) {
          try { await db.from('permissions').insert({ name: m, permission: m } as any); } catch {}
        }
        // re-fetch
        const ref = await db.from('permissions').select('id, name, permission').in('name', permissionsFromFrontend);
        permissionsFromDb = ref.data as any;
        foundNames = (permissionsFromDb || []).map((p: any) => p.name || p.permission).filter(Boolean);
      }
      if (foundNames.length !== permissionsFromFrontend.length) {
        const missingPermission = permissionsFromFrontend.find((p) => !foundNames.includes(p));
        return res.status(400).json({ error: `permission not found: ${missingPermission}` });
      }
      const permissionIds = (permissionsFromDb || []).map((p: any) => p.id);
      await db.from('profile_permissions').delete().eq('profile_name', profile_name);
      await db.from('profile_permissions').delete().eq('perfil', profile_name);
      const rows = permissionIds.map((id: string | number) => ({ profile_name, permission_id: id }));
      const { error: insertErr } = await db.from('profile_permissions').insert(rows as any);
      if (insertErr) return res.status(500).json({ error: 'Falha ao atualizar permissões (insert).' });
      return res.status(200).json({ message: 'Permissões atualizadas com sucesso!' });
    }

    if (req.method === 'DELETE') {
      const body = (req.body as any) || {};
      const { perfil, permission } = body;
      if (!perfil || !permission) return res.status(400).json({ error: 'perfil and permission required' });
      try {
        await deleteProfilePermissionFlexible(db, perfil, permission);
        return res.status(200).json({ ok: true });
      } catch (e: any) {
        const msg = e?.message || String(e);
        return res.status(400).json({ error: msg });
      }
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error: any) {
    console.error('[ERRO FATAL NA FUNÇÃO VERCEL]', error);
    return res.status(500).json({ error: 'Erro interno do servidor: ' + (error?.message || String(error)) });
  }
}
