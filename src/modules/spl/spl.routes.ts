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
} from "@modules/spl/spl.validation";
import * as c from "@modules/spl/spl.controller";

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

export default router;
