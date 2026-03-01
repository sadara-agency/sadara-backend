// ═══════════════════════════════════════════════════════════════
// src/modules/training/training.schema.ts
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

export const createCourseSchema = z.object({
  title: z.string().min(1),
  titleAr: z.string().optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  contentType: z.enum(['Video', 'PDF', 'Link', 'Exercise', 'Mixed']).default('Mixed'),
  contentUrl: z.string().url().optional(),
  category: z.string().optional(),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Intermediate'),
  durationHours: z.number().positive().optional(),
});

export const updateCourseSchema = createCourseSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const enrollPlayersSchema = z.object({
  playerIds: z.array(z.string().uuid()).min(1, 'Select at least one player'),
});

export const updateEnrollmentSchema = z.object({
  status: z.enum(['NotStarted', 'InProgress', 'Completed', 'Dropped']).optional(),
  progressPct: z.number().int().min(0).max(100).optional(),
  notes: z.string().optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type UpdateEnrollmentInput = z.infer<typeof updateEnrollmentSchema>;