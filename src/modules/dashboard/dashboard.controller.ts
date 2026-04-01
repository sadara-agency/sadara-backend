import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess } from "@shared/utils/apiResponse";
import { camelCaseKeys } from "@shared/utils/caseTransform";
import { hasPermission } from "@modules/permissions/permission.service";
import * as dashboardService from "@modules/dashboard/dashboard.service";

// ── Per-module permission guard ──
// Returns true if the user's role can read the given module.
// KPIs, alerts, and today overview are multi-module aggregates — always allowed
// (they already pass through the route-level authorizeModule("dashboard","read")).
async function canRead(req: AuthRequest, module: string): Promise<boolean> {
  return hasPermission(req.user!.role, module, "read");
}

// GET /dashboard/kpis
export async function getKpis(_req: AuthRequest, res: Response) {
  const data = await dashboardService.getKpis();
  sendSuccess(res, camelCaseKeys(data));
}

// GET /dashboard/alerts
export async function getAlerts(_req: AuthRequest, res: Response) {
  const data = await dashboardService.getAlerts();
  sendSuccess(res, camelCaseKeys(data));
}

// GET /dashboard/today
export async function getTodayOverview(_req: AuthRequest, res: Response) {
  const data = await dashboardService.getTodayOverview();
  sendSuccess(res, camelCaseKeys(data));
}

// GET /dashboard/top-players
export async function getTopPlayers(req: AuthRequest, res: Response) {
  if (!(await canRead(req, "players"))) return sendSuccess(res, []);
  const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);
  const data = await dashboardService.getTopPlayers(limit);
  sendSuccess(res, data);
}

// GET /dashboard/contracts/status
export async function getContractStatus(req: AuthRequest, res: Response) {
  if (!(await canRead(req, "contracts"))) return sendSuccess(res, []);
  const data = await dashboardService.getContractStatusDistribution();
  sendSuccess(res, camelCaseKeys(data));
}

// GET /dashboard/players/distribution
export async function getPlayerDistribution(req: AuthRequest, res: Response) {
  if (!(await canRead(req, "players"))) return sendSuccess(res, []);
  const data = await dashboardService.getPlayerDistribution();
  sendSuccess(res, camelCaseKeys(data));
}

// GET /dashboard/offers/recent
export async function getRecentOffers(req: AuthRequest, res: Response) {
  if (!(await canRead(req, "offers"))) return sendSuccess(res, []);
  const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);
  const data = await dashboardService.getRecentOffers(limit);
  sendSuccess(res, camelCaseKeys(data));
}

// GET /dashboard/matches/upcoming
export async function getUpcomingMatches(req: AuthRequest, res: Response) {
  if (!(await canRead(req, "matches"))) return sendSuccess(res, []);
  const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);
  const { id, role, playerId } = req.user!;
  const data = await dashboardService.getUpcomingMatches(
    limit,
    id,
    role,
    playerId,
  );
  sendSuccess(res, camelCaseKeys(data));
}

// GET /dashboard/tasks/urgent
export async function getUrgentTasks(req: AuthRequest, res: Response) {
  if (!(await canRead(req, "tasks"))) return sendSuccess(res, []);
  const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);
  const { id, role, playerId } = req.user!;
  const data = await dashboardService.getUrgentTasks(limit, id, role, playerId);
  sendSuccess(res, camelCaseKeys(data));
}

// GET /dashboard/revenue
export async function getRevenueChart(req: AuthRequest, res: Response) {
  if (!(await canRead(req, "finance"))) return sendSuccess(res, []);
  const months = Math.min(parseInt(req.query.months as string) || 12, 24);
  const data = await dashboardService.getRevenueChart(months);
  sendSuccess(res, camelCaseKeys(data));
}

// GET /dashboard/performance
export async function getPerformanceAverages(req: AuthRequest, res: Response) {
  if (!(await canRead(req, "players"))) return sendSuccess(res, []);
  const data = await dashboardService.getPerformanceAverages();
  sendSuccess(res, camelCaseKeys(data));
}

