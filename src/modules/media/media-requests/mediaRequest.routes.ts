import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import {
  createMediaRequestSchema,
  updateMediaRequestSchema,
  updateMediaRequestStatusSchema,
  mediaRequestQuerySchema,
} from "./mediaRequest.schema";
import * as mediaRequestController from "./mediaRequest.controller";

const router = Router();
router.use(authenticate);

// ── List & Read ──
router.get(
  "/",
  authorizeModule("media_requests", "read"),
  dynamicFieldAccess("media_requests"),
  validate(mediaRequestQuerySchema, "query"),
  asyncHandler(mediaRequestController.list),
);
router.get(
  "/:id",
  authorizeModule("media_requests", "read"),
  dynamicFieldAccess("media_requests"),
  asyncHandler(mediaRequestController.getById),
);

// ── Create ──
router.post(
  "/",
  authorizeModule("media_requests", "create"),
  validate(createMediaRequestSchema),
  asyncHandler(mediaRequestController.create),
);

// ── Update ──
router.patch(
  "/:id",
  authorizeModule("media_requests", "update"),
  validate(updateMediaRequestSchema),
  asyncHandler(mediaRequestController.update),
);
router.patch(
  "/:id/status",
  authorizeModule("media_requests", "update"),
  validate(updateMediaRequestStatusSchema),
  asyncHandler(mediaRequestController.updateStatus),
);

// ── Delete ──
router.delete(
  "/:id",
  authorizeModule("media_requests", "delete"),
  asyncHandler(mediaRequestController.remove),
);

export default router;
