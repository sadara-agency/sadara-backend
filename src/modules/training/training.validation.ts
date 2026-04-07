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

// ── Modules ──

export const createModuleSchema = z.object({
  title: z.string().min(1).max(500),
  titleAr: z.string().max(500).optional(),
  description: z.string().optional(),
});

export const updateModuleSchema = createModuleSchema.partial();

export const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1).max(100),
});

// ── Lessons ──

export const createLessonSchema = z.object({
  title: z.string().min(1).max(500),
  titleAr: z.string().max(500).optional(),
  type: z.enum(["video", "pdf", "link", "quiz"]).default("video"),
  contentUrl: z.string().url().optional(),
  durationSec: z.number().int().positive().optional(),
  isFree: z.boolean().optional(),
});

export const updateLessonSchema = createLessonSchema.partial();

// ── Lesson Progress ──

export const updateLessonProgressSchema = z.object({
  position: z.number().int().min(0),
  duration: z.number().int().min(1),
});

export const markLessonCompleteSchema = z.object({
  lessonId: z.string().uuid(),
});

// ── Inferred types ──

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type UpdateEnrollmentInput = z.infer<typeof updateEnrollmentSchema>;
export type TrackActivityInput = z.infer<typeof trackActivitySchema>;
export type SelfUpdateProgressInput = z.infer<typeof selfUpdateProgressSchema>;
