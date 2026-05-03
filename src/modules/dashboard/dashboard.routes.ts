import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorize, authorizeModule } from "@middleware/auth";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import * as dashboardController from "@modules/dashboard/dashboard.controller";
import * as configController from "@modules/dashboard/dashboardConfig.controller";
import * as transferPortfolioController from "@modules/dashboard/transferPortfolio.controller";
import coachRouter from "@modules/dashboard/coach.routes";

const router = Router();
router.use(authenticate);

// ── Coach Dashboard sub-router ──
router.use("/coach", coachRouter);

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

export default router;
