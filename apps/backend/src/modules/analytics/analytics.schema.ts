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

// data_inicio/data_fim chegam como AAAA-MM-DD, então a comparação de
// strings já respeita a ordem cronológica.
function validPeriod(value: { data_inicio?: string; data_fim?: string }) {
  return !value.data_inicio || !value.data_fim || value.data_inicio <= value.data_fim;
}

const invalidPeriodError = {
  message: "data_inicio deve ser anterior ou igual a data_fim",
  path: ["data_fim"],
};

const listExpensesByNatureQuerySchema = z
  .object({
    codigo_municipio: optionalString,
    data_inicio: dataInicio.optional(),
    data_fim: dataFim.optional(),
  })
  .refine(validPeriod, invalidPeriodError);

const getMicroenterpriseIndicatorQuerySchema = z
  .object({
    codigo_municipio: optionalString,
    codigo_natureza: codigoNatureza.optional(),
    data_inicio: dataInicio.optional(),
    data_fim: dataFim.optional(),
  })
  .refine(validPeriod, invalidPeriodError);

const listMicroenterpriseParticipationByNatureQuerySchema = z
  .object({
    codigo_municipio: optionalString,
    data_inicio: dataInicio.optional(),
    data_fim: dataFim.optional(),
  })
  .refine(validPeriod, invalidPeriodError);

type ListDetailedBidsDTO = z.infer<typeof listDetailedBidsQuerySchema>;
type ListLocalMicroenterpriseParticipationsDTO = z.infer<
  typeof listLocalMicroenterpriseParticipationsQuerySchema
>;
type ListGeneralMicroenterpriseParticipationsDTO = z.infer<
  typeof listGeneralMicroenterpriseParticipationsQuerySchema
>;
type ListExpensesByNatureDTO = z.infer<typeof listExpensesByNatureQuerySchema>;
type GetMicroenterpriseIndicatorDTO = z.infer<
  typeof getMicroenterpriseIndicatorQuerySchema
>;
type ListMicroenterpriseParticipationByNatureDTO = z.infer<
  typeof listMicroenterpriseParticipationByNatureQuerySchema
>;

export {
  getMicroenterpriseIndicatorQuerySchema,
  listDetailedBidsQuerySchema,
  listExpensesByNatureQuerySchema,
  listGeneralMicroenterpriseParticipationsQuerySchema,
  listLocalMicroenterpriseParticipationsQuerySchema,
  listMicroenterpriseParticipationByNatureQuerySchema,
};
export type {
  GetMicroenterpriseIndicatorDTO,
  ListDetailedBidsDTO,
  ListExpensesByNatureDTO,
  ListGeneralMicroenterpriseParticipationsDTO,
  ListLocalMicroenterpriseParticipationsDTO,
  ListMicroenterpriseParticipationByNatureDTO,
};
