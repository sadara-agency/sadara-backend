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
  "GraphicDesigner",
  "Executive",
  "GoalkeeperCoach",
  "MentalCoach",
]);

export const assignmentStatusEnum = z.enum([
  "Assigned",
  "Acknowledged",
  "InProgress",
  "Completed",
]);

export const assignmentPriorityEnum = z.enum([
  "low",
  "normal",
  "high",
  "critical",
]);

export const createAssignmentSchema = z.object({
  playerId: z.string().uuid(),
  coachUserId: z.string().uuid(),
  specialty: staffRoleEnum,
  priority: assignmentPriorityEnum.optional(),
  dueAt: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
});

export const assignmentQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(50),
  sort: z
    .enum(["created_at", "specialty", "status", "priority", "due_at"])
    .default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  playerId: z.string().uuid().optional(),
  coachUserId: z.string().uuid().optional(),
  specialty: staffRoleEnum.optional(),
  status: assignmentStatusEnum.optional(),
});

// Coerce ?status=Assigned&status=InProgress (Express parses repeated keys
// as an array) OR ?status=Assigned (single string) into a typed array.
const csvOrArray = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.preprocess((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    if (Array.isArray(v)) return v;
    return [v];
  }, z.array(itemSchema).optional());

export const myAssignmentQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(50),
  sort: z
    .enum(["created_at", "status", "priority", "due_at"])
    .default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  status: csvOrArray(assignmentStatusEnum),
  priority: csvOrArray(assignmentPriorityEnum),
  specialty: csvOrArray(staffRoleEnum),
  search: z.string().trim().min(1).max(100).optional(),
  groupBy: z.enum(["status", "priority", "none"]).default("none"),
});

export const updateAssignmentStatusSchema = z.object({
  status: assignmentStatusEnum,
});

export type StaffRole = z.infer<typeof staffRoleEnum>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type AssignmentQuery = z.infer<typeof assignmentQuerySchema>;
export type MyAssignmentQuery = z.infer<typeof myAssignmentQuerySchema>;
export type UpdateAssignmentStatusInput = z.infer<
  typeof updateAssignmentStatusSchema
>;
