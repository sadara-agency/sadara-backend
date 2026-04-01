import { z } from "zod";

// ── Course CRUD ──

export const createCourseSchema = z.object({
  title: z.string().min(1),
  titleAr: z.string().optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  contentType: z
    .enum(["Video", "PDF", "Link", "Exercise", "Mixed"])
    .default("Mixed"),
  contentUrl: z.string().url().optional(),
  category: z.string().optional(),
  difficulty: z
    .enum(["Beginner", "Intermediate", "Advanced"])
    .default("Intermediate"),
  durationHours: z.number().positive().optional(),
});

export const updateCourseSchema = createCourseSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ── Enrollment ──

export const enrollPlayersSchema = z.object({
  playerIds: z.array(z.string().uuid()).min(1, "Select at least one player"),
});

export const updateEnrollmentSchema = z.object({
  status: z
    .enum(["NotStarted", "InProgress", "Completed", "Dropped"])
    .optional(),
  progressPct: z.number().int().min(0).max(100).optional(),
  notes: z.string().optional(),
});

// ── NEW: Activity tracking (player self-service) ──

export const trackActivitySchema = z.object({
  action: z.enum([
    "Clicked",
    "VideoStarted",
    "VideoCompleted",
    "Downloaded",
    "Viewed",
  ]),
  metadata: z.record(z.unknown()).optional(),
});

// ── NEW: Player self-service progress update ──

export const selfUpdateProgressSchema = z.object({
  progressPct: z.number().int().min(0).max(100).optional(),
  notes: z.string().optional(),
});

// ── Inferred types ──

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type UpdateEnrollmentInput = z.infer<typeof updateEnrollmentSchema>;
export type TrackActivityInput = z.infer<typeof trackActivitySchema>;
export type SelfUpdateProgressInput = z.infer<typeof selfUpdateProgressSchema>;
