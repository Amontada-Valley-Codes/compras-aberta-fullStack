"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    DATABASE_URL: zod_1.z.string().min(1, "DATABASE_URL é obrigatória"),
    JWT_SECRET: zod_1.z
        .string()
        .min(32, "JWT_SECRET deve ter pelo menos 32 caracteres"),
    API_DADOS: zod_1.z.string().url("API_DADOS deve ser uma URL válida"),
    // Dados cadastrais de CNPJ (base aberta da Receita Federal), usados para
    // preencher a solicitação de acesso.
    OPEN_CNPJ_API: zod_1.z
        .string()
        .url("OPEN_CNPJ_API deve ser uma URL válida")
        .default("https://api.opencnpj.org"),
    CORS_ORIGIN: zod_1.z
        .string()
        .default("http://localhost:3000")
        .transform((value) => value
        .split(",")
        .map((origin) => origin.trim().replace(/\/+$/, ""))
        .filter(Boolean))
        .pipe(zod_1.z
        .array(zod_1.z.url("CORS_ORIGIN deve conter URLs válidas separadas por vírgula"))
        .min(1, "CORS_ORIGIN não pode ficar vazio")),
    TRUST_PROXY: zod_1.z
        .enum(["true", "false"])
        .default("false")
        .transform((value) => value === "true"),
    ANALYTICS_CACHE_TTL_SECONDS: zod_1.z.coerce.number().int().min(0).default(300),
    LOG_LEVEL: zod_1.z
        .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
        .default("info"),
    PORT: zod_1.z.coerce.number().int().min(1).default(3333),
});
const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
    console.error(`Variáveis de ambiente inválidas:\n${zod_1.z.prettifyError(parsedEnv.error)}`);
    process.exit(1);
}
const env = parsedEnv.data;
exports.env = env;
