import { Router } from "express";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { asyncHandler } from "@middleware/errorHandler";
import { CacheTTL } from "@shared/utils/cache";
import * as ctrl from "./workoutPlan.controller";
import {
  createWorkoutPlanSchema,
  updateWorkoutPlanSchema,
  getWorkoutPlanSchema,
  logSetSchema,
  resolveSessionBodySchema,
  completeSessionSchema,
} from "./workoutPlan.validation";

const router = Router();
router.use(authenticate);

// ── Player self-service ──

router.get(
  "/my/today",
  authorizeModule("workout-plans", "read"),
  asyncHandler(ctrl.todaysWorkout),
);

router.get(
  "/my/week",
  authorizeModule("workout-plans", "read"),
  asyncHandler(ctrl.weeklyWorkouts),
);

/**
 * @swagger
 * /workout-plans/my/history:
 *   get:
 *     summary: Get the player's workout session history
 *     tags: [WorkoutPlans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated workout history
 */
router.get(
  "/my/history",
  authorizeModule("workout-plans", "read"),
  asyncHandler(ctrl.workoutHistory),
);

/**
 * @swagger
 * /workout-plans/my/sessions/resolve:
 *   post:
 *     summary: Resolve a projected program day into a real workout session
 *     tags: [WorkoutPlans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The materialized workout session
 */
router.post(
  "/my/sessions/resolve",
  authorizeModule("workout-plans", "update"),
  validate(resolveSessionBodySchema),
  asyncHandler(ctrl.resolveSession),
);

router.post(
  "/my/sessions/start",
  authorizeModule("workout-plans", "update"),
  validate(resolveSessionBodySchema),
  asyncHandler(ctrl.startSession),
);

router.post(
  "/my/sessions/complete",
  authorizeModule("workout-plans", "update"),
  validate(completeSessionSchema),
  asyncHandler(ctrl.completeSession),
);

router.post(
  "/my/sessions/skip",
  authorizeModule("workout-plans", "update"),
  validate(resolveSessionBodySchema),
  asyncHandler(ctrl.skipSession),
);

router.post(
  "/my/sessions/:sessionId/sets",
  authorizeModule("workout-plans", "update"),
  validate(logSetSchema),
  asyncHandler(ctrl.logSet),
);

router.get(
  "/my/sessions/:sessionId/sets",
  authorizeModule("workout-plans", "read"),
  asyncHandler(ctrl.getSessionLogs),
);

// ── Coach / Admin CRUD ──

router.get(
  "/",
  authorizeModule("workout-plans", "read"),
  cacheRoute("workout-plans", CacheTTL.MEDIUM, { perUser: true }),
  asyncHandler(ctrl.list),
);

router.get(
  "/:id",
  authorizeModule("workout-plans", "read"),
  cacheRoute("workout-plan", CacheTTL.MEDIUM),
  validate(getWorkoutPlanSchema, "params"),
  asyncHandler(ctrl.getById),
);

router.post(
  "/",
  authorizeModule("workout-plans", "create"),
  validate(createWorkoutPlanSchema),
  asyncHandler(ctrl.create),
);

router.patch(
  "/:id",
  authorizeModule("workout-plans", "update"),
  validate(updateWorkoutPlanSchema),
  asyncHandler(ctrl.update),
);

router.delete(
  "/:id",
  authorizeModule("workout-plans", "delete"),
  asyncHandler(ctrl.remove),
);

// ── Coach analytics ──

router.get(
  "/:id/adherence",
  authorizeModule("workout-plans", "read"),
  asyncHandler(ctrl.planAdherence),
);

router.get(
  "/:id/progression/:exerciseId",
  authorizeModule("workout-plans", "read"),
  asyncHandler(ctrl.exerciseProgression),
);

export default router;
