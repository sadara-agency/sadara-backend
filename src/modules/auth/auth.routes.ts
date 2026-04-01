import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorize } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { authLimiter, passwordResetLimiter } from "@middleware/rateLimiter";
import {
  registerSchema,
  loginSchema,
  inviteSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@modules/auth/auth.validation";
import { uploadSingle, verifyFileType } from "@middleware/upload";
import * as authController from "@modules/auth/auth.controller";

const router = Router();

// ── Public ──
router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  asyncHandler(authController.register),
);
router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  asyncHandler(authController.login),
);
router.post(
  "/forgot-password",
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword),
);
router.post(
  "/reset-password",
  passwordResetLimiter,
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword),
);

// ── Refresh Token ──
// No authLimiter here — refresh is automated (page load, tab focus) and
// shouldn't eat into the login attempt budget. apiLimiter still applies.
router.post("/refresh", asyncHandler(authController.refresh));

// ── Logout ──
router.post("/logout", authenticate, asyncHandler(authController.logout));

// ── Protected ──
router.get("/me", authenticate, asyncHandler(authController.getProfile));
router.patch(
  "/me",
  authenticate,
  validate(updateProfileSchema),
  asyncHandler(authController.updateProfile),
);
// ── Avatar Upload (multipart/form-data) ──
router.post(
  "/me/avatar",
  authenticate,
  (req, res, next) => {
    uploadSingle(req, res, (err: any) => {
      if (err) {
        const msg =
          err.code === "LIMIT_FILE_SIZE"
            ? "File too large. Maximum size is 25MB."
            : err.message || "Upload failed";
        return res.status(400).json({ success: false, message: msg });
      }
      next();
    });
  },
  verifyFileType,
  asyncHandler(authController.uploadAvatar),
);

router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(authController.changePassword),
);

// ── Admin Only — Invite user with specific role ──
router.post(
  "/invite",
  authenticate,
  authorize("Admin"),
  validate(inviteSchema),
  asyncHandler(authController.invite),
);

export default router;
