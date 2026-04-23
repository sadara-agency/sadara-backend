import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess } from "@shared/utils/apiResponse";
import * as svc from "./staffMonitoring.service";
import { parseRange, parseRoleFilter } from "./staffMonitoring.validation";

export async function getEngagement(req: AuthRequest, res: Response) {
  const { range = "30d", role } = req.query as {
    range?: string;
    role?: string;
  };
  const rangeDays = parseRange(range);
  const roleFilter = parseRoleFilter(role);
  const data = await svc.getEngagementSummary({ roleFilter, rangeDays });
  sendSuccess(res, data);
}

export async function getEngagementDetail(req: AuthRequest, res: Response) {
  const { userId } = req.params;
  const { range = "30d" } = req.query as { range?: string };
  const rangeDays = parseRange(range);
  const data = await svc.getEngagementDetail(userId, rangeDays);
  sendSuccess(res, data);
}

export async function getTaskPerformance(req: AuthRequest, res: Response) {
  const { range = "30d", role } = req.query as {
    range?: string;
    role?: string;
  };
  const rangeDays = parseRange(range);
  const roleFilter = parseRoleFilter(role);
  const data = await svc.getTaskPerformance({ roleFilter, rangeDays });
  sendSuccess(res, data);
}

export async function getRankings(req: AuthRequest, res: Response) {
  const {
    range = "30d",
    role,
    limit,
  } = req.query as {
    range?: string;
    role?: string;
    limit?: string;
  };
  const rangeDays = parseRange(range);
  const roleFilter = parseRoleFilter(role);
  const limitNum = limit
    ? Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100)
    : 50;
  const data = await svc.getRankings({
    roleFilter,
    rangeDays,
    limit: limitNum,
  });
  sendSuccess(res, data);
}

export async function getActivityHeatmap(req: AuthRequest, res: Response) {
  const { userId } = req.params;
  const { range = "30d" } = req.query as { range?: string };
  const rangeDays = parseRange(range) as 7 | 30 | 90;
  const data = await svc.getActivityHeatmap(userId, rangeDays);
  sendSuccess(res, data);
}
