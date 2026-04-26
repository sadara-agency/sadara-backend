import { z } from "zod";

const REVIEW_STATUSES = ["draft", "submitted", "acknowledged"] as const;

// Assessment block (e.g. { rating: 7, notes: "..." })
const assessmentSchema = z.record(z.unknown()).optional();

export const createDevReviewSchema = z.object({
  playerId: z.string().uuid(),
  reviewerId: z.string().uuid().optional(),
  quarterLabel: z.string().regex(/^Q[1-4]-\d{4}$/, "Must be Q1-2026 format"),
  reviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  technicalAssessment: assessmentSchema,
  tacticalAssessment: assessmentSchema,
  physicalAssessment: assessmentSchema,
  mentalAssessment: assessmentSchema,
  overallRating: z.number().min(1).max(10).optional(),
  strengths: z.array(z.string()).optional(),
  developmentAreas: z.array(z.string()).optional(),
  shortTermGoals: z.array(z.string()).optional(),
  longTermGoals: z.array(z.string()).optional(),
  previousGoalsReview: z.record(z.unknown()).optional(),
  notes: z.string().optional(),
  notesAr: z.string().optional(),
});

export const updateDevReviewSchema = z.object({
  reviewDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  technicalAssessment: assessmentSchema,
  tacticalAssessment: assessmentSchema,
  physicalAssessment: assessmentSchema,
  mentalAssessment: assessmentSchema,
  overallRating: z.number().min(1).max(10).optional(),
  strengths: z.array(z.string()).optional(),
  developmentAreas: z.array(z.string()).optional(),
  shortTermGoals: z.array(z.string()).optional(),
  longTermGoals: z.array(z.string()).optional(),
  previousGoalsReview: z.record(z.unknown()).optional(),
  notes: z.string().optional(),
  notesAr: z.string().optional(),
  status: z.enum(REVIEW_STATUSES).optional(),
});

export const devReviewQuerySchema = z.object({
  playerId: z.string().uuid().optional(),
  reviewerId: z.string().uuid().optional(),
  status: z.enum(REVIEW_STATUSES).optional(),
  quarterLabel: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
});

export const generateTemplateSchema = z.object({
  playerId: z.string().uuid(),
  quarterLabel: z.string().regex(/^Q[1-4]-\d{4}$/),
});

export type CreateDevReviewInput = z.infer<typeof createDevReviewSchema>;
export type UpdateDevReviewInput = z.infer<typeof updateDevReviewSchema>;
export type DevReviewQuery = z.infer<typeof devReviewQuerySchema>;
export type GenerateTemplateInput = z.infer<typeof generateTemplateSchema>;
