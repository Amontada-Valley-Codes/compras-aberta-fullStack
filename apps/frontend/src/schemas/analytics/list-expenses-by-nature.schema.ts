import { z } from "zod";
import { periodFields, validPeriod } from "./shared.schema";

export const expensesByNatureQuerySchema = z.object(periodFields)
  .refine(validPeriod, "A data inicial deve ser anterior à final.");
