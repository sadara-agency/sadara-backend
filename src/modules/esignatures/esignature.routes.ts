import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import {
  createSignatureRequestSchema,
  submitSignatureSchema,
  declineSignatureSchema,
  signatureRequestQuerySchema,
} from "./esignature.schema";
import * as ctrl from "./esignature.controller";

const router = Router();

// ── Public routes (token-based, no auth) ──

router.get("/sign/:token", asyncHandler(ctrl.viewByToken));
router.post(
  "/sign/:token",
  validate(submitSignatureSchema),
  asyncHandler(ctrl.submitByToken),
);
router.post(
  "/sign/:token/decline",
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

router.get("/my-pending", asyncHandler(ctrl.getMyPending));

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
  validate(submitSignatureSchema),
  asyncHandler(ctrl.submitAuth),
);

router.post(
  "/:id/signers/:signerId/decline",
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
