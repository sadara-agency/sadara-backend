import { z } from "zod";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
const PLAN_STATUSES = ["draft", "active", "completed", "archived"] as const;

// ── Plan Item Schema ──

const mealPlanItemSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
  mealType: z.enum(MEAL_TYPES),
  foodItemId: z.string().uuid().optional(),
  customName: z.string().max(500).optional(),
  servings: z.coerce.number().min(0.1).default(1),
  calories: z.coerce.number().min(0).optional(),
  proteinG: z.coerce.number().min(0).optional(),
  carbsG: z.coerce.number().min(0).optional(),
  fatG: z.coerce.number().min(0).optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  notes: z.string().optional(),
});

// ── Create Plan ──

export const createMealPlanSchema = z.object({
  playerId: z.string().uuid("Invalid player ID"),
  title: z.string().min(1, "Title is required").max(255),
  titleAr: z.string().max(255).optional(),
  description: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  status: z.enum(PLAN_STATUSES).default("draft"),
  targetCalories: z.coerce.number().int().min(0).optional(),
  targetProteinG: z.coerce.number().min(0).optional(),
  targetCarbsG: z.coerce.number().min(0).optional(),
  targetFatG: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  items: z.array(mealPlanItemSchema).optional(),
});

// ── Update Plan ──

export const updateMealPlanSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  titleAr: z.string().max(255).nullable().optional(),
  description: z.string().nullable().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: z.enum(PLAN_STATUSES).optional(),
  targetCalories: z.coerce.number().int().min(0).nullable().optional(),
  targetProteinG: z.coerce.number().min(0).nullable().optional(),
  targetCarbsG: z.coerce.number().min(0).nullable().optional(),
  targetFatG: z.coerce.number().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
  items: z.array(mealPlanItemSchema).optional(),
});

// ── Query Plans ──

export const mealPlanQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z
    .enum(["created_at", "start_date", "end_date", "status", "title"])
    .default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  playerId: z.string().uuid().optional(),
  status: z.enum(PLAN_STATUSES).optional(),
});

// ── Inferred Types ──

export type CreateMealPlanInput = z.infer<typeof createMealPlanSchema>;
export type UpdateMealPlanInput = z.infer<typeof updateMealPlanSchema>;
export type MealPlanQuery = z.infer<typeof mealPlanQuerySchema>;
export type MealPlanItemInput = z.infer<typeof mealPlanItemSchema>;
