import { z } from "zod";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Per-field hard caps. Kept in sync with the frontend FIELD_CAPS
// (frontend/src/lib/inbodyCalc.ts) and the OCR extractor's FIELDS ranges so
// extraction, the form, and the API all agree on what is plausible. These
// reject absurd single values (e.g. minerals 9500) at the API boundary.
const scanFields = z.object({
  playerId: z.string().uuid(),
  scanDate: z.string().regex(DATE_RE, "scanDate must be YYYY-MM-DD"),
  deviceTag: z.string().max(50).optional().nullable(),

  weightKg: z.number().min(25).max(250),
  bodyFatPct: z.number().min(2).max(75).optional().nullable(),
  leanBodyMassKg: z.number().min(20).max(150).optional().nullable(),
  skeletalMuscleMassKg: z.number().min(10).max(80).optional().nullable(),
  totalBodyWaterKg: z.number().min(15).max(100).optional().nullable(),
  proteinKg: z.number().min(3).max(30).optional().nullable(),
  mineralKg: z.number().min(1).max(10).optional().nullable(),

  segLeanRightArmKg: z.number().min(0.5).max(8).optional().nullable(),
  segLeanLeftArmKg: z.number().min(0.5).max(8).optional().nullable(),
  segLeanTrunkKg: z.number().min(10).max(50).optional().nullable(),
  segLeanRightLegKg: z.number().min(3).max(20).optional().nullable(),
  segLeanLeftLegKg: z.number().min(3).max(20).optional().nullable(),

  segFatRightArmKg: z.number().min(0.05).max(5).optional().nullable(),
  segFatLeftArmKg: z.number().min(0.05).max(5).optional().nullable(),
  segFatTrunkKg: z.number().min(0.5).max(30).optional().nullable(),
  segFatRightLegKg: z.number().min(0.2).max(12).optional().nullable(),
  segFatLeftLegKg: z.number().min(0.2).max(12).optional().nullable(),

  measuredBmrKcal: z.number().int().min(600).max(4000).optional().nullable(),
  visceralFatLevel: z.number().int().min(1).max(25).optional().nullable(),
  waistHipRatio: z.number().min(0.5).max(1.5).optional().nullable(),
  metabolicAge: z.number().int().min(10).max(120).optional().nullable(),

  pdfDocumentId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// A body-composition part can never exceed total body weight — this is a
// genuine impossibility (not device rounding), so it is rejected hard. Soft
// "sums should reconcile" checks live on the frontend as warnings only.
function checkPartExceedsWeight(
  data: {
    weightKg?: number | null;
    leanBodyMassKg?: number | null;
    totalBodyWaterKg?: number | null;
    skeletalMuscleMassKg?: number | null;
  },
  ctx: z.RefinementCtx,
): void {
  const w = data.weightKg;
  if (w == null) return;
  const parts = [
    ["leanBodyMassKg", data.leanBodyMassKg],
    ["totalBodyWaterKg", data.totalBodyWaterKg],
    ["skeletalMuscleMassKg", data.skeletalMuscleMassKg],
  ] as const;
  for (const [field, val] of parts) {
    if (val != null && val > w) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: `${field} cannot exceed body weight`,
      });
    }
  }
}

export const createScanSchema = scanFields.superRefine(checkPartExceedsWeight);

export const updateScanSchema = scanFields
  .omit({ playerId: true })
  .partial()
  .superRefine(checkPartExceedsWeight);

export const listScansQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
  from: z.string().regex(DATE_RE, "from must be YYYY-MM-DD").optional(),
  to: z.string().regex(DATE_RE, "to must be YYYY-MM-DD").optional(),
});

export const getScanSchema = z.object({
  id: z.string().uuid(),
});

export const getPlayerScansSchema = z.object({
  playerId: z.string().uuid(),
});

export type CreateScanDTO = z.infer<typeof createScanSchema>;
export type UpdateScanDTO = z.infer<typeof updateScanSchema>;
export type ListScansQueryDTO = z.infer<typeof listScansQuerySchema>;
