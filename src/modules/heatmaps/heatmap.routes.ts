import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL, CachePrefix } from "@shared/utils/cache";
import { validate } from "@middleware/validate";
import {
  createHeatmapDataSchema,
  playerHeatmapsQuerySchema,
  aggregateHeatmapQuerySchema,
  heatmapIdParamsSchema,
  playerIdParamsSchema,
  matchIdParamsSchema,
} from "./heatmap.validation";
import * as heatmapController from "./heatmap.controller";

const router = Router();
router.use(authenticate);

// ── Read ──
router.get(
  "/player/:playerId/aggregate",
  authorizeModule("heatmaps", "read"),
  validate(playerIdParamsSchema, "params"),
  validate(aggregateHeatmapQuerySchema, "query"),
  dynamicFieldAccess("heatmaps"),
  cacheRoute(CachePrefix.HEATMAPS, CacheTTL.MEDIUM),
  asyncHandler(heatmapController.aggregateByPlayer),
);

router.get(
  "/player/:playerId",
  authorizeModule("heatmaps", "read"),
  validate(playerIdParamsSchema, "params"),
  validate(playerHeatmapsQuerySchema, "query"),
  dynamicFieldAccess("heatmaps"),
  cacheRoute(CachePrefix.HEATMAPS, CacheTTL.MEDIUM),
  asyncHandler(heatmapController.listByPlayer),
);

router.get(
  "/match/:matchId",
  authorizeModule("heatmaps", "read"),
  validate(matchIdParamsSchema, "params"),
  dynamicFieldAccess("heatmaps"),
  cacheRoute(CachePrefix.HEATMAPS, CacheTTL.MEDIUM),
  asyncHandler(heatmapController.listByMatch),
);

router.get(
  "/:id",
  authorizeModule("heatmaps", "read"),
  validate(heatmapIdParamsSchema, "params"),
  dynamicFieldAccess("heatmaps"),
  cacheRoute(CachePrefix.HEATMAPS, CacheTTL.MEDIUM),
  asyncHandler(heatmapController.getById),
);

// ── Create ──
router.post(
  "/data",
  authorizeModule("heatmaps", "create"),
  validate(createHeatmapDataSchema),
  asyncHandler(heatmapController.create),
);

// ── Delete ──
router.delete(
  "/:id",
  authorizeModule("heatmaps", "delete"),
  validate(heatmapIdParamsSchema, "params"),
  asyncHandler(heatmapController.remove),
);

export default router;
