
import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import * as portalController from './portal.controller';

const router = Router();

// ── Public route: complete registration via invite token ──
router.post('/register', asyncHandler(portalController.completeRegistration));

// ── All other portal routes require authentication ──
router.use(authenticate);

// ── Player-only routes (role: Player) ──
router.get('/me', authorize('Player'), asyncHandler(portalController.getMyProfile));
router.get('/schedule', authorize('Player'), asyncHandler(portalController.getMySchedule));
router.get('/documents', authorize('Player'), asyncHandler(portalController.getMyDocuments));
router.get('/development', authorize('Player'), asyncHandler(portalController.getMyDevelopment));

// ── Admin/Manager routes: generate invite links ──
router.post('/invite', authorize('Admin', 'Manager'), asyncHandler(portalController.generateInvite));

export default router;