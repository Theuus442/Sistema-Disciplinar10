import { supabase } from "./supabase";

export interface FuncionarioAPI {
  id: string;
  matricula?: string | null;
  nome_completo?: string | null;
  cargo?: string | null;
  setor?: string | null;
  gestor_id?: string | null;
}

export interface ProcessoAPI {
  id: string;
  employee_id: string;
  criado_por_user_id?: string;
  tipo_desvio?: string | null;
  classificacao?: string | null;
  descricao?: string | null;
  status?: string | null;
  juridico_responsavel_user_id?: string | null;
  resolucao?: string | null;
  si_occurrence_number?: string | null;
  created_at?: string | null;
}

export async function fetchEmployees() {
  const { data: employees, error: empErr } = await supabase.from("employees").select("*");
  if (empErr) throw empErr;

  const { data: processes } = await supabase
    .from("processes")
    .select(`
      id, employee_id, classificacao, resolucao, status, created_at, data_da_ocorrencia,
      misconduct_types ( name )
    `);
  const { data: profiles } = await supabase.from("profiles").select("*");

  const profilesMap = new Map<string, any>();
  profiles?.forEach((p) => profilesMap.set(p.id, p));

  const employeesMapped = (employees || []).map((e) => ({
    id: e.matricula ?? e.id,
    nomeCompleto: e.nome_completo ?? "",
    cargo: e.cargo ?? "",
    setor: e.setor ?? "",
    gestorDireto: profilesMap.get(e.gestor_id)?.nome ?? "",
    historico:
      (processes || [])
        .filter((pr) => pr.employee_id === e.id)
        .map((pr) => ({
          id: pr.id,
          dataOcorrencia: (() => { const d = pr.created_at ?? (pr as any).data_da_ocorrencia ?? pr.createdAt ?? (pr as any).dataOcorrencia; return d ? new Date(d).toLocaleDateString() : ""; })(),
          tipoDesvio: (pr as any)?.misconduct_types?.name ?? "",
          classificacao: pr.classificacao ? (pr.classificacao === "Media" ? "Média" : pr.classificacao) : ("Leve" as any),
          medidaAplicada: pr.resolucao ?? pr.descricao ?? "",
          status: pr.status ? (pr.status.replace(/_/g, " ") as any) : ("Em Análise" as any),
        })),
  }));

  return employeesMapped;
}

export async function fetchEmployeeById(matriculaOrId: string) {
  const { data: employees } = await supabase.from("employees").select("*").or(`matricula.eq.${matriculaOrId},id.eq.${matriculaOrId}`);
  const emp = employees?.[0];
  if (!emp) return undefined;
  const employeesMapped = await fetchEmployees();
  return employeesMapped.find((e) => e.id === (emp.matricula ?? emp.id));
}

export async function fetchProcesses() {
  // Read directly from Supabase to avoid serverless 500s
  const { data: processes } = await supabase
    .from("processes")
    .select(`
      id, status, classificacao, resolucao, created_at, data_da_ocorrencia,
      employees ( nome_completo ),
      misconduct_types ( name )
    `);
  return (processes || []).map((p: any) => ({
    id: p.id,
    funcionario: p.employees?.nome_completo ?? "",
    tipoDesvio: p.misconduct_types?.name ?? "",
    classificacao: p.classificacao ? (p.classificacao === "Media" ? "Média" : p.classificacao) : ("Leve" as any),
    dataAbertura: (() => { const d = p.created_at ?? (p as any).data_da_ocorrencia ?? p.createdAt ?? (p as any).dataOcorrencia; return d ? new Date(d).toLocaleDateString() : ""; })(),
    createdAt: (p.created_at ?? (p as any).data_da_ocorrencia ?? p.createdAt ?? (p as any).dataOcorrencia) ?? null,
    status: p.status ? p.status.replace(/_/g, " ") : ("Em Análise" as any),
    resolucao: p.resolucao ?? "",
  }));
}

export async function fetchProcessById(id: string) {
  const { data: processes } = await supabase
    .from("processes")
    .select(`
      id, status, classificacao, resolucao, created_at, data_da_ocorrencia,
      employees ( nome_completo ),
      misconduct_types ( name )
    `)
    .eq("id", id);
  if (!processes || processes.length === 0) return undefined;
  const p: any = processes[0];
  return {
    id: p.id,
    funcionario: p.employees?.nome_completo ?? "",
    tipoDesvio: p.misconduct_types?.name ?? "",
    classificacao: p.classificacao ? (p.classificacao === "Media" ? "Média" : p.classificacao) : ("Leve" as any),
    dataAbertura: (() => { const d = p.created_at ?? (p as any).data_da_ocorrencia ?? p.createdAt ?? (p as any).dataOcorrencia; return d ? new Date(d).toLocaleDateString() : ""; })(),
    createdAt: (p.created_at ?? (p as any).data_da_ocorrencia ?? p.createdAt ?? (p as any).dataOcorrencia) ?? null,
    status: p.status ? p.status.replace(/_/g, " ") : ("Em Análise" as any),
    resolucao: p.resolucao ?? "",
  };
}

export async function fetchUsers() {
  const { data: profiles } = await supabase.from("profiles").select("*");
  return (profiles || []).map((p) => ({
    id: p.id,
    nome: p.nome ?? "",
    email: p.email ?? ((p.nome ? p.nome.toLowerCase().replace(/\s+/g, ".") : "user") + "@empresa.com"),
    perfil: p.perfil ?? "funcionario",
    ativo: p.ativo ?? true,
    criadoEm: p.created_at ?? new Date().toISOString(),
    ultimoAcesso: null,
  }));
}

export type PerfilUsuario = "administrador" | "gestor" | "juridico" | "funcionario";
export async function updateProfile(id: string, patch: { nome?: string; perfil?: PerfilUsuario; ativo?: boolean }) {
  const { error } = await supabase.from("profiles").update(patch as any).eq("id", id);
  if (error) throw error;
}

export async function updateProcess(id: string, patch: Partial<ProcessoAPI>) {
  const normalizedStatus = typeof patch.status === "string" ? patch.status.replace(/_/g, " ") : undefined;
  if (normalizedStatus === "Finalizado") {
    const occ = (patch as any).si_occurrence_number ?? (patch as any).siOccurrenceNumber ?? null;
    if (!occ || String(occ).trim() === "") {
      throw new Error("Para finalizar, preencha o Número da Ocorrência no SI (si_occurrence_number).");
    }
  }
  const payload: any = { ...patch };
  if ((payload as any).siOccurrenceNumber && !payload.si_occurrence_number) {
    payload.si_occurrence_number = (payload as any).siOccurrenceNumber;
    delete payload.siOccurrenceNumber;
  }
  const { error } = await supabase.from("processes").update(payload).eq("id", id);
  if (error) throw error;
}

export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