// GET /dashboard/activity
export async function getRecentActivity(req: AuthRequest, res: Response) {
  if (!(await canRead(req, "audit"))) return sendSuccess(res, []);
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const data = await dashboardService.getRecentActivity(limit);
  sendSuccess(res, camelCaseKeys(data));
}

// GET /dashboard/quick-stats
export async function getQuickStats(req: AuthRequest, res: Response) {
  if (!(await canRead(req, "gates"))) return sendSuccess(res, {});
  const data = await dashboardService.getQuickStats();
  sendSuccess(res, data);
}

// GET /dashboard/offer-pipeline
export async function getOfferPipeline(req: AuthRequest, res: Response) {
  if (!(await canRead(req, "offers"))) return sendSuccess(res, []);
  const data = await dashboardService.getOfferPipeline();
  sendSuccess(res, camelCaseKeys(data));
}

// GET /dashboard/injury-trends
export async function getInjuryTrends(req: AuthRequest, res: Response) {
  if (!(await canRead(req, "injuries"))) return sendSuccess(res, []);
  const data = await dashboardService.getInjuryTrends();
  sendSuccess(res, camelCaseKeys(data));
}

// GET /dashboard/kpi-trends
export async function getKpiTrends(req: AuthRequest, res: Response) {
  const data = await dashboardService.getKpiTrends();
  sendSuccess(res, data);
}

// ── Executive Dashboard ──

// GET /dashboard/executive/employee-performance
export async function getEmployeePerformance(req: AuthRequest, res: Response) {
  const limit = Number(req.query.limit) || 20;
  const data = await dashboardService.getEmployeePerformance(limit);
  sendSuccess(res, data);
}

// GET /dashboard/executive/platform-stats
export async function getPlatformStats(_req: AuthRequest, res: Response) {
  const data = await dashboardService.getPlatformStats();
  sendSuccess(res, data);
}

// GET /dashboard/executive/financial-summary
export async function getFinancialSummary(_req: AuthRequest, res: Response) {
  const data = await dashboardService.getFinancialSummary();
  sendSuccess(res, data);
}

// GET /dashboard/executive/operational-efficiency
export async function getOperationalEfficiency(
  _req: AuthRequest,
  res: Response,
) {
  const data = await dashboardService.getOperationalEfficiency();
  sendSuccess(res, data);
}

// GET /dashboard/executive/task-turnaround
export async function getTaskTurnaround(_req: AuthRequest, res: Response) {
  const data = await dashboardService.getTaskTurnaround();
  sendSuccess(res, data);
}

// GET /dashboard/executive/stuck-volume
export async function getStuckVolume(_req: AuthRequest, res: Response) {
  const data = await dashboardService.getStuckVolume();
  sendSuccess(res, data);
}

// GET /dashboard/executive/efficiency
export async function getEfficiency(_req: AuthRequest, res: Response) {
  const data = await dashboardService.getEfficiency();
  sendSuccess(res, data);
}

// GET /dashboard/executive/legal-turnaround
export async function getLegalTurnaround(_req: AuthRequest, res: Response) {
  const data = await dashboardService.getLegalTurnaround();
  sendSuccess(res, data);
}

// GET /dashboard/executive/approval-bottleneck
export async function getApprovalBottleneck(_req: AuthRequest, res: Response) {
  const data = await dashboardService.getApprovalBottleneck();
  sendSuccess(res, data);
}

