import { z } from "zod";
import { email, password } from "../../utils/validation";
import { cnpj } from "../../utils/cnpj";

export const registerBusinessSchema = z.object({
  usuario: z.string().trim().min(3).max(120).describe("Nome do usuário (3 a 120 caracteres)."),
  password: password.describe("Senha de acesso (mínimo 6 caracteres)."),
  cnpj: cnpj,
  nome_empresa: z.string().trim().min(2).max(200).describe("Nome da empresa (2 a 200 caracteres)."),
  porte_empresa: z.enum(["MEI", "ME", "EPP"]).describe("Porte da empresa."),
  email: email,
});

export type RegisterBusinessDTO = z.infer<typeof registerBusinessSchema>;
