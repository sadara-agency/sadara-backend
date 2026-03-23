import { z } from "zod";

// ══════════════════════════════════════════════════════════════════════
//  Shared Enums — these MUST match the frontend enum values
// ══════════════════════════════════════════════════════════════════════

export const ActivityLevel = z.enum([
  "sedentary",
  "light",
  "moderate",
  "active",
  "extra_active",
  "fasting",
]);

export const Goal = z.enum(["cut", "maintain", "bulk"]);

export const Gender = z.enum(["male", "female"]);

// ══════════════════════════════════════════════════════════════════════
//  Body Metrics — strict min/max ranges aligned with frontend
// ══════════════════════════════════════════════════════════════════════

/**
 * Ranges mirror the frontend RecordMeasurementModal BASIC_FIELDS / DETAIL_FIELDS
 * so that server and client validation are always in sync.
 */
const bodyMetricFields = {
  weight: z
    .number()
    .min(30, "Weight must be at least 30 kg")
    .max(200, "Weight must be at most 200 kg")
    .optional(),
  height: z
    .number()
    .min(100, "Height must be at least 100 cm")
    .max(220, "Height must be at most 220 cm")
    .optional(),
  bodyFatPct: z
    .number()
    .min(3, "Body fat must be at least 3%")
    .max(50, "Body fat must be at most 50%")
    .optional(),
  muscleMass: z
    .number()
    .min(15, "Muscle mass must be at least 15 kg")
    .max(80, "Muscle mass must be at most 80 kg")
    .optional(),
  bmi: z
    .number()
    .min(10, "BMI must be at least 10")
    .max(60, "BMI must be at most 60")
    .optional(),
  chest: z
    .number()
    .min(50, "Chest must be at least 50 cm")
    .max(150, "Chest must be at most 150 cm")
    .optional(),
  waist: z
    .number()
    .min(40, "Waist must be at least 40 cm")
    .max(150, "Waist must be at most 150 cm")
    .optional(),
  arms: z
    .number()
    .min(20, "Arms must be at least 20 cm")
    .max(60, "Arms must be at most 60 cm")
    .optional(),
  thighs: z
    .number()
    .min(30, "Thighs must be at least 30 cm")
    .max(90, "Thighs must be at most 90 cm")
    .optional(),
};

export const createBodyMetricSchema = z
  .object({
    playerId: z.string().uuid(),
    date: z.string().optional(),
    ...bodyMetricFields,
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.muscleMass != null && data.weight != null) {
        return data.muscleMass <= data.weight;
      }
      return true;
    },
    {
      message: "Muscle mass cannot exceed total body weight",
      path: ["muscleMass"],
    },
  );

export const updateBodyMetricSchema = z
  .object({
    ...bodyMetricFields,
    date: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.muscleMass != null && data.weight != null) {
        return data.muscleMass <= data.weight;
      }
      return true;
    },
    {
      message: "Muscle mass cannot exceed total body weight",
      path: ["muscleMass"],
    },
  );

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

// ── Metric Targets ──

export const createMetricTargetSchema = z.object({
  playerId: z.string().uuid(),
  targetWeight: z.number().min(30).max(200).optional(),
  targetBodyFat: z.number().min(3).max(50).optional(),
  targetMuscleMass: z.number().min(15).max(80).optional(),
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
  weight: z
    .number()
    .min(30, "Weight must be at least 30 kg")
    .max(200, "Weight must be at most 200 kg"),
  height: z
    .number()
    .min(100, "Height must be at least 100 cm")
    .max(220, "Height must be at most 220 cm"),
  age: z
    .number()
    .int()
    .min(10, "Age must be at least 10")
    .max(80, "Age must be at most 80"),
  gender: Gender.default("male"),
  activityLevel: ActivityLevel.default("moderate"),
  goal: Goal.default("maintain"),
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
  proteinG: z.number().min(0).optional(),
  carbsG: z.number().min(0).optional(),
  fatG: z.number().min(0).optional(),
  isTemplate: z.boolean().default(false),
  templateTags: z.array(z.string()).optional(),
  playerId: z.string().uuid().optional(),
});

export const updateDietPlanSchema = createDietPlanSchema.partial().extend({
  status: z.enum(["draft", "active", "archived"]).optional(),
});

// ── Diet Meals ──

export const createDietMealSchema = z.object({
  nameEn: z.string().optional(),
  nameAr: z.string().optional(),
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
        portionSize: z.number().positive().default(100),
        portionUnit: z.string().default("g"),
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
  status: z.enum(["ate", "skipped", "partial"]).default("ate"),
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
