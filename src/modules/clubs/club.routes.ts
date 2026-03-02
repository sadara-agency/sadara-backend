import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { uploadSingle } from '../../middleware/upload';
import { createClubSchema, updateClubSchema, clubQuerySchema, createContactSchema, updateContactSchema } from './club.schema';
import * as clubController from './club.controller';

const router = Router();
router.use(authenticate);

router.get('/', validate(clubQuerySchema, 'query'), asyncHandler(clubController.list));
router.get('/:id', asyncHandler(clubController.getById));
router.post('/', authorize('Admin', 'Manager'), validate(createClubSchema), asyncHandler(clubController.create));
router.patch('/:id', authorize('Admin', 'Manager'), validate(updateClubSchema), asyncHandler(clubController.update));
router.delete('/:id', authorize('Admin'), asyncHandler(clubController.remove));

// ── Logo Upload ──
router.post('/:id/logo', authorize('Admin', 'Manager'), uploadSingle, asyncHandler(clubController.uploadLogo));

// ── Contact CRUD ──
router.post('/:id/contacts', authorize('Admin', 'Manager'), validate(createContactSchema), asyncHandler(clubController.createContact));
router.patch('/:id/contacts/:contactId', authorize('Admin', 'Manager'), validate(updateContactSchema), asyncHandler(clubController.updateContact));
router.delete('/:id/contacts/:contactId', authorize('Admin', 'Manager'), asyncHandler(clubController.deleteContact));

export default router;
