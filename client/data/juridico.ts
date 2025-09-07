export type StatusJuridico = "Em Revisão" | "Pendente" | "Finalizado" | "Aguardando Análise";

export interface ProcessoJuridico {
  id: string;
  assunto: string;
  vencimento: string; // dd-mm-yyyy
  status: StatusJuridico;
}

export interface AtividadeRecente {
  id: string;
  descricao: string;
  tempo: string;
}

export const processosJuridicosMock: ProcessoJuridico[] = [
  {
    id: "PROC-00123",
    assunto: "Ação Trabalhista - João Silva",
    vencimento: "2024-07-15",
    status: "Em Revisão",
  },
  {
    id: "PROC-00124", 
    assunto: "Revisão de Contrato - Fornecedor X",
    vencimento: "2024-07-18",
    status: "Pendente",
  },
  {
    id: "PROC-00125",
    assunto: "Disputa Comercial - Cliente Y", 
    vencimento: "2024-07-20",
    status: "Em Revisão",
  },
  {
    id: "PROC-00126",
    assunto: "Processo Administrativo Disciplinar - Maria Souza",
    vencimento: "2024-07-22", 
    status: "Pendente",
  },
  {
    id: "PROC-00127",
    assunto: "Consulta Legal - Nova Legislação",
    vencimento: "2024-07-25",
    status: "Pendente",
  },
  {
    id: "PROC-00128",
    assunto: "Propriedade Intelectual - Registro Z",
    vencimento: "2024-07-28",
    status: "Em Revisão",
  },
  {
    id: "PROC-00129",
    assunto: "Conformidade GDPR - Auditoria Interna",
    vencimento: "2024-07-30",
    status: "Pendente",
  },
];

export const atividadesRecentesMock: AtividadeRecente[] = [
  {
    id: "1",
    descricao: "Reunião com Dr. Almeida sobre o caso PROC-00123.",
    tempo: "há 2 horas",
  },
  {
    id: "2", 
    descricao: "Documentos do caso PROC-00124 enviados para análise.",
    tempo: "há 1 dia",
  },
  {
    id: "3",
    descricao: "Notificação de vencimento para PROC-00125.",
    tempo: "há 2 dias",
  },
  {
    id: "4",
    descricao: "Início da revisão do contrato do Fornecedor Alfa.",
    tempo: "há 3 dias",
  },
];
