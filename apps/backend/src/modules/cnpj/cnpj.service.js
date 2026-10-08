"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cnpjService = void 0;
const axios_1 = __importDefault(require("axios"));
const opencnpj_api_1 = require("../../lib/axios/opencnpj-api");
const memory_cache_1 = require("../../lib/cache/memory-cache");
const AppError_1 = require("../../utils/AppError");
const municipio_service_1 = require("../municipios/municipio.service");
// Os dados cadastrais mudam pouco; um dia de cache evita repetir a consulta
// externa a cada tecla ou reenvio do formulário.
const cnpjCache = (0, memory_cache_1.createMemoryCache)({
    ttlMs: 24 * 60 * 60 * 1000,
});
// A Receita grava o município em maiúsculas e sem acentos ("SAO GONCALO DO
// AMARANTE"); o catálogo usa o nome do IBGE ("São Gonçalo do Amarante").
function normalizeName(value) {
    return value
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, " ")
        .trim()
        .toUpperCase();
}
async function findMunicipioIbge(nome, uf) {
    // O catálogo só tem municípios do Ceará.
    if (uf !== "CE") {
        return null;
    }
    const municipios = await municipio_service_1.municipioService.list({});
    const target = normalizeName(nome);
    const match = municipios.find((municipio) => municipio.nome && normalizeName(municipio.nome) === target);
    return match?.id ?? null;
}
function mainPhone(telefones) {
    const phone = telefones?.find((item) => !item.is_fax && item.numero);
    const digits = phone ? `${phone.ddd}${phone.numero}`.replace(/\D/g, "") : "";
    return /^\d{10,11}$/.test(digits) ? digits : null;
}
async function fetchCnpj(cnpj) {
    try {
        const { data } = await opencnpj_api_1.openCnpjApi.get(`/${cnpj}`);
        return data;
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error) && error.response?.status === 404) {
            throw new AppError_1.AppError("CNPJ não encontrado na Receita Federal", 404);
        }
        throw new AppError_1.AppError("Não foi possível consultar o CNPJ na Receita Federal agora.", 502, {
            upstreamStatus: axios_1.default.isAxiosError(error)
                ? error.response?.status
                : undefined,
            code: axios_1.default.isAxiosError(error) ? error.code : undefined,
            cause: error instanceof Error ? error.message : String(error),
        });
    }
}
const cnpjService = {
    async find({ cnpj }) {
        const data = await cnpjCache.getOrLoad(cnpj, () => fetchCnpj(cnpj));
        return {
            cnpj: data.cnpj,
            razaoSocial: data.razao_social,
            nomeFantasia: data.nome_fantasia || null,
            situacaoCadastral: data.situacao_cadastral,
            porte: data.porte_empresa || null,
            atividadePrincipal: data.cnaes?.find((cnae) => cnae.is_principal)?.descricao ?? null,
            municipio: {
                nome: data.municipio,
                uf: data.uf,
                codigoIbge: await findMunicipioIbge(data.municipio, data.uf),
            },
            telefone: mainPhone(data.telefones),
            email: data.email ? data.email.trim().toLowerCase() : null,
        };
    },
};
exports.cnpjService = cnpjService;
