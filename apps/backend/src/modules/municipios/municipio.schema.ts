import { z } from "zod";

const listMunicipiosQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
});

export { listMunicipiosQuerySchema };
