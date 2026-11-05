import { z } from "zod";
import { AVAILABLE_REPORT_MODEL_IDS } from "@/features/dashboard/gestor-publico/relatorios/report-catalog";
import { KNOWN_NATURE_CODES } from "@/features/public-data/plain-language";
import { GESTOR_YEARS } from "./gestor-page.schema";

// Consulta de /gestor/relatorios/dados. Só os modelos com fonte de dados
// podem ser pedidos; "receitas" é recusado aqui.
export const gestorReportQuerySchema = z.object({
  modelo: z.string().refine((value) => (AVAILABLE_REPORT_MODEL_IDS as string[]).includes(value)),
  municipio: z.string().regex(/^\d{7}$/),
  ano: z.coerce.number().int().refine((year) => (GESTOR_YEARS as readonly number[]).includes(year)),
  natureza: z.string().refine((code) => KNOWN_NATURE_CODES.includes(code)).optional(),
});
