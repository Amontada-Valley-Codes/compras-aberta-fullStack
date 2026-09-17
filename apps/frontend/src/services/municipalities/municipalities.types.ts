export interface Municipality {
  id: number;
  nome: string;
}

export interface MunicipalityQuery {
  search?: string;
}

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
