import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import {
  createSocialPostSchema,
  updateSocialPostSchema,
  updateSocialPostStatusSchema,
  socialPostQuerySchema,
} from "./socialPost.validation";
import * as socialPostController from "./socialPost.controller";

const router = Router();
router.use(authenticate);

// ── List ──
router.get(
  "/",
  authorizeModule("social_media", "read"),
  validate(socialPostQuerySchema, "query"),
  asyncHandler(socialPostController.list),
);

// ── Get by ID ──
router.get(
  "/:id",
  authorizeModule("social_media", "read"),
  asyncHandler(socialPostController.getById),
);

// ── Create ──
router.post(
  "/",
  authorizeModule("social_media", "create"),
  validate(createSocialPostSchema),
  asyncHandler(socialPostController.create),
);

// ── Update ──
router.put(
  "/:id",
  authorizeModule("social_media", "update"),
  validate(updateSocialPostSchema),
  asyncHandler(socialPostController.update),
);

// ── Update Status ──
router.patch(
  "/:id/status",
  authorizeModule("social_media", "update"),
  validate(updateSocialPostStatusSchema),
  asyncHandler(socialPostController.updateStatus),
);

// ── Delete ──
router.delete(
  "/:id",
  authorizeModule("social_media", "delete"),
  asyncHandler(socialPostController.remove),
);

export default router;
