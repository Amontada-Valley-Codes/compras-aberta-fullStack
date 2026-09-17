import { api } from "@/api/client";
import { localParticipationsQuerySchema } from "@/schemas/analytics/list-local-participations.schema";
import type { LocalParticipationsQuery, LocalParticipationsResponse } from "./analytics.types";

export async function listLocalParticipationsService(query: LocalParticipationsQuery): Promise<LocalParticipationsResponse> {
  const { data } = await api.get<LocalParticipationsResponse>("/analytics/participacoes-me-locais", {
    params: localParticipationsQuerySchema.parse(query),
  });
  return data;
}
