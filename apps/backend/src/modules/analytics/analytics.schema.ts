import { z } from "zod";

const codigoMunicipio = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .describe(
    "Código do município no TCE-CE (o mesmo usado pela API de dados). Não é o código IBGE.",
  );

const optionalString = codigoMunicipio.optional();

const codigoNatureza = z
  .string()
  .trim()
  .length(2)
  .describe("Código da natureza (2 caracteres).");

const ano = z.coerce
  .number()
  .int()
  .min(2000)
  .max(2100)
  .describe("Ano da licitação (entre 2000 e 2100).");

const limit = z.coerce
  .number()
  .int()
  .min(1)
  .max(100)
  .default(100)
  .describe("Quantidade máxima de registros retornados (1 a 100).");

const offset = z.coerce
  .number()
  .int()
  .min(0)
  .default(0)
  .describe("Quantos registros pular, para paginação.");

const dataInicio = z
  .string()
  .date()
  .describe("Início do período, no formato AAAA-MM-DD.");

const dataFim = z
  .string()
  .date()
  .describe("Fim do período, no formato AAAA-MM-DD.");

const listDetailedBidsQuerySchema = z.object({
  codigo_municipio: optionalString,
  codigo_natureza: codigoNatureza.optional(),
  ano: ano.optional(),
  limit,
  offset,
});

const listLocalMicroenterpriseParticipationsQuerySchema = z.object({
  codigo_municipio: codigoMunicipio,
  codigo_natureza: codigoNatureza.optional(),
  ano: ano.optional(),
  limit,
  offset,
});

const listGeneralMicroenterpriseParticipationsQuerySchema = z.object({
  codigo_municipio: codigoMunicipio,
  codigo_natureza: codigoNatureza.optional(),
  ano: ano.optional(),
  limit,
  offset,
});

const listExpensesByNatureQuerySchema = z.object({
  codigo_municipio: optionalString,
  data_inicio: dataInicio.optional(),
  data_fim: dataFim.optional(),
});

const getMicroenterpriseIndicatorQuerySchema = z.object({
  codigo_municipio: optionalString,
  codigo_natureza: codigoNatureza.optional(),
  data_inicio: dataInicio.optional(),
  data_fim: dataFim.optional(),
});

const listMicroenterpriseParticipationByNatureQuerySchema = z.object({
  codigo_municipio: optionalString,
  data_inicio: dataInicio.optional(),
  data_fim: dataFim.optional(),
});

export {
  getMicroenterpriseIndicatorQuerySchema,
  listDetailedBidsQuerySchema,
  listExpensesByNatureQuerySchema,
  listGeneralMicroenterpriseParticipationsQuerySchema,
  listLocalMicroenterpriseParticipationsQuerySchema,
  listMicroenterpriseParticipationByNatureQuerySchema,
};
