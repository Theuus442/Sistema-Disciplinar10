export type Classificacao = "Leve" | "Média" | "Grave" | "Gravíssima";
export type StatusAtual =
  | "Em Análise"
  | "Sindicância"
  | "Aguardando Assinatura"
  | "Finalizado";

export interface ProcessoItem {
  id: string;
  funcionario: string;
  tipoDesvio: string;
  classificacao: Classificacao;
  dataAbertura: string; // dd/mm/yyyy
  status: StatusAtual;
}

export const processosMock: ProcessoItem[] = [
  {
    id: "PROC-1001",
    funcionario: "João Silva",
    tipoDesvio: "Atraso Injustificado",
    classificacao: "Leve",
    dataAbertura: "01/02/2025",
    status: "Em Análise",
  },
  {
    id: "PROC-1002",
    funcionario: "Maria Oliveira",
    tipoDesvio: "Uso Indevido de Recursos",
    classificacao: "Grave",
    dataAbertura: "05/02/2025",
    status: "Sindicância",
  },
  {
    id: "PROC-1003",
    funcionario: "Pedro Souza",
    tipoDesvio: "Conduta Inapropriada",
    classificacao: "Média",
    dataAbertura: "08/02/2025",
    status: "Aguardando Assinatura",
  },
  {
    id: "PROC-1004",
    funcionario: "Ana Costa",
    tipoDesvio: "Descumprimento de Normas",
    classificacao: "Gravíssima",
    dataAbertura: "12/02/2025",
    status: "Em Análise",
  },
  {
    id: "PROC-1005",
    funcionario: "Carlos Santos",
    tipoDesvio: "Quebra de Confidencialidade",
    classificacao: "Grave",
    dataAbertura: "14/02/2025",
    status: "Finalizado",
  },
];
