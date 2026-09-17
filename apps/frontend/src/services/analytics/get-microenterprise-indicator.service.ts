import { api } from "@/api/client";
import { microenterpriseQuerySchema } from "@/schemas/analytics/get-microenterprise-indicator.schema";
import type { MicroenterpriseQuery, MicroenterpriseResponse } from "./analytics.types";

export async function getMicroenterpriseIndicatorService(query: MicroenterpriseQuery = {}): Promise<MicroenterpriseResponse> {
  const { data } = await api.get<MicroenterpriseResponse>("/analytics/microempresas", {
    params: microenterpriseQuerySchema.parse(query),
  });
  return data;
}
