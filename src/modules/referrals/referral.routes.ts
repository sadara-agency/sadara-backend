import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { authorizePlayerPackage } from "@middleware/packageAccess";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import { validate } from "@middleware/validate";
import {
  createReferralSchema,
  updateReferralSchema,
  updateReferralStatusSchema,
  referralQuerySchema,
  checkDuplicateSchema,
} from "@modules/referrals/referral.validation";
import * as referralController from "@modules/referrals/referral.controller";

const router = Router();
router.use(authenticate);

// ── Read ──
router.get(
  "/",
  authorizeModule("referrals", "read"),
  dynamicFieldAccess("referrals"),
  cacheRoute("referrals", CacheTTL.MEDIUM),
  validate(referralQuerySchema, "query"),
  asyncHandler(referralController.list),
);
router.get(
  "/check-duplicate",
  authorizeModule("referrals", "read"),
  validate(checkDuplicateSchema, "query"),
  asyncHandler(referralController.checkDuplicate),
);
router.get(
  "/:id",
  authorizeModule("referrals", "read"),
  dynamicFieldAccess("referrals"),
  cacheRoute("referral", CacheTTL.MEDIUM),
  asyncHandler(referralController.getById),
);

// ── Create ──
router.post(
  "/",
  authorizeModule("referrals", "create"),
  authorizePlayerPackage("referrals", "create"),
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
