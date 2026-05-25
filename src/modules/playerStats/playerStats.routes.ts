import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import * as ctrl from "./playerStats.controller";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import {
  upsertPlayerSeasonStatsSchema,
  applyMatchToSeasonSchema,
  seasonParamSchema,
  playerIdParamSchema,
} from "./playerStats.validation";

const router = Router();
router.use(authenticate);

router.get(
  "/:playerId",
  authorizeModule("player-stats", "read"),
  validate(playerIdParamSchema, "params"),
  cacheRoute("player-season-stats", CacheTTL.MEDIUM),
  asyncHandler(ctrl.getAllSeasons),
);

/**
 * @swagger
 * /player-stats/{playerId}/history:
 *   get:
 *     summary: Change history (audit log) for a player's season stats
 *     tags: [PlayerStats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of audit entries
 */
router.get(
  "/:playerId/history",
  authorizeModule("player-stats", "read"),
  validate(playerIdParamSchema, "params"),
  dynamicFieldAccess("player-stats"),
  asyncHandler(ctrl.getHistory),
);

router.get(
  "/:playerId/:season",
  authorizeModule("player-stats", "read"),
  validate(seasonParamSchema, "params"),
  cacheRoute("player-season-stats", CacheTTL.MEDIUM),
  asyncHandler(ctrl.getOneSeason),
);

router.put(
  "/:playerId/:season",
  authorizeModule("player-stats", "update"),
  validate(seasonParamSchema, "params"),
  validate(upsertPlayerSeasonStatsSchema),
  asyncHandler(ctrl.upsertSeason),
);

router.post(
  "/:playerId/:season/recompute",
  authorizeModule("player-stats", "update"),
  validate(seasonParamSchema, "params"),
  asyncHandler(ctrl.recompute),
);

/**
 * @swagger
 * /player-stats/{playerId}/{season}/apply-match:
 *   post:
 *     summary: Record a match's stats and add them onto the season totals
 *     tags: [PlayerStats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Updated season stats
 */
router.post(
  "/:playerId/:season/apply-match",
  authorizeModule("player-stats", "update"),
  validate(seasonParamSchema, "params"),
  validate(applyMatchToSeasonSchema),
  asyncHandler(ctrl.applyMatch),
);

export default router;
