import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorize, authorizeModule } from "@middleware/auth";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import * as dashboardController from "@modules/dashboard/dashboard.controller";
import * as configController from "@modules/dashboard/dashboardConfig.controller";
import * as transferPortfolioController from "@modules/dashboard/transferPortfolio.controller";
import * as portfolioAnalyticsController from "@modules/dashboard/portfolioAnalytics.controller";
import * as salesDashboardController from "@modules/dashboard/salesDashboard.controller";

const router = Router();
router.use(authenticate);

// ── Batched: all dashboard data in one request (15 → 1) ──
router.get(
  "/all",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.MEDIUM, { perUser: true }),
  asyncHandler(dashboardController.getAll),
);

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

// ── Player Attention (Version A) ──
router.get(
  "/player-attention",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(dashboardController.getPlayerAttention),
);

// ── Executive Dashboard (Admin/Executive only) ──

router.get(
  "/executive/employee-performance",
  authorize("Admin", "Executive"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(dashboardController.getEmployeePerformance),
);
router.get(
  "/executive/platform-stats",
  authorize("Admin", "Executive"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(dashboardController.getPlatformStats),
);
router.get(
  "/executive/financial-summary",
  authorize("Admin", "Executive"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(dashboardController.getFinancialSummary),
);
router.get(
  "/executive/operational-efficiency",
  authorize("Admin", "Executive"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(dashboardController.getOperationalEfficiency),
);

// ── Admin Metrics ──

router.get(
  "/executive/task-turnaround",
  authorize("Admin", "Executive"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(dashboardController.getTaskTurnaround),
);
router.get(
  "/executive/stuck-volume",
  authorize("Admin", "Executive"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(dashboardController.getStuckVolume),
);
router.get(
  "/executive/efficiency",
  authorize("Admin", "Executive"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(dashboardController.getEfficiency),
);
router.get(
  "/executive/legal-turnaround",
  authorize("Admin", "Executive"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(dashboardController.getLegalTurnaround),
);
router.get(
  "/executive/approval-bottleneck",
  authorize("Admin", "Executive"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(dashboardController.getApprovalBottleneck),
);

// ── Sports Manager Dashboard ──
router.get(
  "/sports-manager",
  authorize(
    "Admin",
    "Manager",
    "Executive",
    "Analyst",
    "Coach",
    "SkillCoach",
    "TacticalCoach",
    "FitnessCoach",
    "NutritionSpecialist",
    "GoalkeeperCoach",
    "MentalCoach",
  ),
  cacheRoute("dash", CacheTTL.SHORT),
  asyncHandler(dashboardController.getSportsManagerOverview),
);

router.get(
  "/transfer-framework",
  authorizeModule("dashboard", "read"),
  cacheRoute("tf-portfolio", CacheTTL.SHORT),
  transferPortfolioController.getStats,
);

// ── Player Portfolio Analytics ──
// Roster-wide aggregation. Service layer caches each query group via
// cacheOrFetch; the route-level cacheRoute adds a per-response layer.
// Nav/RouteGuard restrict the page to Admin/Manager/SportingDirector/
// Executive on the frontend; endpoints stay authorizeModule('dashboard','read').

/**
 * @swagger
 * /dashboard/portfolio/all:
 *   get:
 *     summary: Batched portfolio analytics (distributions + KPIs + positions + rankings at default period)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Combined portfolio analytics payload
 */
router.get(
  "/portfolio/all",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(portfolioAnalyticsController.getAll),
);

/**
 * @swagger
 * /dashboard/portfolio/distributions:
 *   get:
 *     summary: Current-state categorical distributions across the active roster
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Distribution buckets keyed by dimension
 */
router.get(
  "/portfolio/distributions",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.LONG),
  asyncHandler(portfolioAnalyticsController.getDistributions),
);

/**
 * @swagger
 * /dashboard/portfolio/kpis:
 *   get:
 *     summary: Portfolio KPI counters (avg age, avg rating, ready-for-marketing, under negotiation, etc.)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KPI counter object
 */
router.get(
  "/portfolio/kpis",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.LONG),
  asyncHandler(portfolioAnalyticsController.getKpis),
);

/**
 * @swagger
 * /dashboard/portfolio/positions:
 *   get:
 *     summary: Position insights — all present positions, most- and least-represented
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Position insight buckets
 */
router.get(
  "/portfolio/positions",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.LONG),
  asyncHandler(portfolioAnalyticsController.getPositions),
);

/**
 * @swagger
 * /dashboard/portfolio/rankings:
 *   get:
 *     summary: Top-rated and most-improved players over a time window
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           enum: [30, 90, 365]
 *           default: 90
 *         description: Window in days (whitelisted; invalid values fall back to 90)
 *     responses:
 *       200:
 *         description: Ranked player lists for the resolved period
 */
router.get(
  "/portfolio/rankings",
  authorizeModule("dashboard", "read"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(portfolioAnalyticsController.getRankings),
);

// ── Leadership Sales Dashboard (descriptive commercial analytics) ──
// Funnel offers→contracts, open-pipeline value, commission revenue,
// per-rep performance, and top counterparty clubs. Leadership-only,
// matching the executive route gating. Descriptive only — no forecasting.

/**
 * @swagger
 * /dashboard/sales/all:
 *   get:
 *     summary: Batched leadership sales dashboard (funnel + pipeline + revenue + reps + clubs)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Combined sales analytics payload
 */
router.get(
  "/sales/all",
  authorize("Admin", "Executive", "Manager"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(salesDashboardController.getAll),
);

/**
 * @swagger
 * /dashboard/sales/funnel:
 *   get:
 *     summary: Offer→contract conversion funnel with win rate and deal velocity
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Funnel counters and rates
 */
router.get(
  "/sales/funnel",
  authorize("Admin", "Executive", "Manager"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(salesDashboardController.getFunnel),
);

/**
 * @swagger
 * /dashboard/sales/pipeline:
 *   get:
 *     summary: Open-offer pipeline value broken down by status and phase
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pipeline stage buckets and totals
 */
router.get(
  "/sales/pipeline",
  authorize("Admin", "Executive", "Manager"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(salesDashboardController.getPipeline),
);

/**
 * @swagger
 * /dashboard/sales/revenue:
 *   get:
 *     summary: Commission summary (expected/collected/outstanding) and monthly trend
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: months
 *         schema:
 *           type: integer
 *           default: 12
 *         description: Trend window in months
 *     responses:
 *       200:
 *         description: Commission totals and monthly revenue trend
 */
router.get(
  "/sales/revenue",
  authorize("Admin", "Executive", "Manager"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(salesDashboardController.getRevenue),
);

/**
 * @swagger
 * /dashboard/sales/rep-performance:
 *   get:
 *     summary: Per-rep deal performance (offers created, won, won value)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Ranked rep performance list
 */
router.get(
  "/sales/rep-performance",
  authorize("Admin", "Executive", "Manager"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(salesDashboardController.getRepPerformance),
);

/**
 * @swagger
 * /dashboard/sales/top-clubs:
 *   get:
 *     summary: Top counterparty clubs by deal volume and value
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Ranked club deal stats
 */
router.get(
  "/sales/top-clubs",
  authorize("Admin", "Executive", "Manager"),
  cacheRoute("dash", CacheTTL.MEDIUM),
  asyncHandler(salesDashboardController.getTopClubs),
);

export default router;
