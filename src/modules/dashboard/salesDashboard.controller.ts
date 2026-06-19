import { sendSuccess } from "@shared/utils/apiResponse";
import * as salesService from "./salesDashboard.service";
import type { AuthRequest } from "@shared/types";
import type { Response } from "express";

// Plain async handlers — the routes file wraps each in asyncHandler,
// matching every other handler registered in dashboard.routes.ts.

export async function getFunnel(_req: AuthRequest, res: Response) {
  const data = await salesService.getFunnel();
  sendSuccess(res, data);
}

export async function getPipeline(_req: AuthRequest, res: Response) {
  const data = await salesService.getPipeline();
  sendSuccess(res, data);
}

export async function getRevenue(req: AuthRequest, res: Response) {
  const months = Number(req.query.months) || 12;
  const data = await salesService.getRevenue(months);
  sendSuccess(res, data);
}

export async function getRepPerformance(req: AuthRequest, res: Response) {
  const limit = Number(req.query.limit) || 20;
  const data = await salesService.getRepPerformance(limit);
  sendSuccess(res, data);
}

export async function getTopClubs(req: AuthRequest, res: Response) {
  const limit = Number(req.query.limit) || 10;
  const data = await salesService.getTopClubs(limit);
  sendSuccess(res, data);
}

export async function getAll(_req: AuthRequest, res: Response) {
  const data = await salesService.getSalesAll();
  sendSuccess(res, data);
}
