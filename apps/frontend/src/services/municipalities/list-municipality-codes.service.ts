import { catalogApi } from "@/api/client";
import { listMunicipalityCodesSchema } from "@/schemas/municipalities/list-municipality-codes.schema";
import type { CatalogMunicipalitiesResponse, CatalogMunicipality } from "./municipalities.types";

export async function listMunicipalityCodesService(): Promise<CatalogMunicipality[]> {
  const all: CatalogMunicipality[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data } = await catalogApi.get<CatalogMunicipalitiesResponse>("/municipios", {
      params: listMunicipalityCodesSchema.parse({ limit: 100, offset }),
    });
    all.push(...data.data);
    if (data.data.length < 100) return all;
  }
}
