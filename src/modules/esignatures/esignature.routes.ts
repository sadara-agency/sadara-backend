import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { authLimiter } from "@middleware/rateLimiter";
import {
  createSignatureRequestSchema,
  submitSignatureSchema,
  declineSignatureSchema,
  signatureRequestQuerySchema,
} from "./esignature.validation";
import * as ctrl from "./esignature.controller";

const router = Router();

// ── Public routes (token-based, no auth) ──
// Rate-limited: prevents token enumeration on this unauthenticated surface (A-H12)

router.get("/sign/:token", authLimiter, asyncHandler(ctrl.viewByToken));
router.post(
  "/sign/:token",
  authLimiter,
  validate(submitSignatureSchema),
  asyncHandler(ctrl.submitByToken),
);
router.post(
  "/sign/:token/decline",
  authLimiter,
  validate(declineSignatureSchema),
  asyncHandler(ctrl.declineByToken),
);

// ── Authenticated routes ──

router.use(authenticate);

router.post(
  "/",
  authorizeModule("documents", "create"),
  validate(createSignatureRequestSchema),
  asyncHandler(ctrl.create),
);

router.get(
  "/",
  authorizeModule("documents", "read"),
  validate(signatureRequestQuerySchema, "query"),
  asyncHandler(ctrl.list),
);

router.get(
  "/my-pending",
  authorizeModule("documents", "read"),
  asyncHandler(ctrl.getMyPending),
);

router.get(
  "/:id",
  authorizeModule("documents", "read"),
  asyncHandler(ctrl.getById),
);

router.post(
  "/:id/cancel",
  authorizeModule("documents", "update"),
  asyncHandler(ctrl.cancel),
);

router.post(
  "/:id/signers/:signerId/sign",
  authorizeModule("documents", "update"),
  validate(submitSignatureSchema),
  asyncHandler(ctrl.submitAuth),
);

router.post(
  "/:id/signers/:signerId/decline",
  authorizeModule("documents", "update"),
  validate(declineSignatureSchema),
  asyncHandler(ctrl.declineAuth),
);

router.post(
  "/:id/signers/:signerId/remind",
  authorizeModule("documents", "update"),
  asyncHandler(ctrl.remind),
);

router.get(
  "/:id/audit",
  authorizeModule("documents", "read"),
  asyncHandler(ctrl.getAuditTrail),
);

export default router;
