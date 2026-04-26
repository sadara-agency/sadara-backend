import { z } from "zod";

// ── Templates ──

export const createTemplateSchema = z.object({
  name: z.string().min(2).max(150),
  nameAr: z.string().max(150).optional(),
  category: z.enum([
    "depression",
    "anxiety",
    "stress",
    "burnout",
    "wellbeing",
    "custom",
  ]),
  questions: z
    .array(
      z.object({
        text: z.string().min(1),
        textAr: z.string().optional(),
        type: z.enum(["scale", "boolean", "text"]),
        min: z.number().optional(),
        max: z.number().optional(),
        weight: z.number().positive().optional(),
      }),
    )
    .min(1),
  scoringRanges: z
    .array(
      z.object({
        minScore: z.number(),
        maxScore: z.number(),
        label: z.string(),
        labelAr: z.string().optional(),
        severity: z.enum(["normal", "mild", "moderate", "severe"]),
      }),
    )
    .optional(),
  maxScore: z.number().positive().optional(),
  isValidated: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updateTemplateSchema = createTemplateSchema.partial();

// ── Assessments ──

export const createAssessmentSchema = z.object({
  templateId: z.string().uuid(),
  playerId: z.string().uuid(),
  administeredBy: z.string().uuid().optional(),
  assessmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  responses: z.array(
    z.object({
      questionIndex: z.number().int().min(0),
      value: z.union([z.number(), z.boolean(), z.string()]),
    }),
  ),
  clinicalNotes: z.string().optional(),
  clinicalNotesAr: z.string().optional(),
  recommendedActions: z.array(z.string()).optional(),
  followUpDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  isConfidential: z.boolean().optional(),
  status: z.enum(["pending", "completed", "reviewed"]).optional(),
});

export const updateAssessmentSchema = z
  .object({
    clinicalNotes: z.string(),
    clinicalNotesAr: z.string(),
    recommendedActions: z.array(z.string()),
    followUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    isConfidential: z.boolean(),
    status: z.enum(["pending", "completed", "reviewed"]),
  })
  .partial();

export const listAssessmentsSchema = z.object({
  playerId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  category: z
    .enum(["depression", "anxiety", "stress", "burnout", "wellbeing", "custom"])
    .optional(),
  severityLevel: z.enum(["normal", "mild", "moderate", "severe"]).optional(),
  status: z.enum(["pending", "completed", "reviewed"]).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

export type CreateTemplateDTO = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateDTO = z.infer<typeof updateTemplateSchema>;
export type CreateAssessmentDTO = z.infer<typeof createAssessmentSchema>;
export type UpdateAssessmentDTO = z.infer<typeof updateAssessmentSchema>;
export type ListAssessmentsQuery = z.infer<typeof listAssessmentsSchema>;
