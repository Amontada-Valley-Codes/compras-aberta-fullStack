import { z } from "zod";
import { municipalityCodeSchema, yearSchema } from "./shared.schema";

export const localParticipationsQuerySchema = z.object({
  codigo_municipio: municipalityCodeSchema,
  ano: yearSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});
