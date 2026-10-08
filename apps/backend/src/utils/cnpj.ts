import { z } from "zod";

export function sanitizeCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}

export const cnpj = z
  .string()
  .trim()
  .transform(sanitizeCnpj)
  .refine((val) => val.length === 14, {
    message: "CNPJ inválido",
  })
  .describe("CNPJ da empresa (14 dígitos, com ou sem formatação).");
