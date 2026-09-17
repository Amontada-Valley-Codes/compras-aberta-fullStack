import { z } from "zod";

export const municipalityCodeSchema = z.string().trim().min(1).max(20);
export const natureCodeSchema = z.string().regex(/^\d{2}$/);
export const yearSchema = z.number().int().min(2000).max(2100);
export const periodFields = {
  codigo_municipio: municipalityCodeSchema.optional(),
  data_inicio: z.iso.date().optional(),
  data_fim: z.iso.date().optional(),
};
export const validPeriod = (value: { data_inicio?: string; data_fim?: string }) =>
  !value.data_inicio || !value.data_fim || value.data_inicio <= value.data_fim;
