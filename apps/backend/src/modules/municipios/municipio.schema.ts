import { z } from "zod";

const listMunicipiosQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .describe(
      "Filtro opcional. Se contiver só dígitos, busca pelo código IBGE exato; caso contrário, busca pelo nome (contém, sem diferenciar maiúsculas).",
    ),
});

export { listMunicipiosQuerySchema };
