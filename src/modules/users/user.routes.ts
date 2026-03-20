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
  authorizeModule("settings", "read"),
  asyncHandler(userController.stats),
);
router.get(
  "/",
  authorizeModule("settings", "read"),
  validate(userQuerySchema, "query"),
  asyncHandler(userController.list),
);
router.get(
  "/:id",
  authorizeModule("settings", "read"),
  asyncHandler(userController.getById),
);

// ── Write ──
router.post(
  "/",
  authorizeModule("settings", "create"),
  validate(createUserSchema),
  asyncHandler(userController.create),
);
router.patch(
  "/:id",
  authorizeModule("settings", "update"),
  validate(updateUserSchema),
  asyncHandler(userController.update),
);
router.post(
  "/:id/reset-password",
  authorizeModule("settings", "update"),
  validate(resetPasswordSchema),
  asyncHandler(userController.resetPassword),
);
router.delete(
  "/:id",
  authorizeModule("settings", "delete"),
  asyncHandler(userController.remove),
);

export default router;
