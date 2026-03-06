import { Response } from "express";
import { AuthRequest } from "../../shared/types";
import { sendSuccess } from "../../shared/utils/apiResponse";
import * as dashboardService from "./dashboard.service";

// GET /dashboard — full aggregated dashboard
export async function getFullDashboard(req: AuthRequest, res: Response) {
  const { id, role, playerId } = req.user!;
  const data = await dashboardService.getFullDashboard(id, role, playerId);
  sendSuccess(res, data);
}

// GET /dashboard/kpis
export async function getKpis(_req: AuthRequest, res: Response) {
  const data = await dashboardService.getKpis();
  sendSuccess(res, data);
}

// GET /dashboard/alerts
export async function getAlerts(_req: AuthRequest, res: Response) {
  const data = await dashboardService.getAlerts();
  sendSuccess(res, data);
}

// GET /dashboard/today
export async function getTodayOverview(_req: AuthRequest, res: Response) {
  const data = await dashboardService.getTodayOverview();
  sendSuccess(res, data);
}

// GET /dashboard/top-players
export async function getTopPlayers(req: AuthRequest, res: Response) {
  const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);
  const data = await dashboardService.getTopPlayers(limit);
  sendSuccess(res, data);
}

// GET /dashboard/contracts/status
export async function getContractStatus(_req: AuthRequest, res: Response) {
  const data = await dashboardService.getContractStatusDistribution();
  sendSuccess(res, data);
}

// GET /dashboard/players/distribution
export async function getPlayerDistribution(_req: AuthRequest, res: Response) {
  const data = await dashboardService.getPlayerDistribution();
  sendSuccess(res, data);
}

// GET /dashboard/offers/recent
export async function getRecentOffers(req: AuthRequest, res: Response) {
  const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);
  const data = await dashboardService.getRecentOffers(limit);
  sendSuccess(res, data);
}

// GET /dashboard/matches/upcoming
export async function getUpcomingMatches(req: AuthRequest, res: Response) {
  const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);
  const { id, role, playerId } = req.user!;
  const data = await dashboardService.getUpcomingMatches(limit, id, role, playerId);
  sendSuccess(res, data);
}

// GET /dashboard/tasks/urgent
export async function getUrgentTasks(req: AuthRequest, res: Response) {
  const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);
  const { id, role, playerId } = req.user!;
  const data = await dashboardService.getUrgentTasks(limit, id, role, playerId);
  sendSuccess(res, data);
}

// GET /dashboard/revenue
export async function getRevenueChart(req: AuthRequest, res: Response) {
  const months = Math.min(parseInt(req.query.months as string) || 12, 24);
  const data = await dashboardService.getRevenueChart(months);
  sendSuccess(res, data);
}

// GET /dashboard/performance
export async function getPerformanceAverages(_req: AuthRequest, res: Response) {
  const data = await dashboardService.getPerformanceAverages();
  sendSuccess(res, data);
}

// GET /dashboard/activity
export async function getRecentActivity(req: AuthRequest, res: Response) {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const data = await dashboardService.getRecentActivity(limit);
  sendSuccess(res, data);
}

// GET /dashboard/quick-stats
export async function getQuickStats(_req: AuthRequest, res: Response) {
  const data = await dashboardService.getQuickStats();
  sendSuccess(res, data);
}

// GET /dashboard/offer-pipeline
export async function getOfferPipeline(_req: AuthRequest, res: Response) {
  const data = await dashboardService.getOfferPipeline();
  sendSuccess(res, data);
}

// GET /dashboard/injury-trends
export async function getInjuryTrends(_req: AuthRequest, res: Response) {
  const data = await dashboardService.getInjuryTrends();
  sendSuccess(res, data);
}

// GET /dashboard/kpi-trends
export async function getKpiTrends(_req: AuthRequest, res: Response) {
  const data = await dashboardService.getKpiTrends();
  sendSuccess(res, data);
}
