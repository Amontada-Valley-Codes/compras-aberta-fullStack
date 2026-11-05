import { z } from "zod";

export const bidStageSchema = z.enum([
  "analise",
  "proposta",
  "lance",
  "sessao",
  "homologada",
  "desistida",
]);

export const trackedBidItemSchema = z.object({
  id: z.string().min(1).max(100),
  itemNumber: z.number().int().min(1),
  description: z.string().trim().min(1).max(4000),
  quantity: z.number().min(0).nullable().optional().default(1),
  unit: z.string().trim().max(80).nullable().optional().default(null),
  estimatedUnitValue: z.number().min(0).nullable().optional().default(null),
  confidentialBudget: z.boolean().optional().default(false),
  benefitName: z.string().trim().max(180).nullable().optional().default(null),
  selected: z.boolean().optional().default(true),
  brand: z.string().trim().max(240).optional().default(""),
  model: z.string().trim().max(240).optional().default(""),
  minUnitPrice: z.number().min(0).nullable().optional().default(null),
  initialUnitPrice: z.number().min(0).nullable().optional().default(null),
  finalUnitPrice: z.number().min(0).nullable().optional().default(null),
  unitCost: z.number().min(0).nullable().optional().default(null),
  notes: z.string().trim().max(1000).optional().default(""),
  isManual: z.boolean().optional().default(false),
});

export const qualificationCheckItemSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(240),
  category: z.string().trim().max(80).optional().default("Habilitação"),
  checked: z.boolean().default(false),
  dueDate: z.string().trim().max(40).nullable().optional().default(null),
  notes: z.string().trim().max(500).optional().default(""),
});

export const trackedBidMetadataSchema = z
  .object({
    deliveryTerm: z.string().trim().max(240).optional(),
    paymentTerm: z.string().trim().max(240).optional(),
    proposalValidity: z.string().trim().max(120).optional(),
    auctioneerName: z.string().trim().max(160).optional(),
    auctioneerPhone: z.string().trim().max(80).optional(),
    auctioneerEmail: z.string().trim().max(160).optional(),
    deliveryAddress: z.string().trim().max(400).optional(),
    publicSessionAt: z.string().trim().max(60).nullable().optional(),
    appealDeadlineAt: z.string().trim().max(60).nullable().optional(),
    counterAppealDeadlineAt: z.string().trim().max(60).nullable().optional(),
    placement: z.string().trim().max(80).optional(),
    finalNegotiatedValue: z.number().min(0).nullable().optional(),
    winnerName: z.string().trim().max(240).optional(),
    sessionNotes: z.string().max(8000).optional(),
    pricingParams: z
      .object({
        taxPct: z.number().min(0).max(60),
        expensesPct: z.number().min(0).max(60),
        minMarginPct: z.number().min(0).max(80),
        targetMarginPct: z.number().min(0).max(80),
      })
      .optional(),
    qualificationChecklist: z
      .array(qualificationCheckItemSchema)
      .max(80)
      .optional(),
  })
  .passthrough();

export const bidSnapshotSchema = z
  .object({
    id: z.string().min(1).max(160),
  })
  .passthrough();

export const upsertTrackedBidSchema = z.object({
  bidControlId: z.string().trim().min(3).max(160),
  stage: bidStageSchema.optional(),
  nickname: z.string().trim().max(180).nullable().optional(),
  customStatus: z.string().trim().max(100).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  notes: z.string().max(12000).optional(),
  bidSnapshot: bidSnapshotSchema.optional(),
  metadata: trackedBidMetadataSchema.optional(),
  items: z.array(trackedBidItemSchema).max(1000).optional(),
});

export const createReminderSchema = z.object({
  title: z.string().trim().min(1, "Informe o título do lembrete").max(200),
  description: z.string().trim().max(1000).nullable().optional(),
  dueAt: z.string().trim().min(10).max(60),
  type: z
    .enum(["lembrete", "prazo", "sessao", "abertura"])
    .optional()
    .default("lembrete"),
  trackedBidId: z.string().trim().min(1).max(80).nullable().optional(),
  completed: z.boolean().optional().default(false),
});

export const updateReminderSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  dueAt: z.string().trim().min(10).max(60).optional(),
  type: z.enum(["lembrete", "prazo", "sessao", "abertura"]).optional(),
  completed: z.boolean().optional(),
});

export type UpsertTrackedBidInput = z.infer<typeof upsertTrackedBidSchema>;
export type CreateReminderInput = z.infer<typeof createReminderSchema>;
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;
