import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { authorizePlayerPackage } from "@middleware/packageAccess";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import { validate } from "@middleware/validate";
import {
  createJourneySchema,
  updateJourneySchema,
  journeyQuerySchema,
  reorderStagesSchema,
} from "./journey.validation";
import * as journeyController from "./journey.controller";

const router = Router();
router.use(authenticate);

// ── Read ──
router.get(
  "/",
  authorizeModule("journey", "read"),
  dynamicFieldAccess("journey"),
  cacheRoute("journey", CacheTTL.MEDIUM),
  validate(journeyQuerySchema, "query"),
  asyncHandler(journeyController.list),
);

router.get(
  "/player/:playerId",
  authorizeModule("journey", "read"),
  authorizePlayerPackage("journey", "read"),
  dynamicFieldAccess("journey"),
  cacheRoute("journey", CacheTTL.MEDIUM),
  asyncHandler(journeyController.getPlayerJourney),
);

router.get(
  "/:id",
  authorizeModule("journey", "read"),
  dynamicFieldAccess("journey"),
  cacheRoute("journey", CacheTTL.MEDIUM),
  asyncHandler(journeyController.getById),
);

// ── Write ──
router.post(
  "/",
  authorizeModule("journey", "create"),
  authorizePlayerPackage("journey", "create"),
  validate(createJourneySchema),
  asyncHandler(journeyController.create),
);

router.patch(
  "/:id",
  authorizeModule("journey", "update"),
  validate(updateJourneySchema),
  asyncHandler(journeyController.update),
);

router.post(
  "/reorder",
  authorizeModule("journey", "update"),
  authorizePlayerPackage("journey", "update"),
  validate(reorderStagesSchema),
  asyncHandler(journeyController.reorder),
);

router.delete(
  "/:id",
  authorizeModule("journey", "delete"),
  asyncHandler(journeyController.remove),
);

export default router;
