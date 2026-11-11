import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  DIRECT_URL: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET deve ter pelo menos 32 caracteres"),
  API_DADOS: z
    .string()
    .url("API_DADOS deve ser uma URL válida")
    .default("https://comprasabertas.amontadavalley.com.br/api-dados"),
  // Dados cadastrais de CNPJ (base aberta da Receita Federal), usados para
  // preencher a solicitação de acesso.
  OPEN_CNPJ_API: z
    .string()
    .url("OPEN_CNPJ_API deve ser uma URL válida")
    .default("https://api.opencnpj.org"),
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
        .array(
          z.url("CORS_ORIGIN deve conter URLs válidas separadas por vírgula"),
        )
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

  PORT: z.coerce.number().int().min(1).default(3333),

  SUPABASE_URL: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  SUPABASE_STORAGE_BUCKET: z
    .string()
    .trim()
    .default("documentos-empresas"),

  ADMIN_EMAIL: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  ADMIN_PASSWORD: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),

  FRONTEND_URL: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.replace(/\/+$/, "") : undefined)),
  SMTP_HOST: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SMTP_USER: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  SMTP_PASS: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  SMTP_FROM: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),

  STRIPE_SECRET_KEY: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  STRIPE_PRICE_ID_MONTHLY: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
});


const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    `Variáveis de ambiente inválidas:\n${z.prettifyError(parsedEnv.error)}`,
  );
  process.exit(1);
}

const env = parsedEnv.data;

export { env };
