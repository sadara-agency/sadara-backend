import { z } from "zod";

export const attendanceTrendQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).optional().default(30),
});

export const taskVelocityQuerySchema = z.object({
  weeks: z.coerce.number().int().min(2).max(26).optional().default(8),
});

export type AttendanceTrendQuery = z.infer<typeof attendanceTrendQuerySchema>;
export type TaskVelocityQuery = z.infer<typeof taskVelocityQuerySchema>;
