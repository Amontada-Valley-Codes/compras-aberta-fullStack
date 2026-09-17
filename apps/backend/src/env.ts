import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET deve ter pelo menos 32 caracteres"),
  API_DADOS: z
    .string()
    .url("API_DADOS deve ser uma URL válida")
    .default("https://compra-aberta-api.onrender.com"),
});

const env = envSchema.parse(process.env);

export { env };
