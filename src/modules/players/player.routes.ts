import { Router } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { authenticate, authorizeModule } from "../../middleware/auth";
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
  authorizeModule("players", "read"),
  validate(playerQuerySchema, "query"),
  fieldAccess(PLAYER_HIDDEN_FIELDS),
  cacheRoute("players", CacheTTL.MEDIUM),
  asyncHandler(playerController.list),
);
router.get("/check-duplicate", authorizeModule("players", "read"), asyncHandler(playerController.checkDuplicate));
router.get(
  "/:id",
  authorizeModule("players", "read"),
  fieldAccess(PLAYER_HIDDEN_FIELDS),
  cacheRoute("player", CacheTTL.MEDIUM),
  asyncHandler(playerController.getById),
);

// ── Write (no cache — these invalidate) ──
router.post(
  "/",
  authorizeModule("players", "create"),
  validate(createPlayerSchema),
  asyncHandler(playerController.create),
);
router.patch(
  "/:id",
  authorizeModule("players", "update"),
  validate(updatePlayerSchema),
  asyncHandler(playerController.update),
);
router.delete(
  "/:id",
  authorizeModule("players", "delete"),
  asyncHandler(playerController.remove),
);
router.post(
  "/:id/photo",
  authorizeModule("players", "create"),
  uploadSingle,
  verifyFileType,
  asyncHandler(playerController.uploadPhoto),
);

router.get("/:id/club-history", authorizeModule("players", "read"), asyncHandler(playerController.getClubHistory));
router.get(
  "/:id/providers",
  authorizeModule("players", "read"),
  asyncHandler(playerController.getProviders),
);
router.put(
  "/:id/providers",
  authorizeModule("players", "update"),
  asyncHandler(playerController.upsertProvider),
);
router.delete(
  "/:id/providers/:provider",
  authorizeModule("players", "delete"),
  asyncHandler(playerController.removeProvider),
);
router.post(
  "/:id/refresh-stats",
  authorizeModule("players", "create"),
  asyncHandler(playerController.refreshStats),
);

export default router;
