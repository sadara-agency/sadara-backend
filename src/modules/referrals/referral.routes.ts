import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createReferralSchema, updateReferralSchema, updateReferralStatusSchema, referralQuerySchema } from './referral.schema';
import * as referralController from './referral.controller';

const router = Router();
router.use(authenticate);

// ── Read ──
router.get('/', validate(referralQuerySchema, 'query'), asyncHandler(referralController.list));
router.get('/:id', asyncHandler(referralController.getById));

// ── Create ──
router.post('/', authorize('Admin', 'Manager', 'Analyst'), validate(createReferralSchema), asyncHandler(referralController.create));

// ── Update ──
router.patch('/:id', authorize('Admin', 'Manager'), validate(updateReferralSchema), asyncHandler(referralController.update));
router.patch('/:id/status', authorize('Admin', 'Manager', 'Analyst'), validate(updateReferralStatusSchema), asyncHandler(referralController.updateStatus));

// ── Delete ──
router.delete('/:id', authorize('Admin'), asyncHandler(referralController.remove));

export default router;