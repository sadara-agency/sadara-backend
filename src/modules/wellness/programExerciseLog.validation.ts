import { z } from "zod";

export const logSetSchema = z.object({
  setNumber: z.number().int().min(1).max(100),
  actualReps: z.number().int().min(0).max(999).nullable().optional(),
  actualWeightKg: z.number().min(0).max(999).nullable().optional(),
  rpe: z.number().min(1).max(10).nullable().optional(),
});

export type LogSetDTO = z.infer<typeof logSetSchema>;
