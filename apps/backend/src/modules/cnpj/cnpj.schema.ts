import { z } from "zod";

import { cnpj } from "../../utils/validation";

const findCnpjParamsSchema = z.object({
  cnpj: cnpj.describe(
    "CNPJ a consultar. Aceita com ou sem máscara; os dígitos verificadores são validados.",
  ),
});

type FindCnpjDTO = z.infer<typeof findCnpjParamsSchema>;

export { findCnpjParamsSchema };
export type { FindCnpjDTO };
