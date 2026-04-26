import { z } from "zod";

const ratingField = z.coerce.number().int().min(1).max(10).optional();

// ── Create ──

export const createSessionFeedbackSchema = z.object({
  technicalRating: ratingField,
  tacticalRating: ratingField,
  physicalRating: ratingField,
  mentalRating: ratingField,
  overallRating: z.coerce.number().min(0).max(10).optional(),
  effortLevel: ratingField,
  attitudeRating: ratingField,
  strengths: z.string().optional(),
  strengthsAr: z.string().optional(),
  areasToImprove: z.string().optional(),
  areasToImproveAr: z.string().optional(),
  coachNotes: z.string().optional(),
  coachNotesAr: z.string().optional(),
  metrics: z.record(z.any()).optional(),
});

// ── Update ──

export const updateSessionFeedbackSchema =
  createSessionFeedbackSchema.partial();

// ── Query ──

export const feedbackQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(20),
  sort: z
    .enum(["created_at", "overall_rating", "session_date"])
    .default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  playerId: z.string().uuid().optional(),
  coachId: z.string().uuid().optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

// ── Inferred Types ──

export type CreateSessionFeedbackInput = z.infer<
  typeof createSessionFeedbackSchema
>;
export type UpdateSessionFeedbackInput = z.infer<
  typeof updateSessionFeedbackSchema
>;
export type FeedbackQuery = z.infer<typeof feedbackQuerySchema>;
