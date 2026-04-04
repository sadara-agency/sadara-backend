import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { syncLeaguesSchema } from "./saffplus.validation";
import * as ctrl from "./saffplus.controller";

const router = Router();
router.use(authenticate);

// ── Discovery ──
router.get(
  "/discover",
  authorizeModule("saff-data", "read"),
  asyncHandler(ctrl.discover),
);

// ── Competitions ──
router.get(
  "/competitions",
  authorizeModule("saff-data", "read"),
  asyncHandler(ctrl.listCompetitions),
);

// ── Clubs / Teams ──
router.get(
  "/clubs",
  authorizeModule("saff-data", "read"),
  asyncHandler(ctrl.listTeams),
);

// ── Standings ──
router.get(
  "/competitions/:competitionId/standings",
  authorizeModule("saff-data", "read"),
  asyncHandler(ctrl.listStandings),
);

// ── Matches ──
router.get(
  "/competitions/:competitionId/matches",
  authorizeModule("saff-data", "read"),
  asyncHandler(ctrl.listMatches),
);

// ── Sync (SAFF+ API first, scraper fallback) ──
router.post(
  "/sync",
  authorizeModule("saff-data", "create"),
  validate(syncLeaguesSchema),
  asyncHandler(ctrl.syncLeagues),
);

export default router;
