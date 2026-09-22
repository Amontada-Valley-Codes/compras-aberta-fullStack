import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET deve ter pelo menos 32 caracteres"),
  API_DADOS: z.string().url("API_DADOS deve ser uma URL válida"),
  CORS_ORIGIN: z
    .string()
    .default("http://localhost:3000")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim().replace(/\/+$/, ""))
        .filter(Boolean),
    )
    .pipe(
      z
        .array(z.url("CORS_ORIGIN deve conter URLs válidas separadas por vírgula"))
        .min(1, "CORS_ORIGIN não pode ficar vazio"),
    ),
  TRUST_PROXY: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  ANALYTICS_CACHE_TTL_SECONDS: z.coerce.number().int().min(0).default(300),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
});

const env = envSchema.parse(process.env);

export { env };
