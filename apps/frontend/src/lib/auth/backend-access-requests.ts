import { authApi } from "@/api/client";
import type {
  AccessRequest,
  AccessStatus,
  CnpjLookup,
  CreateAccessRequestInput,
} from "@/services/access-requests/access-requests.types";
import { forwardClientIp } from "./backend-sessions";

// Usa o authApi (sem normalizeApiError) pelo mesmo motivo das rotas de
// sessão: o backend já devolve mensagens em pt-BR prontas para a tela.

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function backendCreateAccessRequest(
  request: Request,
  input: CreateAccessRequestInput,
) {
  const { data } = await authApi.post<Pick<AccessRequest, "id" | "status" | "createdAt">>(
    "/access-requests",
    input,
    forwardClientIp(request),
  );
  return data;
}

export async function backendFindCnpj(request: Request, cnpj: string) {
  const { data } = await authApi.get<CnpjLookup>(
    `/cnpj/${encodeURIComponent(cnpj)}`,
    forwardClientIp(request),
  );
  return data;
}

export async function backendGetMyAccessRequest(token: string) {
  const { data } = await authApi.get<AccessRequest>("/access-requests/me", {
    headers: bearer(token),
  });
  return data;
}

export async function backendListAccessRequests(token: string, status?: AccessStatus) {
  const { data } = await authApi.get<AccessRequest[]>("/access-requests", {
    headers: bearer(token),
    params: status ? { status } : undefined,
  });
  return data;
}

export async function backendReviewAccessRequest(
  token: string,
  id: string,
  decision: "approve" | "reject",
  note?: string,
) {
  const { data } = await authApi.patch<AccessRequest>(
    `/access-requests/${encodeURIComponent(id)}/${decision}`,
    { note },
    { headers: bearer(token) },
  );
  return data;
}
