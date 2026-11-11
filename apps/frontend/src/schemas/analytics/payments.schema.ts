import { z } from "zod";

export const paymentsSummaryQuerySchema = z.object({
  codigo_municipio: z.string().trim().length(3),
  ano: z.coerce.number().int().min(2000).max(2100),
  coleta_id: z.coerce.number().int().min(1).optional(),
});
export const paymentSuppliersQuerySchema = paymentsSummaryQuerySchema.extend({
  codigo_natureza: z.string().length(2).optional(),
  categoria_porte: z.string().max(40).default("ME"),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});
export const localPaymentsQuerySchema = z.object({
  codigo_municipio: z.string().trim().min(1).max(20),
  codigo_natureza: z.string().length(2).optional(),
  ano: z.coerce.number().int().min(2000).max(2100),
  coleta_id: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});
