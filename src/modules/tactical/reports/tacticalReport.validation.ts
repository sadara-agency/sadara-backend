import { z } from "zod";

export const createTacticalReportSchema = z.object({
  playerId: z.string().uuid(),
  analystId: z.string().uuid().optional(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  title: z.string().min(1).max(255),
  titleAr: z.string().max(255).optional(),
  summary: z.string().optional(),
  summaryAr: z.string().optional(),
  tacticalStrengths: z.array(z.string()).optional(),
  tacticalWeaknesses: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
  kpiSnapshot: z.record(z.unknown()).optional(),
  matchesAnalyzed: z.number().int().min(0).optional(),
  status: z.enum(["draft", "published"]).optional(),
});

export const updateTacticalReportSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  titleAr: z.string().max(255).optional(),
  summary: z.string().optional(),
  summaryAr: z.string().optional(),
  tacticalStrengths: z.array(z.string()).optional(),
  tacticalWeaknesses: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
  kpiSnapshot: z.record(z.unknown()).optional(),
  matchesAnalyzed: z.number().int().min(0).optional(),
  status: z.enum(["draft", "published"]).optional(),
  filePath: z.string().max(500).optional(),
});

export const tacticalReportQuerySchema = z.object({
  playerId: z.string().uuid().optional(),
  analystId: z.string().uuid().optional(),
  status: z.enum(["draft", "published"]).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
});

export const autoGenerateSchema = z.object({
  playerId: z.string().uuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

export type CreateTacticalReportInput = z.infer<
  typeof createTacticalReportSchema
>;
export type UpdateTacticalReportInput = z.infer<
  typeof updateTacticalReportSchema
>;
export type TacticalReportQuery = z.infer<typeof tacticalReportQuerySchema>;
export type AutoGenerateInput = z.infer<typeof autoGenerateSchema>;
