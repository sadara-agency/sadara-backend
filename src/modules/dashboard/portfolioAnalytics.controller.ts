import { sendSuccess } from "@shared/utils/apiResponse";
import * as portfolioService from "./portfolioAnalytics.service";
import type { AuthRequest } from "@shared/types";
import type { Response } from "express";

// Plain async handlers — the routes file wraps each in asyncHandler,
// matching every other handler registered in dashboard.routes.ts.

export async function getDistributions(_req: AuthRequest, res: Response) {
  const data = await portfolioService.getDistributions();
  sendSuccess(res, data);
}

export async function getKpis(_req: AuthRequest, res: Response) {
  const data = await portfolioService.getKpis();
  sendSuccess(res, data);
}

export async function getPositions(_req: AuthRequest, res: Response) {
  const data = await portfolioService.getPositions();
  sendSuccess(res, data);
}

export async function getRankings(req: AuthRequest, res: Response) {
  const data = await portfolioService.getRankings(req.query.period);
  sendSuccess(res, data);
}

export async function getAll(_req: AuthRequest, res: Response) {
  const data = await portfolioService.getPortfolioAll();
  sendSuccess(res, data);
}
