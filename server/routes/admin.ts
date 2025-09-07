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

    // Select all columns to avoid projection errors if some optional columns don't exist
    const { data, error } = await admin.from("profiles").select("*");
    if (error) return res.status(400).json({ error: error.message });

    const rows = Array.isArray(data) ? data : [];

    // Fetch emails from auth.users to guarantee the real email (in case profiles.email is missing)
    const emailMap = new Map<string, string>();
    try {
      let page = 1;
      const perPage = 1000;
      // Loop through all pages to build a complete map of user.id -> email
      // If listUsers fails for any reason, we gracefully fallback to profiles.email
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data: usersData, error: usersErr } = await admin.auth.admin.listUsers({ page, perPage } as any);
        if (usersErr) break;
        const users = usersData?.users ?? [];
        for (const u of users) {
          if (u && (u as any).id && (u as any).email) {
            emailMap.set((u as any).id, (u as any).email);
          }
        }
        if (users.length < perPage) break;
        page += 1;
      }
    } catch {}

    const normalized = rows.map((p: any) => ({
      id: p.id,
      nome: p.nome ?? "",
      email: (p.email ?? emailMap.get(p.id) ?? ""),
      perfil: p.perfil ?? "funcionario",
      ativo: p.ativo ?? true,
      criadoEm: p.created_at ?? new Date().toISOString(),
      ultimoAcesso: p.ultimoAcesso ?? null,
    }));

    return res.json(normalized);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};

export const createUserAndProfile: RequestHandler = async (req, res) => {
  try {
    const { nome, email, password, perfil, ativo } = req.body as {
      nome: string;
      email: string;
      password: string;
      perfil: "administrador" | "gestor" | "juridico" | "funcionario";
      ativo: boolean;
    };

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

    return res.json({ id: user.id, nome, email, perfil, ativo, criadoEm: new Date().toISOString() });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};
