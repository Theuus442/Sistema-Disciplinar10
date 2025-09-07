export type PerfilUsuario = "administrador" | "gestor" | "juridico" | "funcionario";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  ativo: boolean;
  criadoEm: string; // ISO date
  ultimoAcesso?: string; // ISO date
}

export const usuariosMock: Usuario[] = [
  { id: "USR-001", nome: "Alice Martins", email: "alice.martins@empresa.com", perfil: "administrador", ativo: true, criadoEm: "2024-11-10", ultimoAcesso: "2025-02-06T10:00:00Z" },
  { id: "USR-002", nome: "Bruno Ferreira", email: "bruno.ferreira@empresa.com", perfil: "gestor", ativo: true, criadoEm: "2024-12-01", ultimoAcesso: "2025-02-06T12:30:00Z" },
  { id: "USR-003", nome: "Carla Nunes", email: "carla.nunes@empresa.com", perfil: "juridico", ativo: true, criadoEm: "2025-01-05", ultimoAcesso: "2025-02-05T16:20:00Z" },
  { id: "USR-004", nome: "Diego Souza", email: "diego.souza@empresa.com", perfil: "funcionario", ativo: false, criadoEm: "2024-09-15" },
  { id: "USR-005", nome: "Elisa Ramos", email: "elisa.ramos@empresa.com", perfil: "funcionario", ativo: true, criadoEm: "2024-10-02", ultimoAcesso: "2025-02-04T09:00:00Z" },
];
