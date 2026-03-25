import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import {
  createPressReleaseSchema,
  updatePressReleaseSchema,
  updatePressReleaseStatusSchema,
  pressReleaseQuerySchema,
} from "./pressRelease.schema";
import * as pressReleaseController from "./pressRelease.controller";

const router = Router();
router.use(authenticate);

// ── List & Read ──
router.get(
  "/",
  authorizeModule("press_releases", "read"),
  dynamicFieldAccess("press_releases"),
  validate(pressReleaseQuerySchema, "query"),
  asyncHandler(pressReleaseController.list),
);
router.get(
  "/slug/:slug",
  authorizeModule("press_releases", "read"),
  dynamicFieldAccess("press_releases"),
  asyncHandler(pressReleaseController.getBySlug),
);
router.get(
  "/:id",
  authorizeModule("press_releases", "read"),
  dynamicFieldAccess("press_releases"),
  asyncHandler(pressReleaseController.getById),
);

// ── Create ──
router.post(
  "/",
  authorizeModule("press_releases", "create"),
  validate(createPressReleaseSchema),
  asyncHandler(pressReleaseController.create),
);

// ── Update ──
router.patch(
  "/:id",
  authorizeModule("press_releases", "update"),
  validate(updatePressReleaseSchema),
  asyncHandler(pressReleaseController.update),
);
router.patch(
  "/:id/status",
  authorizeModule("press_releases", "update"),
  validate(updatePressReleaseStatusSchema),
  asyncHandler(pressReleaseController.updateStatus),
);

// ── Delete ──
router.delete(
  "/:id",
  authorizeModule("press_releases", "delete"),
  asyncHandler(pressReleaseController.remove),
);

export default router;
