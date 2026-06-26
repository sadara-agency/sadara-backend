import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import { uploadSingle, verifyFileType } from "@middleware/upload";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import {
  createPlayerSchema,
  updatePlayerSchema,
  playerQuerySchema,
  upsertProviderSchema,
  validateProviderSchema,
  refreshStatsSchema,
  timelineQuerySchema,
} from "@modules/players/utils/player.validation";
import * as playerController from "@modules/players/player.controller";
import {
  getFullAccessMap,
  type PlayerPackage,
} from "@shared/utils/packageAccess";
import { sendSuccess } from "@shared/utils/apiResponse";
import { Player } from "@modules/players/player.model";

const router = Router();
router.use(authenticate);

// ── Read (cached) ──
router.get(
  "/",
  authorizeModule("players", "read"),
  validate(playerQuerySchema, "query"),
  dynamicFieldAccess("players"),
  cacheRoute("players", CacheTTL.MEDIUM),
  asyncHandler(playerController.list),
);
router.get(
  "/check-duplicate",
  authorizeModule("players", "read"),
  asyncHandler(playerController.checkDuplicate),
);
router.get(
  "/:id",
  authorizeModule("players", "read"),
  dynamicFieldAccess("players"),
  cacheRoute("player", CacheTTL.MEDIUM),
  asyncHandler(playerController.getById),
);

// ── Package access map ──
router.get(
  "/:id/package-access",
  authorizeModule("players", "read"),
  asyncHandler(async (req, res) => {
    const player = await Player.findByPk(req.params.id, {
      attributes: ["id", "playerPackage"],
    });
    if (!player) {
      return sendSuccess(res, { package: "B", access: getFullAccessMap("B") });
    }
    const raw = player.playerPackage as PlayerPackage;
    const valid: PlayerPackage[] = ["A+", "A", "B+", "B"];
    const pkg = valid.includes(raw) ? raw : "B";
    sendSuccess(res, { package: pkg, access: getFullAccessMap(pkg) });
  }),
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

router.get(
  "/:id/overview",
  authorizeModule("players", "read"),
  dynamicFieldAccess("players"),
  cacheRoute("player-overview", CacheTTL.SHORT),
  asyncHandler(playerController.getPlayerOverview),
);

router.get(
  "/:id/performance-summary",
  authorizeModule("players", "read"),
  dynamicFieldAccess("players"),
  asyncHandler(playerController.getPerformanceSummary),
);

router.get(
  "/:id/timeline",
  authorizeModule("players", "read"),
  dynamicFieldAccess("players"),
  validate(timelineQuerySchema, "query"),
  asyncHandler(playerController.getTimeline),
);

router.get(
  "/:id/club-history",
  authorizeModule("players", "read"),
  dynamicFieldAccess("players"),
  asyncHandler(playerController.getClubHistory),
);
router.get(
  "/:id/providers",
  authorizeModule("players", "read"),
  dynamicFieldAccess("players"),
  asyncHandler(playerController.getProviders),
);
router.put(
  "/:id/providers",
  authorizeModule("players", "update"),
  validate(upsertProviderSchema),
  asyncHandler(playerController.upsertProvider),
);
router.delete(
  "/:id/providers/:provider",
  authorizeModule("players", "delete"),
  asyncHandler(playerController.removeProvider),
);
router.post(
  "/:id/providers/validate",
  authorizeModule("players", "read"),
  validate(validateProviderSchema),
  asyncHandler(playerController.validateProvider),
);
router.post(
  "/:id/refresh-stats",
  authorizeModule("players", "create"),
  validate(refreshStatsSchema),
  asyncHandler(playerController.refreshStats),
);

export default router;
