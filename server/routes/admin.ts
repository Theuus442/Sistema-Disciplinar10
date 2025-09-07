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
    const { data, error } = await admin
      .from("profiles")
      .select("id, nome, email, perfil, ativo, created_at");
    if (error) return res.status(400).json({ error: error.message });
    return res.json(data || []);
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
      email,
      perfil,
      ativo,
    } as any);
    if (profileErr) return res.status(400).json({ error: profileErr.message });

    return res.json({ id: user.id, nome, email, perfil, ativo, criadoEm: new Date().toISOString() });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};
