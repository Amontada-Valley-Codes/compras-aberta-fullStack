import { listLocalParticipationsService } from "@/services/analytics/list-local-participations.service";
import { listGeneralParticipationsService } from "@/services/analytics/list-general-participations.service";
import { listExpensesByNatureService } from "@/services/analytics/list-expenses-by-nature.service";
import { getMicroenterpriseIndicatorService } from "@/services/analytics/get-microenterprise-indicator.service";
import { listParticipationByNatureService } from "@/services/analytics/list-participation-by-nature.service";
import type {
  DetailedBidsResponse, ExpensesByNatureResponse, GeneralParticipationsResponse, LocalParticipationsResponse,
  MicroenterpriseResponse, ParticipationByNatureResponse,
} from "@/services/analytics/analytics.types";
import type { MunicipalityOption } from "@/services/municipalities/municipalities.types";
import { listMunicipalitiesService } from "@/services/municipalities/list-municipalities.service";
import { listMunicipalityCodesService } from "@/services/municipalities/list-municipality-codes.service";

export interface DataResult<T> {
  data: T | null;
  error: string | null;
}

async function result<T>(promise: Promise<T>): Promise<DataResult<T>> {
  try {
    return { data: await promise, error: null };
  } catch {
    return { data: null, error: "Não foi possível carregar estes dados. Tente novamente mais tarde." };
  }
}

export async function loadMunicipalityOptions(): Promise<DataResult<MunicipalityOption[]>> {
  const [backend, catalog] = await Promise.all([
    result(listMunicipalitiesService()), result(listMunicipalityCodesService()),
  ]);
  if (!catalog.data) return { data: null, error: catalog.error };

  const names = new Map(backend.data?.map((item) => [String(item.id), item.nome]) ?? []);
  const options = catalog.data
    .filter((item) => item.uf === "CE")
    .filter((item) => !backend.data || names.has(item.codigo_ibge))
    .map((item) => ({
      ibgeCode: item.codigo_ibge,
      tceCode: item.codigo_municipio,
      name: names.get(item.codigo_ibge) ?? item.nome,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return { data: options, error: backend.error };
}

export interface PublicData {
  municipalities: DataResult<MunicipalityOption[]>;
  bids: DataResult<DetailedBidsResponse>;
  local: DataResult<LocalParticipationsResponse>;
  general: DataResult<GeneralParticipationsResponse>;
  expenses: DataResult<ExpensesByNatureResponse>;
  micro: DataResult<MicroenterpriseResponse>;
  participation: DataResult<ParticipationByNatureResponse>;
}

export interface AnalysisFilters {
  municipalityIbge?: string;
  natureCode?: string;
  year: number;
  page: number;
  pageSize: number;
}

export interface AnalysisData extends Omit<PublicData, "bids"> {
  selectedMunicipality: MunicipalityOption | null;
  filters: AnalysisFilters;
  // Esta operação restringe os registros a ME; licitações-detalhadas não filtra porte.
  bids: DataResult<GeneralParticipationsResponse>;
  hasNext: boolean;
}

export async function loadAnalysisData(filters: AnalysisFilters): Promise<AnalysisData> {
  const municipalities = await loadMunicipalityOptions();
  const selectedMunicipality = municipalities.data?.find((item) => item.ibgeCode === filters.municipalityIbge) ?? null;
  if (filters.municipalityIbge && !selectedMunicipality) {
    const unavailable = { data: null, error: "Não foi possível aplicar o filtro de município." };
    return { municipalities, selectedMunicipality, filters, bids: unavailable, expenses: unavailable, participation: unavailable, micro: unavailable, local: unavailable, general: unavailable, hasNext: false };
  }
  const codigo_municipio = selectedMunicipality?.tceCode.padStart(3, "0");
  const period = { codigo_municipio, data_inicio: `${filters.year}-01-01`, data_fim: `${filters.year}-12-31` };
  const bidQuery = { codigo_municipio: codigo_municipio!, codigo_natureza: filters.natureCode, ano: filters.year, limit: filters.pageSize, offset: (filters.page - 1) * filters.pageSize };
  const empty = { data: null, error: null };
  const [expenses, participation, micro, local, bids] = await Promise.all([
    result(listExpensesByNatureService(period)),
    result(listParticipationByNatureService(period)),
    result(getMicroenterpriseIndicatorService({ ...period, codigo_natureza: filters.natureCode })),
    codigo_municipio ? result(listLocalParticipationsService({ ...bidQuery, limit: 1, offset: 0 })) : Promise.resolve(empty),
    codigo_municipio ? result(listGeneralParticipationsService(bidQuery)) : Promise.resolve(empty),
  ]);
  // O resumo é global ao filtro, independentemente de limit/offset.
  const general = bids;
  const total = bids.data?.resumo.participacoes_me ?? 0;
  const hasNext = Boolean(bids.data && bidQuery.offset + bids.data.data.length < total);
  return { municipalities, selectedMunicipality, filters, expenses, participation, micro, local, general, bids, hasNext };
}
