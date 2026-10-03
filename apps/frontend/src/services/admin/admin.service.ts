import type { CompanyRequest } from "@/lib/mock-data";

/**
 * Tenta fazer refresh do token de sessão.
 * Retorna true se o refresh foi bem-sucedido.
 */
async function tryRefreshSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/refresh", { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Wrapper para fetch autenticado: se receber 401, tenta refresh
 * do token e refaz a requisição uma vez antes de falhar.
 */
async function authenticatedFetch(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  let response = await fetch(url, options);

  if (response.status === 401) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      response = await fetch(url, options);
    }
  }

  return response;
}

export async function listBusinessRequestsService(): Promise<CompanyRequest[]> {
  const response = await authenticatedFetch("/api/admin/business-requests");
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || "Não foi possível buscar as solicitações.");
  }
  return response.json();
}

export async function updateBusinessRequestStatusService(
  userId: string,
  status: "Aprovada" | "Pendente" | "Em análise",
): Promise<{ message: string }> {
  const response = await authenticatedFetch(
    `/api/admin/business-requests/${userId}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || "Não foi possível atualizar o status.");
  }
  return response.json();
}
