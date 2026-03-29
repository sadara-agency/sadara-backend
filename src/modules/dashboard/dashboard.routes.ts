import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorize, authorizeModule } from "@middleware/auth";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import * as dashboardController from "@modules/dashboard/dashboard.controller";
import * as configController from "@modules/dashboard/dashboardConfig.controller";

const router = Router();
router.use(authenticate);

// ── Widget layout config ──
router.get(
  "/config",
  authorizeModule("dashboard", "read"),
  asyncHandler(configController.getConfig),
);
router.put(
  "/config",
  authorize("Admin"),
  asyncHandler(configController.updateConfig),
);

// ── Volatile, per-user data — MEDIUM (5 min) ──
// SSE handles real-time updates on the frontend, so backend
// cache can be longer without staleness concerns.
router.get(
  "/matches/upcoming",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.MEDIUM, { perUser: true }),
  asyncHandler(dashboardController.getUpcomingMatches),
);
router.get(
  "/tasks/urgent",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.MEDIUM, { perUser: true }),
  asyncHandler(dashboardController.getUrgentTasks),
);
router.get(
  "/activity",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(dashboardController.getRecentActivity),
);

// ── Aggregate counters & alerts — MEDIUM (5 min) ──
router.get(
  "/kpis",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(dashboardController.getKpis),
);
router.get(
  "/alerts",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(dashboardController.getAlerts),
);
router.get(
  "/today",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(dashboardController.getTodayOverview),
);
router.get(
  "/offers/recent",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(dashboardController.getRecentOffers),
);
router.get(
  "/quick-stats",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(dashboardController.getQuickStats),
);

// ── Slow-changing distributions & charts — LONG (15 min) ──
router.get(
  "/top-players",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.LONG),
  asyncHandler(dashboardController.getTopPlayers),
);
router.get(
  "/contracts/status",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.LONG),
  asyncHandler(dashboardController.getContractStatus),
);
router.get(
  "/players/distribution",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.LONG),
  asyncHandler(dashboardController.getPlayerDistribution),
);
router.get(
  "/revenue",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.LONG),
  asyncHandler(dashboardController.getRevenueChart),
);
router.get(
  "/performance",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.LONG),
  asyncHandler(dashboardController.getPerformanceAverages),
);
router.get(
  "/offer-pipeline",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.LONG),
  asyncHandler(dashboardController.getOfferPipeline),
);
router.get(
  "/injury-trends",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.LONG),
  asyncHandler(dashboardController.getInjuryTrends),
);
router.get(
  "/kpi-trends",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.LONG),
  asyncHandler(dashboardController.getKpiTrends),
);

export default router;
