"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMicroenterpriseParticipationByNatureQuerySchema = exports.listLocalMicroenterpriseParticipationsQuerySchema = exports.listGeneralMicroenterpriseParticipationsQuerySchema = exports.listExpensesByNatureQuerySchema = exports.listDetailedBidsQuerySchema = exports.getMicroenterpriseIndicatorQuerySchema = void 0;
const zod_1 = require("zod");
const codigoMunicipio = zod_1.z
    .string()
    .trim()
    .min(1)
    .max(20)
    .describe("Código do município no TCE-CE (o mesmo usado pela API de dados). Não é o código IBGE.");
const optionalString = codigoMunicipio.optional();
const codigoNatureza = zod_1.z
    .string()
    .trim()
    .length(2)
    .describe("Código da natureza (2 caracteres).");
const ano = zod_1.z.coerce
    .number()
    .int()
    .min(2000)
    .max(2100)
    .describe("Ano da licitação (entre 2000 e 2100).");
const limit = zod_1.z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(100)
    .describe("Quantidade máxima de registros retornados (1 a 100).");
const offset = zod_1.z.coerce
    .number()
    .int()
    .min(0)
    .default(0)
    .describe("Quantos registros pular, para paginação.");
const dataInicio = zod_1.z
    .string()
    .date()
    .describe("Início do período, no formato AAAA-MM-DD.");
const dataFim = zod_1.z
    .string()
    .date()
    .describe("Fim do período, no formato AAAA-MM-DD.");
const listDetailedBidsQuerySchema = zod_1.z.object({
    codigo_municipio: optionalString,
    codigo_natureza: codigoNatureza.optional(),
    ano: ano.optional(),
    limit,
    offset,
});
exports.listDetailedBidsQuerySchema = listDetailedBidsQuerySchema;
const listLocalMicroenterpriseParticipationsQuerySchema = zod_1.z.object({
    codigo_municipio: codigoMunicipio,
    codigo_natureza: codigoNatureza.optional(),
    ano: ano.optional(),
    limit,
    offset,
});
exports.listLocalMicroenterpriseParticipationsQuerySchema = listLocalMicroenterpriseParticipationsQuerySchema;
const listGeneralMicroenterpriseParticipationsQuerySchema = zod_1.z.object({
    codigo_municipio: codigoMunicipio,
    codigo_natureza: codigoNatureza.optional(),
    ano: ano.optional(),
    limit,
    offset,
});
exports.listGeneralMicroenterpriseParticipationsQuerySchema = listGeneralMicroenterpriseParticipationsQuerySchema;
// data_inicio/data_fim chegam como AAAA-MM-DD, então a comparação de
// strings já respeita a ordem cronológica.
function validPeriod(value) {
    return !value.data_inicio || !value.data_fim || value.data_inicio <= value.data_fim;
}
const invalidPeriodError = {
    message: "data_inicio deve ser anterior ou igual a data_fim",
    path: ["data_fim"],
};
const listExpensesByNatureQuerySchema = zod_1.z
    .object({
    codigo_municipio: optionalString,
    data_inicio: dataInicio.optional(),
    data_fim: dataFim.optional(),
})
    .refine(validPeriod, invalidPeriodError);
exports.listExpensesByNatureQuerySchema = listExpensesByNatureQuerySchema;
const getMicroenterpriseIndicatorQuerySchema = zod_1.z
    .object({
    codigo_municipio: optionalString,
    codigo_natureza: codigoNatureza.optional(),
    data_inicio: dataInicio.optional(),
    data_fim: dataFim.optional(),
})
    .refine(validPeriod, invalidPeriodError);
exports.getMicroenterpriseIndicatorQuerySchema = getMicroenterpriseIndicatorQuerySchema;
const listMicroenterpriseParticipationByNatureQuerySchema = zod_1.z
    .object({
    codigo_municipio: optionalString,
    data_inicio: dataInicio.optional(),
    data_fim: dataFim.optional(),
})
    .refine(validPeriod, invalidPeriodError);
exports.listMicroenterpriseParticipationByNatureQuerySchema = listMicroenterpriseParticipationByNatureQuerySchema;
