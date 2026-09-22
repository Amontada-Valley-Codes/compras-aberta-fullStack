import { z } from "zod";

const createUserSchema = z.object({
  name: z
    .string()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .describe("Nome completo do usuário (mínimo 3 caracteres)."),

  email: z
    .email("E-mail inválido")
    .describe(
      "E-mail de acesso. É normalizado (sem espaços, minúsculo) e deve ser único.",
    ),

  password: z
    .string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .describe("Senha de acesso (mínimo 6 caracteres)."),
});

export { createUserSchema };
