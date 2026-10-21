import { z } from "zod";
import { natureCodeSchema, periodFields, validPeriod } from "./shared.schema";

export const microenterpriseQuerySchema = z.object({
  ...periodFields,
  codigo_natureza: natureCodeSchema.optional(),
}).refine(validPeriod, "A data inicial deve ser anterior à final.");
