import { z } from "zod";

export const listMunicipalitiesSchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
});
