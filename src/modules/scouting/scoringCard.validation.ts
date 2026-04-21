import { z } from "zod";

const bucketScore = z.number().int().min(0).max(100).nullable().optional();

export const upsertScoringCardSchema = z.object({
  watchlistId: z.string().uuid(),
  windowId: z.string().uuid(),
  performanceScore: bucketScore,
  contractFitScore: bucketScore,
  commercialScore: bucketScore,
  culturalFitScore: bucketScore,
  criteriaScores: z
    .record(z.string().min(1), z.number().finite())
    .nullable()
    .optional(),
  notes: z.string().max(2000).optional(),
});

export const scoringCardQuerySchema = z.object({
  windowId: z.string().uuid().optional(),
  watchlistId: z.string().uuid().optional(),
  isShortlisted: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(50),
});

export type UpsertScoringCardInput = z.infer<typeof upsertScoringCardSchema>;
export type ScoringCardQuery = z.infer<typeof scoringCardQuerySchema>;
