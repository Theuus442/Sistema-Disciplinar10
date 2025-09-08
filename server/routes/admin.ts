import type { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export const listProfiles: RequestHandler = async (_req, res) => {
  try {
    const admin = getAdminClient();
    if (!admin) return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY ausente no servidor" });

    const { data, error } = await admin.from("profiles").select("*");
    if (error) return res.status(400).json({ error: error.message });

    const rows = Array.isArray(data) ? data : [];

    // Build a quick map for profile name lookup (used for gestor nome)
    const profileNameById = new Map<string, string>();
    for (const p of rows as any[]) {
      if (p?.id) profileNameById.set(p.id, p?.nome ?? "");
    }

    // Fetch emails from auth.users to guarantee the real email (in case profiles.email is missing)
    const emailMap = new Map<string, string>();
    try {
      let page = 1;
      const perPage = 1000;
      while (true) {
        const { data: usersData, error: usersErr } = await admin.auth.admin.listUsers({ page, perPage } as any);
        if (usersErr) break;
        const users = usersData?.users ?? [];
        for (const u of users) {
          if (u && (u as any).id && (u as any).email) emailMap.set((u as any).id, (u as any).email);
        }
        if (users.length < perPage) break;
        page += 1;
      }
    } catch {}

    // Fetch employees for funcionario profiles and attach details
    const funcionarioIds = rows.filter((p: any) => (p?.perfil ?? "funcionario") === "funcionario").map((p: any) => p.id);
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
        email: (p.email ?? emailMap.get(p.id) ?? ""),
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

    const admin = getAdminClient();
    if (!admin) {
      return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY ausente no servidor" });
    }

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
    const admin = getAdminClient();
    if (!admin) return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY ausente no servidor" });

    const users: any[] = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage } as any);
      if (error) return res.status(400).json({ error: error.message });
      const batch = data?.users ?? [];
      users.push(...batch);
      if (batch.length < perPage) break;
      page += 1;
    }

    const ids = users.map((u: any) => u.id).filter(Boolean);
    let namesById = new Map<string, string>();
    if (ids.length) {
      const { data: profs } = await admin.from("profiles").select("id,nome").in("id", ids as any);
      for (const p of profs || []) namesById.set((p as any).id, (p as any).nome ?? "");
    }

    const list = users
      .map((u: any) => ({
        id: u.id,
        email: u.email ?? "",
        nome: namesById.get(u.id) ?? "",
        lastSignInAt: u.last_sign_in_at ?? u.updated_at ?? u.created_at ?? null,
      }))
      .filter((u) => !!u.lastSignInAt)
      .sort((a, b) => new Date(b.lastSignInAt as any).getTime() - new Date(a.lastSignInAt as any).getTime())
      .slice(0, 10);

    return res.json(list);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};

export const listRecentActivities: RequestHandler = async (_req, res) => {
  try {
    const admin = getAdminClient();
    if (!admin) return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY ausente no servidor" });

    // Processes -> activities
    const { data: processes, error: procErr } = await admin.from("processes").select("*");
    if (procErr) return res.status(400).json({ error: procErr.message });
    const procs = Array.isArray(processes) ? processes : [];

    const employeeIds = Array.from(new Set(procs.map((p: any) => p.employee_id).filter(Boolean)));
    const employeesById = new Map<string, any>();
    if (employeeIds.length) {
      const { data: employees } = await admin.from("employees").select("*").in("id", employeeIds as any);
      for (const e of employees || []) employeesById.set((e as any).id, e);
    }

    const procActivities = procs
      .filter((p: any) => !!p?.created_at)
      .map((p: any) => {
        const emp = employeesById.get(p.employee_id);
        const nome = emp?.nome_completo ?? "Funcionário";
        const tipo = p.tipo_desvio ?? "Processo";
        return {
          id: `process:${p.id}`,
          descricao: `Abertura de processo (${tipo}) para ${nome}`,
          at: p.created_at as string,
        };
      });

    // Users created -> activities
    const users: any[] = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage } as any);
      if (error) break;
      const batch = data?.users ?? [];
      users.push(...batch);
      if (batch.length < perPage) break;
      page += 1;
    }

    const userIds = users.map((u: any) => u.id).filter(Boolean);
    const namesById = new Map<string, string>();
    if (userIds.length) {
      const { data: profs } = await admin.from("profiles").select("id,nome").in("id", userIds as any);
      for (const p of profs || []) namesById.set((p as any).id, (p as any).nome ?? "");
    }

    const userActivities = users
      .filter((u: any) => !!u?.created_at)
      .map((u: any) => ({
        id: `user:${u.id}`,
        descricao: `Cadastro de usuário ${namesById.get(u.id) || u.email || u.id}`,
        at: u.created_at as string,
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
