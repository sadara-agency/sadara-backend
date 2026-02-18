// ─────────────────────────────────────────────────────────────
// src/modules/Users/user.routes.ts
// RESTful routes for admin user management.
//
// All routes require authentication.
// Create/Update/Delete/ResetPassword are Admin-only.
// List/GetById are available to Admin and Manager.
//
// Follows the same pattern as player.routes.ts.
// ─────────────────────────────────────────────────────────────
import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
    createUserSchema,
    updateUserSchema,
    resetPasswordSchema,
    userQuerySchema,
} from './user.schema';
import * as userController from './user.controller';

const router = Router();
router.use(authenticate);

// ── Read ──
router.get('/', authorize('Admin', 'Manager'), validate(userQuerySchema, 'query'), asyncHandler(userController.list));
router.get('/:id', authorize('Admin', 'Manager'), asyncHandler(userController.getById));

// ── Write (Admin only) ──
router.post('/', authorize('Admin'), validate(createUserSchema), asyncHandler(userController.create));
router.patch('/:id', authorize('Admin'), validate(updateUserSchema), asyncHandler(userController.update));
router.post('/:id/reset-password', authorize('Admin'), validate(resetPasswordSchema), asyncHandler(userController.resetPassword));
router.delete('/:id', authorize('Admin'), asyncHandler(userController.remove));

export default router;