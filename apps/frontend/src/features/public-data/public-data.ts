import type {
  DetailedBidsResponse, ExpensesByNatureResponse, GeneralParticipationsResponse, LocalParticipationsResponse,
  MicroenterpriseResponse, ParticipationByNatureResponse,
} from "@/services/analytics/analytics.types";
import type { MunicipalityOption } from "@/services/municipalities/municipalities.types";
import { listMunicipalitiesService } from "@/services/municipalities/list-municipalities.service";
import { listMunicipalityCodesService } from "@/services/municipalities/list-municipality-codes.service";
import { listDetailedBidsService } from "@/services/analytics/list-detailed-bids.service";
import { listLocalParticipationsService } from "@/services/analytics/list-local-participations.service";
import { listGeneralParticipationsService } from "@/services/analytics/list-general-participations.service";
import { listExpensesByNatureService } from "@/services/analytics/list-expenses-by-nature.service";
import { getMicroenterpriseIndicatorService } from "@/services/analytics/get-microenterprise-indicator.service";
import { listParticipationByNatureService } from "@/services/analytics/list-participation-by-nature.service";

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

export interface AnalysisData extends PublicData {
  selectedMunicipality: MunicipalityOption | null;
  filters: AnalysisFilters;
}

export async function loadAnalysisData(filters: AnalysisFilters): Promise<AnalysisData> {
  const municipalities = await loadMunicipalityOptions();
  const selectedMunicipality = municipalities.data?.find((item) => item.ibgeCode === filters.municipalityIbge) ?? null;
  const unresolvedMunicipality = Boolean(filters.municipalityIbge && !selectedMunicipality);
  const codigo_municipio = selectedMunicipality?.tceCode;
  const period = {
    codigo_municipio,
    data_inicio: `${filters.year}-01-01`,
    data_fim: `${filters.year}-12-31`,
  };
  const unavailable = { data: null, error: "Não foi possível aplicar o filtro de município." };
  const [bids, expenses, micro, participation, local, general] = await Promise.all([
    unresolvedMunicipality ? Promise.resolve(unavailable) : result(listDetailedBidsService({ codigo_municipio, codigo_natureza: filters.natureCode, ano: filters.year, limit: Math.min(filters.pageSize + 1, 100), offset: (filters.page - 1) * filters.pageSize })),
    unresolvedMunicipality ? Promise.resolve(unavailable) : result(listExpensesByNatureService(period)),
    unresolvedMunicipality ? Promise.resolve(unavailable) : result(getMicroenterpriseIndicatorService({ ...period, codigo_natureza: filters.natureCode })),
    unresolvedMunicipality ? Promise.resolve(unavailable) : result(listParticipationByNatureService(period)),
    selectedMunicipality
      ? result(listLocalParticipationsService({ codigo_municipio: selectedMunicipality.tceCode, codigo_natureza: filters.natureCode, ano: filters.year, limit: 1 }))
      : Promise.resolve({ data: null, error: null }),
    selectedMunicipality
      ? result(listGeneralParticipationsService({ codigo_municipio: selectedMunicipality.tceCode, codigo_natureza: filters.natureCode, ano: filters.year, limit: 1 }))
      : Promise.resolve({ data: null, error: null }),
  ]);
  return { municipalities, selectedMunicipality, filters, bids, expenses, micro, participation, local, general };
}
