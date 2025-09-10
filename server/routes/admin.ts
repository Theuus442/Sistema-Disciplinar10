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
    const id = setTimeout(() => controller.abort(new Error("fetch timeout")), init?.timeout ?? defaultMs);
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
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    global: { fetch: createFetchWithTimeout(8000) } as any,
  });
}

function getAnonClientWithToken(token: string) {
  const url = sanitizeEnv(process.env.SUPABASE_URL || (process.env as any).VITE_SUPABASE_URL);
  const anon = sanitizeEnv((process.env as any).SUPABASE_ANON_KEY || (process.env as any).VITE_SUPABASE_ANON_KEY);
  if (!url || !anon) return null as any;
  return createClient(url, anon, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` }, fetch: createFetchWithTimeout(7000) } as any,
  });
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
    // Decode JWT localmente para evitar chamada de rede
    let userId: string | null = null;
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
        userId = payload?.sub ?? null;
      }
    } catch {}
    if (!userId) {
      const { data: userData } = await userClient.auth.getUser();
      userId = (userData?.user as any)?.id ?? null;
    }
    if (!userId) {
      res.status(401).json({ error: "Token inválido." });
      return null;
    }
    // Verifica perfil usando o token do usuário (sem exigir service role)
    const { data: profile, error: profErr } = await userClient
      .from("profiles")
      .select("id,perfil")
      .eq("id", userId)
      .maybeSingle();
    if (profErr) {
      res.status(400).json({ error: profErr.message });
      return null;
    }
    if ((profile?.perfil ?? "").toLowerCase() !== "administrador") {
      res.status(403).json({ error: "Acesso proibido: somente administradores." });
      return null;
    }

    // Tenta cliente elevado; se ausente, usa o client do usuário (respeitando RLS)
    const admin = getAdminClient();
    const db = admin ?? userClient;
    return { admin, db, userId };
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
    return null;
  }
}

export const listProfiles: RequestHandler = async (_req, res) => {
  try {
    const ctx = await ensureAdmin(_req, res);
    if (!ctx) return;
    const db = ctx.db;

    const { data, error } = await db.from("profiles").select("*");
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

    // Funcionários relacionados
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
        criadoEm: p.created_at ?? new Date().toISOString(),
        ultimoAcesso: p.ultimoAcesso ?? null,
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
