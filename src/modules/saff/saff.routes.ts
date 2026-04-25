import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import {
  tournamentQuerySchema,
  fetchRequestSchema,
  standingQuerySchema,
  fixtureQuerySchema,
  teamMapQuerySchema,
  mapTeamSchema,
  importRequestSchema,
  jobIdParamSchema,
  syncTournamentsSchema,
  createSessionSchema,
  sessionIdParamSchema,
  updateDecisionsSchema,
  applySessionSchema,
} from "@modules/saff/saff.validation";
import * as saffController from "@modules/saff/saff.controller";

const router = Router();

// All SAFF routes require authentication
router.use(authenticate);

// ── Tournaments ──
router.get(
  "/tournaments",
  authorizeModule("saff-data", "read"),
  validate(tournamentQuerySchema, "query"),
  asyncHandler(saffController.listTournaments),
);
router.post(
  "/tournaments/seed",
  authorizeModule("saff-data", "create"),
  asyncHandler(saffController.seedTournaments),
);
router.post(
  "/tournaments/sync",
  authorizeModule("saff-data", "create"),
  validate(syncTournamentsSchema),
  asyncHandler(saffController.syncTournaments),
);

// ── Fetch (Scrape from SAFF) ──
router.post(
  "/fetch",
  authorizeModule("saff-data", "create"),
  validate(fetchRequestSchema),
  asyncHandler(saffController.fetchFromSaff),
);

// ── Standings ──
router.get(
  "/standings",
  authorizeModule("saff-data", "read"),
  validate(standingQuerySchema, "query"),
  asyncHandler(saffController.listStandings),
);

// ── Fixtures ──
router.get(
  "/fixtures",
  authorizeModule("saff-data", "read"),
  validate(fixtureQuerySchema, "query"),
  asyncHandler(saffController.listFixtures),
);

// ── Team Mappings ──
router.get(
  "/team-maps",
  authorizeModule("saff-data", "read"),
  validate(teamMapQuerySchema, "query"),
  asyncHandler(saffController.listTeamMaps),
);
router.post(
  "/team-maps",
  authorizeModule("saff-data", "create"),
  validate(mapTeamSchema),
  asyncHandler(saffController.mapTeam),
);

// ── Import to Sadara (legacy direct-apply path; deprecated by /import-sessions) ──
router.post(
  "/import",
  authorizeModule("saff-data", "create"),
  validate(importRequestSchema),
  asyncHandler(saffController.importToSadara),
);

// ── Fetch Team Logos ──
router.post(
  "/fetch-logos",
  authorizeModule("saff-data", "create"),
  asyncHandler(saffController.fetchTeamLogos),
);

// ── Bulk Fetch Men's Leagues (stage-only — no production writes after redesign) ──
router.post(
  "/bulk-fetch-men",
  authorizeModule("saff-data", "create"),
  asyncHandler(saffController.bulkFetchMenLeagues),
);

// ── Stats ──
router.get(
  "/stats",
  authorizeModule("saff-data", "read"),
  asyncHandler(saffController.getStats),
);

// ── Job status polling ──
router.get(
  "/jobs/:jobId",
  authorizeModule("saff-data", "read"),
  validate(jobIdParamSchema, "params"),
  asyncHandler(saffController.getJobStatus),
);

// ── Sync (Scheduler) ──
router.get(
  "/sync-status",
  authorizeModule("saff-data", "read"),
  asyncHandler(saffController.getSyncStatus),
);
router.post(
  "/sync-now",
  authorizeModule("saff-data", "create"),
  asyncHandler(saffController.triggerSync),
);
router.get(
  "/sync-debug",
  authorizeModule("saff-data", "read"),
  asyncHandler(saffController.syncDebug),
);

// ── Player-centric endpoints ──
router.get(
  "/player-matches",
  authorizeModule("saff-data", "read"),
  asyncHandler(saffController.getPlayerUpcomingMatches),
);

router.get(
  "/player-stats/:playerId",
  authorizeModule("saff-data", "read"),
  asyncHandler(saffController.getPlayerCompetitionStats),
);

router.get(
  "/watchlist-matches",
  authorizeModule("saff-data", "read"),
  asyncHandler(saffController.getWatchlistMatches),
);

// ══════════════════════════════════════════
// IMPORT SESSIONS (WIZARD)
// ══════════════════════════════════════════

router.get(
  "/import-sessions/active",
  authorizeModule("saff-data", "read"),
  asyncHandler(saffController.listMyActiveImportSessions),
);

router.post(
  "/import-sessions",
  authorizeModule("saff-data", "create"),
  validate(createSessionSchema),
  asyncHandler(saffController.createImportSession),
);

router.get(
  "/import-sessions/:id",
  authorizeModule("saff-data", "read"),
  validate(sessionIdParamSchema, "params"),
  asyncHandler(saffController.getImportSession),
);

router.post(
  "/import-sessions/:id/upload",
  authorizeModule("saff-data", "create"),
  validate(sessionIdParamSchema, "params"),
  asyncHandler(saffController.uploadImportSession),
);

router.patch(
  "/import-sessions/:id/decisions",
  authorizeModule("saff-data", "update"),
  validate(sessionIdParamSchema, "params"),
  validate(updateDecisionsSchema),
  asyncHandler(saffController.updateImportSessionDecisions),
);

router.post(
  "/import-sessions/:id/preview",
  authorizeModule("saff-data", "create"),
  validate(sessionIdParamSchema, "params"),
  asyncHandler(saffController.previewImportSession),
);

router.post(
  "/import-sessions/:id/apply",
  authorizeModule("saff-data", "create"),
  validate(sessionIdParamSchema, "params"),
  validate(applySessionSchema),
  asyncHandler(saffController.applyImportSession),
);

router.post(
  "/import-sessions/:id/abort",
  authorizeModule("saff-data", "update"),
  validate(sessionIdParamSchema, "params"),
  asyncHandler(saffController.abortImportSession),
);

export default router;
