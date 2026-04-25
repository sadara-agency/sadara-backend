import { z } from "zod";

import { PLAYER_REVIEW_STATUSES } from "./playerReview.model";

// ── List filter ──

export const playerReviewQuerySchema = z.object({
  status: z.enum(PLAYER_REVIEW_STATUSES).optional(),
  squadId: z.string().uuid().optional(),
  season: z
    .string()
    .regex(/^\d{4}-\d{4}$/, "Season must be YYYY-YYYY format")
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ── Path params ──

export const playerReviewIdSchema = z.object({
  id: z.string().uuid(),
});

// ── Body schemas ──

export const linkReviewSchema = z.object({
  playerId: z.string().uuid(),
});

export const rejectReviewSchema = z
  .object({
    reason: z.string().max(500).optional(),
  })
  .optional()
  .default({});

export type PlayerReviewQuery = z.infer<typeof playerReviewQuerySchema>;
export type LinkReviewDto = z.infer<typeof linkReviewSchema>;
