import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createInjurySchema, updateInjurySchema, addInjuryUpdateSchema, injuryQuerySchema } from './injury.schema';
import * as ctrl from './injury.controller';

const router = Router();
router.use(authenticate);

router.get('/', validate(injuryQuerySchema, 'query'), asyncHandler(ctrl.list));
router.get('/stats', asyncHandler(ctrl.stats));
router.get('/player/:playerId', asyncHandler(ctrl.getByPlayer));
router.get('/:id', asyncHandler(ctrl.getById));
router.post('/', validate(createInjurySchema), asyncHandler(ctrl.create));
router.patch('/:id', validate(updateInjurySchema), asyncHandler(ctrl.update));
router.post('/:id/updates', validate(addInjuryUpdateSchema), asyncHandler(ctrl.addUpdate));
router.delete('/:id', authorize('Admin', 'Manager'), asyncHandler(ctrl.remove));

export default router;