import { z } from "zod";

export const triggeringReasonEnum = z.enum(["manual", "scan", "injury"]);

const prescriptionMealItemSchema = z.object({
  // null = manually-entered food (no library entry)
  foodItemId: z.string().uuid().nullable().optional(),
  name: z.string().max(255).optional(),
  servings: z.number().positive(),
  // Pre-calculated macros supplied by the client for manual items
  calories: z.number().min(0).optional().nullable(),
  proteinG: z.number().min(0).optional().nullable(),
  carbsG: z.number().min(0).optional().nullable(),
  fatG: z.number().min(0).optional().nullable(),
});

const prescriptionMealSchema = z.object({
  customName: z.string().min(1).max(100),
  sortOrder: z.number().int().min(0).optional(),
  items: z.array(prescriptionMealItemSchema).min(1),
});

export const issuePrescriptionSchema = z.object({
  playerId: z.string().uuid(),
  targetCalories: z.number().int().positive().optional().nullable(),
  targetProteinG: z.number().positive().optional().nullable(),
  targetCarbsG: z.number().positive().optional().nullable(),
  targetFatG: z.number().positive().optional().nullable(),
  hydrationTargetMl: z.number().int().positive().optional().nullable(),
  preTrainingGuidance: z.string().max(2000).optional(),
  postTrainingGuidance: z.string().max(2000).optional(),
  notes: z.string().max(1000).optional(),
  meals: z.array(prescriptionMealSchema).optional(),
});

export const updatePrescriptionSchema = issuePrescriptionSchema
  .omit({ playerId: true })
  .partial();

export const reissuePrescriptionSchema = z.object({
  triggeringReason: triggeringReasonEnum.default("manual"),
  triggeringScanId: z.string().uuid().optional(),
});

export const listPrescriptionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
  playerId: z.string().uuid().optional(),
  currentOnly: z.coerce.boolean().default(false),
});

export const foodSearchSchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const macroTypeEnum = z.enum(["protein", "carb", "fat"]);

export const createFoodItemSchema = z.object({
  name: z.string().min(1).max(255),
  nameAr: z.string().max(255).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  macroType: z.array(macroTypeEnum).optional().nullable(),
  calories: z.coerce.number().positive().optional().nullable(),
  proteinG: z.coerce.number().min(0).optional().nullable(),
  carbsG: z.coerce.number().min(0).optional().nullable(),
  fatG: z.coerce.number().min(0).optional().nullable(),
  fiberG: z.coerce.number().min(0).optional().nullable(),
  sodiumMg: z.coerce.number().min(0).optional().nullable(),
  defaultServingG: z.coerce.number().positive().default(100),
  servingLabel: z.string().max(50).optional().nullable(),
});

export const updateFoodItemSchema = createFoodItemSchema.partial();

export const listFoodItemsSchema = z.object({
  q: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  macroType: macroTypeEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(40),
});

export type IssuePrescriptionDTO = z.infer<typeof issuePrescriptionSchema>;
export type UpdatePrescriptionDTO = z.infer<typeof updatePrescriptionSchema>;
export type ReissuePrescriptionDTO = z.infer<typeof reissuePrescriptionSchema>;
export type ListPrescriptionsQueryDTO = z.infer<
  typeof listPrescriptionsQuerySchema
>;
export type FoodSearchDTO = z.infer<typeof foodSearchSchema>;
export type CreateFoodItemDTO = z.infer<typeof createFoodItemSchema>;
export type UpdateFoodItemDTO = z.infer<typeof updateFoodItemSchema>;
export type ListFoodItemsDTO = z.infer<typeof listFoodItemsSchema>;
