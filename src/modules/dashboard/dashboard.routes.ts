import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';
import { cacheRoute } from '../../middleware/cache.middleware';
import { CacheTTL } from '../../shared/utils/cache';
import * as dashboardController from './dashboard.controller';

const router = Router();
router.use(authenticate);

// Full aggregated dashboard — short TTL (changes frequently)
router.get('/', cacheRoute('dash', CacheTTL.SHORT), asyncHandler(dashboardController.getFullDashboard));

// Individual endpoints — short TTL for volatile data
router.get('/kpis', cacheRoute('dash', CacheTTL.SHORT), asyncHandler(dashboardController.getKpis));
router.get('/alerts', cacheRoute('dash', CacheTTL.SHORT), asyncHandler(dashboardController.getAlerts));
router.get('/today', cacheRoute('dash', CacheTTL.SHORT), asyncHandler(dashboardController.getTodayOverview));
router.get('/top-players', cacheRoute('dash', CacheTTL.MEDIUM), asyncHandler(dashboardController.getTopPlayers));
router.get('/contracts/status', cacheRoute('dash', CacheTTL.MEDIUM), asyncHandler(dashboardController.getContractStatus));
router.get('/players/distribution', cacheRoute('dash', CacheTTL.MEDIUM), asyncHandler(dashboardController.getPlayerDistribution));
router.get('/offers/recent', cacheRoute('dash', CacheTTL.SHORT), asyncHandler(dashboardController.getRecentOffers));
router.get('/matches/upcoming', cacheRoute('dash', CacheTTL.SHORT), asyncHandler(dashboardController.getUpcomingMatches));
router.get('/tasks/urgent', cacheRoute('dash', CacheTTL.SHORT), asyncHandler(dashboardController.getUrgentTasks));
router.get('/revenue', cacheRoute('dash', CacheTTL.MEDIUM), asyncHandler(dashboardController.getRevenueChart));
router.get('/performance', cacheRoute('dash', CacheTTL.MEDIUM), asyncHandler(dashboardController.getPerformanceAverages));
router.get('/activity', cacheRoute('dash', CacheTTL.SHORT), asyncHandler(dashboardController.getRecentActivity));
router.get('/quick-stats', cacheRoute('dash', CacheTTL.SHORT), asyncHandler(dashboardController.getQuickStats));

export default router;