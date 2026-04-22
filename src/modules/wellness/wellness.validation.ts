import { z } from "zod";

// ── Profile ──

export const createProfileSchema = z.object({
  playerId: z.string().uuid(),
  sex: z.enum(["male", "female"]),
  activityLevel: z.coerce.number().min(1.0).max(2.5).default(1.55),
  goal: z.enum(["bulk", "cut", "maintenance"]).default("maintenance"),
  targetCalories: z.number().int().positive().optional(),
  targetProteinG: z.number().positive().optional(),
  targetFatG: z.number().positive().optional(),
  targetCarbsG: z.number().positive().optional(),
  notes: z.string().optional(),
});

export const updateProfileSchema = createProfileSchema
  .omit({ playerId: true })
  .partial();

// ── Weight Log ──

export const createWeightLogSchema = z.object({
  playerId: z.string().uuid(),
  weightKg: z.number().positive().max(500),
  bodyFatPct: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  loggedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});

export const createMyWeightLogSchema = createWeightLogSchema.omit({
  playerId: true,
});

// ── Food Item ──

export const createFoodItemSchema = z.object({
  name: z.string().min(1).max(500),
  nameAr: z.string().max(500).optional(),
  brand: z.string().max(255).optional(),
  servingQty: z.number().positive().default(1),
  servingUnit: z.string().max(50).default("serving"),
  calories: z.number().min(0),
  proteinG: z.number().min(0),
  carbsG: z.number().min(0),
  fatG: z.number().min(0),
  fiberG: z.number().min(0).optional(),
  photoUrl: z.string().url().max(500).optional(),
});

// ── Meal Log ──

export const createMealLogSchema = z.object({
  playerId: z.string().uuid(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  foodItemId: z.string().uuid().optional(),
  customName: z.string().max(500).optional(),
  servings: z.number().positive().default(1),
  calories: z.number().min(0),
  proteinG: z.number().min(0),
  carbsG: z.number().min(0),
  fatG: z.number().min(0),
  loggedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  notes: z.string().optional(),
});

export const updateMealLogSchema = createMealLogSchema
  .omit({ playerId: true, loggedDate: true })
  .partial();

export const createMyMealLogSchema = createMealLogSchema.omit({
  playerId: true,
});

export const copyDaySchema = z.object({
  playerId: z.string().uuid(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});

export const copyMyDaySchema = copyDaySchema.omit({ playerId: true });

// ── Exercise ──

const muscleGroups = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "core",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "full_body",
  "cardio",
  "other",
] as const;

const equipmentTypes = [
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "bodyweight",
  "kettlebell",
  "band",
  "cardio_machine",
  "other",
  "none",
] as const;

export const createExerciseSchema = z.object({
  name: z.string().min(1).max(255),
  nameAr: z.string().max(255).optional(),
  muscleGroup: z.enum(muscleGroups),
  equipment: z.enum(equipmentTypes).default("none"),
  videoUrl: z.string().url().max(500).optional(),
  instructions: z.string().optional(),
  instructionsAr: z.string().optional(),
});

export const updateExerciseSchema = createExerciseSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ── Workout Template ──

const workoutCategories = [
  "strength",
  "hypertrophy",
  "cardio",
  "recovery",
  "mixed",
] as const;

const templateExerciseItem = z.object({
  exerciseId: z.string().uuid(),
  orderIndex: z.number().int().min(0),
  targetSets: z.number().int().min(1).default(3),
  targetReps: z.string().max(20).default("8-12"),
  targetWeightKg: z.number().positive().optional(),
  restSeconds: z.number().int().min(0).default(90),
  notes: z.string().optional(),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  nameAr: z.string().max(255).optional(),
  description: z.string().optional(),
  category: z.enum(workoutCategories).default("strength"),
  estimatedMinutes: z.number().int().positive().optional(),
  exercises: z.array(templateExerciseItem).min(1),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  nameAr: z.string().max(255).optional(),
  description: z.string().optional(),
  category: z.enum(workoutCategories).optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  exercises: z.array(templateExerciseItem).min(1).optional(),
});

// ── Workout Assignment ──

export const createAssignmentSchema = z.object({
  playerId: z.string().uuid(),
  templateId: z.string().uuid(),
  assignedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  notes: z.string().optional(),
});

export const updateAssignmentSchema = z.object({
  status: z.enum(["pending", "in_progress", "completed", "skipped"]).optional(),
  notes: z.string().optional(),
});

// ── Workout Log (per-set) ──

const workoutLogEntry = z.object({
  exerciseId: z.string().uuid(),
  setNumber: z.number().int().min(1),
  actualReps: z.number().int().min(0).optional(),
  actualWeightKg: z.number().min(0).optional(),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
});

export const logWorkoutSchema = z.object({
  sets: z.array(workoutLogEntry).min(1),
});

// ── Inferred types ──

export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateWeightLogInput = z.infer<typeof createWeightLogSchema>;
export type CreateMyWeightLogInput = z.infer<typeof createMyWeightLogSchema>;
export type CreateFoodItemInput = z.infer<typeof createFoodItemSchema>;
export type CreateMealLogInput = z.infer<typeof createMealLogSchema>;
export type UpdateMealLogInput = z.infer<typeof updateMealLogSchema>;
export type CreateMyMealLogInput = z.infer<typeof createMyMealLogSchema>;
export type CopyDayInput = z.infer<typeof copyDaySchema>;
export type CopyMyDayInput = z.infer<typeof copyMyDaySchema>;
export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
export type LogWorkoutInput = z.infer<typeof logWorkoutSchema>;

// ── Daily Checkin (Readiness Survey) ──

const rating1to5 = z.coerce.number().int().min(1).max(5);

export const DAILY_PULSE_TRAINING_TYPES = [
  "rest",
  "club_session",
  "program_session",
  "mixed",
] as const;

export const createCheckinSchema = z.object({
  playerId: z.string().uuid("Invalid player ID"),
  checkinDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  sleepHours: z.coerce.number().min(0).max(24).optional(),
  sleepQuality: rating1to5.optional(),
  fatigue: rating1to5.optional(),
  muscleSoreness: rating1to5.optional(),
  mood: rating1to5.optional(),
  stress: rating1to5.optional(),
  sorenessAreas: z.array(z.string().max(50)).max(20).optional(),
  notes: z.string().max(1000).optional(),
  // Phase 5 — describe the *previous* day
  trainingType: z.enum(DAILY_PULSE_TRAINING_TYPES).optional(),
  nutritionRating: rating1to5.optional(),
  trainingBlockId: z.string().uuid().optional(),
});

export const createMyCheckinSchema = createCheckinSchema.omit({
  playerId: true,
});

export const checkinQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type CreateCheckinInput = z.infer<typeof createCheckinSchema>;
export type CheckinQuery = z.infer<typeof checkinQuerySchema>;
