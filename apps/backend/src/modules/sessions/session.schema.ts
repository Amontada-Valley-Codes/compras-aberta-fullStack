import { z } from "zod";

import { email } from "../../utils/validation";

const createSessionSchema = z.object({
  email: email.describe("E-mail cadastrado do usuário."),
  // Sem regra de tamanho mínimo no login: a regra vale para o cadastro, e
  // exigir aqui só revelaria a política de senha a quem está tentando adivinhar.
  password: z
    .string()
    .min(1, "Senha é obrigatória")
    .max(200, "Senha inválida")
    .describe("Senha do usuário."),
});

const refreshSessionSchema = z.object({
  refreshToken: z
    .string()
    .min(1, "Refresh token é obrigatório")
    .max(200, "Refresh token inválido")
    .describe("Refresh token recebido no login ou no último refresh."),
});

type CreateSessionDTO = z.infer<typeof createSessionSchema>;

export { createSessionSchema, refreshSessionSchema };
export type { CreateSessionDTO };
