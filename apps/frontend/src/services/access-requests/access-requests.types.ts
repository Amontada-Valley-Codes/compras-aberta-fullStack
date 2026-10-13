import type { AccessStatus } from "@/lib/auth/session";

export type { AccessStatus };

// Formato devolvido pelo backend em /access-requests (CNPJ e telefone só com
// dígitos; datas em ISO 8601).
export interface AccessRequest {
  id: string;
  status: AccessStatus;
  companyName: string;
  cnpj: string;
  phone: string;
  message: string | null;
  municipio: { codigoIbge: number; nome: string | null };
  requester: { name: string; email: string };
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
}

export interface CreateAccessRequestInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  companyName: string;
  cnpj: string;
  municipioIbge: number;
  message?: string;
}

export const accessStatusLabel: Record<AccessStatus, string> = {
  PENDING: "Em análise",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
};

// Dados cadastrais devolvidos por GET /cnpj/:cnpj (base aberta da Receita).
export interface CnpjLookup {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  situacaoCadastral: string;
  porte: string | null;
  atividadePrincipal: string | null;
  municipio: { nome: string; uf: string; codigoIbge: number | null };
  telefone: string | null;
  email: string | null;
}
