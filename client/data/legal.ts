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
];
