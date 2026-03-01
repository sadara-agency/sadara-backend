import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { cacheRoute } from '../../middleware/cache.middleware';
import { CacheTTL } from '../../shared/utils/cache';
import { createPlayerSchema, updatePlayerSchema, playerQuerySchema } from './utils/player.schema';
import * as playerController from './player.controller';

const router = Router();
router.use(authenticate);

// ── Read (cached) ──
router.get('/', validate(playerQuerySchema, 'query'), cacheRoute('players', CacheTTL.MEDIUM), asyncHandler(playerController.list));
router.get('/:id', cacheRoute('player', CacheTTL.MEDIUM), asyncHandler(playerController.getById));

// ── Write (no cache — these invalidate) ──
router.post('/', authorize('Admin', 'Manager'), validate(createPlayerSchema), asyncHandler(playerController.create));
router.patch('/:id', authorize('Admin', 'Manager'), validate(updatePlayerSchema), asyncHandler(playerController.update));
router.delete('/:id', authorize('Admin'), asyncHandler(playerController.remove));

router.get('/:id/providers', asyncHandler(playerController.getProviders));
router.put('/:id/providers', asyncHandler(playerController.upsertProvider));
router.delete('/:id/providers/:provider', asyncHandler(playerController.removeProvider));


export default router;