import { z } from "zod";
import { municipalityCodeSchema, natureCodeSchema, yearSchema } from "./shared.schema";

export const detailedBidsQuerySchema = z.object({
  codigo_municipio: municipalityCodeSchema.optional(),
  codigo_natureza: natureCodeSchema.optional(),
  ano: yearSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});
