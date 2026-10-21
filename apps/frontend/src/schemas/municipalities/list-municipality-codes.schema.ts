import { z } from "zod";

export const listMunicipalityCodesSchema = z.object({
  limit: z.number().int().min(1).max(100).default(100),
  offset: z.number().int().min(0).default(0),
});
