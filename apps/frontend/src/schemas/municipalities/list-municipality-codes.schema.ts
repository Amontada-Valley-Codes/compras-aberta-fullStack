import { z } from "zod";

export const listMunicipalityCodesSchema = z.object({
  uf: z.string().length(2).optional(),
  limit: z.number().int().min(1).max(100).default(100),
  offset: z.number().int().min(0).default(0),
});
