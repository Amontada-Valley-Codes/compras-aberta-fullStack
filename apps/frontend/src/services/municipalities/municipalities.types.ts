import type { z } from "zod";
import type { listMunicipalitiesSchema } from "@/schemas/municipalities/list-municipalities.schema";

export interface Municipality {
  id: number;
  nome: string;
}

export type MunicipalityQuery = z.input<typeof listMunicipalitiesSchema>;

export interface CatalogMunicipality {
  codigo_municipio: string;
  codigo_ibge: string;
  nome: string;
  uf: string;
}

export interface CatalogMunicipalitiesResponse {
  limit: number;
  offset: number;
  data: CatalogMunicipality[];
}

export interface MunicipalityOption {
  ibgeCode: string;
  tceCode: string;
  name: string;
}
