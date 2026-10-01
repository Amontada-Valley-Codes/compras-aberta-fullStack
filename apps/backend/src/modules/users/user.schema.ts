import { z } from "zod";

import { email, password } from "../../utils/validation";

const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(120, "Nome deve ter no máximo 120 caracteres")
    .describe("Nome completo do usuário (3 a 120 caracteres)."),

  email: email.describe(
    "E-mail de acesso. É normalizado (sem espaços, minúsculo) e deve ser único.",
  ),

  password: password.describe("Senha de acesso (mínimo 6 caracteres)."),
});

type CreateUserDTO = z.infer<typeof createUserSchema>;

export { createUserSchema };
export type { CreateUserDTO };
