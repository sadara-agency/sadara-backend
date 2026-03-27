// ─────────────────────────────────────────────────────────────
// src/modules/users/user.routes.ts
// RESTful routes for admin user management.
//
// All routes require authentication.
// Create/Update/Delete/ResetPassword are Admin-only.
// List/GetById are available to Admin and Manager.
//
// Follows the same pattern as player.routes.ts.
// ─────────────────────────────────────────────────────────────
import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  userQuerySchema,
} from "@modules/users/user.schema";
import * as userController from "@modules/users/user.controller";

const router = Router();
router.use(authenticate);

// ── Read ──
router.get(
  "/stats",
  authorizeModule("users", "read"),
  asyncHandler(userController.stats),
);
router.get(
  "/active-sessions",
  authorizeModule("users", "read"),
  asyncHandler(userController.activeSessions),
);
router.get(
  "/",
  authorizeModule("users", "read"),
  validate(userQuerySchema, "query"),
  asyncHandler(userController.list),
);
router.get(
  "/:id",
  authorizeModule("users", "read"),
  asyncHandler(userController.getById),
);

// ── Write ──
router.post(
  "/",
  authorizeModule("users", "create"),
  validate(createUserSchema),
  asyncHandler(userController.create),
);
router.patch(
  "/:id",
  authorizeModule("users", "update"),
  validate(updateUserSchema),
  asyncHandler(userController.update),
);
router.post(
  "/:id/reset-password",
  authorizeModule("users", "update"),
  validate(resetPasswordSchema),
  asyncHandler(userController.resetPassword),
);
router.post(
  "/:id/force-logout",
  authorizeModule("users", "delete"),
  asyncHandler(userController.forceLogout),
);
router.delete(
  "/:id",
  authorizeModule("users", "delete"),
  asyncHandler(userController.remove),
);

export default router;
