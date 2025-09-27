import type { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

function sanitizeEnv(v?: string | null) {
  if (!v) return undefined as any;
  const t = v.trim().replace(/^['"]|['"]$/g, "");
  if (!t || t.toLowerCase() === "undefined" || t.toLowerCase() === "null") return undefined as any;
  return t;
}

function createFetchWithTimeout(defaultMs = 7000) {
  return async (input: any, init?: any) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), init?.timeout ?? defaultMs);
    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      return res as any;
    } catch (e: any) {
      if (e && e.name === 'AbortError') throw new Error('fetch timeout');
      throw e;
    } finally {
      clearTimeout(id);
    }
  };
}

function getAdminClient() {
  const url = sanitizeEnv(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
  const serviceKey = sanitizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !serviceKey) {
    console.error('getAdminClient: missing SUPABASE SERVICE config', { VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL, SUPABASE_URL: !!process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY });
    return null;
  }
  try {
    return createClient(url, serviceKey, {
      auth: { persistSession: false },
      global: { fetch: createFetchWithTimeout(8000) } as any,
    });
  } catch (e: any) {
    console.error('getAdminClient: createClient failed', e?.stack || e?.message || e);
    throw e;
  }
}

function getAnonClientWithToken(token: string) {
  const url = sanitizeEnv(process.env.SUPABASE_URL || (process.env as any).VITE_SUPABASE_URL);
  const anon = sanitizeEnv((process.env as any).SUPABASE_ANON_KEY || (process.env as any).VITE_SUPABASE_ANON_KEY);
  if (!url || !anon) {
    console.error('getAnonClientWithToken: missing SUPABASE ANON config', { SUPABASE_URL: !!process.env.SUPABASE_URL, VITE_SUPABASE_URL: !!(process.env as any).VITE_SUPABASE_URL, SUPABASE_ANON_KEY: !!(process.env as any).SUPABASE_ANON_KEY, VITE_SUPABASE_ANON_KEY: !!(process.env as any).VITE_SUPABASE_ANON_KEY });
    return null as any;
  }
  try {
    return createClient(url, anon, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` }, fetch: createFetchWithTimeout(7000) } as any,
    });
  } catch (e: any) {
    console.error('getAnonClientWithToken: createClient failed', e?.stack || e?.message || e);
    throw e;
  }
}

async function ensureAdmin(req: any, res: any) {
  try {
    const auth = (req.headers?.authorization as string) || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;

    if (!token) {
      res.status(401).json({ error: "Não autorizado: token não fornecido." });
      return null;
    }

    const userClient = getAnonClientWithToken(token);
    if (!userClient) {
      res.status(500).json({ error: "Configuração Supabase ausente (URL/ANON)." });
      return null;
    }

    let userId: string | null = null;
    try {
      const { data: userData, error: getUserErr } = await userClient.auth.getUser();
      if (getUserErr) {
        res.status(401).json({ error: 'Token inválido ou problema na autenticação.' });
        return null;
      }
      userId = (userData?.user as any)?.id ?? null;
    } catch (e: any) {
      res.status(401).json({ error: 'Token inválido ou problema na autenticação.' });
      return null;
    }

    if (!userId) {
      res.status(401).json({ error: "Token inválido." });
      return null;
    }

    let profile: any = null;
    try {
      const profResp = await userClient.from('profiles').select('id,perfil,nome,email').eq('id', userId).maybeSingle();
      if (profResp && (profResp as any).error) {
        res.status(401).json({ error: 'Token inválido ou sem permissão para acessar perfil.' });
        return null;
      }
      profile = (profResp as any).data ?? profResp;
    } catch (e: any) {
      res.status(401).json({ error: 'Token inválido ou sem permissão para acessar perfil.' });
      return null;
    }

    const perfilLower = (profile?.perfil ?? '').toLowerCase();
    if (perfilLower !== 'administrador') {
      res.status(403).json({ error: "Acesso proibido: somente administradores." });
      return null;
    }

    const admin = getAdminClient();
    const db = admin ?? userClient;
    return { admin, db, userId };
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
    return null;
  }
}

// ------------------------- Permissions management helpers -------------------------

function isMissingTableOrColumn(err: any) {
  const msg = (err && (err.message || String(err))) || '';
  const code = String((err as any)?.code || '');
  if (/42P01/.test(code)) return true; // undefined_table
  if (/42703/.test(code)) return true; // undefined_column
  if (/relation .* does not exist/i.test(msg)) return true;
  if (/Could not find the table/i.test(msg)) return true;
  if (/Could not find the '.*' column/i.test(msg)) return true;
  return false;
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

async function ensurePermissionId(db: any, permissionName: string) {
  let id = await findPermissionId(db, permissionName);
  if (id) return id;
  try {
    // Try to create the permission if it doesn't exist yet
    await db.from('permissions').insert({ name: permissionName, permission: permissionName } as any);
  } catch {}
  id = await findPermissionId(db, permissionName);
  if (!id) throw new Error(`permission not found: ${permissionName}`);
  return id;
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
    const permId = await ensurePermissionId(db, permissionName);
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

async function readProfilePermissionsFlexible(db: any): Promise<Record<string, string[]>> {
  // Try simple shape
  try {
    const { data, error } = await db.from('profile_permissions').select('perfil, permission');
    if (!error && Array.isArray(data)) {
      const by: Record<string, string[]> = {};
      for (const r of data as any[]) {
        const p = r.perfil || 'unknown';
        const perm = r.permission || '';
        if (!perm) continue;
        (by[p] = by[p] || []).push(perm);
      }
      if (Object.keys(by).length) return by;
    }
  } catch {}
  // Try alternate column name
  try {
    const { data, error } = await db.from('profile_permissions').select('profile_name, permission');
    if (!error && Array.isArray(data)) {
      const by: Record<string, string[]> = {};
      for (const r of data as any[]) {
        const p = r.profile_name || 'unknown';
        const perm = r.permission || '';
        if (!perm) continue;
        (by[p] = by[p] || []).push(perm);
      }
      if (Object.keys(by).length) return by;
    }
  } catch {}
  // Try join to permissions table
  try {
    const { data, error } = await db.from('profile_permissions').select('perfil, profile_name, permission, permission_id, permissions ( name, permission )');
    if (!error && Array.isArray(data)) {
      const by: Record<string, string[]> = {};
      for (const r of data as any[]) {
        const p = r.perfil || r.profile_name || 'unknown';
        const perm = r.permission || r?.permissions?.name || r?.permissions?.permission || '';
        if (!perm) continue;
        (by[p] = by[p] || []).push(perm);
      }
      return by;
    }
  } catch {}
  return {};
}

// ------------------------- Users -------------------------

export const listProfiles: RequestHandler = async (_req, res) => {
  try {
    const ctx = await ensureAdmin(_req, res);
    if (!ctx) return;
    const db = ctx.db;

    const { data, error } = await db
      .from("profiles")
      .select("*");
    if (error) return res.status(400).json({ error: error.message });

    const rows = Array.isArray(data) ? data : [];

    const profileNameById = new Map<string, string>();
    for (const p of rows as any[]) {
      if (p?.id) profileNameById.set(p.id, p?.nome ?? "");
    }

    const emailById = new Map<string, string>();
    if (ctx.admin) {
      try {
        // @ts-ignore - Supabase types may not expose admin on auth client in this environment
        const { data: usersPage } = await (ctx.admin as any).auth?.admin.listUsers({ page: 1, perPage: 200 } as any);
        const users = (usersPage as any)?.users || [];
        for (const u of users) if (u?.id && u?.email) emailById.set(u.id, u.email);
      } catch {}
    }

    const funcionarioIds = rows
      .filter((p: any) => (p?.perfil ?? "funcionario") === "funcionario")
      .map((p: any) => p.id);
    let employeesById = new Map<string, any>();
    if (funcionarioIds.length > 0) {
      const { data: employees } = await db.from("employees").select("*").in("id", funcionarioIds as any);
      for (const e of employees || []) {
        employeesById.set((e as any).id, e);
      }
    }

    const normalized = rows.map((p: any) => {
      const emp = employeesById.get(p.id) || null;
      return {
        id: p.id,
        nome: p.nome ?? "",
        email: p.email ?? emailById.get(p.id) ?? "",
        perfil: p.perfil ?? "funcionario",
        ativo: p.ativo ?? true,
        criadoEm: p.created_at ?? p.createdAt ?? new Date().toISOString(),
        ultimoAcesso: p.ultimo_acesso ?? p.ultimoAcesso ?? p.updated_at ?? p.updatedAt ?? null,
        funcionario: emp
          ? {
              nomeCompleto: emp.nome_completo ?? "",
              matricula: emp.matricula ?? "",
              cargo: emp.cargo ?? "",
              setor: emp.setor ?? "",
              gestorDiretoId: emp.gestor_id ?? null,
              gestorDiretoNome: emp.gestor_id ? profileNameById.get(emp.gestor_id) ?? "" : "",
            }
          : null,
      };
    });

    return res.json(normalized);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};

export const createUserAndProfile: RequestHandler = async (req, res) => {
  try {
    const { nome, email, password, perfil, ativo, employee } = req.body as any;

    if (!nome || !email || !password || !perfil) {
      return res.status(400).json({ error: "Campos obrigatórios: nome, email, password, perfil" });
    }

    const ctx = await ensureAdmin(req, res);
    if (!ctx) return;
    const admin = ctx.admin;
    if (!admin) return res.status(501).json({ error: "Operação administrativa requer SUPABASE_SERVICE_ROLE_KEY no servidor" });

    // @ts-ignore - Supabase types may not expose admin on auth client in this environment
    const { data: created, error: createErr } = await (admin.auth as any).admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome, perfil, ativo },
    });
    if (createErr) return res.status(400).json({ error: createErr.message });

    const user = created.user;
    if (!user) return res.status(500).json({ error: "Falha ao criar usuário" });

    const { error: profileErr } = await admin.from("profiles").insert({
      id: user.id,
      nome,
      perfil,
      ativo,
    } as any);
    if (profileErr) return res.status(400).json({ error: profileErr.message });

    if (perfil === "funcionario") {
      const empPayload: any = {
        id: user.id,
        nome_completo: (employee?.nomeCompleto ?? nome) || nome,
        matricula: employee?.matricula ?? null,
        cargo: employee?.cargo ?? null,
        setor: employee?.setor ?? null,
        gestor_id: employee?.gestorId ?? null,
      };
      const { error: empErr } = await admin.from("employees").insert(empPayload as any);
      if (empErr) return res.status(400).json({ error: empErr.message });
    }

    return res.json({ id: user.id, nome, email, perfil, ativo, criadoEm: new Date().toISOString() });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};

export const listRecentLogins: RequestHandler = async (_req, res) => {
  try {
    const ctx = await ensureAdmin(_req, res);
    if (!ctx) return;
    const db = ctx.db;

    const { data: profs, error } = await db.from("profiles").select("*").limit(100);
    if (error) return res.status(400).json({ error: error.message });

    let lastById = new Map<string, string | null>();
    if (ctx.admin) {
      try {
        const { data: usersResp } = await (ctx.admin as any).auth?.admin.listUsers({ page: 1, perPage: 200 } as any);
        const users = (usersResp as any)?.users || [];
        for (const u of users) {
          const last = u?.last_sign_in_at || u?.created_at || null;
          if (u?.id) lastById.set(u.id, last);
        }
      } catch {}
    }

    const list = (profs || [])
      .map((p: any) => {
        const ts =
          lastById.get(p.id) ||
          p.last_sign_in_at ||
          p.ultimoAcesso || p.ultimo_acesso ||
          p.created_at || p.createdAt || p.updated_at || p.updatedAt || null;
        return {
          id: p.id,
          email: p.email ?? p.user_email ?? "",
          nome: p.nome ?? p.full_name ?? p.name ?? "",
          lastSignInAt: ts,
        };
      })
      .sort((a: any, b: any) => new Date(b.lastSignInAt || 0).getTime() - new Date(a.lastSignInAt || 0).getTime())
      .slice(0, 10);
    return res.json(list);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};

export const listRecentActivities: RequestHandler = async (_req, res) => {
  try {
    const ctx = await ensureAdmin(_req, res);
    if (!ctx) return;
    const db = ctx.db;

    const { data: processes, error: procErr } = await db
      .from("processes")
      .select("*")
      .limit(200);
    if (procErr) return res.status(400).json({ error: procErr.message });
    const procs = Array.isArray(processes) ? processes : [];

    const employeeIds = Array.from(new Set(procs.map((p: any) => p.employee_id).filter(Boolean)));
    const employeesById = new Map<string, any>();
    if (employeeIds.length) {
      const { data: employees } = await db.from("employees").select("*").in("id", employeeIds as any);
      for (const e of employees || []) employeesById.set((e as any).id, e);
    }

    const procActivities = procs
      .map((p: any) => {
        const at =
          p?.created_at || (p as any)?.data_da_ocorrencia || p?.updated_at ||
          p?.createdAt || (p as any)?.dataOcorrencia || p?.updatedAt || new Date().toISOString();
        const emp = employeesById.get(p.employee_id);
        const nome = emp?.nome_completo ?? "Funcionário";
        const tipo = p.tipo_desvio ?? "Processo";
        return {
          id: `process:${p.id}`,
          descricao: `Abertura de processo (${tipo}) para ${nome}`,
          at: String(at),
        };
      });

    const { data: recentProfiles, error: profilesErr } = await db
      .from("profiles")
      .select("*")
      .limit(100);
    if (profilesErr) return res.status(400).json({ error: profilesErr.message });
    const userActivities = (recentProfiles || []).map((p: any) => {
      const at = p.ultimo_acesso || p.ultimoAcesso || p.updated_at || p.updatedAt || p.created_at || p.createdAt || new Date().toISOString();
      return {
        id: `user:${p.id}`,
        descricao: `Cadastro de usuário ${p.nome || p.email || p.id}`,
        at: String(at),
      };
    });

    const all = [...procActivities, ...userActivities]
      .sort((a, b) => new Date(b.at as any).getTime() - new Date(a.at as any).getTime())
      .slice(0, 15);

    return res.json(all);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};

// ------------------------- Permissions management -------------------------

export const listPermissions: RequestHandler = async (_req, res) => {
  try {
    const ctx = await ensureAdmin(_req, res);
    if (!ctx) return;
    const db = ctx.db;

    try {
      const { data, error } = await db.from('permissions').select('permission, name');
      if (!error && Array.isArray(data) && data.length > 0) {
        const names = (data as any).map((d: any) => d.permission || d.name).filter(Boolean);
        if (names.length) return res.json(names);
      }
    } catch {}

    return res.json([
      'processo:criar',
      'processo:ver_todos',
      'processo:editar',
      'relatorios:ver',
      'usuarios:gerenciar',
    ]);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};

export const getProfilePermissions: RequestHandler = async (_req, res) => {
  try {
    const ctx = await ensureAdmin(_req, res);
    if (!ctx) return;
    const db = ctx.db;

    try {
      const by = await readProfilePermissionsFlexible(db);
      return res.json(by);
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || String(e) });
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};

export const addProfilePermission: RequestHandler = async (req, res) => {
  try {
    const ctx = await ensureAdmin(req, res);
    if (!ctx) return;
    const db = ctx.db;
    const { perfil, permission } = req.body as any;
    if (!perfil || !permission) return res.status(400).json({ error: 'perfil and permission required' });
    try {
      await insertProfilePermissionFlexible(db, perfil, permission);
      return res.json({ ok: true });
    } catch (e: any) {
      const msg = isMissingTableOrColumn(e) ? 'Tabela/coluna permissions/profile_permissions ausente.' : (e?.message || String(e));
      return res.status(400).json({ error: msg });
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};

export const removeProfilePermission: RequestHandler = async (req, res) => {
  try {
    const ctx = await ensureAdmin(req, res);
    if (!ctx) return;
    const db = ctx.db;
    const { perfil, permission } = req.body as any;
    if (!perfil || !permission) return res.status(400).json({ error: 'perfil and permission required' });
    try {
      await deleteProfilePermissionFlexible(db, perfil, permission);
      return res.json({ ok: true });
    } catch (e: any) {
      const msg = isMissingTableOrColumn(e) ? 'Tabela/coluna permissions/profile_permissions ausente.' : (e?.message || String(e));
      return res.status(400).json({ error: msg });
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};

async function getUserPerms(db: any, userId: string): Promise<string[]> {
  try {
    const { data, error } = await db.from('user_permissions').select('permission').eq('user_id', userId);
    if (error) throw error;
    return (data || []).map((r: any) => r.permission);
  } catch (e: any) {
    if (isMissingTableOrColumn(e)) {
      const key = `user:${userId}`;
      // Try simple
      try {
        const { data } = await db.from('profile_permissions').select('permission').eq('perfil', key);
        if (Array.isArray(data) && data.length) return data.map((r: any) => r.permission).filter(Boolean);
      } catch {}
      try {
        const { data } = await db.from('profile_permissions').select('permission').eq('profile_name', key);
        if (Array.isArray(data) && data.length) return data.map((r: any) => r.permission).filter(Boolean);
      } catch {}
      // Try joined permissions
      try {
        const { data } = await db.from('profile_permissions').select('permissions ( name, permission ), permission').or(`perfil.eq.${key},profile_name.eq.${key}`);
        if (Array.isArray(data) && data.length) return data.map((r: any) => r.permission || r?.permissions?.name || r?.permissions?.permission).filter(Boolean);
      } catch {}
      return [];
    }
    return [];
  }
}

export const getUserPermissions: RequestHandler = async (req, res) => {
  try {
    const ctx = await ensureAdmin(req, res);
    if (!ctx) return;
    const db = ctx.db;
    const userId = String(req.params.userId || req.query.userId || '').trim();
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const perms = await getUserPerms(db, userId);
    return res.json(perms);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};

export const addUserPermission: RequestHandler = async (req, res) => {
  try {
    const ctx = await ensureAdmin(req, res);
    if (!ctx) return;
    const db = ctx.db;
    const { userId, permission } = req.body as any;
    if (!userId || !permission) return res.status(400).json({ error: 'userId and permission required' });
    try {
      const { error } = await db.from('user_permissions').insert({ user_id: userId, permission });
      if (error) throw error;
    } catch (e: any) {
      if (isMissingTableOrColumn(e)) {
        try {
          await insertProfilePermissionFlexible(db, `user:${userId}`, permission);
        } catch (fbErr: any) {
          return res.status(400).json({ error: fbErr?.message || String(fbErr) });
        }
      } else {
        return res.status(400).json({ error: e?.message || String(e) });
      }
    }
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};

export const removeUserPermission: RequestHandler = async (req, res) => {
  try {
    const ctx = await ensureAdmin(req, res);
    if (!ctx) return;
    const db = ctx.db;
    const { userId, permission } = req.body as any;
    if (!userId || !permission) return res.status(400).json({ error: 'userId and permission required' });
    try {
      const { error } = await db.from('user_permissions').delete().eq('user_id', userId).eq('permission', permission);
      if (error) throw error;
    } catch (e: any) {
      if (isMissingTableOrColumn(e)) {
        try {
          await deleteProfilePermissionFlexible(db, `user:${userId}`, permission);
        } catch (fbErr: any) {
          return res.status(400).json({ error: fbErr?.message || String(fbErr) });
        }
      } else {
        return res.status(400).json({ error: e?.message || String(e) });
      }
    }
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};

// ------------------------- User overrides (grant/revoke) -------------------------

type UserOverride = { permission_name?: string; permission_id?: number | string; action: 'grant' | 'revoke' };

async function selectUserOverridesFlexible(db: any, userId: string): Promise<UserOverride[]> {
  const trySelects = [
    async () => db.from('user_permission_overrides').select('permission_name, action').eq('user_id', userId),
    async () => db.from('user_permission_overrides').select('permission, action').eq('user_id', userId),
    async () => db.from('user_overrides').select('permission_name, action').eq('user_id', userId),
    async () => db.from('user_overrides').select('permission, action').eq('user_id', userId),
  ];
  for (const fn of trySelects) {
    try {
      const { data, error } = await fn();
      if (!error && Array.isArray(data)) {
        return (data as any[]).map((r: any) => {
          const action: 'grant' | 'revoke' = ((r.action || '').toLowerCase() === 'revoke' ? 'revoke' : 'grant');
          return {
            permission_name: r.permission_name || r.permission,
            action,
          } as UserOverride;
        }).filter((r) => r.permission_name);
      }
    } catch {}
  }
  try {
    const perms = await getUserPerms(db, userId);
    return perms.map((p: string) => ({ permission_name: p, action: 'grant' as const }));
  } catch {
    return [];
  }
}

async function replaceUserOverridesFlexible(db: any, userId: string, overrides: UserOverride[]): Promise<{ ok: boolean; fallback?: boolean; message?: string }>{
  // Try to resolve permission IDs if provided or resolvable by name
  const resolvedIds: (string | null)[] = [];
  for (const o of overrides) {
    const rawId = (o as any)?.permission_id;
    if (typeof rawId !== 'undefined' && rawId !== null && String(rawId).trim() !== '') {
      resolvedIds.push(String(rawId));
      continue;
    }
    const name = (o as any)?.permission_name;
    if (typeof name === 'string' && name.trim() !== '') {
      try {
        const id = await findPermissionId(db, name);
        resolvedIds.push(id ? String(id) : null);
      } catch {
        resolvedIds.push(null);
      }
    } else {
      resolvedIds.push(null);
    }
  }
  const allHaveIds = resolvedIds.every((v) => v && v !== null);

  const rowsId = overrides.map((o, i) => ({ user_id: userId, permission_id: resolvedIds[i], action: o.action }));
  const rowsA = overrides.map((o) => ({ user_id: userId, permission_name: (o as any).permission_name, action: o.action }));
  const rowsB = overrides.map((o) => ({ user_id: userId, permission: (o as any).permission_name, action: o.action }));

  const attempts: Array<() => Promise<void>> = [];
  if (allHaveIds) {
    attempts.push(async () => {
      await db.from('user_permission_overrides').delete().eq('user_id', userId);
      const { error } = await db.from('user_permission_overrides').insert(rowsId as any);
      if (error) throw error;
    });
  }
  attempts.push(
    async () => {
      await db.from('user_permission_overrides').delete().eq('user_id', userId);
      const { error } = await db.from('user_permission_overrides').insert(rowsA as any);
      if (error) throw error;
    },
    async () => {
      await db.from('user_permission_overrides').delete().eq('user_id', userId);
      const { error } = await db.from('user_permission_overrides').insert(rowsB as any);
      if (error) throw error;
    },
    async () => {
      await db.from('user_overrides').delete().eq('user_id', userId);
      const { error } = await db.from('user_overrides').insert(rowsA as any);
      if (error) throw error;
    },
    async () => {
      await db.from('user_overrides').delete().eq('user_id', userId);
      const { error } = await db.from('user_overrides').insert(rowsB as any);
      if (error) throw error;
    },
  );

  for (const fn of attempts) {
    try { await fn(); return { ok: true }; } catch {}
  }

  try {
    const grants = overrides.filter((o) => o.action === 'grant').map((o) => (o as any).permission_name).filter(Boolean);
    const revokes = overrides.filter((o) => o.action === 'revoke').map((o) => (o as any).permission_name).filter(Boolean);
    for (const p of grants) {
      try { await db.from('user_permissions').insert({ user_id: userId, permission: p } as any); } catch (e: any) {
        if (isMissingTableOrColumn(e)) { await insertProfilePermissionFlexible(db, `user:${userId}`, p); }
      }
    }
    for (const p of revokes) {
      try { await db.from('user_permissions').delete().eq('user_id', userId).eq('permission', p); } catch (e: any) {
        if (isMissingTableOrColumn(e)) { await deleteProfilePermissionFlexible(db, `user:${userId}`, p); }
      }
    }
    return { ok: true, fallback: true, message: 'Revogações podem not be fully applied without user_permission_overrides.' };
  } catch (e: any) {
    return { ok: false, message: e?.message || String(e) };
  }
}

export const getUserOverrides: RequestHandler = async (req, res) => {
  try {
    const ctx = await ensureAdmin(req, res);
    if (!ctx) return;
    const db = ctx.db;
    const userId = String(req.params.userId || '').trim();
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const list = await selectUserOverridesFlexible(db, userId);
    return res.json(list);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};

export const saveUserOverrides: RequestHandler = async (req, res) => {
  if ((req.method || '').toUpperCase() !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }
  try {
    const url = sanitizeEnv(process.env.SUPABASE_URL || (process.env as any).VITE_SUPABASE_URL);
    const serviceKey = sanitizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const supabaseAdmin = createClient(url, serviceKey);

    const auth = String(req.headers.authorization || '');
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    if (!token) return res.status(401).json({ error: 'Não autorizado.' });

    const { data: userData } = await (supabaseAdmin as any).auth.getUser(token);
    const user = (userData as any)?.user || null;
    if (!user) return res.status(401).json({ error: 'Token inválido.' });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('perfil')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.perfil !== 'administrador') {
      return res.status(403).json({ error: 'Acesso proibido.' });
    }

    const userId = String(req.params.userId || (req.query as any)?.userId || '').trim();
    const overrides = Array.isArray((req.body as any)?.overrides) ? (req.body as any).overrides : null;
    if (!userId || !Array.isArray(overrides)) {
      return res.status(400).json({ error: 'Dados de entrada inválidos.' });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('user_permission_overrides')
      .delete()
      .eq('user_id', userId);
    if (deleteError) {
      console.error('Erro ao deletar permissões antigas:', deleteError);
      throw deleteError;
    }

    if (overrides.length > 0) {
      const rows: any[] = [];
      for (const o of overrides as any[]) {
        let pid = (o as any).permission_id ?? null;
        if (!pid) {
          const pname = (o as any).permission_name || (o as any).permission;
          if (typeof pname === 'string' && pname.trim() !== '') {
            try {
              const rid = await findPermissionId(supabaseAdmin, pname);
              if (rid) pid = rid;
            } catch {}
          }
        }
        if (!pid) {
          throw new Error(`permission_id ausente e não resolvível para '${(o as any).permission_name || (o as any).permission || ''}'`);
        }
        rows.push({ user_id: userId, permission_id: pid, action: (o as any).action });
      }

      const { error: insertError } = await supabaseAdmin
        .from('user_permission_overrides')
        .insert(rows as any);
      if (insertError) {
        console.error('Erro ao inserir novas permissões:', insertError);
        throw insertError;
      }
    }

    return res.status(200).json({ message: 'Permissões do usuário atualizadas com sucesso!' });
  } catch (error: any) {
    console.error('ERRO REAL DO SUPABASE:', error);
    return res.status(500).json({ error: 'Erro ao salvar no banco de dados: ' + (error?.message || String(error)) });
  }
};

// ------------------------- Users update -------------------------

export const updateUserProfile: RequestHandler = async (req, res) => {
  try {
    const ctx = await ensureAdmin(req, res);
    if (!ctx) return;
    const admin = ctx.admin;
    const db = ctx.db;

    const userId = String((req.params as any)?.userId || (req.params as any)?.id || '').trim();
    if (!userId) return res.status(400).json({ error: 'userId path param required' });

    const body = req.body as any;
    const patch: any = {};
    if (typeof body?.nome === 'string') patch.nome = body.nome;
    if (typeof body?.perfil === 'string') patch.perfil = body.perfil;
    if (typeof body?.ativo === 'boolean') patch.ativo = body.ativo;

    if (Object.keys(patch).length === 0 && typeof body?.email !== 'string') {
      return res.status(400).json({ error: 'Nada para atualizar.' });
    }

    if (Object.keys(patch).length > 0) {
      const { error: updErr } = await db.from('profiles').update(patch).eq('id', userId);
      if (updErr) return res.status(400).json({ error: updErr.message || String(updErr) });
    }

    if (typeof body?.email === 'string' && admin) {
      try {
        // @ts-ignore supabase admin typings in this environment
        const { error: uErr } = await (admin.auth as any).admin.updateUserById(userId, { email: body.email });
        if (uErr) {
          console.warn('Falha ao atualizar e-mail do auth user:', uErr);
        }
      } catch (e) {
        console.warn('Exceção ao atualizar e-mail do auth user:', e);
      }
    }

    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};

// ------------------------- Import employees (CSV) -------------------------

function parseCsvToObjects(csvText: string) {
  const rows: string[][] = [];
  let cur = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      row.push(cur);
      cur = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (cur !== '' || row.length > 0) {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = '';
      }
      if (ch === '\r' && next === '\n') i++;
    } else {
      cur += ch;
    }
  }
  if (cur !== '' || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  const objs: any[] = [];
  for (let r = 1; r < rows.length; r++) {
    const values = rows[r];
    if (values.length === 1 && values[0].trim() === '') continue;
    const obj: any = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = (values[c] ?? '').trim();
    }
    objs.push(obj);
  }
  return objs;
}

export const importEmployees: RequestHandler = async (req, res) => {
  try {
    const ctx = await ensureAdmin(req, res);
    if (!ctx) return;
    const db = ctx.db;

    const body = req.body as any;
    const csv = body?.csv as string | undefined;
    if (!csv) return res.status(400).json({ error: 'csv required in body (as text)' });

    const objs = parseCsvToObjects(csv);
    if (!Array.isArray(objs)) return res.status(400).json({ error: 'Invalid CSV' });
    if (objs.length === 0) return res.json({ inserted: 0, updated: 0, errors: 0, details: [] });

    const details: any[] = [];
    const toUpsert: any[] = [];
    const matriculas = new Set<string>();
    for (const row of objs) {
      const matricula = (row['matricula'] ?? row['matrícula'] ?? '').trim();
      if (!matricula) {
        details.push({ row, error: 'matricula missing' });
        continue;
      }
      const nome_completo = (row['nome_completo'] ?? row['nome'] ?? '').trim();
      const cargo = (row['cargo'] ?? '').trim() || null;
      const setor = (row['setor'] ?? '').trim() || null;
      const gestor_id = (row['gestor_id'] ?? '').trim() || null;
      toUpsert.push({ matricula, nome_completo, cargo, setor, gestor_id });
      matriculas.add(matricula);
    }

    const { data: existing } = await db.from('employees').select('matricula').in('matricula', Array.from(matriculas) as any);
    const existingSet = new Set((existing || []).map((e: any) => e.matricula));

    const inserted = toUpsert.filter((t) => !existingSet.has(t.matricula)).length;
    const updated = toUpsert.filter((t) => existingSet.has(t.matricula)).length;

    const { error: upsertErr } = await db.from('employees').upsert(toUpsert as any, { onConflict: 'matricula' });
    if (upsertErr) {
      return res.status(500).json({ error: upsertErr.message || String(upsertErr) });
    }

    return res.json({ inserted, updated, errors: details.length, details });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};
