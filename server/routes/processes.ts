import type { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export const listProcesses: RequestHandler = async (_req, res) => {
  try {
    const admin = getAdminClient();
    if (!admin) return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY ausente no servidor" });

    const { data: processes, error: procErr } = await admin.from("processes").select("*");
    if (procErr) return res.status(400).json({ error: procErr.message });
    const procs = Array.isArray(processes) ? processes : [];

    const employeeIds = Array.from(new Set(procs.map((p: any) => p.employee_id).filter(Boolean)));
    const employeesById = new Map<string, any>();
    if (employeeIds.length) {
      const { data: employees } = await admin.from("employees").select("*").in("id", employeeIds as any);
      for (const e of employees || []) employeesById.set((e as any).id, e);
    }

    function normalizeClassificacao(c?: string | null) {
      if (!c) return "Leve";
      return c === "Media" ? "Média" : c;
    }
    function normalizeStatus(s?: string | null) {
      if (!s) return "Em Análise" as any;
      if (s === "Em_Analise") return "Em Análise" as any;
      return (s.replace(/_/g, " ") as any);
    }

    const items = procs.map((p: any) => {
      const emp = employeesById.get(p.employee_id);
      const funcionario = emp?.nome_completo ?? emp?.matricula ?? "";
      const d = p.created_at ?? p.data_ocorrencia ?? p.createdAt ?? p.dataOcorrencia;
      const dataAbertura = d ? new Date(d).toLocaleDateString() : "";
      return {
        id: p.id,
        funcionario,
        tipoDesvio: p.tipo_desvio ?? "",
        classificacao: normalizeClassificacao(p.classificacao),
        dataAbertura,
        status: normalizeStatus(p.status),
      };
    });

    return res.json(items);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};
