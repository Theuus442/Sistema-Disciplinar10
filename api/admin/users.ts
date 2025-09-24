import { createClient } from '@supabase/supabase-js';

function sanitizeEnv(v?: string | null) {
  if (!v) return undefined as any;
  const t = v.trim().replace(/^['"]|['"]$/g, "");
  if (!t || t.toLowerCase() === 'undefined' || t.toLowerCase() === 'null') return undefined as any;
  return t;
}

function createFetchWithTimeout(defaultMs = 7000) {
  return async (input: any, init?: any) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), init?.timeout ?? defaultMs);
    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      return res as any;
    } finally {
      clearTimeout(id);
    }
  };
}

function getAdminClient() {
  const url = sanitizeEnv(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
  const serviceKey = sanitizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !serviceKey) return null;
  try {
    return createClient(url, serviceKey, { auth: { persistSession: false }, global: { fetch: createFetchWithTimeout(8000) } as any });
  } catch (e) {
    return null as any;
  }
}

function getAnonClientWithToken(token: string) {
  const url = sanitizeEnv(process.env.SUPABASE_URL || (process.env as any).VITE_SUPABASE_URL);
  const anon = sanitizeEnv((process.env as any).SUPABASE_ANON_KEY || (process.env as any).VITE_SUPABASE_ANON_KEY);
  if (!url || !anon) return null as any;
  try {
    return createClient(url, anon, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` }, fetch: createFetchWithTimeout(7000) } as any,
    });
  } catch (e) {
    return null as any;
  }
}

async function ensureAdmin(req: any, res: any) {
  const auth = (req.headers?.authorization as string) || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  if (!token) {
    res.status(401).json({ error: 'Não autorizado: token não fornecido.' });
    return null;
  }
  const userClient = getAnonClientWithToken(token);
  if (!userClient) {
    res.status(500).json({ error: 'Configuração Supabase ausente (URL/ANON).' });
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
  } catch (e) {
    res.status(401).json({ error: 'Token inválido ou problema na autenticação.' });
    return null;
  }
  if (!userId) {
    res.status(401).json({ error: 'Token inválido.' });
    return null;
  }

  let profile: any = null;
  try {
    const profResp = await userClient.from('profiles').select('id,perfil,nome,email').eq('id', userId).maybeSingle();
    if ((profResp as any)?.error) {
      res.status(401).json({ error: 'Token inválido ou sem permissão para acessar perfil.' });
      return null;
    }
    profile = (profResp as any).data ?? profResp;
  } catch (e) {
    res.status(401).json({ error: 'Token inválido ou sem permissão para acessar perfil.' });
    return null;
  }
  const perfilLower = (profile?.perfil ?? '').toLowerCase();
  if (perfilLower !== 'administrador') {
    res.status(403).json({ error: 'Acesso proibido: somente administradores.' });
    return null;
  }

  const admin = getAdminClient();
  const db = admin ?? userClient;
  return { admin, db, userId };
}

async function handleGet(req: any, res: any) {
  const ctx = await ensureAdmin(req, res);
  if (!ctx) return;
  const db = ctx.db;

  const { data, error } = await db.from('profiles').select('*');
  if (error) return res.status(400).json({ error: error.message });
  const rows = Array.isArray(data) ? data : [];

  const profileNameById = new Map<string, string>();
  for (const p of rows as any[]) if (p?.id) profileNameById.set(p.id, p?.nome ?? '');

  const emailById = new Map<string, string>();
  if (ctx.admin) {
    try {
      const { data: usersPage } = await ctx.admin.auth.admin.listUsers({ page: 1, perPage: 200 } as any);
      const users = (usersPage as any)?.users || [];
      for (const u of users) if (u?.id && u?.email) emailById.set(u.id, u.email);
    } catch {}
  }

  const funcionarioIds = rows
    .filter((p: any) => (p?.perfil ?? 'funcionario') === 'funcionario')
    .map((p: any) => p.id);
  let employeesById = new Map<string, any>();
  if (funcionarioIds.length > 0) {
    const { data: employees } = await db.from('employees').select('*').in('id', funcionarioIds as any);
    for (const e of employees || []) employeesById.set((e as any).id, e);
  }

  const normalized = rows.map((p: any) => {
    const emp = employeesById.get(p.id) || null;
    return {
      id: p.id,
      nome: p.nome ?? '',
      email: p.email ?? emailById.get(p.id) ?? '',
      perfil: p.perfil ?? 'funcionario',
      ativo: p.ativo ?? true,
      criadoEm: p.created_at ?? p.createdAt ?? new Date().toISOString(),
      ultimoAcesso: p.ultimo_acesso ?? p.ultimoAcesso ?? p.updated_at ?? p.updatedAt ?? null,
      funcionario: emp
        ? {
            nomeCompleto: emp.nome_completo ?? '',
            matricula: emp.matricula ?? '',
            cargo: emp.cargo ?? '',
            setor: emp.setor ?? '',
            gestorDiretoId: emp.gestor_id ?? null,
            gestorDiretoNome: emp.gestor_id ? profileNameById.get(emp.gestor_id) ?? '' : '',
          }
        : null,
    };
  });

  return res.json(normalized);
}

async function handlePost(req: any, res: any) {
  const { nome, email, password, perfil, ativo, employee } = req.body as any;
  if (!nome || !email || !password || !perfil) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, email, password, perfil' });
  }
  const ctx = await ensureAdmin(req, res);
  if (!ctx) return;
  const admin = ctx.admin;
  if (!admin) return res.status(501).json({ error: 'Operação administrativa requer SUPABASE_SERVICE_ROLE_KEY no servidor' });

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome, perfil, ativo },
  });
  if (createErr) return res.status(400).json({ error: createErr.message });

  const user = (created as any).user;
  if (!user) return res.status(500).json({ error: 'Falha ao criar usuário' });

  const { error: profileErr } = await admin.from('profiles').insert({ id: user.id, nome, perfil, ativo } as any);
  if (profileErr) return res.status(400).json({ error: profileErr.message });

  if (perfil === 'funcionario') {
    const empPayload: any = {
      id: user.id,
      nome_completo: (employee?.nomeCompleto ?? nome) || nome,
      matricula: employee?.matricula ?? null,
      cargo: employee?.cargo ?? null,
      setor: employee?.setor ?? null,
      gestor_id: employee?.gestorId ?? null,
    };
    const { error: empErr } = await admin.from('employees').insert(empPayload as any);
    if (empErr) return res.status(400).json({ error: empErr.message });
  }

  return res.json({ id: user.id, nome, email, perfil, ativo, criadoEm: new Date().toISOString() });
}

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handlePost(req, res);
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method Not Allowed' });
}
