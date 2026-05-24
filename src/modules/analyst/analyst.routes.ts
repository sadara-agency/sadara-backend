import { Router } from "express";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import * as ctrl from "./analyst.controller";
import {
  playerIdParamSchema,
  kpiIdParamSchema,
  sessionIdParamSchema,
  cycleIdParamSchema,
  seasonParamSchema,
  matchStatsQuerySchema,
  kpiTrendQuerySchema,
  compareQuerySchema,
  createKpiSchema,
  updateKpiSchema,
  computeKpiSchema,
  upsertSeasonStatsSchema,
  createSessionSchema,
  updateSessionSchema,
  createEvolutionCycleSchema,
  updateEvolutionCycleSchema,
} from "./analyst.validation";

const router = Router();
router.use(authenticate);

// ── Read endpoints ────────────────────────────────────────────────────────────

router.get(
  "/matches-to-analyze",
  authorizeModule("players", "read"),
  cacheRoute("analyst:matches-to-analyze", CacheTTL.SHORT),
  ctrl.matchesToAnalyze,
);

router.get(
  "/players",
  authorizeModule("players", "read"),
  dynamicFieldAccess("players"),
  cacheRoute("analyst:players", CacheTTL.SHORT),
  ctrl.listPlayers,
);

router.get(
  "/compare",
  authorizeModule("players", "read"),
  validate(compareQuerySchema, "query"),
  ctrl.compare,
);

router.get(
  "/players/:playerId/profile",
  authorizeModule("players", "read"),
  validate(playerIdParamSchema, "params"),
  cacheRoute("analyst:profile", CacheTTL.SHORT),
  ctrl.getProfile,
);

router.get(
  "/players/:playerId/match-stats",
  authorizeModule("players", "read"),
  validate(playerIdParamSchema, "params"),
  validate(matchStatsQuerySchema, "query"),
  cacheRoute("analyst:match-stats", CacheTTL.SHORT),
  ctrl.getMatchStats,
);

router.get(
  "/players/:playerId/season-stats",
  authorizeModule("player-stats", "read"),
  validate(playerIdParamSchema, "params"),
  cacheRoute("analyst:season-stats", CacheTTL.SHORT),
  ctrl.getSeasonStats,
);

router.get(
  "/players/:playerId/kpi-trend",
  authorizeModule("tactical", "read"),
  validate(playerIdParamSchema, "params"),
  validate(kpiTrendQuerySchema, "query"),
  cacheRoute("analyst:kpi-trend", CacheTTL.SHORT),
  ctrl.getKpiTrend,
);

// ── KPI writes ────────────────────────────────────────────────────────────────

router.post(
  "/players/:playerId/kpi",
  authorizeModule("tactical", "create"),
  validate(playerIdParamSchema, "params"),
  validate(createKpiSchema),
  ctrl.createKpi,
);

router.post(
  "/players/:playerId/kpi/compute",
  authorizeModule("tactical", "create"),
  validate(playerIdParamSchema, "params"),
  validate(computeKpiSchema),
  ctrl.computeKpi,
);

router.patch(
  "/kpi/:kpiId",
  authorizeModule("tactical", "update"),
  validate(kpiIdParamSchema, "params"),
  validate(updateKpiSchema),
  ctrl.updateKpi,
);

// ── Season stats writes ───────────────────────────────────────────────────────

router.put(
  "/players/:playerId/season-stats/:season",
  authorizeModule("player-stats", "update"),
  validate(seasonParamSchema, "params"),
  validate(upsertSeasonStatsSchema),
  ctrl.upsertSeasonStats,
);

router.post(
  "/players/:playerId/season-stats/:season/recompute",
  authorizeModule("player-stats", "update"),
  validate(seasonParamSchema, "params"),
  ctrl.recomputeSeasonStats,
);

// ── Session writes ────────────────────────────────────────────────────────────

router.post(
  "/players/:playerId/sessions",
  authorizeModule("sessions", "create"),
  validate(playerIdParamSchema, "params"),
  validate(createSessionSchema),
  ctrl.createSession,
);

router.patch(
  "/sessions/:sessionId",
  authorizeModule("sessions", "update"),
  validate(sessionIdParamSchema, "params"),
  validate(updateSessionSchema),
  ctrl.updateSession,
);

// ── Evolution cycle writes ────────────────────────────────────────────────────
// advance before generic patch to avoid route conflict

router.post(
  "/players/:playerId/evolution-cycles",
  authorizeModule("evolution-cycles", "create"),
  validate(playerIdParamSchema, "params"),
  validate(createEvolutionCycleSchema),
  ctrl.createEvolutionCycle,
);

router.post(
  "/evolution-cycles/:cycleId/advance",
  authorizeModule("evolution-cycles", "update"),
  validate(cycleIdParamSchema, "params"),
  ctrl.advanceEvolutionPhase,
);

router.patch(
  "/evolution-cycles/:cycleId",
  authorizeModule("evolution-cycles", "update"),
  validate(cycleIdParamSchema, "params"),
  validate(updateEvolutionCycleSchema),
  ctrl.updateEvolutionCycle,
);

export default router;
