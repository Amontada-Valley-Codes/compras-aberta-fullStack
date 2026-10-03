import { api } from "@/api/client";
import type { CompanyRequest } from "@/lib/mock-data";

export async function listBusinessRequestsService(): Promise<CompanyRequest[]> {
  const response = await fetch("/api/admin/business-requests");
  if (!response.ok) throw new Error("Não foi possível buscar as solicitações.");
  return response.json();
}

export async function updateBusinessRequestStatusService(userId: string, status: "Aprovada" | "Pendente" | "Em análise"): Promise<{ message: string }> {
  const response = await fetch(`/api/admin/business-requests/${userId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
  if (!response.ok) throw new Error("Não foi possível atualizar o status.");
  return response.json();
}
