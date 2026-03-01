
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as portalController from './portal.controller';

const router = Router();

// ── Validation Schemas ──
const completeRegistrationSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const generateInviteSchema = z.object({
  playerId: z.string().uuid('Invalid player ID format'),
});

// ── Public route: complete registration via invite token ──
router.post('/register', validate(completeRegistrationSchema), asyncHandler(portalController.completeRegistration));

// ── All other portal routes require authentication ──
router.use(authenticate);

// ── Player-only routes (role: Player) ──
router.get('/me', authorize('Player'), asyncHandler(portalController.getMyProfile));
router.get('/schedule', authorize('Player'), asyncHandler(portalController.getMySchedule));
router.get('/documents', authorize('Player'), asyncHandler(portalController.getMyDocuments));
router.get('/development', authorize('Player'), asyncHandler(portalController.getMyDevelopment));

// ── Admin/Manager routes: generate invite links ──
router.post('/invite', authorize('Admin', 'Manager'), validate(generateInviteSchema), asyncHandler(portalController.generateInvite));

export default router;