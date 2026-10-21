import { api } from "@/api/client";
import { detailedBidsQuerySchema } from "@/schemas/analytics/list-detailed-bids.schema";
import type { DetailedBidsQuery, DetailedBidsResponse } from "./analytics.types";

export async function listDetailedBidsService(query: DetailedBidsQuery = {}): Promise<DetailedBidsResponse> {
  const { data } = await api.get<DetailedBidsResponse>("/analytics/licitacoes-detalhadas", {
    params: detailedBidsQuerySchema.parse(query),
  });
  return data;
}
