import { Router } from "express";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import {
  createTacticalReportSchema,
  updateTacticalReportSchema,
  tacticalReportQuerySchema,
  autoGenerateSchema,
} from "./tacticalReport.validation";
import * as ctrl from "./tacticalReport.controller";

const router = Router();
router.use(authenticate);

// GET /api/v1/tactical/reports
router.get(
  "/",
  authorizeModule("tactical", "read"),
  validate(tacticalReportQuerySchema, "query"),
  cacheRoute("tactical-reports", CacheTTL.MEDIUM),
  ctrl.list,
);

// GET /api/v1/tactical/reports/:id
router.get("/:id", authorizeModule("tactical", "read"), ctrl.getById);

// POST /api/v1/tactical/reports
router.post(
  "/",
  authorizeModule("tactical", "create"),
  validate(createTacticalReportSchema),
  ctrl.create,
);

// POST /api/v1/tactical/reports/auto-generate
router.post(
  "/auto-generate",
  authorizeModule("tactical", "create"),
  validate(autoGenerateSchema),
  ctrl.autoGenerate,
);

// PATCH /api/v1/tactical/reports/:id
router.patch(
  "/:id",
  authorizeModule("tactical", "update"),
  validate(updateTacticalReportSchema),
  ctrl.update,
);

// POST /api/v1/tactical/reports/:id/publish
router.post(
  "/:id/publish",
  authorizeModule("tactical", "update"),
  ctrl.publish,
);

// DELETE /api/v1/tactical/reports/:id
router.delete("/:id", authorizeModule("tactical", "delete"), ctrl.remove);

export default router;
