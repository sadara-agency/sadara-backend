import { z } from "zod";

// ── Exercise Library ──

export const createExerciseSchema = z.object({
  nameEn: z.string().min(1),
  nameAr: z.string().optional(),
  muscleGroup: z.string().min(1),
  secondaryMuscles: z.string().optional(),
  equipment: z.string().optional(),
  movementType: z.string().optional(),
  difficulty: z
    .enum(["Beginner", "Intermediate", "Advanced"])
    .default("Intermediate"),
  mediaUrl: z.string().url().optional(),
  instructions: z.string().optional(),
  instructionsAr: z.string().optional(),
});

export const updateExerciseSchema = createExerciseSchema.partial();

// ── Body Metrics ──

export const createBodyMetricSchema = z.object({
  playerId: z.string().uuid(),
  date: z.string().optional(),
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  bodyFatPct: z.number().min(0).max(100).optional(),
  muscleMass: z.number().positive().optional(),
  bmi: z.number().positive().optional(),
  chest: z.number().positive().optional(),
  waist: z.number().positive().optional(),
  arms: z.number().positive().optional(),
  thighs: z.number().positive().optional(),
  notes: z.string().optional(),
});

export const updateBodyMetricSchema = createBodyMetricSchema
  .partial()
  .omit({ playerId: true });

// ── Metric Targets ──

export const createMetricTargetSchema = z.object({
  playerId: z.string().uuid(),
  targetWeight: z.number().positive().optional(),
  targetBodyFat: z.number().min(0).max(100).optional(),
  targetMuscleMass: z.number().positive().optional(),
  deadline: z.string().optional(),
  notes: z.string().optional(),
});

export const updateMetricTargetSchema = createMetricTargetSchema
  .partial()
  .omit({ playerId: true })
  .extend({
    status: z.enum(["active", "achieved", "cancelled"]).optional(),
  });

// ── BMR Calculator ──

export const calculateBmrSchema = z.object({
  playerId: z.string().uuid(),
  weight: z.number().positive(),
  height: z.number().positive(),
  age: z.number().int().positive(),
  gender: z.enum(["male", "female"]).default("male"),
  activityLevel: z
    .enum(["sedentary", "light", "moderate", "active", "extra_active"])
    .default("moderate"),
  goal: z.enum(["cut", "maintain", "bulk"]).default("maintain"),
});

// ── Workout Plans ──

export const createWorkoutPlanSchema = z.object({
  nameEn: z.string().min(1),
  nameAr: z.string().optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  durationWeeks: z.number().int().min(1).max(52).default(4),
  daysPerWeek: z.number().int().min(1).max(7).default(5),
  type: z.enum(["individual", "group"]).default("individual"),
});

export const updateWorkoutPlanSchema = createWorkoutPlanSchema
  .partial()
  .extend({
    status: z.enum(["draft", "active", "archived"]).optional(),
  });

// ── Workout Sessions ──

export const createSessionSchema = z.object({
  weekNumber: z.number().int().min(1),
  dayNumber: z.number().int().min(1).max(7),
  sessionName: z.string().optional(),
  sessionNameAr: z.string().optional(),
  notes: z.string().optional(),
});

export const updateSessionSchema = createSessionSchema.partial();

// ── Workout Exercises ──

export const createWorkoutExerciseSchema = z.object({
  exerciseId: z.string().uuid().optional(),
  customName: z.string().optional(),
  sets: z.number().int().min(1).default(3),
  reps: z.string().default("10"),
  weight: z.number().optional(),
  restSeconds: z.number().int().min(0).default(60),
  tempo: z.string().optional(),
  sortOrder: z.number().int().default(0),
  notes: z.string().optional(),
});

export const updateWorkoutExerciseSchema =
  createWorkoutExerciseSchema.partial();

// ── Workout Assignment ──

export const assignWorkoutSchema = z.object({
  playerIds: z.array(z.string().uuid()).min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});

// ── Workout Log (player) ──

