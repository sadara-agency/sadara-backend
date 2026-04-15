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

// ── Import to Sadara ──
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

// ── Bulk Fetch Men's Leagues ──
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

export default router;
