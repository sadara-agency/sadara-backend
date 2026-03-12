import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import {
  createExerciseSchema,
  updateExerciseSchema,
  createBodyMetricSchema,
  updateBodyMetricSchema,
  createMetricTargetSchema,
  updateMetricTargetSchema,
  calculateBmrSchema,
  createWorkoutPlanSchema,
  updateWorkoutPlanSchema,
  createSessionSchema,
  updateSessionSchema,
  createWorkoutExerciseSchema,
  assignWorkoutSchema,
  logWorkoutSchema,
  createFoodSchema,
  updateFoodSchema,
  createDietPlanSchema,
  updateDietPlanSchema,
  createDietMealSchema,
  logAdherenceSchema,
} from "@modules/gym/gym.schema";
import * as ctrl from "@modules/gym/gym.controller";

const router = Router();
router.use(authenticate);

// ══════════════════════════════════════════
// PLAYER SELF-SERVICE (before :id catch-alls)
// ══════════════════════════════════════════

router.get(
  "/my/workouts",
  authorizeModule("gym", "read"),
  asyncHandler(ctrl.getMyWorkouts),
);
router.post(
  "/my/workouts/:assignmentId/log",
  authorizeModule("gym", "create"),
  validate(logWorkoutSchema),
  asyncHandler(ctrl.logMyWorkout),
);
router.get(
  "/my/diet-plans",
  authorizeModule("gym", "read"),
  asyncHandler(ctrl.getMyDietPlans),
);
router.post(
  "/my/diet-plans/:planId/adherence",
  authorizeModule("gym", "create"),
  validate(logAdherenceSchema),
  asyncHandler(ctrl.logMyAdherence),
);

// ══════════════════════════════════════════
// COACH DASHBOARD
// ══════════════════════════════════════════

router.get(
  "/dashboard",
  authorizeModule("gym", "read"),
  asyncHandler(ctrl.getCoachDashboard),
);
router.patch(
  "/alerts/:id/read",
  authorizeModule("gym", "update"),
  asyncHandler(ctrl.markAlertRead),
);

// ══════════════════════════════════════════
// EXERCISE LIBRARY
// ══════════════════════════════════════════

router.get(
  "/exercises",
  authorizeModule("gym", "read"),
  asyncHandler(ctrl.listExercises),
);
router.get(
  "/exercises/:id",
  authorizeModule("gym", "read"),
  asyncHandler(ctrl.getExercise),
);
router.post(
  "/exercises",
  authorizeModule("gym", "create"),
  validate(createExerciseSchema),
  asyncHandler(ctrl.createExercise),
);
router.patch(
  "/exercises/:id",
  authorizeModule("gym", "update"),
  validate(updateExerciseSchema),
  asyncHandler(ctrl.updateExercise),
);
router.delete(
  "/exercises/:id",
  authorizeModule("gym", "delete"),
  asyncHandler(ctrl.deleteExercise),
);

// ══════════════════════════════════════════
// BODY METRICS
// ══════════════════════════════════════════

router.get(
  "/metrics/:playerId",
  authorizeModule("gym", "read"),
  asyncHandler(ctrl.listBodyMetrics),
);
router.get(
  "/metrics/:playerId/latest",
  authorizeModule("gym", "read"),
  asyncHandler(ctrl.getLatestBodyMetric),
);
router.post(
  "/metrics",
  authorizeModule("gym", "create"),
  validate(createBodyMetricSchema),
  asyncHandler(ctrl.createBodyMetric),
);
router.patch(
  "/metrics/:id",
  authorizeModule("gym", "update"),
  validate(updateBodyMetricSchema),
  asyncHandler(ctrl.updateBodyMetric),
);
router.delete(
  "/metrics/:id",
  authorizeModule("gym", "delete"),
  asyncHandler(ctrl.deleteBodyMetric),
);

// ══════════════════════════════════════════
// METRIC TARGETS
// ══════════════════════════════════════════

router.get(
  "/targets/:playerId",
  authorizeModule("gym", "read"),
  asyncHandler(ctrl.getMetricTarget),
);
router.post(
  "/targets",
  authorizeModule("gym", "create"),
  validate(createMetricTargetSchema),
  asyncHandler(ctrl.createMetricTarget),
);
router.patch(
  "/targets/:id",
  authorizeModule("gym", "update"),
  validate(updateMetricTargetSchema),
  asyncHandler(ctrl.updateMetricTarget),
);

// ══════════════════════════════════════════
// BMR CALCULATOR
// ══════════════════════════════════════════

router.post(
  "/bmr",
  authorizeModule("gym", "create"),
  validate(calculateBmrSchema),
  asyncHandler(ctrl.calculateBmr),
);
router.get(
  "/bmr/:playerId",
  authorizeModule("gym", "read"),
  asyncHandler(ctrl.getBmrHistory),
);

// ══════════════════════════════════════════
// WORKOUT PLANS
// ══════════════════════════════════════════

