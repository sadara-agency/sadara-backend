import { Router } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { authenticate, authorizeModule } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createReferralSchema,
  updateReferralSchema,
  updateReferralStatusSchema,
  referralQuerySchema,
} from "./referral.schema";
import * as referralController from "./referral.controller";

const router = Router();
router.use(authenticate);

// ── Read ──
router.get(
  "/",
  authorizeModule("referrals", "read"),
  validate(referralQuerySchema, "query"),
  asyncHandler(referralController.list),
);
router.get("/:id", authorizeModule("referrals", "read"), asyncHandler(referralController.getById));

// ── Create ──
router.post(
  "/",
  authorizeModule("referrals", "create"),
  validate(createReferralSchema),
  asyncHandler(referralController.create),
);

// ── Update ──
router.patch(
  "/:id",
  authorizeModule("referrals", "update"),
  validate(updateReferralSchema),
  asyncHandler(referralController.update),
);
router.patch(
  "/:id/status",
  authorizeModule("referrals", "update"),
  validate(updateReferralStatusSchema),
  asyncHandler(referralController.updateStatus),
);

// ── Delete ──
router.delete(
  "/:id",
  authorizeModule("referrals", "delete"),
  asyncHandler(referralController.remove),
);

export default router;
