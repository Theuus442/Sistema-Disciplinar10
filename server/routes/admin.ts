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
    const admin = getAdminClient();
    if (!admin) {
      res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY ausente no servidor" });
      return null;
    }
    const { data: profile, error: profErr } = await admin.from("profiles").select("id,perfil").eq("id", userId).maybeSingle();
    if (profErr) {
      res.status(400).json({ error: profErr.message });
      return null;
    }
    if ((profile?.perfil ?? "").toLowerCase() !== "administrador") {
      res.status(403).json({ error: "Acesso proibido: somente administradores." });
      return null;
    }
    return { admin, userId };
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
    return null;
  }
}

export const listProfiles: RequestHandler = async (_req, res) => {
  try {
    const ctx = await ensureAdmin(_req, res);
    if (!ctx) return;
    const admin = ctx.admin;

    const { data, error } = await admin.from("profiles").select("*");
    if (error) return res.status(400).json({ error: error.message });

    const rows = Array.isArray(data) ? data : [];

    // Mapa de nomes para lookup rápido (gestor)
    const profileNameById = new Map<string, string>();
    for (const p of rows as any[]) {
      if (p?.id) profileNameById.set(p.id, p?.nome ?? "");
    }

    // Evitar chamadas ao auth.admin.listUsers (causa timeouts). Usar apenas profiles/email.

    // Funcionários relacionados
    const funcionarioIds = rows
      .filter((p: any) => (p?.perfil ?? "funcionario") === "funcionario")
      .map((p: any) => p.id);
    let employeesById = new Map<string, any>();
    if (funcionarioIds.length > 0) {
      const { data: employeesData } = await admin.from("employees").select("*").in("id", funcionarioIds as any);
      for (const e of employeesData || []) {
        employeesById.set((e as any).id, e);
      }
    }

    const normalized = rows.map((p: any) => {
      const emp = employeesById.get(p.id) || null;
      return {
        id: p.id,
        nome: p.nome ?? "",
        email: p.email ?? "",
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
    const admin = ctx.admin;

    // Evitar chamadas ao auth.admin.listUsers (pode manter conexões abertas). Usar apenas profiles recentes.
    const { data: profs, error } = await admin
      .from("profiles")
      .select("id,nome,email,created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) return res.status(400).json({ error: error.message });
    const list = (profs || []).map((p: any) => ({
      id: p.id,
      email: p.email ?? "",
      nome: p.nome ?? "",
      lastSignInAt: p.created_at ?? null,
    }));
    return res.json(list);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};

export const listRecentActivities: RequestHandler = async (_req, res) => {
  try {
    const ctx = await ensureAdmin(_req, res);
    if (!ctx) return;
    const admin = ctx.admin;

    // Limitar consultas para evitar payloads grandes
    const { data: processes, error: procErr } = await admin
      .from("processes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (procErr) return res.status(400).json({ error: procErr.message });
    const procs = Array.isArray(processes) ? processes : [];

    const employeeIds = Array.from(new Set(procs.map((p: any) => p.employee_id).filter(Boolean)));
    const employeesById = new Map<string, any>();
    if (employeeIds.length) {
      const { data: employees } = await admin.from("employees").select("*").in("id", employeeIds as any);
      for (const e of employees || []) employeesById.set((e as any).id, e);
    }

    const procActivities = procs
      .map((p: any) => {
        const at = p?.created_at ?? p?.data_ocorrencia ?? p?.createdAt ?? p?.dataOcorrencia ?? null;
        if (!at) return null;
        const emp = employeesById.get(p.employee_id);
        const nome = emp?.nome_completo ?? "Funcionário";
        const tipo = p.tipo_desvio ?? "Processo";
        return {
          id: `process:${p.id}`,
          descricao: `Abertura de processo (${tipo}) para ${nome}`,
          at: at as string,
        };
      })
      .filter(Boolean) as any[];

    // Users criados recentemente
    const { data: recentProfiles } = await admin
      .from("profiles")
      .select("id,nome,created_at,email")
      .order("created_at", { ascending: false })
      .limit(30);
    const userActivities = (recentProfiles || []).map((p: any) => ({
      id: `user:${p.id}`,
      descricao: `Cadastro de usuário ${p.nome || p.email || p.id}`,
      at: p.created_at as string,
    }));

    const all = [...procActivities, ...userActivities]
      .filter((a) => !!a.at)
      .sort((a, b) => new Date(b.at as any).getTime() - new Date(a.at as any).getTime())
      .slice(0, 15);

    return res.json(all);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};
