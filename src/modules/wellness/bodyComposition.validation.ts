import { z } from "zod";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const createScanSchema = z.object({
  playerId: z.string().uuid(),
  scanDate: z.string().regex(DATE_RE, "scanDate must be YYYY-MM-DD"),
  scanDevice: z.string().max(50).optional().nullable(),

  weightKg: z.number().positive(),
  bodyFatPct: z.number().min(0).max(100).optional().nullable(),
  bodyFatMassKg: z.number().min(0).optional().nullable(),
  leanBodyMassKg: z.number().min(0).optional().nullable(),
  skeletalMuscleMassKg: z.number().min(0).optional().nullable(),
  totalBodyWaterKg: z.number().min(0).optional().nullable(),
  proteinKg: z.number().min(0).optional().nullable(),
  mineralsKg: z.number().min(0).optional().nullable(),

  segmentalLeanRightArm: z.number().min(0).optional().nullable(),
  segmentalLeanLeftArm: z.number().min(0).optional().nullable(),
  segmentalLeanTrunk: z.number().min(0).optional().nullable(),
  segmentalLeanRightLeg: z.number().min(0).optional().nullable(),
  segmentalLeanLeftLeg: z.number().min(0).optional().nullable(),

  segmentalFatRightArm: z.number().min(0).optional().nullable(),
  segmentalFatLeftArm: z.number().min(0).optional().nullable(),
  segmentalFatTrunk: z.number().min(0).optional().nullable(),
  segmentalFatRightLeg: z.number().min(0).optional().nullable(),
  segmentalFatLeftLeg: z.number().min(0).optional().nullable(),

  measuredBmr: z.number().int().positive().optional().nullable(),
  visceralFatLevel: z.number().int().min(1).max(30).optional().nullable(),
  visceralFatAreaCm2: z.number().min(0).optional().nullable(),
  waistHipRatio: z.number().min(0).max(5).optional().nullable(),
  metabolicAge: z.number().int().positive().optional().nullable(),

  pdfDocumentId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateScanSchema = createScanSchema
  .omit({ playerId: true })
  .partial();

export const listScansQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
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
