import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { authorizePlayerPackage } from "@middleware/packageAccess";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import { validate } from "@middleware/validate";
import {
  createMealPlanSchema,
  updateMealPlanSchema,
  mealPlanQuerySchema,
} from "./mealPlan.validation";
import * as mealPlanController from "./mealPlan.controller";

const router = Router();
router.use(authenticate);

// ── Read ──

/**
 * @swagger
 * /wellness/meal-plans:
 *   get:
 *     summary: List meal plans
 *     tags: [Meal Plans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of meal plans
 */
router.get(
  "/meal-plans",
  authorizeModule("meal-plans", "read"),
  validate(mealPlanQuerySchema, "query"),
  cacheRoute("meal-plans", CacheTTL.MEDIUM),
  asyncHandler(mealPlanController.list),
);

/**
 * @swagger
 * /wellness/meal-plans/player/{playerId}/active:
 *   get:
 *     summary: Get active meal plan for a player
 *     tags: [Meal Plans]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/meal-plans/player/:playerId/active",
  authorizeModule("meal-plans", "read"),
  authorizePlayerPackage("meal-plans", "read"),
  cacheRoute("meal-plans", CacheTTL.MEDIUM),
  asyncHandler(mealPlanController.getActivePlan),
);

/**
 * @swagger
 * /wellness/meal-plans/{id}:
 *   get:
 *     summary: Get a meal plan by ID
 *     tags: [Meal Plans]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/meal-plans/:id",
  authorizeModule("meal-plans", "read"),
  cacheRoute("meal-plans", CacheTTL.MEDIUM),
  asyncHandler(mealPlanController.getById),
);

/**
 * @swagger
 * /wellness/meal-plans/{id}/adherence:
 *   get:
 *     summary: Get adherence report for a meal plan
 *     tags: [Meal Plans]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/meal-plans/:id/adherence",
  authorizeModule("meal-plans", "read"),
  cacheRoute("meal-plans", CacheTTL.SHORT),
  asyncHandler(mealPlanController.adherenceReport),
);

// ── Create ──

/**
 * @swagger
 * /wellness/meal-plans:
 *   post:
 *     summary: Create a meal plan
 *     tags: [Meal Plans]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/meal-plans",
  authorizeModule("meal-plans", "create"),
  validate(createMealPlanSchema),
  asyncHandler(mealPlanController.create),
);

// ── Update ──

/**
 * @swagger
 * /wellness/meal-plans/{id}:
 *   patch:
 *     summary: Update a meal plan
 *     tags: [Meal Plans]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  "/meal-plans/:id",
  authorizeModule("meal-plans", "update"),
  validate(updateMealPlanSchema),
  asyncHandler(mealPlanController.update),
);

// ── Delete ──

/**
 * @swagger
 * /wellness/meal-plans/{id}:
 *   delete:
 *     summary: Delete a meal plan
 *     tags: [Meal Plans]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/meal-plans/:id",
  authorizeModule("meal-plans", "delete"),
  asyncHandler(mealPlanController.remove),
);

export default router;
