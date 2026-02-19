import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { authLimiter } from '../../middleware/rateLimiter';
import {
  registerSchema,
  loginSchema,
  inviteSchema,
  updateProfileSchema,
  changePasswordSchema,
} from './auth.schema';
import * as authController from './auth.controller';

const router = Router();

// ── Public ──
router.post('/register', authLimiter, validate(registerSchema), asyncHandler(authController.register));
router.post('/login',    authLimiter, validate(loginSchema),    asyncHandler(authController.login));

// ── Protected ──
router.get('/me',              authenticate,                                                          asyncHandler(authController.getProfile));
router.patch('/me',            authenticate, validate(updateProfileSchema),                           asyncHandler(authController.updateProfile));
router.post('/change-password', authenticate, validate(changePasswordSchema),                         asyncHandler(authController.changePassword));

// ── Admin Only — Invite user with specific role ──
router.post('/invite', authenticate, authorize('Admin'), validate(inviteSchema), asyncHandler(authController.invite));

export default router;