import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
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
  cacheRoute("media-kits", CacheTTL.MEDIUM),
  validate(mediaKitHistoryQuerySchema, "query"),
  asyncHandler(mediaKitController.listHistory),
);
router.get(
  "/:id",
  authorizeModule("media_kits", "read"),
  cacheRoute("media-kits", CacheTTL.MEDIUM),
  asyncHandler(mediaKitController.getById),
);
router.get(
  "/:id/download",
  authorizeModule("media_kits", "read"),
  asyncHandler(mediaKitController.download),
);

export default router;
