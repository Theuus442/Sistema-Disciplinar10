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

    console.info('ensureAdmin: received authorization header?', !!auth, 'headerLength', auth?.length ?? 0);
    if (!token) {
      console.warn('ensureAdmin: no token provided');
      res.status(401).json({ error: "Não autorizado: token não fornecido." });
      return null;
    }

    const masked = token && token.length > 16 ? `${token.slice(0,8)}...${token.slice(-8)}` : token;
    console.info('ensureAdmin: token masked preview=', masked, 'tokenLength=', token.length);

    const userClient = getAnonClientWithToken(token);
    if (!userClient) {
      console.error('ensureAdmin: failed to create anon client with provided token');
      res.status(500).json({ error: "Configuração Supabase ausente (URL/ANON)." });
      return null;
    }
    console.info('ensureAdmin: userClient created successfully');

    // Decode JWT localmente to get possible user id without network call
    let userId: string | null = null;
    let decodedPayload: any = null;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        decodedPayload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        userId = decodedPayload?.sub ?? null;
        console.info('ensureAdmin: decoded JWT payload', decodedPayload);
      }
    } catch (err) {
      console.warn('ensureAdmin: failed to decode JWT locally', err);
    }

    if (!userId) {
      try {
        const { data: userData, error: getUserErr } = await userClient.auth.getUser();
        if (getUserErr) {
          console.error('ensureAdmin: userClient.auth.getUser returned error', getUserErr);
          res.status(401).json({ error: 'Token inválido ou problema na autenticação.' });
          return null;
        }
        console.info('ensureAdmin: auth.getUser result', { userData });
        userId = (userData?.user as any)?.id ?? null;
      } catch (e: any) {
        console.error('ensureAdmin: auth.getUser failed', e?.stack || e?.message || e);
        res.status(401).json({ error: 'Token inválido ou problema na autenticação.' });
        return null;
      }
    }

    if (!userId) {
      console.error('ensureAdmin: could not determine userId from token or auth.getUser');
      res.status(401).json({ error: "Token inválido." });
      return null;
    }

    console.info('ensureAdmin: resolved userId=', userId);

    // Verify profile using the user token (no service role required for this check)
    let profile: any = null;
    try {
      const profResp = await userClient.from('profiles').select('id,perfil,nome,email').eq('id', userId).maybeSingle();
      console.info('ensureAdmin: profiles select response', profResp);

      if (profResp && (profResp as any).error) {
        console.error('ensureAdmin: profiles select returned error', (profResp as any).error);
        res.status(401).json({ error: 'Token inválido ou sem permissão para acessar perfil.' });
        return null;
      }

      profile = (profResp as any).data ?? profResp;
      console.info('ensureAdmin: profile found for userId', userId, profile);
    } catch (e: any) {
      console.error('ensureAdmin: profiles select failed', e?.stack || e?.message || e);
      res.status(401).json({ error: 'Token inválido ou sem permissão para acessar perfil.' });
      return null;
    }

    const perfilLower = (profile?.perfil ?? '').toLowerCase();
    console.info('ensureAdmin: profile.perfil (normalized)=', perfilLower);
    if (perfilLower !== 'administrador') {
      console.warn('ensureAdmin: access denied - not an administrador');
      res.status(403).json({ error: "Acesso proibido: somente administradores." });
      return null;
    }

    // Try elevated client; fall back to userClient if service role is not configured
    const admin = getAdminClient();
    if (admin) console.info('ensureAdmin: admin client available (service role)');
    else console.info('ensureAdmin: admin client NOT available, will use user client (respecting RLS)');

    const db = admin ?? userClient;
    return { admin, db, userId };
  } catch (e: any) {
    console.error('ensureAdmin error', e?.stack || e?.message || e);
    res.status(500).json({ error: e?.message || String(e) });
    return null;
  }
}

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

    // Mapa de nomes para lookup rápido (gestor)
    const profileNameById = new Map<string, string>();
    for (const p of rows as any[]) {
      if (p?.id) profileNameById.set(p.id, p?.nome ?? "");
    }

    // Mapear emails via admin, se disponível; caso contrário, depender de profiles.email
    const emailById = new Map<string, string>();
    if (ctx.admin) {
      try {
        const { data: usersPage } = await ctx.admin.auth.admin.listUsers({ page: 1, perPage: 200 } as any);
        const users = (usersPage as any)?.users || [];
        for (const u of users) if (u?.id && u?.email) emailById.set(u.id, u.email);
      } catch {}
    }

    // Funcion��rios relacionados
    const funcionarioIds = rows
      .filter((p: any) => (p?.perfil ?? "funcionario") === "funcionario")
      .map((p: any) => p.id);
    let employeesById = new Map<string, any>();
    if (funcionarioIds.length > 0) {
      const { data: employeesData } = await db.from("employees").select("*").in("id", funcionarioIds as any);
      for (const e of employeesData || []) {
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
    console.error('/api/admin/users error', e?.stack || e?.message || e);
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

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
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

    // Buscar perfis recententes e, se possível, enriquecer com last_sign_in_at via admin
    const { data: profs, error } = await db.from("profiles").select("*").limit(100);
    if (error) return res.status(400).json({ error: error.message });

    let lastById = new Map<string, string | null>();
    if (ctx.admin) {
      try {
        const { data: usersResp } = await ctx.admin.auth.admin.listUsers({ page: 1, perPage: 200 } as any);
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

    // Limitar consultas para evitar payloads grandes
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
          p?.created_at || p?.data_ocorrencia || p?.updated_at ||
          p?.createdAt || p?.dataOcorrencia || p?.updatedAt || new Date().toISOString();
        const emp = employeesById.get(p.employee_id);
        const nome = emp?.nome_completo ?? "Funcionário";
        const tipo = p.tipo_desvio ?? "Processo";
        return {
          id: `process:${p.id}`,
          descricao: `Abertura de processo (${tipo}) para ${nome}`,
          at: String(at),
        };
      });

    // Usuários criados/atualizados recentemente (flexível a diferentes colunas)
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

    // Tenta ler da tabela permissions; se não existir, retorna lista padrão
    try {
      const { data, error } = await db.from('permissions').select('permission, description');
      if (!error && Array.isArray(data) && data.length > 0) {
        return res.json((data as any).map((d: any) => d.permission));
      }
    } catch (e) {
      // ignore - tabela pode não existir
    }

    // Lista padrão
    return res.json([
      'process:criar',
      'process:ver',
      'process:finalizar',
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
      const { data, error } = await db.from('profile_permissions').select('*');
      if (error) return res.status(400).json({ error: error.message });
      const rows = Array.isArray(data) ? data : [];
      // Agrupar por perfil
      const byProfile: Record<string, string[]> = {};
      for (const r of rows as any[]) {
        const p = r.perfil || 'unknown';
        byProfile[p] = byProfile[p] || [];
        byProfile[p].push(r.permission);
      }
      return res.json(byProfile);
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
      const { error } = await db.from('profile_permissions').insert({ perfil, permission });
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || String(e) });
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
      const { error } = await db.from('profile_permissions').delete().eq('perfil', perfil).eq('permission', permission);
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || String(e) });
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};

// ------------------------- Import employees (CSV) -------------------------

function parseCsvToObjects(csvText: string) {
  // Very small CSV parser handling quoted fields and commas
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
        i++; // skip escaped quote
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
      // handle CRLF
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
    if (values.length === 1 && values[0].trim() === '') continue; // skip empty line
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

    // Expect JSON payload: { csv: '...' }
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

    // Query existing by matricula
    const { data: existing, error: existErr } = await db.from('employees').select('matricula').in('matricula', Array.from(matriculas) as any);
    if (existErr) {
      console.error('Error fetching existing employees', existErr);
    }
    const existingSet = new Set((existing || []).map((e: any) => e.matricula));

    const inserted = toUpsert.filter((t) => !existingSet.has(t.matricula)).length;
    const updated = toUpsert.filter((t) => existingSet.has(t.matricula)).length;

    // Perform upsert (on conflict matricula)
    const { error: upsertErr } = await db.from('employees').upsert(toUpsert as any, { onConflict: 'matricula' });
    if (upsertErr) {
      return res.status(500).json({ error: upsertErr.message || String(upsertErr) });
    }

    return res.json({ inserted, updated, errors: details.length, details });
  } catch (e: any) {
    console.error('importEmployees error', e?.stack || e?.message || e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
};
