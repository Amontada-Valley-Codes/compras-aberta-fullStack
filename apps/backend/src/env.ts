import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET deve ter pelo menos 32 caracteres"),
});

const env = envSchema.parse(process.env);

export { env };
