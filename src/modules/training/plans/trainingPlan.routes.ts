import { Router } from "express";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import {
  createTrainingPlanSchema,
  updateTrainingPlanSchema,
  trainingPlanQuerySchema,
  upsertWeekSchema,
  logProgressSchema,
} from "./trainingPlan.validation";
import * as ctrl from "./trainingPlan.controller";

const router = Router();
router.use(authenticate);

// GET /api/v1/training/plans
router.get(
  "/",
  authorizeModule("training-plans", "read"),
  validate(trainingPlanQuerySchema, "query"),
  cacheRoute("training-plans", CacheTTL.MEDIUM),
  ctrl.list,
);

// GET /api/v1/training/plans/player/:playerId/active
router.get(
  "/player/:playerId/active",
  authorizeModule("training-plans", "read"),
  ctrl.getActive,
);

// GET /api/v1/training/plans/:id
router.get("/:id", authorizeModule("training-plans", "read"), ctrl.getById);

// GET /api/v1/training/plans/:id/report
router.get(
  "/:id/report",
  authorizeModule("training-plans", "read"),
  ctrl.progressionReport,
);

// GET /api/v1/training/plans/:id/progress
router.get(
  "/:id/progress",
  authorizeModule("training-plans", "read"),
  ctrl.progressLogs,
);

// POST /api/v1/training/plans
router.post(
  "/",
  authorizeModule("training-plans", "create"),
  validate(createTrainingPlanSchema),
  ctrl.create,
);

// PATCH /api/v1/training/plans/:id
router.patch(
  "/:id",
  authorizeModule("training-plans", "update"),
  validate(updateTrainingPlanSchema),
  ctrl.update,
);

// PUT /api/v1/training/plans/:id/weeks
router.put(
  "/:id/weeks",
  authorizeModule("training-plans", "update"),
  validate(upsertWeekSchema),
  ctrl.upsertWeek,
);

// POST /api/v1/training/plans/:id/progress
router.post(
  "/:id/progress",
  authorizeModule("training-plans", "create"),
  validate(logProgressSchema),
  ctrl.logProgress,
);

// DELETE /api/v1/training/plans/:id
router.delete("/:id", authorizeModule("training-plans", "delete"), ctrl.remove);

export default router;
