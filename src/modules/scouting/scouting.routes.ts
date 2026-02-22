import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createWatchlistSchema, updateWatchlistSchema, updateWatchlistStatusSchema, watchlistQuerySchema,
  createScreeningSchema, updateScreeningSchema, markPackReadySchema,
  createDecisionSchema,
} from './scouting.schema';
import * as ctrl from './scouting.controller';

const router = Router();
router.use(authenticate);

// ── Pipeline Summary ──
router.get('/summary', asyncHandler(ctrl.pipelineSummary));

// ── Watchlist ──
router.get('/watchlist', validate(watchlistQuerySchema, 'query'), asyncHandler(ctrl.listWatchlist));
router.get('/watchlist/:id', asyncHandler(ctrl.getWatchlistById));
router.post('/watchlist', authorize('Admin', 'Manager', 'Analyst'), validate(createWatchlistSchema), asyncHandler(ctrl.createWatchlist));
router.patch('/watchlist/:id', authorize('Admin', 'Manager', 'Analyst'), validate(updateWatchlistSchema), asyncHandler(ctrl.updateWatchlist));
router.patch('/watchlist/:id/status', authorize('Admin', 'Manager'), validate(updateWatchlistStatusSchema), asyncHandler(ctrl.updateWatchlistStatus));
router.delete('/watchlist/:id', authorize('Admin'), asyncHandler(ctrl.deleteWatchlist));

// ── Screening Cases ──
router.post('/screening', authorize('Admin', 'Manager'), validate(createScreeningSchema), asyncHandler(ctrl.createScreening));
router.get('/screening/:id', asyncHandler(ctrl.getScreening));
router.patch('/screening/:id', authorize('Admin', 'Manager', 'Analyst'), validate(updateScreeningSchema), asyncHandler(ctrl.updateScreening));
router.patch('/screening/:id/pack-ready', authorize('Admin', 'Manager'), validate(markPackReadySchema), asyncHandler(ctrl.markPackReady));

// ── Selection Decisions (immutable — create + read only) ──
router.post('/decisions', authorize('Admin', 'Manager'), validate(createDecisionSchema), asyncHandler(ctrl.createDecision));
router.get('/decisions/:id', asyncHandler(ctrl.getDecision));

export default router;