import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createMatchSchema, updateMatchSchema, updateScoreSchema,
  updateMatchStatusSchema, matchQuerySchema, calendarQuerySchema,
  assignPlayersSchema, updateMatchPlayerSchema,
  bulkStatsSchema, updateStatsSchema,
  playerMatchesQuerySchema,
} from './match.schema';
import * as ctrl from './match.controller';

const router = Router();
router.use(authenticate);

// ── Calendar (must be before /:id to avoid route conflict) ──
router.get('/calendar', validate(calendarQuerySchema, 'query'), asyncHandler(ctrl.calendar));

// ── Upcoming ──
router.get('/upcoming', asyncHandler(ctrl.upcoming));

// ── Player-centric routes (for player profile) ──
router.get('/player/:playerId', validate(playerMatchesQuerySchema, 'query'), asyncHandler(ctrl.playerMatches));
router.get('/player/:playerId/stats', asyncHandler(ctrl.playerAggregateStats));

// ── Match CRUD ──
router.get('/', validate(matchQuerySchema, 'query'), asyncHandler(ctrl.list));
router.get('/:id', asyncHandler(ctrl.getById));
router.post('/', authorize('Admin', 'Manager'), validate(createMatchSchema), asyncHandler(ctrl.create));
router.patch('/:id', authorize('Admin', 'Manager'), validate(updateMatchSchema), asyncHandler(ctrl.update));
router.patch('/:id/score', authorize('Admin', 'Manager', 'Analyst'), validate(updateScoreSchema), asyncHandler(ctrl.updateScore));
router.patch('/:id/status', authorize('Admin', 'Manager'), validate(updateMatchStatusSchema), asyncHandler(ctrl.updateStatus));
router.delete('/:id', authorize('Admin'), asyncHandler(ctrl.remove));

// ── Match Players (assign/manage players in a match) ──
router.get('/:id/players', asyncHandler(ctrl.getPlayers));
router.post('/:id/players', authorize('Admin', 'Manager'), validate(assignPlayersSchema), asyncHandler(ctrl.assignPlayers));
router.patch('/:id/players/:playerId', authorize('Admin', 'Manager'), validate(updateMatchPlayerSchema), asyncHandler(ctrl.updatePlayer));
router.delete('/:id/players/:playerId', authorize('Admin', 'Manager'), asyncHandler(ctrl.removePlayer));

// ── Player Match Stats ──
router.get('/:id/stats', asyncHandler(ctrl.getStats));
router.post('/:id/stats', authorize('Admin', 'Manager', 'Analyst'), validate(bulkStatsSchema), asyncHandler(ctrl.upsertStats));
router.patch('/:id/stats/:playerId', authorize('Admin', 'Manager', 'Analyst'), validate(updateStatsSchema), asyncHandler(ctrl.updatePlayerStats));
router.delete('/:id/stats/:playerId', authorize('Admin', 'Manager'), asyncHandler(ctrl.deletePlayerStats));

export default router;