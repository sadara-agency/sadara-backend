import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import {
  generatePlayerKitSchema,
  generateSquadKitSchema,
  mediaKitHistoryQuerySchema,
} from "./mediaKit.validation";
import * as mediaKitController from "./mediaKit.controller";

const router = Router();
router.use(authenticate);

// ── Generate ──
router.post(
  "/player/:playerId",
  authorizeModule("media_kits", "create"),
  validate(generatePlayerKitSchema),
  asyncHandler(mediaKitController.generatePlayerKit),
);
router.post(
  "/squad/:clubId",
  authorizeModule("media_kits", "create"),
  validate(generateSquadKitSchema),
  asyncHandler(mediaKitController.generateSquadKit),
);

// ── History ──
router.get(
  "/history",
  authorizeModule("media_kits", "read"),
  validate(mediaKitHistoryQuerySchema, "query"),
  asyncHandler(mediaKitController.listHistory),
);
router.get(
  "/:id",
  authorizeModule("media_kits", "read"),
  asyncHandler(mediaKitController.getById),
);

export default router;
