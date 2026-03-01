
import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  tournamentQuerySchema,
  fetchRequestSchema,
  standingQuerySchema,
  fixtureQuerySchema,
  teamMapQuerySchema,
  mapTeamSchema,
  importRequestSchema,
} from './saff.schema';
import * as saffController from './saff.controller';

const router = Router();

// All SAFF routes require authentication
router.use(authenticate);

// ── Tournaments ──
router.get('/tournaments', validate(tournamentQuerySchema, 'query'), asyncHandler(saffController.listTournaments));
router.post('/tournaments/seed', authorize('Admin'), asyncHandler(saffController.seedTournaments));

// ── Fetch (Scrape from SAFF) ──
router.post('/fetch', authorize('Admin', 'Manager'), validate(fetchRequestSchema), asyncHandler(saffController.fetchFromSaff));

// ── Standings ──
router.get('/standings', validate(standingQuerySchema, 'query'), asyncHandler(saffController.listStandings));

// ── Fixtures ──
router.get('/fixtures', validate(fixtureQuerySchema, 'query'), asyncHandler(saffController.listFixtures));

// ── Team Mappings ──
router.get('/team-maps', validate(teamMapQuerySchema, 'query'), asyncHandler(saffController.listTeamMaps));
router.post('/team-maps', authorize('Admin', 'Manager'), validate(mapTeamSchema), asyncHandler(saffController.mapTeam));

// ── Import to Sadara ──
router.post('/import', authorize('Admin'), validate(importRequestSchema), asyncHandler(saffController.importToSadara));

// ── Stats ──
router.get('/stats', asyncHandler(saffController.getStats));

// ── Sync (Scheduler) ──
router.get('/sync-status', asyncHandler(saffController.getSyncStatus));
router.post('/sync-now', authorize('Admin'), asyncHandler(saffController.triggerSync));

export default router;