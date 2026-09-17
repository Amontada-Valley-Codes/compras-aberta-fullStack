import { z } from "zod";

const optionalString = z.string().trim().min(1).max(20).optional();

const listDetailedBidsQuerySchema = z.object({
  codigo_municipio: optionalString,
  codigo_natureza: z.string().trim().length(2).optional(),
  ano: z.coerce.number().int().min(2000).max(2100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

const listLocalMicroenterpriseParticipationsQuerySchema = z.object({
  codigo_municipio: z.string().trim().min(1).max(20),
  ano: z.coerce.number().int().min(2000).max(2100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

const listExpensesByNatureQuerySchema = z.object({
  codigo_municipio: optionalString,
  data_inicio: z.string().date().optional(),
  data_fim: z.string().date().optional(),
});

const getMicroenterpriseIndicatorQuerySchema = z.object({
  codigo_municipio: optionalString,
  codigo_natureza: z.string().trim().length(2).optional(),
  data_inicio: z.string().date().optional(),
  data_fim: z.string().date().optional(),
});

const listMicroenterpriseParticipationByNatureQuerySchema = z.object({
  codigo_municipio: optionalString,
  data_inicio: z.string().date().optional(),
  data_fim: z.string().date().optional(),
});

export {
  getMicroenterpriseIndicatorQuerySchema,
  listDetailedBidsQuerySchema,
  listExpensesByNatureQuerySchema,
  listLocalMicroenterpriseParticipationsQuerySchema,
  listMicroenterpriseParticipationByNatureQuerySchema,
};
