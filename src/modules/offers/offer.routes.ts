import { Router } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { authenticate, authorizeModule } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createOfferSchema,
  updateOfferSchema,
  updateOfferStatusSchema,
  offerQuerySchema,
} from "./offer.schema";
import * as offerController from "./offer.controller";

const router = Router();
router.use(authenticate);

// ── List & Read ──
router.get(
  "/",
  authorizeModule("offers", "read"),
  validate(offerQuerySchema, "query"),
  asyncHandler(offerController.list),
);
router.get("/:id", authorizeModule("offers", "read"), asyncHandler(offerController.getById));
router.get("/player/:playerId", authorizeModule("offers", "read"), asyncHandler(offerController.getByPlayer));

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

// ── Delete ──
router.delete("/:id", authorizeModule("offers", "delete"), asyncHandler(offerController.remove));

router.post(
  "/:id/convert",
  authorizeModule("offers", "create"),
  asyncHandler(offerController.convertToContract),
);

export default router;
