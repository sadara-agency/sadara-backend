import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createOfferSchema, updateOfferSchema, updateOfferStatusSchema, offerQuerySchema } from './offer.schema';
import * as offerController from './offer.controller';

const router = Router();
router.use(authenticate);

// ── List & Read ──
router.get('/', validate(offerQuerySchema, 'query'), asyncHandler(offerController.list));
router.get('/:id', asyncHandler(offerController.getById));
router.get('/player/:playerId', asyncHandler(offerController.getByPlayer));

// ── Create ──
router.post('/', authorize('Admin', 'Manager'), validate(createOfferSchema), asyncHandler(offerController.create));

// ── Update ──
router.patch('/:id', authorize('Admin', 'Manager'), validate(updateOfferSchema), asyncHandler(offerController.update));
router.patch('/:id/status', authorize('Admin', 'Manager'), validate(updateOfferStatusSchema), asyncHandler(offerController.updateStatus));

// ── Delete ──
router.delete('/:id', authorize('Admin'), asyncHandler(offerController.remove));


router.post('/:id/convert', authorize('Admin', 'Manager'), asyncHandler(offerController.convertToContract));


export default router;