// GET /dashboard/all — batched fetch for all dashboard sections (15 → 1 request)
export async function getAll(req: AuthRequest, res: Response) {
  const role = req.user!.role;
  const userId = req.user!.id;
  const playerId = req.user!.playerId;

  // Check per-module permissions in parallel
  const [
    canPlayers,
    canContracts,
    canOffers,
    canMatches,
    canTasks,
    canFinance,
    canAudit,
    canGates,
    canInjuries,
  ] = await Promise.all([
    canRead(req, "players"),
    canRead(req, "contracts"),
    canRead(req, "offers"),
    canRead(req, "matches"),
    canRead(req, "tasks"),
    canRead(req, "finance"),
    canRead(req, "audit"),
    canRead(req, "gates"),
    canRead(req, "injuries"),
  ]);

  // Fire all service calls in parallel, respecting permissions
  const results = await Promise.allSettled([
    /* 0  */ dashboardService.getKpis(),
    /* 1  */ dashboardService.getAlerts(),
    /* 2  */ dashboardService.getTodayOverview(),
    /* 3  */ canPlayers
      ? dashboardService.getTopPlayers(5)
      : Promise.resolve([]),
    /* 4  */ canContracts
      ? dashboardService.getContractStatusDistribution()
      : Promise.resolve([]),
    /* 5  */ canPlayers
      ? dashboardService.getPlayerDistribution()
      : Promise.resolve([]),
    /* 6  */ canOffers
      ? dashboardService.getRecentOffers(5)
      : Promise.resolve([]),
    /* 7  */ canMatches
      ? dashboardService.getUpcomingMatches(5, userId, role, playerId)
      : Promise.resolve([]),
    /* 8  */ canTasks
      ? dashboardService.getUrgentTasks(5, userId, role, playerId)
      : Promise.resolve([]),
    /* 9  */ canFinance
      ? dashboardService.getRevenueChart(12)
      : Promise.resolve([]),
    /* 10 */ canPlayers
      ? dashboardService.getPerformanceAverages()
      : Promise.resolve([]),
    /* 11 */ canAudit
      ? dashboardService.getRecentActivity(10)
      : Promise.resolve([]),
    /* 12 */ canGates ? dashboardService.getQuickStats() : Promise.resolve({}),
    /* 13 */ canOffers
      ? dashboardService.getOfferPipeline()
      : Promise.resolve([]),
    /* 14 */ canInjuries
      ? dashboardService.getInjuryTrends()
      : Promise.resolve([]),
    /* 15 */ dashboardService.getKpiTrends(),
  ]);

  const val = (i: number, fallback: unknown = null) => {
    const r = results[i];
    return r.status === "fulfilled" ? r.value : fallback;
  };

  sendSuccess(res, {
    kpis: camelCaseKeys(val(0, {}) as Record<string, unknown>),
    alerts: camelCaseKeys(val(1, {}) as Record<string, unknown>),
    today: camelCaseKeys(val(2, {}) as Record<string, unknown>),
    topPlayers: val(3, []),
    contractStatus: camelCaseKeys(val(4, []) as Record<string, unknown>),
    playerDistribution: camelCaseKeys(val(5, []) as Record<string, unknown>),
    recentOffers: camelCaseKeys(val(6, []) as Record<string, unknown>),
    upcomingMatches: camelCaseKeys(val(7, []) as Record<string, unknown>),
    urgentTasks: camelCaseKeys(val(8, []) as Record<string, unknown>),
    revenue: camelCaseKeys(val(9, []) as Record<string, unknown>),
    performance: camelCaseKeys(val(10, []) as Record<string, unknown>),
    activity: camelCaseKeys(val(11, []) as Record<string, unknown>),
    quickStats: val(12, {}),
    offerPipeline: camelCaseKeys(val(13, []) as Record<string, unknown>),
    injuryTrends: camelCaseKeys(val(14, []) as Record<string, unknown>),
    kpiTrends: val(15, {}),
  });
}

// GET /dashboard/player-attention — players needing attention (Version A)
export async function getPlayerAttention(_req: AuthRequest, res: Response) {
  const { getPlayerAttentionData } =
    await import("@modules/dashboard/dashboard.attention");
  const data = await getPlayerAttentionData();
  sendSuccess(res, data);
}

// GET /dashboard/sports-manager — operational overview for sports manager
export async function getSportsManagerOverview(
  _req: AuthRequest,
  res: Response,
) {
  const data = await dashboardService.getSportsManagerOverview();
  sendSuccess(res, camelCaseKeys(data as Record<string, unknown>));
}
