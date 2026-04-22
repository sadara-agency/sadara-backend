import { z } from "zod";

export const sessionTypeEnum = z.enum([
  "club_training",
  "development_gym",
  "development_field",
  "rehab",
  "recovery",
]);

export const sessionStatusEnum = z.enum([
  "pending",
  "completed",
  "partial",
  "skipped",
]);

export const createSessionSchema = z.object({
  playerId: z.string().uuid(),
  programId: z.string().uuid().optional(),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  sessionType: sessionTypeEnum,
  notes: z.string().max(1000).optional(),
});

export const updateSessionSchema = z.object({
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  sessionType: sessionTypeEnum.optional(),
  status: sessionStatusEnum.optional(),
  notes: z.string().max(1000).optional(),
});

export const completeSessionSchema = z.object({
  status: sessionStatusEnum,
  overallRpe: z.number().min(1).max(10).optional(),
  actualDurationMinutes: z.number().int().positive().optional(),
  sessionNote: z.string().max(2000).optional(),
  completedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const listSessionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  playerId: z.string().uuid().optional(),
  programId: z.string().uuid().optional(),
  status: sessionStatusEnum.optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type CreateSessionDTO = z.infer<typeof createSessionSchema>;
export type UpdateSessionDTO = z.infer<typeof updateSessionSchema>;
export type CompleteSessionDTO = z.infer<typeof completeSessionSchema>;
export type ListSessionsQueryDTO = z.infer<typeof listSessionsQuerySchema>;