router.get(
  "/workout-plans",
  authorizeModule("gym", "read"),
  asyncHandler(ctrl.listWorkoutPlans),
);
router.get(
  "/workout-plans/:id",
  authorizeModule("gym", "read"),
  asyncHandler(ctrl.getWorkoutPlan),
);
router.post(
  "/workout-plans",
  authorizeModule("gym", "create"),
  validate(createWorkoutPlanSchema),
  asyncHandler(ctrl.createWorkoutPlan),
);
router.patch(
  "/workout-plans/:id",
  authorizeModule("gym", "update"),
  validate(updateWorkoutPlanSchema),
  asyncHandler(ctrl.updateWorkoutPlan),
);
router.delete(
  "/workout-plans/:id",
  authorizeModule("gym", "delete"),
  asyncHandler(ctrl.deleteWorkoutPlan),
);
router.post(
  "/workout-plans/:id/duplicate",
  authorizeModule("gym", "create"),
  asyncHandler(ctrl.duplicateWorkoutPlan),
);
router.post(
  "/workout-plans/:id/assign",
  authorizeModule("gym", "create"),
  validate(assignWorkoutSchema),
  asyncHandler(ctrl.assignWorkout),
);

// ── Sessions ──

router.post(
  "/workout-plans/:planId/sessions",
  authorizeModule("gym", "create"),
  validate(createSessionSchema),
  asyncHandler(ctrl.addSession),
);
router.patch(
  "/sessions/:sessionId",
  authorizeModule("gym", "update"),
  validate(updateSessionSchema),
  asyncHandler(ctrl.updateSession),
);
router.delete(
  "/sessions/:sessionId",
  authorizeModule("gym", "delete"),
  asyncHandler(ctrl.deleteSession),
);

// ── Session Exercises ──

router.post(
  "/sessions/:sessionId/exercises",
  authorizeModule("gym", "create"),
  validate(createWorkoutExerciseSchema),
  asyncHandler(ctrl.addExerciseToSession),
);
router.patch(
  "/workout-exercises/:exerciseId",
  authorizeModule("gym", "update"),
  asyncHandler(ctrl.updateWorkoutExercise),
);
router.delete(
  "/workout-exercises/:exerciseId",
  authorizeModule("gym", "delete"),
  asyncHandler(ctrl.deleteWorkoutExercise),
);

// ── Assignments ──

router.delete(
  "/assignments/:assignmentId",
  authorizeModule("gym", "delete"),
  asyncHandler(ctrl.removeAssignment),
);
router.get(
  "/assignments/:assignmentId/logs",
  authorizeModule("gym", "read"),
  asyncHandler(ctrl.getWorkoutLogs),
);

// ══════════════════════════════════════════
// FOOD DATABASE
// ══════════════════════════════════════════

router.get(
  "/foods",
  authorizeModule("gym", "read"),
  asyncHandler(ctrl.listFoods),
);
router.get(
  "/foods/:id",
  authorizeModule("gym", "read"),
  asyncHandler(ctrl.getFood),
);
router.post(
  "/foods",
  authorizeModule("gym", "create"),
  validate(createFoodSchema),
  asyncHandler(ctrl.createFood),
);
router.patch(
  "/foods/:id",
  authorizeModule("gym", "update"),
  validate(updateFoodSchema),
  asyncHandler(ctrl.updateFood),
);
router.delete(
  "/foods/:id",
  authorizeModule("gym", "delete"),
  asyncHandler(ctrl.deleteFood),
);

// ══════════════════════════════════════════
// DIET PLANS
// ══════════════════════════════════════════

router.get(
  "/diet-plans",
  authorizeModule("gym", "read"),
  asyncHandler(ctrl.listDietPlans),
);
router.get(
  "/diet-plans/:id",
  authorizeModule("gym", "read"),
  asyncHandler(ctrl.getDietPlan),
);
router.post(
  "/diet-plans",
  authorizeModule("gym", "create"),
  validate(createDietPlanSchema),
  asyncHandler(ctrl.createDietPlan),
);
router.patch(
  "/diet-plans/:id",
  authorizeModule("gym", "update"),
  validate(updateDietPlanSchema),
  asyncHandler(ctrl.updateDietPlan),
);
router.delete(
  "/diet-plans/:id",
  authorizeModule("gym", "delete"),
  asyncHandler(ctrl.deleteDietPlan),
);

// ── Diet Meals ──

router.post(
  "/diet-plans/:planId/meals",
  authorizeModule("gym", "create"),
  validate(createDietMealSchema),
  asyncHandler(ctrl.addMealToPlan),
);
router.delete(
  "/diet-meals/:mealId",
  authorizeModule("gym", "delete"),
  asyncHandler(ctrl.deleteMeal),
);
router.post(
  "/diet-meals/:mealId/items",
  authorizeModule("gym", "create"),
  asyncHandler(ctrl.addItemToMeal),
);
router.delete(
  "/diet-meal-items/:itemId",
  authorizeModule("gym", "delete"),
  asyncHandler(ctrl.deleteItemFromMeal),
);

// ── Diet Adherence ──

router.get(
  "/adherence/:playerId",
  authorizeModule("gym", "read"),
  asyncHandler(ctrl.getPlayerAdherence),
);

export default router;
