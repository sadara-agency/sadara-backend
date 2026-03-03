import { Router } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { cacheRoute } from "../../middleware/cache.middleware";
import { CacheTTL } from "../../shared/utils/cache";
import { uploadSingle, verifyFileType } from "../../middleware/upload";
import {
  fieldAccess,
  PLAYER_HIDDEN_FIELDS,
} from "../../middleware/fieldAccess";
import {
  createPlayerSchema,
  updatePlayerSchema,
  playerQuerySchema,
} from "./utils/player.schema";
import * as playerController from "./player.controller";

const router = Router();
router.use(authenticate);

// ── Read (cached) ──
router.get(
  "/",
  validate(playerQuerySchema, "query"),
  fieldAccess(PLAYER_HIDDEN_FIELDS),
  cacheRoute("players", CacheTTL.MEDIUM),
  asyncHandler(playerController.list),
);
router.get("/check-duplicate", asyncHandler(playerController.checkDuplicate));
router.get(
  "/:id",
  fieldAccess(PLAYER_HIDDEN_FIELDS),
  cacheRoute("player", CacheTTL.MEDIUM),
  asyncHandler(playerController.getById),
);

// ── Write (no cache — these invalidate) ──
router.post(
  "/",
  authorize("Admin", "Manager"),
  validate(createPlayerSchema),
  asyncHandler(playerController.create),
);
router.patch(
  "/:id",
  authorize("Admin", "Manager"),
  validate(updatePlayerSchema),
  asyncHandler(playerController.update),
);
router.delete(
  "/:id",
  authorize("Admin"),
  asyncHandler(playerController.remove),
);
router.post(
  "/:id/photo",
  authorize("Admin", "Manager"),
  uploadSingle,
  verifyFileType,
  asyncHandler(playerController.uploadPhoto),
);

router.get("/:id/club-history", asyncHandler(playerController.getClubHistory));
router.get(
  "/:id/providers",
  authorize("Admin", "Manager"),
  asyncHandler(playerController.getProviders),
);
router.put(
  "/:id/providers",
  authorize("Admin", "Manager"),
  asyncHandler(playerController.upsertProvider),
);
router.delete(
  "/:id/providers/:provider",
  authorize("Admin", "Manager"),
  asyncHandler(playerController.removeProvider),
);
router.post(
  "/:id/refresh-stats",
  authorize("Admin", "Manager"),
  asyncHandler(playerController.refreshStats),
);

export default router;
