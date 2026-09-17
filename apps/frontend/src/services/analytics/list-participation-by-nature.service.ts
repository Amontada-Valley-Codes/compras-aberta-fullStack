import { api } from "@/api/client";
import { participationByNatureQuerySchema } from "@/schemas/analytics/list-participation-by-nature.schema";
import type { ParticipationByNatureResponse, PeriodQuery } from "./analytics.types";

export async function listParticipationByNatureService(query: PeriodQuery = {}): Promise<ParticipationByNatureResponse> {
  const { data } = await api.get<ParticipationByNatureResponse>("/analytics/participacao-me-por-natureza", {
    params: participationByNatureQuerySchema.parse(query),
  });
  return data;
}
