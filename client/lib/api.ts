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
  created_at?: string | null;
}

export async function fetchEmployees() {
  const { data: employees, error: empErr } = await supabase.from("employees").select("*");
  if (empErr) throw empErr;

  const { data: processes } = await supabase.from("processes").select("*");
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
          dataOcorrencia: (() => { const d = pr.created_at ?? pr.data_ocorrencia ?? pr.createdAt ?? pr.dataOcorrencia; return d ? new Date(d).toLocaleDateString() : ""; })(),
          tipoDesvio: pr.tipo_desvio ?? "",
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
  const res = await fetch("/api/processes");
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const items = await res.json();
  return Array.isArray(items) ? items : [];
}

export async function fetchProcessById(id: string) {
  const { data: processes } = await supabase.from("processes").select("*").eq("id", id);
  if (!processes || processes.length === 0) return undefined;
  const p = processes[0];
  const { data: employee } = await supabase.from("employees").select("*").eq("id", p.employee_id).limit(1).single();
  return {
    id: p.id,
    funcionario: employee?.nome_completo ?? "",
    tipoDesvio: p.tipo_desvio ?? "",
    classificacao: p.classificacao ? (p.classificacao === "Media" ? "Média" : p.classificacao) : ("Leve" as any),
    dataAbertura: (() => { const d = p.created_at ?? p.data_ocorrencia ?? p.createdAt ?? p.dataOcorrencia; return d ? new Date(d).toLocaleDateString() : ""; })(),
    createdAt: (p.created_at ?? p.data_ocorrencia ?? p.createdAt ?? p.dataOcorrencia) ?? null,
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
  const { error } = await supabase.from("processes").update(patch as any).eq("id", id);
  if (error) throw error;
}
