import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createMatchSchema, updateMatchSchema, updateScoreSchema, updateMatchStatusSchema, matchQuerySchema } from './match.schema';
import * as matchController from './match.controller';

const router = Router();
router.use(authenticate);

// ── Read ──
router.get('/', validate(matchQuerySchema, 'query'), asyncHandler(matchController.list));
router.get('/upcoming', asyncHandler(matchController.upcoming));
router.get('/:id', asyncHandler(matchController.getById));

// ── Create ──
router.post('/', authorize('Admin', 'Manager'), validate(createMatchSchema), asyncHandler(matchController.create));

// ── Update ──
router.patch('/:id', authorize('Admin', 'Manager'), validate(updateMatchSchema), asyncHandler(matchController.update));
router.patch('/:id/score', authorize('Admin', 'Manager', 'Analyst'), validate(updateScoreSchema), asyncHandler(matchController.updateScore));
router.patch('/:id/status', authorize('Admin', 'Manager'), validate(updateMatchStatusSchema), asyncHandler(matchController.updateStatus));

// ── Delete ──
router.delete('/:id', authorize('Admin'), asyncHandler(matchController.remove));

export default router;