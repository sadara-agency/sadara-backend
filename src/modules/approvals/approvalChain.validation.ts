import { z } from "zod";

const ENTITY_TYPES = ["contract", "offer", "payment", "gate"] as const;

const ROLES = [
  "Admin",
  "Manager",
  "Analyst",
  "Scout",
  "Player",
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
] as const;

const templateStepSchema = z.object({
  stepNumber: z.number().int().min(1).max(20),
  approverRole: z.enum(ROLES),
  label: z.string().min(1).max(200),
  labelAr: z.string().max(200).optional(),
  dueDays: z.number().int().min(1).max(30).optional().default(3),
});

export const createTemplateSchema = z.object({
  body: z.object({
    entityType: z.enum(ENTITY_TYPES),
    action: z.string().min(1).max(100),
    name: z.string().min(1).max(200),
    nameAr: z.string().max(200).optional(),
    steps: z.array(templateStepSchema).min(1).max(10),
  }),
});

export const updateTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    nameAr: z.string().max(200).optional(),
    isActive: z.boolean().optional(),
    steps: z.array(templateStepSchema).min(1).max(10).optional(),
  }),
});

export const resolveStepSchema = z.object({
  body: z.object({
    comment: z.string().max(2000).optional(),
  }),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>["body"];
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>["body"];
