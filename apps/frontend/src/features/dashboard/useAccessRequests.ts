"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccessRequest } from "@/services/access-requests/access-requests.types";

export async function readMessage(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);
  return (data?.message as string | undefined) ?? fallback;
}

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

// Solicitações de acesso reais (GET /api/admin/access-requests, que repassa
// para o backend com o token da sessão).
export function useAccessRequests() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/access-requests");
      if (!response.ok) {
        throw new Error(
          await readMessage(response, "Não foi possível carregar as solicitações."),
        );
      }
      setRequests(await response.json());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar as solicitações.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const replace = (updated: AccessRequest) =>
    setRequests((items) =>
      items.map((item) => (item.id === updated.id ? updated : item)),
    );

  return { requests, loading, error, reload, replace };
}

export type RequestsState = ReturnType<typeof useAccessRequests>;
