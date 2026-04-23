import { z } from "zod";

export const staffRoleEnum = z.enum([
  "Admin",
  "Manager",
  "Analyst",
  "Scout",
  "Legal",
  "Finance",
  "Coach",
  "SkillCoach",
  "TacticalCoach",
  "FitnessCoach",
  "NutritionSpecialist",
  "GymCoach",
  "Media",
  "Executive",
  "GoalkeeperCoach",
  "MentalCoach",
]);

export const createAssignmentSchema = z.object({
  playerId: z.string().uuid(),
  coachUserId: z.string().uuid(),
  specialty: staffRoleEnum,
});

export const assignmentQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(50),
  sort: z.enum(["created_at", "specialty"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  playerId: z.string().uuid().optional(),
  coachUserId: z.string().uuid().optional(),
  specialty: staffRoleEnum.optional(),
});

export type StaffRole = z.infer<typeof staffRoleEnum>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type AssignmentQuery = z.infer<typeof assignmentQuerySchema>;
