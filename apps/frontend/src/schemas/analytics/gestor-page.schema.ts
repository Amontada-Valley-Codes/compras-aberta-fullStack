import { z } from "zod";

// Anos com dados na fonte (TCE-CE), do mais recente para o mais antigo.
export const GESTOR_YEARS = [2026, 2025, 2024, 2023] as const;

export const gestorPageSchema = z.object({
  municipio: z.string().regex(/^\d{7}$/).optional().catch(undefined),
  ano: z.coerce.number().int().refine((year) => (GESTOR_YEARS as readonly number[]).includes(year)).optional().catch(undefined),
});
