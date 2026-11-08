import axios from "axios";

import { env } from "../../env";
import { createMemoryCache } from "../../lib/cache/memory-cache";
import { analyticsApi } from "../../lib/axios/analytics-api";
import { AppError } from "../../utils/AppError";
import type {
  PaymentsSummaryDTO,
  PaymentSuppliersDTO,
  GetMicroenterpriseIndicatorDTO,
  ListDetailedBidsDTO,
  ListExpensesByNatureDTO,
  ListGeneralMicroenterpriseParticipationsDTO,
  ListLocalMicroenterpriseParticipationsDTO,
  ListMicroenterpriseParticipationByNatureDTO,
} from "./analytics.schema";

interface AnalyticsQuery {
  coleta_id?: number;
  categoria_porte?: string;
  codigo_municipio?: string;
  codigo_natureza?: string;
  ano?: number;
  data_inicio?: string;
  data_fim?: string;
  limit?: number;
  offset?: number;
}

const analyticsCache = createMemoryCache<unknown>({
  ttlMs: env.ANALYTICS_CACHE_TTL_SECONDS * 1000,
});

function buildCacheKey(pathname: string, query: AnalyticsQuery) {
  const sortedQuery = Object.entries(query)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));

  return `${pathname}?${JSON.stringify(sortedQuery)}`;
}

function getAnalyticsData(pathname: string, query: AnalyticsQuery) {
  return analyticsCache.getOrLoad(buildCacheKey(pathname, query), () =>
    fetchAnalyticsData(pathname, query),
  );
}

async function fetchAnalyticsData(
  pathname: string,
  query: AnalyticsQuery,
) {
  try {
    const response = await analyticsApi.get(pathname, {
      params: query,
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new AppError(
        "A API de análise de dados não conseguiu atender a consulta.",
        502,
        {
          upstreamUrl: error.config?.url,
          upstreamStatus: error.response.status,
          upstreamBody: error.response.data,
          params: query,
        },
      );
    }

    throw new AppError(
      "Não foi possível conectar à API de análise de dados.",
      502,
      {
        upstreamUrl: pathname,
        code: axios.isAxiosError(error) ? error.code : undefined,
        cause: error instanceof Error ? error.message : String(error),
        params: query,
      },
    );
  }
}

const analyticsService = {
  async getPaymentsSummary(filters: PaymentsSummaryDTO) {
    return getAnalyticsData("/analytics/pagamentos/resumo", filters);
  },
  async listPaymentSuppliers(filters: PaymentSuppliersDTO) {
    return getAnalyticsData("/analytics/pagamentos/fornecedores", filters);
  },
  async listDetailedBids(filters: ListDetailedBidsDTO) {
    return getAnalyticsData(
      "/analytics/licitacoes-detalhadas",
      filters,
    );
  },

  async listLocalMicroenterpriseParticipations(
    filters: ListLocalMicroenterpriseParticipationsDTO,
  ) {
    return getAnalyticsData(
      "/analytics/participacoes-me-locais",
      filters,
    );
  },

  async listGeneralMicroenterpriseParticipations(
    filters: ListGeneralMicroenterpriseParticipationsDTO,
  ) {
    return getAnalyticsData(
      "/analytics/participacoes-me-gerais",
      filters,
    );
  },

  async listExpensesByNature(filters: ListExpensesByNatureDTO) {
    return getAnalyticsData("/analytics/gastos-por-natureza", filters);
  },

  async getMicroenterpriseIndicator(
    filters: GetMicroenterpriseIndicatorDTO,
  ) {
    return getAnalyticsData("/analytics/microempresas", filters);
  },

  async listMicroenterpriseParticipationByNature(
    filters: ListMicroenterpriseParticipationByNatureDTO,
  ) {
    return getAnalyticsData(
      "/analytics/participacao-me-por-natureza",
      filters,
    );
  },
};

export { analyticsService };
