import { Router } from "express";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import {
  createOppositionReportSchema,
  updateOppositionReportSchema,
  oppositionReportQuerySchema,
  oppositionReportParamsSchema,
} from "./oppositionReport.validation";
import * as ctrl from "./oppositionReport.controller";

const router = Router();
router.use(authenticate);

// GET /api/v1/tactical/opposition
router.get(
  "/",
  authorizeModule("tactical", "read"),
  validate(oppositionReportQuerySchema, "query"),
  cacheRoute("opposition-reports", CacheTTL.MEDIUM),
  ctrl.list,
);

// GET /api/v1/tactical/opposition/:id
router.get(
  "/:id",
  authorizeModule("tactical", "read"),
  validate(oppositionReportParamsSchema, "params"),
  ctrl.getById,
);

// POST /api/v1/tactical/opposition
router.post(
  "/",
  authorizeModule("tactical", "create"),
  validate(createOppositionReportSchema),
  ctrl.create,
);

// POST /api/v1/tactical/opposition/:id/publish
router.post(
  "/:id/publish",
  authorizeModule("tactical", "update"),
  validate(oppositionReportParamsSchema, "params"),
  ctrl.publish,
);

// PATCH /api/v1/tactical/opposition/:id
router.patch(
  "/:id",
  authorizeModule("tactical", "update"),
  validate(updateOppositionReportSchema),
  ctrl.update,
);

// DELETE /api/v1/tactical/opposition/:id
router.delete(
  "/:id",
  authorizeModule("tactical", "delete"),
  validate(oppositionReportParamsSchema, "params"),
  ctrl.remove,
);

export default router;
