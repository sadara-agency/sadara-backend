import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import {
  syncLeaguesSchema,
  clubIdParamSchema,
  syncClubSquadsBodySchema,
  matchIdParamSchema,
  syncPlayerSchema,
  saffPlayerIdParamSchema,
  sadaraPlayerIdParamSchema,
  autoLinkAllBodySchema,
  previewByUrlSchema,
  linkByUrlSchema,
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

// ── HLS + DRM Proxy ──
// These endpoints serve binary/text content, not JSON — they bypass the
// standard JSON response helpers and write directly to res.

router.get(
  "/matches/:matchId/stream.m3u8",
  authorizeModule("saff-data", "read"),
  validate(matchIdParamSchema, "params"),
  asyncHandler(ctrl.proxyMatchStream),
);

// No matchId param — the upstream URL is the `u` query param (allowlist-validated).
router.get("/stream/segment", asyncHandler(ctrl.proxyStreamSegment));

// express.raw() so EME challenge bytes arrive as a Buffer, not parsed JSON.
router.post(
  "/matches/:matchId/drm-license",
  authorizeModule("saff-data", "read"),
  validate(matchIdParamSchema, "params"),

  require("express").raw({ type: "application/octet-stream", limit: "64kb" }),
  asyncHandler(ctrl.proxyMatchDrmLicense),
);

// ── Phase 4: Player profile enrichment ──

// Fixed-path routes must come before param routes to avoid Express matching
// "preview-by-url" or "link-by-url" as a saffPlayerId.
router.get(
  "/players/preview-by-url",
  authorizeModule("saff-data", "read"),
  validate(previewByUrlSchema, "query"),
  asyncHandler(ctrl.previewByUrlCtrl),
);

router.post(
  "/players/link-by-url",
  authorizeModule("saff-data", "update"),
  validate(linkByUrlSchema),
  asyncHandler(ctrl.linkByUrlCtrl),
);

router.get(
  "/players/by-sadara/:sadaraPlayerId/live",
  authorizeModule("saff-data", "read"),
  validate(sadaraPlayerIdParamSchema, "params"),
  asyncHandler(ctrl.getLiveProfileBySadaraIdCtrl),
);

router.get(
  "/players/:saffPlayerId/preview",
  authorizeModule("saff-data", "read"),
  validate(saffPlayerIdParamSchema, "params"),
  asyncHandler(ctrl.getPlayerProfilePreviewCtrl),
);

router.post(
  "/players/sync",
  authorizeModule("saff-data", "create"),
  validate(syncPlayerSchema),
  asyncHandler(ctrl.syncPlayerCtrl),
);

// ── Auto-link: match Sadara players to SAFF+ by name + club + DOB ──

// Fixed path must come before the param route to avoid Express treating
// "auto-link-all" as a sadaraPlayerId UUID.
router.post(
  "/players/auto-link-all",
  authorizeModule("saff-data", "update"),
  validate(autoLinkAllBodySchema),
  asyncHandler(ctrl.autoLinkAllPlayersCtrl),
);

router.post(
  "/players/:sadaraPlayerId/auto-link",
  authorizeModule("saff-data", "update"),
  validate(sadaraPlayerIdParamSchema, "params"),
  asyncHandler(ctrl.autoLinkPlayerCtrl),
);

// Unlink — undo a SAFF+ player link (admin/manager via saff-data:update)
router.delete(
  "/players/:sadaraPlayerId/link",
  authorizeModule("saff-data", "update"),
  validate(sadaraPlayerIdParamSchema, "params"),
  asyncHandler(ctrl.unlinkPlayerCtrl),
);

export default router;
