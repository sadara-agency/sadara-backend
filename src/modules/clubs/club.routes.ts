import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createClubSchema, updateClubSchema, clubQuerySchema } from './club.schema';
import * as clubController from './club.controller';

const router = Router();
router.use(authenticate);

router.get('/', validate(clubQuerySchema, 'query'), asyncHandler(clubController.list));
router.get('/:id', asyncHandler(clubController.getById));
router.post('/', authorize('Admin', 'Manager'), validate(createClubSchema), asyncHandler(clubController.create));
router.patch('/:id', authorize('Admin', 'Manager'), validate(updateClubSchema), asyncHandler(clubController.update));
router.delete('/:id', authorize('Admin'), asyncHandler(clubController.remove));

export default router;