export const logWorkoutSchema = z.object({
  sessionId: z.string().uuid(),
  actualData: z.record(z.unknown()).optional(),
  notes: z.string().optional(),
});

// ── Food Database ──

export const createFoodSchema = z.object({
  nameEn: z.string().min(1),
  nameAr: z.string().optional(),
  category: z.string().optional(),
  caloriesPer100g: z.number().min(0).optional(),
  proteinPer100g: z.number().min(0).optional(),
  carbsPer100g: z.number().min(0).optional(),
  fatPer100g: z.number().min(0).optional(),
  fiberPer100g: z.number().min(0).optional(),
  servingSize: z.number().positive().default(100),
  servingUnit: z.string().default("g"),
});

export const updateFoodSchema = createFoodSchema.partial();

// ── Diet Plans ──

export const createDietPlanSchema = z.object({
  nameEn: z.string().min(1),
  nameAr: z.string().optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  type: z.enum(["daily", "weekly", "custom"]).default("weekly"),
  targetCalories: z.number().positive().optional(),
  targetProtein: z.number().min(0).optional(),
  targetCarbs: z.number().min(0).optional(),
  targetFat: z.number().min(0).optional(),
  isTemplate: z.boolean().default(false),
  templateTags: z.array(z.string()).optional(),
  playerId: z.string().uuid().optional(),
});

export const updateDietPlanSchema = createDietPlanSchema.partial().extend({
  status: z.enum(["draft", "active", "archived"]).optional(),
});

// ── Diet Meals ──

export const createDietMealSchema = z.object({
  dayNumber: z.number().int().min(1).default(1),
  mealType: z
    .enum(["breakfast", "lunch", "dinner", "snack", "suhoor", "iftar"])
    .default("lunch"),
  sortOrder: z.number().int().default(0),
  items: z
    .array(
      z.object({
        foodId: z.string().uuid().optional(),
        customName: z.string().optional(),
        servingSize: z.number().positive().default(100),
        servingUnit: z.string().default("g"),
        calories: z.number().min(0).optional(),
        protein: z.number().min(0).optional(),
        carbs: z.number().min(0).optional(),
        fat: z.number().min(0).optional(),
      }),
    )
    .optional(),
});

// ── Diet Adherence (player) ──

export const logAdherenceSchema = z.object({
  mealId: z.string().uuid().optional(),
  date: z.string().optional(),
  status: z.enum(["consumed", "skipped", "partial"]).default("consumed"),
  notes: z.string().optional(),
});

// ── Inferred types ──

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;
export type CreateBodyMetricInput = z.infer<typeof createBodyMetricSchema>;
export type UpdateBodyMetricInput = z.infer<typeof updateBodyMetricSchema>;
export type CreateMetricTargetInput = z.infer<typeof createMetricTargetSchema>;
export type UpdateMetricTargetInput = z.infer<typeof updateMetricTargetSchema>;
export type CalculateBmrInput = z.infer<typeof calculateBmrSchema>;
export type CreateWorkoutPlanInput = z.infer<typeof createWorkoutPlanSchema>;
export type UpdateWorkoutPlanInput = z.infer<typeof updateWorkoutPlanSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type CreateWorkoutExerciseInput = z.infer<
  typeof createWorkoutExerciseSchema
>;
export type AssignWorkoutInput = z.infer<typeof assignWorkoutSchema>;
export type LogWorkoutInput = z.infer<typeof logWorkoutSchema>;
export type CreateFoodInput = z.infer<typeof createFoodSchema>;
export type UpdateFoodInput = z.infer<typeof updateFoodSchema>;
export type CreateDietPlanInput = z.infer<typeof createDietPlanSchema>;
export type UpdateDietPlanInput = z.infer<typeof updateDietPlanSchema>;
export type CreateDietMealInput = z.infer<typeof createDietMealSchema>;
export type LogAdherenceInput = z.infer<typeof logAdherenceSchema>;
