// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.routes.ts
// ─────────────────────────────────────────────────────────────

import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import {
  syncPlayerSchema,
  syncTeamSchema,
  syncAllSchema,
  seedClubIdsSchema,
  syncDetailedStatsSchema,
  syncFixturesSchema,
  syncAllFixtureDetailsSchema,
  syncAllMatchStatsSchema,
  syncTeamRosterSchema,
  syncAllRostersSchema,
  backfillSeasonSchema,
  backfillAllSchema,
} from "@modules/spl/spl.validation";
import * as c from "@modules/spl/spl.controller";
import * as fx from "@modules/spl/spl.matches.controller";
import * as ms from "@modules/spl/spl.matchStats.controller";
import * as rs from "@modules/spl/spl.rosters.controller";
import * as bf from "@modules/spl/spl.backfill.controller";
import * as gw from "@modules/spl/spl.gameweeks.sync";
import { sendSuccess } from "@shared/utils/apiResponse";

const router = Router();
router.use(authenticate);

// Read
router.get(
  "/registry",
  authorizeModule("spl-sync", "read"),
  asyncHandler(c.getRegistry),
);
router.get(
  "/sync-status",
  authorizeModule("spl-sync", "read"),
  asyncHandler(c.getStatus),
);

// PulseLive data (read-only)
router.get(
  "/standings",
  authorizeModule("spl-sync", "read"),
  asyncHandler(c.standings),
);
router.get(
  "/leaderboard/:stat",
  authorizeModule("spl-sync", "read"),
  asyncHandler(c.leaderboard),
);
router.get(
  "/players/:id/detailed-stats",
  authorizeModule("spl-sync", "read"),
  asyncHandler(c.playerDetailedStats),
);
router.get(
  "/team-stats/:teamId",
  authorizeModule("spl-sync", "read"),
  asyncHandler(c.teamStats),
);

// Sync operations
router.post(
  "/sync/player",
  authorizeModule("spl-sync", "create"),
  validate(syncPlayerSchema),
  asyncHandler(c.syncPlayer),
);
router.post(
  "/sync/team",
  authorizeModule("spl-sync", "create"),
  validate(syncTeamSchema),
  asyncHandler(c.syncTeam),
);
router.post(
  "/sync/all",
  authorizeModule("spl-sync", "create"),
  validate(syncAllSchema),
  asyncHandler(c.syncAll),
);

// PulseLive sync
router.post(
  "/sync/detailed-stats",
  authorizeModule("spl-sync", "create"),
  validate(syncDetailedStatsSchema),
  asyncHandler(c.syncDetailedStats),
);

// Seed
router.post(
  "/seed-club-ids",
  authorizeModule("spl-sync", "create"),
  validate(seedClubIdsSchema),
  asyncHandler(c.seedClubIds),
);

// ── Phase A — Pulselive fixtures + match details + events ──
router.post(
  "/sync/fixtures",
  authorizeModule("spl-sync", "create"),
  validate(syncFixturesSchema),
  asyncHandler(fx.triggerSyncFixtures),
);
router.post(
  "/sync/fixtures/:pulselivefixtureId/detail",
  authorizeModule("spl-sync", "create"),
  asyncHandler(fx.triggerSyncFixtureDetail),
);
router.post(
  "/sync/fixture-details",
  authorizeModule("spl-sync", "create"),
  validate(syncAllFixtureDetailsSchema),
  asyncHandler(fx.triggerSyncAllFixtureDetails),
);
router.get(
  "/provider-fixtures/dry-run",
  authorizeModule("spl-sync", "read"),
  asyncHandler(fx.getProviderFixturesDryRun),
);

// ── Phase B — Match-level player stats from Pulselive ──
router.post(
  "/sync/match-stats/:pulselivefixtureId",
  authorizeModule("spl-sync", "create"),
  asyncHandler(ms.triggerSyncMatchStats),
);
router.post(
  "/sync/match-stats",
  authorizeModule("spl-sync", "create"),
  validate(syncAllMatchStatsSchema),
  asyncHandler(ms.triggerSyncAllMatchStats),
);

// ── Phase C — Squad rosters + team-season stats ──
router.post(
  "/sync/team-roster/:pulseLiveTeamId",
  authorizeModule("spl-sync", "create"),
  validate(syncTeamRosterSchema),
  asyncHandler(rs.triggerSyncTeamRoster),
);
router.post(
  "/sync/team-rosters",
  authorizeModule("spl-sync", "create"),
  validate(syncAllRostersSchema),
  asyncHandler(rs.triggerSyncAllTeamRosters),
);
router.post(
  "/sync/team-season-stats/:pulseLiveTeamId",
  authorizeModule("spl-sync", "create"),
  validate(syncTeamRosterSchema),
  asyncHandler(rs.triggerSyncTeamSeasonStats),
);
router.post(
  "/sync/team-season-stats",
  authorizeModule("spl-sync", "create"),
  validate(syncAllRostersSchema),
  asyncHandler(rs.triggerSyncAllTeamSeasonStats),
);

// ── Phase D — Historical backfill + headshots ──
router.get(
  "/seasons",
  authorizeModule("spl-sync", "read"),
  asyncHandler(bf.getSeasons),
);
router.post(
  "/backfill/season",
  authorizeModule("spl-sync", "create"),
  validate(backfillSeasonSchema),
  asyncHandler(bf.triggerBackfillSeason),
);
router.post(
  "/backfill/all",
  authorizeModule("spl-sync", "create"),
  validate(backfillAllSchema),
  asyncHandler(bf.triggerBackfillAll),
);
router.post(
  "/sync/headshots",
  authorizeModule("spl-sync", "create"),
  asyncHandler(bf.triggerHeadshotsSync),
);
router.get(
  "/backfill/runs",
  authorizeModule("spl-sync", "read"),
  asyncHandler(bf.listBackfillRuns),
);

// ── Gameweeks ──
router.get(
  "/gameweeks",
  authorizeModule("spl-sync", "read"),
  asyncHandler(async (req, res) => {
    const seasonId = req.query.seasonId
      ? Number(req.query.seasonId)
      : undefined;
    const rows = await gw.listGameweeks(seasonId);
    sendSuccess(res, rows);
  }),
);
router.post(
  "/sync/gameweeks",
  authorizeModule("spl-sync", "create"),
  asyncHandler(async (req, res) => {
    const { seasonId } = req.body as { seasonId?: number };
    const result = await gw.syncGameweeks(seasonId);
    sendSuccess(res, result, `Synced ${result.upserted} gameweeks`);
  }),
);

export default router;
