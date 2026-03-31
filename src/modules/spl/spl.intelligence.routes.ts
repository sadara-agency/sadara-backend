// ─────────────────────────────────────────────────────────────
// SPL Intelligence Routes
// ─────────────────────────────────────────────────────────────

import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import * as ctrl from "@modules/spl/spl.intelligence.controller";
import {
  insightQuerySchema,
  insightIdSchema,
  trackPlayerSchema,
  trackedPlayerIdSchema,
  updateAlertConfigSchema,
  toggleCompetitionSchema,
  updateConfigSchema,
} from "@modules/spl/spl.intelligence.schema";

const router = Router();
router.use(authenticate);

// ── Insights ──

router.get(
  "/insights",
  authorizeModule("spl-sync", "read"),
  validate(insightQuerySchema, "query"),
  asyncHandler(ctrl.getInsights),
);

router.post(
  "/insights/:id/dismiss",
  authorizeModule("spl-sync", "update"),
  validate(insightIdSchema),
  asyncHandler(ctrl.dismiss),
);

router.post(
  "/insights/:id/add-to-watchlist",
  authorizeModule("spl-sync", "create"),
  validate(insightIdSchema),
  asyncHandler(ctrl.addToWatchlist),
);

// ── Tracked Players ──

router.get(
  "/tracked",
  authorizeModule("spl-sync", "read"),
  asyncHandler(ctrl.getTrackedPlayers),
);

router.post(
  "/tracked",
  authorizeModule("spl-sync", "create"),
  validate(trackPlayerSchema),
  asyncHandler(ctrl.track),
);

router.get(
  "/tracked/:id",
  authorizeModule("spl-sync", "read"),
  validate(trackedPlayerIdSchema),
  asyncHandler(ctrl.getTrackedDetail),
);

router.patch(
  "/tracked/:id/alerts",
  authorizeModule("spl-sync", "update"),
  validate(updateAlertConfigSchema),
  asyncHandler(ctrl.updateAlerts),
);

router.delete(
  "/tracked/:id",
  authorizeModule("spl-sync", "delete"),
  validate(trackedPlayerIdSchema),
  asyncHandler(ctrl.untrack),
);

// ── Competitions ──

router.get(
  "/competitions",
  authorizeModule("spl-sync", "read"),
  asyncHandler(ctrl.getCompetitions),
);

router.patch(
  "/competitions/:id",
  authorizeModule("spl-sync", "update"),
  validate(toggleCompetitionSchema),
  asyncHandler(ctrl.toggleComp),
);

// ── Status ──

router.get(
  "/status",
  authorizeModule("spl-sync", "read"),
  asyncHandler(ctrl.getStatus),
);

// ── Manual Analysis Trigger ──

router.post(
  "/analyze",
  authorizeModule("spl-sync", "create"),
  asyncHandler(ctrl.triggerAnalysis),
);

// ── Config ──

router.get(
  "/config",
  authorizeModule("spl-sync", "read"),
  asyncHandler(ctrl.getConfig),
);

router.put(
  "/config",
  authorizeModule("spl-sync", "update"),
  validate(updateConfigSchema),
  asyncHandler(ctrl.updateConfig),
);

export default router;
