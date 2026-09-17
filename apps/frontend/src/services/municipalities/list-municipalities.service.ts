import { api } from "@/api/client";
import { listMunicipalitiesSchema } from "@/schemas/municipalities/list-municipalities.schema";
import type { Municipality, MunicipalityQuery } from "./municipalities.types";

export async function listMunicipalitiesService(query: MunicipalityQuery = {}): Promise<Municipality[]> {
  const { data } = await api.get<Municipality[]>("/municipios", {
    params: listMunicipalitiesSchema.parse(query),
  });
  return data;
}
