import axios from "axios";

import { analyticsApi } from "../../lib/axios/analytics-api";
import { AppError } from "../../utils/AppError";

interface ListDetailedBidsDTO {
  codigo_municipio?: string;
  codigo_natureza?: string;
  ano?: number;
  limit: number;
  offset: number;
}

interface ListLocalMicroenterpriseParticipationsDTO {
  codigo_municipio: string;
  ano?: number;
  limit: number;
  offset: number;
}

interface ListExpensesByNatureDTO {
  codigo_municipio?: string;
  data_inicio?: string;
  data_fim?: string;
}

interface GetMicroenterpriseIndicatorDTO {
  codigo_municipio?: string;
  codigo_natureza?: string;
  data_inicio?: string;
  data_fim?: string;
}

interface ListMicroenterpriseParticipationByNatureDTO {
  codigo_municipio?: string;
  data_inicio?: string;
  data_fim?: string;
}

interface AnalyticsQuery {
  codigo_municipio?: string;
  codigo_natureza?: string;
  ano?: number;
  data_inicio?: string;
  data_fim?: string;
  limit?: number;
  offset?: number;
}

async function getAnalyticsData(
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
      );
    }

    throw new AppError(
      "Não foi possível conectar à API de análise de dados.",
      502,
    );
  }
}

const analyticsService = {
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
