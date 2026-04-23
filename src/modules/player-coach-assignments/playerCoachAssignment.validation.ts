import { z } from "zod";

export const specialtyEnum = z.enum([
  "Coach",
  "SkillCoach",
  "TacticalCoach",
  "FitnessCoach",
  "NutritionSpecialist",
  "GymCoach",
  "GoalkeeperCoach",
  "MentalCoach",
]);

export const createAssignmentSchema = z.object({
  playerId: z.string().uuid(),
  coachUserId: z.string().uuid(),
  specialty: specialtyEnum,
});

export const assignmentQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(50),
  sort: z.enum(["created_at", "specialty"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  playerId: z.string().uuid().optional(),
  coachUserId: z.string().uuid().optional(),
  specialty: specialtyEnum.optional(),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type AssignmentQuery = z.infer<typeof assignmentQuerySchema>;
