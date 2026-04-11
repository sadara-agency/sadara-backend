import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import { uploadSingle, verifyFileType } from "@middleware/upload";
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
  cacheRoute("social-posts", CacheTTL.MEDIUM),
  validate(socialPostQuerySchema, "query"),
  asyncHandler(socialPostController.list),
);

// ── Get by ID ──
router.get(
  "/:id",
  authorizeModule("social_media", "read"),
  cacheRoute("social-posts", CacheTTL.MEDIUM),
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

// ── Image Upload ──
router.post(
  "/:id/images",
  authorizeModule("social_media", "update"),
  uploadSingle,
  verifyFileType,
  asyncHandler(socialPostController.uploadImage),
);
router.delete(
  "/:id/images/:index",
  authorizeModule("social_media", "update"),
  asyncHandler(socialPostController.removeImage),
);

// ── Delete ──
router.delete(
  "/:id",
  authorizeModule("social_media", "delete"),
  asyncHandler(socialPostController.remove),
);

export default router;
