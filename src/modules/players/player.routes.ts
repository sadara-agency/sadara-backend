import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createPlayerSchema, updatePlayerSchema, playerQuerySchema } from './player.schema';
import * as playerController from './player.controller';

const router = Router();
router.use(authenticate);

router.get('/',       validate(playerQuerySchema, 'query'),                           asyncHandler(playerController.list));
router.get('/:id',                                                                    asyncHandler(playerController.getById));
// router.get('/:id/stats',                                                              asyncHandler(playerController.getStats));
router.post('/',      authorize('Admin', 'Manager'), validate(createPlayerSchema),    asyncHandler(playerController.create));
router.patch('/:id',  authorize('Admin', 'Manager'), validate(updatePlayerSchema),    asyncHandler(playerController.update));
router.delete('/:id', authorize('Admin'),                                             asyncHandler(playerController.remove));

export default router;
