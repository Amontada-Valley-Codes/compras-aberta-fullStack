import { loadLocalPayments, type LocalPaymentSummary } from "@/services/analytics/local-payments";
import type { PaymentsSummaryResponse, PaymentSuppliersResponse } from "@/services/analytics/payments.types";
import { getPaymentsSummaryService, listPaymentSuppliersService } from "@/services/analytics/payments.service";
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

export interface AnalysisData {
  municipalities: DataResult<MunicipalityOption[]>;
  selectedMunicipality: MunicipalityOption | null;
  filters: AnalysisFilters;
  payments: DataResult<PaymentsSummaryResponse>;
  suppliers: DataResult<PaymentSuppliersResponse>;
  local: DataResult<LocalPaymentSummary>;
  supplierCategory: string;
  hasNext: boolean;
  paginationError: string | null;
}

export async function loadAnalysisData(filters: AnalysisFilters, supplierCategory = "ME"): Promise<AnalysisData> {
  const municipalities = await loadMunicipalityOptions();
  const selectedMunicipality = municipalities.data?.find((item) => item.ibgeCode === filters.municipalityIbge) ?? null;
  if (!selectedMunicipality) {
    const unavailable = { data: null, error: filters.municipalityIbge ? "Não foi possível aplicar o filtro de município." : null };
    return { municipalities, selectedMunicipality, filters, payments: unavailable, suppliers: unavailable, local: unavailable, supplierCategory, hasNext: false, paginationError: null };
  }
  const query = { codigo_municipio: selectedMunicipality.tceCode.padStart(3, "0"), ano: filters.year };
  const payments = await result(getPaymentsSummaryService(query));
  const supplierQuery = { ...query, coleta_id: payments.data?.coleta.coleta_id, codigo_natureza: filters.natureCode, categoria_porte: supplierCategory };
  const loadSupplierPage = async (limit: number, offset: number) => {
    const page = await listPaymentSuppliersService({ ...supplierQuery, limit, offset });
    if (page.coleta_id !== payments.data?.coleta.coleta_id) throw new Error("Coleta de fornecedores diferente do resumo");
    return page;
  };
  const selectedNature = filters.natureCode ? payments.data?.data.find((row) => row.codigo_natureza === filters.natureCode) : null;
  const totalAmount = filters.natureCode ? selectedNature?.total_controle : payments.data?.total_controle;
  const meAmount = filters.natureCode ? selectedNature?.valor_me : payments.data?.total_me;
  const [suppliers, local] = await Promise.all([
    payments.data ? result(loadSupplierPage(filters.pageSize, (filters.page - 1) * filters.pageSize)) : Promise.resolve({ data: null, error: payments.error }),
    payments.data && totalAmount != null && meAmount != null
      ? result(loadLocalPayments({ ...query, coleta_id: payments.data.coleta.coleta_id, codigo_natureza: filters.natureCode }))
      : Promise.resolve({ data: null, error: payments.error }),
  ]);
  const next = suppliers.data?.data.length === filters.pageSize && payments.data
    ? await result(loadSupplierPage(1, filters.page * filters.pageSize))
    : null;
  return { municipalities, selectedMunicipality, filters, payments, suppliers, local, supplierCategory, hasNext: Boolean(next?.data?.data.length), paginationError: next?.error ?? null };
}
