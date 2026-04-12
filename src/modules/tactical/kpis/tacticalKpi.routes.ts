import { Router } from "express";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import {
  tacticalKpiQuerySchema,
  createTacticalKpiSchema,
  updateTacticalKpiSchema,
  computeKpiSchema,
} from "./tacticalKpi.validation";
import * as ctrl from "./tacticalKpi.controller";

const router = Router();
router.use(authenticate);

// GET /api/v1/tactical/kpis
router.get(
  "/",
  authorizeModule("tactical", "read"),
  validate(tacticalKpiQuerySchema, "query"),
  cacheRoute("tactical-kpis", CacheTTL.MEDIUM),
  ctrl.list,
);

// GET /api/v1/tactical/kpis/:id
router.get("/:id", authorizeModule("tactical", "read"), ctrl.getById);

// GET /api/v1/tactical/kpis/player/:playerId/match/:matchId
router.get(
  "/player/:playerId/match/:matchId",
  authorizeModule("tactical", "read"),
  ctrl.getByMatch,
);

// GET /api/v1/tactical/kpis/player/:playerId/trend
router.get(
  "/player/:playerId/trend",
  authorizeModule("tactical", "read"),
  cacheRoute("tactical-trend", CacheTTL.MEDIUM),
  ctrl.playerTrend,
);

// POST /api/v1/tactical/kpis — manual entry
router.post(
  "/",
  authorizeModule("tactical", "create"),
  validate(createTacticalKpiSchema),
  ctrl.create,
);

// POST /api/v1/tactical/kpis/compute — auto-compute from match stats
router.post(
  "/compute",
  authorizeModule("tactical", "create"),
  validate(computeKpiSchema),
  ctrl.compute,
);

// PATCH /api/v1/tactical/kpis/:id
router.patch(
  "/:id",
  authorizeModule("tactical", "update"),
  validate(updateTacticalKpiSchema),
  ctrl.update,
);

// DELETE /api/v1/tactical/kpis/:id
router.delete("/:id", authorizeModule("tactical", "delete"), ctrl.remove);

export default router;
