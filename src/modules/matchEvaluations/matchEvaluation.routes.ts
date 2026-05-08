import { Router } from "express";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import * as ctrl from "./matchEvaluation.controller";
import {
  createMatchEvaluationSchema,
  updateMatchEvaluationSchema,
  getMatchEvaluationSchema,
  listMatchEvaluationsSchema,
  requestRevisionSchema,
} from "./matchEvaluation.validation";

const router = Router();
router.use(authenticate);

// List
router.get(
  "/",
  authorizeModule("matchEvaluations", "read"),
  dynamicFieldAccess("matchEvaluations"),
  cacheRoute("matchEvaluations", CacheTTL.SHORT),
  validate(listMatchEvaluationsSchema, "query"),
  ctrl.list,
);

// Player performance summary
router.get(
  "/player/:playerId/summary",
  authorizeModule("matchEvaluations", "read"),
  cacheRoute("matchEvaluationSummary", CacheTTL.SHORT),
  ctrl.getPlayerSummary,
);

// Get by ID
router.get(
  "/:id",
  authorizeModule("matchEvaluations", "read"),
  dynamicFieldAccess("matchEvaluations"),
  cacheRoute("matchEvaluation", CacheTTL.SHORT),
  validate(getMatchEvaluationSchema, "params"),
  ctrl.getById,
);

// Create
router.post(
  "/",
  authorizeModule("matchEvaluations", "create"),
  validate(createMatchEvaluationSchema),
  ctrl.create,
);

// Update (Draft or NeedsRevision only)
router.patch(
  "/:id",
  authorizeModule("matchEvaluations", "update"),
  validate(updateMatchEvaluationSchema),
  ctrl.update,
);

// Submit for review
router.post(
  "/:id/submit",
  authorizeModule("matchEvaluations", "update"),
  validate(getMatchEvaluationSchema, "params"),
  ctrl.submit,
);

// Approve
router.post(
  "/:id/approve",
  authorizeModule("matchEvaluations", "update"),
  validate(getMatchEvaluationSchema, "params"),
  ctrl.approve,
);

// Request revision
router.post(
  "/:id/revise",
  authorizeModule("matchEvaluations", "update"),
  validate(requestRevisionSchema),
  ctrl.requestRevision,
);

// Delete (Draft only)
router.delete(
  "/:id",
  authorizeModule("matchEvaluations", "delete"),
  validate(getMatchEvaluationSchema, "params"),
  ctrl.remove,
);

export default router;
