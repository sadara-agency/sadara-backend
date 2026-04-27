import { z } from "zod";

const STATUS_VALUES = ["draft", "published"] as const;
const PRESSING_VALUES = ["low", "medium", "high"] as const;
const SHAPE_VALUES = [
  "low_block",
  "mid_block",
  "high_press",
  "compact_mid",
] as const;

const keyThreatSchema = z.object({
  playerName: z.string().trim().min(1).max(100),
  role: z.string().trim().min(1).max(50),
  notes: z.string().trim().max(500).default(""),
});

const setPieceTendenciesSchema = z
  .object({
    corners: z.string().trim().max(500).optional(),
    freeKicks: z.string().trim().max(500).optional(),
    penalties: z.string().trim().max(300).optional(),
    throwIns: z.string().trim().max(300).optional(),
  })
  .optional()
  .nullable();

export const createOppositionReportSchema = z.object({
  opponentName: z.string().trim().min(1).max(120),
  opponentNameAr: z.string().trim().max(120).optional().nullable(),
  matchId: z.string().uuid().optional().nullable(),
  matchDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  formation: z.string().trim().max(20).optional().nullable(),
  pressingIntensity: z.enum(PRESSING_VALUES).optional().nullable(),
  defensiveShape: z.enum(SHAPE_VALUES).optional().nullable(),
  keyThreats: z.array(keyThreatSchema).max(10).optional().nullable(),
  setPieceTendencies: setPieceTendenciesSchema,
  analystNotes: z.string().trim().max(3000).optional().nullable(),
  analystNotesAr: z.string().trim().max(3000).optional().nullable(),
  status: z.enum(STATUS_VALUES).optional(),
});

export const updateOppositionReportSchema =
  createOppositionReportSchema.partial();

export const oppositionReportQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(STATUS_VALUES).optional(),
  analystId: z.string().uuid().optional(),
});

export const oppositionReportParamsSchema = z.object({
  id: z.string().uuid(),
});

export type CreateOppositionReportInput = z.infer<
  typeof createOppositionReportSchema
>;
export type UpdateOppositionReportInput = z.infer<
  typeof updateOppositionReportSchema
>;
export type OppositionReportQuery = z.infer<typeof oppositionReportQuerySchema>;
