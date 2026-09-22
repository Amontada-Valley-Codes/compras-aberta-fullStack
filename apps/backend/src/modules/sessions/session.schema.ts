import { z } from "zod";

const createSessionSchema = z.object({
  email: z.email("E-mail inválido").describe("E-mail cadastrado do usuário."),
  password: z
    .string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .describe("Senha do usuário."),
});

export { createSessionSchema };
