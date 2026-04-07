import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { authorizePlayerPackage } from "@middleware/packageAccess";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import {
  createWatchlistSchema,
  updateWatchlistSchema,
  updateWatchlistStatusSchema,
  watchlistQuerySchema,
  checkDuplicateSchema,
  createScreeningSchema,
  updateScreeningSchema,
  markPackReadySchema,
  createDecisionSchema,
} from "@modules/scouting/scouting.validation";
import * as ctrl from "@modules/scouting/scouting.controller";
import { generatePackPdf } from "@modules/scouting/scouting.pdf.controller";

const router = Router();
router.use(authenticate);

// ── Pipeline Summary ──
router.get(
  "/summary",
  authorizeModule("scouting", "read"),
  asyncHandler(ctrl.pipelineSummary),
);

// ── Watchlist ──
router.get(
  "/watchlist",
  authorizeModule("scouting", "read"),
  validate(watchlistQuerySchema, "query"),
  asyncHandler(ctrl.listWatchlist),
);
router.get(
  "/watchlist/check-duplicate",
  authorizeModule("scouting", "read"),
  validate(checkDuplicateSchema, "query"),
  asyncHandler(ctrl.checkDuplicate),
);
router.get(
  "/watchlist/:id",
  authorizeModule("scouting", "read"),
  asyncHandler(ctrl.getWatchlistById),
);
router.get(
  "/watchlist/:id/timeline",
  authorizeModule("scouting", "read"),
  asyncHandler(ctrl.prospectTimeline),
);
router.post(
  "/watchlist",
  authorizeModule("scouting", "create"),
  validate(createWatchlistSchema),
  asyncHandler(ctrl.createWatchlist),
);
router.patch(
  "/watchlist/:id",
  authorizeModule("scouting", "update"),
  validate(updateWatchlistSchema),
  asyncHandler(ctrl.updateWatchlist),
);
router.patch(
  "/watchlist/:id/status",
  authorizeModule("scouting", "update"),
  validate(updateWatchlistStatusSchema),
  asyncHandler(ctrl.updateWatchlistStatus),
);
router.delete(
  "/watchlist/:id",
  authorizeModule("scouting", "delete"),
  asyncHandler(ctrl.deleteWatchlist),
);

// ── Screening Cases ──
router.post(
  "/screening",
  authorizeModule("scouting", "create"),
  validate(createScreeningSchema),
  asyncHandler(ctrl.createScreening),
);
router.get(
  "/screening/:id",
  authorizeModule("scouting", "read"),
  dynamicFieldAccess("scouting"),
  asyncHandler(ctrl.getScreening),
);
router.patch(
  "/screening/:id",
  authorizeModule("scouting", "update"),
  validate(updateScreeningSchema),
  asyncHandler(ctrl.updateScreening),
);
router.patch(
  "/screening/:id/pack-ready",
  authorizeModule("scouting", "update"),
  validate(markPackReadySchema),
  asyncHandler(ctrl.markPackReady),
);
router.get(
  "/screening/:id/pdf",
  authorizeModule("scouting", "read"),
  asyncHandler(generatePackPdf),
);

// ── Selection Decisions (immutable — create + read only) ──
router.post(
  "/decisions",
  authorizeModule("scouting", "create"),
  validate(createDecisionSchema),
  asyncHandler(ctrl.createDecision),
);
router.get(
  "/decisions/:id",
  authorizeModule("scouting", "read"),
  dynamicFieldAccess("scouting"),
  asyncHandler(ctrl.getDecision),
);

export default router;
