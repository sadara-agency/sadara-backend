// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.routes.ts
// ─────────────────────────────────────────────────────────────

import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { syncPlayerSchema, syncTeamSchema, syncAllSchema, seedClubIdsSchema } from './spl.schema';
import * as c from './spl.controller';

const router = Router();
router.use(authenticate);

// Read
router.get('/registry', asyncHandler(c.getRegistry));
router.get('/sync-status', asyncHandler(c.getStatus));

// Sync operations
router.post('/sync/player', authorize('Admin', 'Manager'), validate(syncPlayerSchema), asyncHandler(c.syncPlayer));
router.post('/sync/team',   authorize('Admin', 'Manager'), validate(syncTeamSchema),   asyncHandler(c.syncTeam));
router.post('/sync/all',    authorize('Admin'),             validate(syncAllSchema),    asyncHandler(c.syncAll));

// Seed
router.post('/seed-club-ids', authorize('Admin'), validate(seedClubIdsSchema), asyncHandler(c.seedClubIds));

export default router;