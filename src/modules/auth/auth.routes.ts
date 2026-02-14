import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { authLimiter } from '../../middleware/rateLimiter';
import { registerSchema, loginSchema, updateProfileSchema, changePasswordSchema } from './auth.schema';
import * as authController from './auth.controller';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), asyncHandler(authController.register));
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(authController.login));

// Protected routes
router.get('/me', authenticate, asyncHandler(authController.getProfile));
router.patch('/me', authenticate, validate(updateProfileSchema), asyncHandler(authController.updateProfile));
router.post('/change-password', authenticate, validate(changePasswordSchema), asyncHandler(authController.changePassword));

export default router;
