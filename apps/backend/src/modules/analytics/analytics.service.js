"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsService = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../../env");
const memory_cache_1 = require("../../lib/cache/memory-cache");
const analytics_api_1 = require("../../lib/axios/analytics-api");
const AppError_1 = require("../../utils/AppError");
const analyticsCache = (0, memory_cache_1.createMemoryCache)({
    ttlMs: env_1.env.ANALYTICS_CACHE_TTL_SECONDS * 1000,
});
function buildCacheKey(pathname, query) {
    const sortedQuery = Object.entries(query)
        .filter(([, value]) => value !== undefined)
        .sort(([a], [b]) => a.localeCompare(b));
    return `${pathname}?${JSON.stringify(sortedQuery)}`;
}
function getAnalyticsData(pathname, query) {
    return analyticsCache.getOrLoad(buildCacheKey(pathname, query), () => fetchAnalyticsData(pathname, query));
}
async function fetchAnalyticsData(pathname, query) {
    try {
        const response = await analytics_api_1.analyticsApi.get(pathname, {
            params: query,
        });
        return response.data;
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error) && error.response) {
            throw new AppError_1.AppError("A API de análise de dados não conseguiu atender a consulta.", 502, {
                upstreamUrl: error.config?.url,
                upstreamStatus: error.response.status,
                upstreamBody: error.response.data,
                params: query,
            });
        }
        throw new AppError_1.AppError("Não foi possível conectar à API de análise de dados.", 502, {
            upstreamUrl: pathname,
            code: axios_1.default.isAxiosError(error) ? error.code : undefined,
            cause: error instanceof Error ? error.message : String(error),
            params: query,
        });
    }
}
const analyticsService = {
    async listDetailedBids(filters) {
        return getAnalyticsData("/analytics/licitacoes-detalhadas", filters);
    },
    async listLocalMicroenterpriseParticipations(filters) {
        return getAnalyticsData("/analytics/participacoes-me-locais", filters);
    },
    async listGeneralMicroenterpriseParticipations(filters) {
        return getAnalyticsData("/analytics/participacoes-me-gerais", filters);
    },
    async listExpensesByNature(filters) {
        return getAnalyticsData("/analytics/gastos-por-natureza", filters);
    },
    async getMicroenterpriseIndicator(filters) {
        return getAnalyticsData("/analytics/microempresas", filters);
    },
    async listMicroenterpriseParticipationByNature(filters) {
        return getAnalyticsData("/analytics/participacao-me-por-natureza", filters);
    },
};
exports.analyticsService = analyticsService;
