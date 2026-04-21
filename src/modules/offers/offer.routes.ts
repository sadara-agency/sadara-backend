import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorize, authorizeModule } from "@middleware/auth";
import { uploadSingle } from "@middleware/upload";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import {
  createOfferSchema,
  updateOfferSchema,
  updateOfferStatusSchema,
  updateOfferPhaseSchema,
  offerQuerySchema,
} from "@modules/offers/offer.validation";
import * as offerController from "@modules/offers/offer.controller";

const router = Router();
router.use(authenticate);

// ── List & Read ──
router.get(
  "/",
  authorizeModule("offers", "read"),
  dynamicFieldAccess("offers"),
  validate(offerQuerySchema, "query"),
  asyncHandler(offerController.list),
);
router.get(
  "/:id",
  authorizeModule("offers", "read"),
  dynamicFieldAccess("offers"),
  asyncHandler(offerController.getById),
);
router.get(
  "/player/:playerId",
  authorizeModule("offers", "read"),
  dynamicFieldAccess("offers"),
  asyncHandler(offerController.getByPlayer),
);

// ── Create ──
router.post(
  "/",
  authorizeModule("offers", "create"),
  validate(createOfferSchema),
  asyncHandler(offerController.create),
);

// ── Update ──
router.patch(
  "/:id",
  authorizeModule("offers", "update"),
  validate(updateOfferSchema),
  asyncHandler(offerController.update),
);
router.patch(
  "/:id/status",
  authorizeModule("offers", "update"),
  validate(updateOfferStatusSchema),
  asyncHandler(offerController.updateStatus),
);

router.patch(
  "/:id/phase",
  authorizeModule("offers", "update"),
  validate(updateOfferPhaseSchema),
  asyncHandler(offerController.updatePhase),
);

// ── Delete ──
router.delete(
  "/:id",
  authorizeModule("offers", "delete"),
  asyncHandler(offerController.remove),
);

router.post(
  "/:id/convert",
  authorizeModule("offers", "create"),
  asyncHandler(offerController.convertToContract),
);

router.post(
  "/import",
  authorize("Admin"),
  uploadSingle,
  asyncHandler(offerController.importCsv),
);

export default router;
