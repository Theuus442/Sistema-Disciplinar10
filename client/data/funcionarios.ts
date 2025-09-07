export type Classificacao = "Leve" | "Média" | "Grave" | "Gravíssima";
export type StatusProcesso = "Finalizado" | "Em Análise" | "Sindicância" | "Aguardando Assinatura";

export interface RegistroDisciplinar {
  id: string;
  dataOcorrencia: string; // dd/mm/yyyy
  tipoDesvio: string;
  classificacao: Classificacao;
  medidaAplicada: string;
  status: StatusProcesso;
}

export interface Funcionario {
  id: string; // matrícula
  nomeCompleto: string;
  cargo: string;
  setor: string;
  gestorDireto: string;
  historico: RegistroDisciplinar[];
}

export const funcionariosMock: Funcionario[] = [
  {
    id: "EMP-001",
    nomeCompleto: "João Silva",
    cargo: "Analista de Sistemas",
    setor: "Tecnologia da Informação",
    gestorDireto: "Maria Oliveira",
    historico: [
      {
        id: "PROC-2001",
        dataOcorrencia: "10/01/2025",
        tipoDesvio: "Atraso Injustificado",
        classificacao: "Leve",
        medidaAplicada: "Advertência Verbal",
        status: "Finalizado",
      },
      {
        id: "PROC-2002",
        dataOcorrencia: "28/01/2025",
        tipoDesvio: "Uso Indevido de Recursos",
        classificacao: "Média",
        medidaAplicada: "Advertência Escrita",
        status: "Em Análise",
      },
    ],
  },
  {
    id: "EMP-002",
    nomeCompleto: "Ana Costa",
    cargo: "Coordenadora de RH",
    setor: "Recursos Humanos",
    gestorDireto: "Carlos Santos",
    historico: [
      {
        id: "PROC-2101",
        dataOcorrencia: "05/02/2025",
        tipoDesvio: "Conduta Inapropriada",
        classificacao: "Grave",
        medidaAplicada: "Suspensão 1 dia",
        status: "Sindicância",
      },
      {
        id: "PROC-2102",
        dataOcorrencia: "12/02/2025",
        tipoDesvio: "Descumprimento de Normas",
        classificacao: "Gravíssima",
        medidaAplicada: "Suspensão 3 dias",
        status: "Aguardando Assinatura",
      },
    ],
  },
];
