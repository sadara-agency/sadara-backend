import { Router } from "express";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import {
  createDevReviewSchema,
  updateDevReviewSchema,
  devReviewQuerySchema,
  generateTemplateSchema,
} from "./devReview.validation";
import * as ctrl from "./devReview.controller";

const router = Router();
router.use(authenticate);
router.use(dynamicFieldAccess("dev-reviews"));

// GET /api/v1/training/reviews
router.get(
  "/",
  authorizeModule("dev-reviews", "read"),
  validate(devReviewQuerySchema, "query"),
  cacheRoute("dev-reviews", CacheTTL.MEDIUM),
  ctrl.list,
);

// POST /api/v1/training/reviews/generate-template
router.post(
  "/generate-template",
  authorizeModule("dev-reviews", "create"),
  validate(generateTemplateSchema),
  ctrl.generateTemplate,
);

// GET /api/v1/training/reviews/:id
router.get("/:id", authorizeModule("dev-reviews", "read"), ctrl.getById);

// POST /api/v1/training/reviews
router.post(
  "/",
  authorizeModule("dev-reviews", "create"),
  validate(createDevReviewSchema),
  ctrl.create,
);

// PATCH /api/v1/training/reviews/:id
router.patch(
  "/:id",
  authorizeModule("dev-reviews", "update"),
  validate(updateDevReviewSchema),
  ctrl.update,
);

// POST /api/v1/training/reviews/:id/submit
router.post(
  "/:id/submit",
  authorizeModule("dev-reviews", "update"),
  ctrl.submit,
);

// POST /api/v1/training/reviews/:id/acknowledge
router.post(
  "/:id/acknowledge",
  authorizeModule("dev-reviews", "update"),
  ctrl.acknowledge,
);

// DELETE /api/v1/training/reviews/:id
router.delete("/:id", authorizeModule("dev-reviews", "delete"), ctrl.remove);

export default router;
