import { z } from "zod";

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const listQuerySchema = z.object({
  playerId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(20),
  page: z.coerce.number().int().min(1).default(1),
});

/**
 * Multipart form-data fields accepted by POST /medical-reports/upload.
 * The file itself is parsed separately by multer, so it's not in this schema.
 */
export const uploadBodySchema = z.object({
  playerId: z.string().uuid(),
  provider: z.string().max(200).optional(),
  reportType: z.string().max(100).optional(),
  reportDate: z.string().optional(), // ISO date; optional — parser may fill
  collectedDate: z.string().optional(),
  summaryNotes: z.string().max(5000).optional(),
});

export const updateReportSchema = z.object({
  provider: z.string().max(200).nullable().optional(),
  reportType: z.string().max(100).nullable().optional(),
  reportDate: z.string().nullable().optional(),
  collectedDate: z.string().nullable().optional(),
  summaryNotes: z.string().max(5000).nullable().optional(),
});

export const labResultInputSchema = z.object({
  id: z.string().uuid().optional(), // present = update, absent = create
  category: z.string().max(100).nullable().optional(),
  name: z.string().min(1).max(300),
  valueNumeric: z.number().nullable().optional(),
  valueText: z.string().max(200).nullable().optional(),
  unit: z.string().max(50).nullable().optional(),
  flag: z.enum(["H", "L", "N", ""]).nullable().optional(),
  refRangeLow: z.number().nullable().optional(),
  refRangeHigh: z.number().nullable().optional(),
  refRangeText: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateLabResultsSchema = z.object({
  labResults: z.array(labResultInputSchema).min(0).max(500),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
export type UploadBody = z.infer<typeof uploadBodySchema>;
export type UpdateReportInput = z.infer<typeof updateReportSchema>;
export type UpdateLabResultsInput = z.infer<typeof updateLabResultsSchema>;
export type LabResultInput = z.infer<typeof labResultInputSchema>;
