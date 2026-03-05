import { Router } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { authenticate, authorizeModule } from "../../middleware/auth";
import { cacheRoute } from "../../middleware/cache.middleware";
import { CacheTTL } from "../../shared/utils/cache";
import * as dashboardController from "./dashboard.controller";

const router = Router();
router.use(authenticate);

// Full aggregated dashboard — short TTL (changes frequently)
router.get(
  "/",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.SHORT),
  asyncHandler(dashboardController.getFullDashboard),
);

// Individual endpoints — short TTL for volatile data
router.get(
  "/kpis",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.SHORT),
  asyncHandler(dashboardController.getKpis),
);
router.get(
  "/alerts",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.SHORT),
  asyncHandler(dashboardController.getAlerts),
);
router.get(
  "/today",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.SHORT),
  asyncHandler(dashboardController.getTodayOverview),
);
router.get(
  "/top-players",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(dashboardController.getTopPlayers),
);
router.get(
  "/contracts/status",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(dashboardController.getContractStatus),
);
router.get(
  "/players/distribution",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(dashboardController.getPlayerDistribution),
);
router.get(
  "/offers/recent",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.SHORT),
  asyncHandler(dashboardController.getRecentOffers),
);
router.get(
  "/matches/upcoming",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.SHORT),
  asyncHandler(dashboardController.getUpcomingMatches),
);
router.get(
  "/tasks/urgent",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.SHORT),
  asyncHandler(dashboardController.getUrgentTasks),
);
router.get(
  "/revenue",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(dashboardController.getRevenueChart),
);
router.get(
  "/performance",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(dashboardController.getPerformanceAverages),
);
router.get(
  "/activity",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.SHORT),
  asyncHandler(dashboardController.getRecentActivity),
);
router.get(
  "/quick-stats",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.SHORT),
  asyncHandler(dashboardController.getQuickStats),
);

router.get(
  "/offer-pipeline",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(dashboardController.getOfferPipeline),
);
router.get(
  "/injury-trends",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(dashboardController.getInjuryTrends),
);
router.get(
  "/kpi-trends",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(dashboardController.getKpiTrends),
);

export default router;
