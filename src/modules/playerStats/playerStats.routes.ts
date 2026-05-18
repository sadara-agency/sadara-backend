import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import * as ctrl from "./playerStats.controller";
import {
  upsertPlayerSeasonStatsSchema,
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

export default router;
