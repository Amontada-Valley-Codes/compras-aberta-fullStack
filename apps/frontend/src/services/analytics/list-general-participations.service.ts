import { api } from "@/api/client";
import { generalParticipationsQuerySchema } from "@/schemas/analytics/list-general-participations.schema";
import type { GeneralParticipationsQuery, GeneralParticipationsResponse } from "./analytics.types";

export async function listGeneralParticipationsService(query: GeneralParticipationsQuery): Promise<GeneralParticipationsResponse> {
  const { data } = await api.get<GeneralParticipationsResponse>("/analytics/participacoes-me-gerais", {
    params: generalParticipationsQuerySchema.parse(query),
  });
  return data;
}
