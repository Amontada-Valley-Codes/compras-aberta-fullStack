import { z } from "zod";

export const keywordGroupSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(80),
  keywords: z.array(z.string().trim().min(1).max(120)).max(800),
  desiredWords: z.array(z.string().trim().min(1).max(120)).max(800),
  excludedWords: z.array(z.string().trim().min(1).max(120)).max(800),
});

export const radarFilterConfigSchema = z.object({
  keywordGroups: z.array(keywordGroupSchema).max(20).default([]),
  useCompanyCnae: z.boolean().default(true),
  modality: z.string().trim().max(120).default(""),
  sector: z.string().trim().max(120).default(""),
  locationMode: z.enum(["state_city", "radius"]).default("state_city"),
  uf: z.string().trim().max(4).default("CE"),
  city: z.string().trim().max(120).default(""),
  radiusBaseCity: z.string().trim().max(120).default(""),
  radiusKm: z.number().min(1).max(5000).nullable().default(100),
  portal: z.string().trim().max(160).default(""),
  sphere: z.string().trim().max(20).default(""),
  srp: z.array(z.enum(["yes", "no"])).max(2).default([]),
  kind: z.array(z.enum(["material", "service"])).max(2).default([]),
  minTotalValue: z.number().min(0).nullable().default(null),
  maxTotalValue: z.number().min(0).nullable().default(null),
  minItemValue: z.number().min(0).nullable().default(null),
  maxItemValue: z.number().min(0).nullable().default(null),
});

export const upsertRadarFilterSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome para o filtro").max(100),
  isDefault: z.boolean().optional().default(false),
  config: radarFilterConfigSchema,
});

export const updateRadarBidStateSchema = z.object({
  bidControlId: z.string().trim().min(3).max(160),
  isSaved: z.boolean().optional(),
  isHidden: z.boolean().optional(),
});

export const syncSavedBidsSchema = z.object({
  savedBidIds: z.array(z.string().trim().min(3).max(160)).max(200),
});

export type RadarFilterConfigInput = z.infer<typeof radarFilterConfigSchema>;
export type UpsertRadarFilterInput = z.infer<typeof upsertRadarFilterSchema>;
export type UpdateRadarBidStateInput = z.infer<typeof updateRadarBidStateSchema>;
