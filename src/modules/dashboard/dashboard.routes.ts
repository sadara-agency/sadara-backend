import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';
import * as dashboardController from './dashboard.controller';

const router = Router();
router.use(authenticate);

// Full aggregated dashboard (single request for initial load)
router.get('/', asyncHandler(dashboardController.getFullDashboard));

// Individual endpoints for granular / lazy-loaded sections
router.get('/kpis', asyncHandler(dashboardController.getKpis));
router.get('/alerts', asyncHandler(dashboardController.getAlerts));
router.get('/today', asyncHandler(dashboardController.getTodayOverview));
router.get('/top-players', asyncHandler(dashboardController.getTopPlayers));
router.get('/contracts/status', asyncHandler(dashboardController.getContractStatus));
router.get('/players/distribution', asyncHandler(dashboardController.getPlayerDistribution));
router.get('/offers/recent', asyncHandler(dashboardController.getRecentOffers));
router.get('/matches/upcoming', asyncHandler(dashboardController.getUpcomingMatches));
router.get('/tasks/urgent', asyncHandler(dashboardController.getUrgentTasks));
router.get('/revenue', asyncHandler(dashboardController.getRevenueChart));
router.get('/performance', asyncHandler(dashboardController.getPerformanceAverages));
router.get('/activity', asyncHandler(dashboardController.getRecentActivity));
router.get('/quick-stats', asyncHandler(dashboardController.getQuickStats));

export default router;