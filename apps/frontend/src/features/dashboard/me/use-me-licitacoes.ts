"use client";

import { useCallback, useEffect } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  MeBidDetailResponse,
  MeOpenBidsResponse,
  MePaginatedBidsRequest,
  MePaginatedBidsResponse,
} from "./cnae-match";

export const meLicitacoesKeys = {
  all: ["me-licitacoes"] as const,
  openSummary: (ibge = "", uf = "CE") =>
    [...meLicitacoesKeys.all, "open-summary", ibge || uf] as const,
  pages: () => [...meLicitacoesKeys.all, "paginated"] as const,
  page: (params: MePaginatedBidsRequest) =>
    [...meLicitacoesKeys.pages(), params] as const,
  details: () => [...meLicitacoesKeys.detailsRoot] as const,
  detailsRoot: ["me-licitacoes", "detail"] as const,
  detail: (cnpj: string, year: number, sequential: number) =>
    ["me-licitacoes", "detail", cnpj, year, sequential] as const,
};

async function fetchOpenBidsSummary(
  ibge = "",
  uf = "CE",
  forceRefresh = false,
): Promise<MeOpenBidsResponse> {
  const search = new URLSearchParams();
  if (ibge) search.set("ibge", ibge);
  if (uf && uf !== "CE") search.set("uf", uf);
  if (forceRefresh) search.set("refresh", "1");
  const qs = search.toString();

  const res = await fetch(`/api/me/licitacoes${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      body?.message ||
        "Não foi possível carregar as licitações abertas do PNCP neste momento.",
    );
  }
  return (await res.json()) as MeOpenBidsResponse;
}

async function fetchPaginatedBids(
  params: MePaginatedBidsRequest,
): Promise<MePaginatedBidsResponse> {
  const res = await fetch("/api/me/licitacoes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      body?.message ||
        "Não foi possível carregar esta página de licitações do PNCP.",
    );
  }
  return (await res.json()) as MePaginatedBidsResponse;
}

async function fetchBidDetail(
  cnpj: string,
  year: number,
  sequential: number,
): Promise<MeBidDetailResponse> {
  const res = await fetch(`/api/me/licitacoes/${cnpj}/${year}/${sequential}`);
  if (!res.ok) {
    throw new Error("Erro ao carregar detalhes da licitação no PNCP.");
  }
  return (await res.json()) as MeBidDetailResponse;
}

/**
 * Consulta completa de todas as licitações abertas no estado selecionado (visão geral, gráficos, KPIs e contadores).
 */
export function useMeOpenBidsQuery(ibge = "", uf = "CE") {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: meLicitacoesKeys.openSummary(ibge, uf),
    queryFn: () => fetchOpenBidsSummary(ibge, uf, false),
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 30 * 60 * 1000,
  });

  const refreshMutation = useMutation({
    mutationFn: () => fetchOpenBidsSummary(ibge, uf, true),
    onSuccess: (freshData) => {
      queryClient.setQueryData(
        meLicitacoesKeys.openSummary(ibge, uf),
        freshData,
      );
      void queryClient.invalidateQueries({
        queryKey: meLicitacoesKeys.pages(),
      });
    },
  });

  return {
    ...query,
    refreshPncp: refreshMutation.mutate,
    isRefreshingPncp: refreshMutation.isPending,
  };
}

/**
 * Paginação com TanStack Query (keepPreviousData + prefetch automático da próxima página e no hover).
 */
export function useMePaginatedBidsQuery(params: MePaginatedBidsRequest) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: meLicitacoesKeys.page(params),
    queryFn: () => fetchPaginatedBids(params),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });

  const totalPages = query.data?.totalPages ?? 1;
  const currentPage = query.data?.page ?? params.page;

  // Faz prefetch automático da próxima página assim que a página atual carrega
  useEffect(() => {
    if (!query.data || query.isPlaceholderData) return;
    if (currentPage < totalPages) {
      const nextParams: MePaginatedBidsRequest = {
        ...params,
        page: currentPage + 1,
      };
      void queryClient.prefetchQuery({
        queryKey: meLicitacoesKeys.page(nextParams),
        queryFn: () => fetchPaginatedBids(nextParams),
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [currentPage, totalPages, params, query.data, query.isPlaceholderData, queryClient]);

  const prefetchPage = useCallback(
    (targetPage: number) => {
      if (targetPage < 1 || targetPage > totalPages || targetPage === currentPage) {
        return;
      }
      const targetParams: MePaginatedBidsRequest = {
        ...params,
        page: targetPage,
      };
      void queryClient.prefetchQuery({
        queryKey: meLicitacoesKeys.page(targetParams),
        queryFn: () => fetchPaginatedBids(targetParams),
        staleTime: 5 * 60 * 1000,
      });
    },
    [currentPage, params, queryClient, totalPages],
  );

  return {
    ...query,
    prefetchPage,
  };
}

/**
 * Consulta de detalhes (arquivos e itens do PNCP) com cache TanStack + prefetch ao passar o mouse no card.
 */
export function useMeBidDetailQuery(params: {
  agencyCnpj?: string | null;
  year?: number | null;
  sequential?: number | null;
  enabled?: boolean;
}) {
  const cleanCnpj = (params.agencyCnpj ?? "").replace(/\D/g, "");
  const year = params.year ?? 0;
  const sequential = params.sequential ?? 0;
  const valid =
    cleanCnpj.length === 14 &&
    year > 0 &&
    sequential > 0 &&
    params.enabled !== false;

  return useQuery({
    queryKey: meLicitacoesKeys.detail(cleanCnpj, year, sequential),
    queryFn: () => fetchBidDetail(cleanCnpj, year, sequential),
    enabled: valid,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function usePrefetchMeBidDetail() {
  const queryClient = useQueryClient();

  return useCallback(
    (agencyCnpj?: string | null, year?: number | null, sequential?: number | null) => {
      const cleanCnpj = (agencyCnpj ?? "").replace(/\D/g, "");
      if (cleanCnpj.length !== 14 || !year || !sequential) return;

      void queryClient.prefetchQuery({
        queryKey: meLicitacoesKeys.detail(cleanCnpj, year, sequential),
        queryFn: () => fetchBidDetail(cleanCnpj, year, sequential),
        staleTime: 15 * 60 * 1000,
      });
    },
    [queryClient],
  );
}
