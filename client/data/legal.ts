export type LegalSeverity = "Leve" | "Média" | "Grave" | "Gravíssima";

export type LegalReviewStatus =
  | "Aguardando Parecer Jurídico"
  | "Em Revisão"
  | "Finalizado";

export interface LegalAttachment {
  name: string;
  url: string;
}

export interface LegalCase {
  id: string;
  employeeName: string;
  deviationType: string;
  classification: LegalSeverity;
  referralDate: string; // yyyy-mm-dd
  managerDescription: string;
  managerAttachments: LegalAttachment[];
  occurrenceDate: string; // yyyy-mm-dd
  status: LegalReviewStatus;
  // Campos para processos finalizados (visualização)
  legalDecisionResult?: "Arquivar Processo" | "Aplicar Medida Disciplinar" | "Recomendar Justa Causa Direta";
  legalDecisionMeasure?: string | null;
  legalOpinionSaved?: string; // HTML do parecer final
  decisionDate?: string; // yyyy-mm-dd
}

export const legalCasesAwaitingMock: LegalCase[] = [
  {
    id: "PROC-1002",
    employeeName: "Maria Oliveira",
    deviationType: "Uso Indevido de Recursos",
    classification: "Gravíssima",
    referralDate: "2025-02-06",
    occurrenceDate: "2025-02-05",
    managerDescription:
      "Uso comprovado de recursos corporativos para fins pessoais em período de trabalho. Gestor anexou logs e relatos de equipe.",
    managerAttachments: [
      { name: "relatorio-logs.pdf", url: "#" },
      { name: "testemunhos.txt", url: "#" },
    ],
    status: "Aguardando Parecer Jurídico",
  },
  {
    id: "PROC-1004",
    employeeName: "Ana Costa",
    deviationType: "Descumprimento de Normas",
    classification: "Gravíssima",
    referralDate: "2025-02-13",
    occurrenceDate: "2025-02-12",
    managerDescription:
      "Descumprimento reiterado de normas internas e políticas de segurança. Evidências fotográficas e e-mails anexados.",
    managerAttachments: [
      { name: "evidencias.zip", url: "#" },
      { name: "emails.eml", url: "#" },
    ],
    status: "Aguardando Parecer Jurídico",
  },
  {
    id: "PROC-1010",
    employeeName: "Rafael Lima",
    deviationType: "Quebra de Confidencialidade",
    classification: "Gravíssima",
    referralDate: "2025-02-18",
    occurrenceDate: "2025-02-17",
    managerDescription:
      "Compartilhamento não autorizado de informações sensíveis com terceiros. Prints e registros de acesso anexados.",
    managerAttachments: [
      { name: "prints.pdf", url: "#" },
      { name: "acessos.csv", url: "#" },
    ],
    status: "Aguardando Parecer Jurídico",
  },
  // Diversificação de status e classificações
  {
    id: "PROC-1015",
    employeeName: "Bruno Carvalho",
    deviationType: "Atraso Recorrente",
    classification: "Leve",
    referralDate: "2025-02-10",
    occurrenceDate: "2025-02-08",
    managerDescription: "Atrasos em três ocasiões na mesma semana.",
    managerAttachments: [{ name: "registros-ponto.pdf", url: "#" }],
    status: "Em Revisão",
  },
  {
    id: "PROC-1016",
    employeeName: "Carla Mendes",
    deviationType: "Conduta Inadequada",
    classification: "Média",
    referralDate: "2025-02-11",
    occurrenceDate: "2025-02-10",
    managerDescription: "Ocorrência em reunião com clientes. Relatos anexados.",
    managerAttachments: [{ name: "relatos.pdf", url: "#" }],
    status: "Em Revisão",
  },
  {
    id: "PROC-1020",
    employeeName: "Diego Rocha",
    deviationType: "Uso Indevido de Email Corporativo",
    classification: "Grave",
    referralDate: "2025-02-14",
    occurrenceDate: "2025-02-13",
    managerDescription: "Envio de conteúdo não relacionado ao trabalho.",
    managerAttachments: [{ name: "amostras-email.eml", url: "#" }],
    status: "Finalizado",
    legalDecisionResult: "Aplicar Medida Disciplinar",
    legalDecisionMeasure: "Advertência Escrita",
    legalOpinionSaved:
      "<p>Concluímos que houve violação da política de uso de e-mail corporativo. Recomenda-se aplicação de medida disciplinar proporcional, considerando a ausência de reincidência.</p>",
    decisionDate: "2025-02-20",
  },
  {
    id: "PROC-1022",
    employeeName: "Elisa Pires",
    deviationType: "Assédio Moral",
    classification: "Grave",
    referralDate: "2025-02-15",
    occurrenceDate: "2025-02-14",
    managerDescription: "Relatos de colegas e superior imediato.",
    managerAttachments: [{ name: "relatorio-interno.pdf", url: "#" }],
    status: "Em Revisão",
  },
  {
    id: "PROC-1025",
    employeeName: "Felipe Santos",
    deviationType: "Quebra de Sigilo",
    classification: "Gravíssima",
    referralDate: "2025-02-16",
    occurrenceDate: "2025-02-15",
    managerDescription: "Compartilhamento de informações estratégicas.",
    managerAttachments: [{ name: "evidencias-chat.pdf", url: "#" }],
    status: "Aguardando Parecer Jurídico",
  },
  {
    id: "PROC-1030",
    employeeName: "Gabriela Nunes",
    deviationType: "Descumprimento de Normas de Segurança",
    classification: "Média",
    referralDate: "2025-02-17",
    occurrenceDate: "2025-02-16",
    managerDescription: "Falha no uso de EPI. Fotos anexas.",
    managerAttachments: [{ name: "fotos-epi.zip", url: "#" }],
    status: "Finalizado",
    legalDecisionResult: "Arquivar Processo",
    legalDecisionMeasure: null,
    legalOpinionSaved:
      "<p>Após análise, não foram constatados danos ou reincidência. Caso orientado com treinamento adicional e arquivado.</p>",
    decisionDate: "2025-02-22",
  },
  {
    id: "PROC-1033",
    employeeName: "Henrique Alves",
    deviationType: "Conflito de Interesses",
    classification: "Grave",
    referralDate: "2025-02-18",
    occurrenceDate: "2025-02-17",
    managerDescription: "Participação em negociação com fornecedor parente.",
    managerAttachments: [{ name: "declaracao.pdf", url: "#" }],
    status: "Em Revisão",
  },
  {
    id: "PROC-1035",
    employeeName: "Isabela Dias",
    deviationType: "Uso Indevido de Senhas",
    classification: "Grave",
    referralDate: "2025-02-19",
    occurrenceDate: "2025-02-18",
    managerDescription: "Compartilhou credenciais com terceiro.",
    managerAttachments: [{ name: "logs-acesso.csv", url: "#" }],
    status: "Aguardando Parecer Jurídico",
  },
];
