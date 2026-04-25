import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import {
  syncLeaguesSchema,
  clubIdParamSchema,
  syncClubSquadsBodySchema,
  matchIdParamSchema,
} from "./saffplus.validation";
import {
  playerReviewQuerySchema,
  playerReviewIdSchema,
  linkReviewSchema,
  rejectReviewSchema,
} from "./playerReview.validation";
import * as ctrl from "./saffplus.controller";

const router = Router();
router.use(authenticate);

router.get(
  "/discover",
  authorizeModule("saff-data", "read"),
  asyncHandler(ctrl.discover),
);

router.get(
  "/competitions",
  authorizeModule("saff-data", "read"),
  asyncHandler(ctrl.listCompetitions),
);

router.get(
  "/clubs",
  authorizeModule("saff-data", "read"),
  asyncHandler(ctrl.listTeams),
);

router.get(
  "/competitions/:competitionId/standings",
  authorizeModule("saff-data", "read"),
  asyncHandler(ctrl.listStandings),
);

router.get(
  "/competitions/:competitionId/matches",
  authorizeModule("saff-data", "read"),
  asyncHandler(ctrl.listMatches),
);

router.post(
  "/sync",
  authorizeModule("saff-data", "create"),
  validate(syncLeaguesSchema),
  asyncHandler(ctrl.syncLeagues),
);

// ── Phase 2: Club squads + rosters ──

router.post(
  "/clubs/:clubId/sync-squads",
  authorizeModule("saff-data", "create"),
  validate(clubIdParamSchema, "params"),
  validate(syncClubSquadsBodySchema),
  asyncHandler(ctrl.syncClubSquads),
);

// ── Phase 2: Player review queue ──

router.get(
  "/player-review",
  authorizeModule("saff-data", "read"),
  validate(playerReviewQuerySchema, "query"),
  asyncHandler(ctrl.listPlayerReview),
);

router.get(
  "/player-review/summary",
  authorizeModule("saff-data", "read"),
  asyncHandler(ctrl.getPlayerReviewSummary),
);

router.get(
  "/player-review/:id",
  authorizeModule("saff-data", "read"),
  validate(playerReviewIdSchema, "params"),
  asyncHandler(ctrl.getPlayerReviewById),
);

router.post(
  "/player-review/:id/link",
  authorizeModule("saff-data", "update"),
  validate(playerReviewIdSchema, "params"),
  validate(linkReviewSchema),
  asyncHandler(ctrl.linkPlayerReview),
);

router.post(
  "/player-review/:id/reject",
  authorizeModule("saff-data", "update"),
  validate(playerReviewIdSchema, "params"),
  validate(rejectReviewSchema),
  asyncHandler(ctrl.rejectPlayerReview),
);

router.post(
  "/player-review/:id/duplicate",
  authorizeModule("saff-data", "update"),
  validate(playerReviewIdSchema, "params"),
  asyncHandler(ctrl.markPlayerReviewDuplicate),
);

// ── Phase 3: Match events + media ──

router.get(
  "/matches/:matchId/events",
  authorizeModule("saff-data", "read"),
  validate(matchIdParamSchema, "params"),
  asyncHandler(ctrl.listMatchEvents),
);

router.get(
  "/matches/:matchId/media",
  authorizeModule("saff-data", "read"),
  validate(matchIdParamSchema, "params"),
  asyncHandler(ctrl.listMatchMedia),
);

router.post(
  "/matches/:matchId/sync-events",
  authorizeModule("saff-data", "create"),
  validate(matchIdParamSchema, "params"),
  asyncHandler(ctrl.syncMatchEventsCtrl),
);

router.post(
  "/matches/:matchId/sync-media",
  authorizeModule("saff-data", "create"),
  validate(matchIdParamSchema, "params"),
  asyncHandler(ctrl.syncMatchMediaCtrl),
);

export default router;
