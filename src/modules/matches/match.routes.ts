import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorize, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import {
  createMatchSchema,
  updateMatchSchema,
  updateScoreSchema,
  updateMatchStatusSchema,
  matchQuerySchema,
  calendarQuerySchema,
  assignPlayersSchema,
  updateMatchPlayerSchema,
  bulkStatsSchema,
  updateStatsSchema,
  playerMatchesQuerySchema,
  createMatchAnalysisSchema,
  updateMatchAnalysisSchema,
} from "@modules/matches/match.schema";
import * as ctrl from "@modules/matches/match.controller";

const router = Router();
router.use(authenticate);

// ── Calendar (must be before /:id to avoid route conflict) ──
router.get(
  "/calendar",
  authorizeModule("matches", "read"),
  validate(calendarQuerySchema, "query"),
  dynamicFieldAccess("matches"),
  asyncHandler(ctrl.calendar),
);

// ── Upcoming ──
router.get(
  "/upcoming",
  authorizeModule("matches", "read"),
  dynamicFieldAccess("matches"),
  asyncHandler(ctrl.upcoming),
);

// ── Player-centric routes (for player profile) ──
router.get(
  "/player/:playerId",
  authorizeModule("matches", "read"),
  validate(playerMatchesQuerySchema, "query"),
  dynamicFieldAccess("matches"),
  asyncHandler(ctrl.playerMatches),
);
router.get(
  "/player/:playerId/stats",
  authorizeModule("matches", "read"),
  dynamicFieldAccess("matches"),
  asyncHandler(ctrl.playerAggregateStats),
);

// ── Match CRUD ──
router.get(
  "/",
  authorizeModule("matches", "read"),
  validate(matchQuerySchema, "query"),
  dynamicFieldAccess("matches"),
  asyncHandler(ctrl.list),
);
router.get(
  "/:id",
  authorizeModule("matches", "read"),
  dynamicFieldAccess("matches"),
  asyncHandler(ctrl.getById),
);
router.post(
  "/",
  authorizeModule("matches", "create"),
  validate(createMatchSchema),
  asyncHandler(ctrl.create),
);
router.patch(
  "/:id",
  authorizeModule("matches", "update"),
  validate(updateMatchSchema),
  asyncHandler(ctrl.update),
);
router.patch(
  "/:id/score",
  authorizeModule("matches", "update"),
  validate(updateScoreSchema),
  asyncHandler(ctrl.updateScore),
);
router.patch(
  "/:id/status",
  authorizeModule("matches", "update"),
  validate(updateMatchStatusSchema),
  asyncHandler(ctrl.updateStatus),
);
router.delete(
  "/:id",
  authorizeModule("matches", "delete"),
  asyncHandler(ctrl.remove),
);

// ── Match Players (assign/manage players in a match) ──
router.get(
  "/:id/players",
  authorizeModule("matches", "read"),
  dynamicFieldAccess("matches"),
  asyncHandler(ctrl.getPlayers),
);
router.post(
  "/:id/players",
  authorizeModule("matches", "create"),
  validate(assignPlayersSchema),
  asyncHandler(ctrl.assignPlayers),
);
router.patch(
  "/:id/players/:playerId",
  authorizeModule("matches", "update"),
  validate(updateMatchPlayerSchema),
  asyncHandler(ctrl.updatePlayer),
);
router.delete(
  "/:id/players/:playerId",
  authorizeModule("matches", "delete"),
  asyncHandler(ctrl.removePlayer),
);

// ── Player Match Stats ──
router.get(
  "/:id/stats",
  authorizeModule("matches", "read"),
  dynamicFieldAccess("matches"),
  asyncHandler(ctrl.getStats),
);
router.post(
  "/:id/stats",
  authorizeModule("matches", "create"),
  validate(bulkStatsSchema),
  asyncHandler(ctrl.upsertStats),
);
router.patch(
  "/:id/stats/:playerId",
  authorizeModule("matches", "update"),
  validate(updateStatsSchema),
  asyncHandler(ctrl.updatePlayerStats),
);
router.delete(
  "/:id/stats/:playerId",
  authorizeModule("matches", "delete"),
  asyncHandler(ctrl.deletePlayerStats),
);

// ── Match Analysis (restricted to tactical roles) ──
router.get(
  "/:id/analysis",
  authorizeModule("matches", "read"),
  authorize("Admin", "Scout", "Analyst", "Coach"),
  asyncHandler(ctrl.listAnalyses),
);
router.get(
  "/:id/analysis/:analysisId",
  authorizeModule("matches", "read"),
  authorize("Admin", "Scout", "Analyst", "Coach"),
  asyncHandler(ctrl.getAnalysis),
);
router.post(
  "/:id/analysis",
  authorizeModule("matches", "create"),
  authorize("Admin", "Scout", "Analyst", "Coach"),
  validate(createMatchAnalysisSchema),
  asyncHandler(ctrl.createAnalysis),
);
router.patch(
  "/:id/analysis/:analysisId",
  authorizeModule("matches", "update"),
  authorize("Admin", "Scout", "Analyst", "Coach"),
  validate(updateMatchAnalysisSchema),
  asyncHandler(ctrl.updateAnalysis),
);
router.patch(
  "/:id/analysis/:analysisId/publish",
  authorizeModule("matches", "update"),
  authorize("Admin", "Scout", "Analyst", "Coach"),
  asyncHandler(ctrl.publishAnalysis),
);
router.delete(
  "/:id/analysis/:analysisId",
  authorizeModule("matches", "delete"),
  authorize("Admin", "Scout", "Analyst", "Coach"),
  asyncHandler(ctrl.removeAnalysis),
);

export default router;
