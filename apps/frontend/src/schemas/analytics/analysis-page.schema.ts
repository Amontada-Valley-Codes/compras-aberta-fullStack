import { z } from "zod";

export const analysisPageSchema = z.object({
  municipio: z.string().regex(/^\d{7}$/).optional().catch(undefined),
  natureza: z.string().regex(/^\d{2}$/).optional().catch(undefined),
  ano: z.coerce.number().int().min(2000).max(2100).optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).max(1000).optional().catch(undefined),
  limite: z.enum(["10", "20", "30"]).optional().catch(undefined),
});
