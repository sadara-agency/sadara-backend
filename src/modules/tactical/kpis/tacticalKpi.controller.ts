import { Response } from "express";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { asyncHandler } from "@middleware/errorHandler";
import type { AuthRequest } from "@shared/types";
import * as svc from "./tacticalKpi.service";

export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await svc.listTacticalKpis(req.query as any);
  sendPaginated(res, result.data, result.meta);
});

export const getById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const record = await svc.getTacticalKpiById(req.params.id);
  sendSuccess(res, record);
});

export const getByMatch = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { playerId, matchId } = req.params;
    const record = await svc.getTacticalKpiByMatch(playerId, matchId);
    sendSuccess(res, record ?? null);
  },
);

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const record = await svc.createTacticalKpi(req.body, req.user!.id);
  Promise.all([
    invalidateMultiple([
      CachePrefix.TACTICAL,
      CachePrefix.MATCH_ANALYTICS,
      CachePrefix.DASHBOARD,
    ]),
    logAudit(
      "CREATE",
      "tactical_kpi_scores",
      record.id,
      buildAuditContext(req.user!, req.ip),
      "Tactical KPI created",
    ),
  ]).catch(() => {});
  sendCreated(res, record);
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  const record = await svc.updateTacticalKpi(req.params.id, req.body);
  Promise.all([
    invalidateMultiple([CachePrefix.TACTICAL, CachePrefix.MATCH_ANALYTICS]),
    logAudit(
      "UPDATE",
      "tactical_kpi_scores",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      "Tactical KPI updated",
    ),
  ]).catch(() => {});
  sendSuccess(res, record);
});

export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await svc.deleteTacticalKpi(req.params.id);
  Promise.all([
    invalidateMultiple([
      CachePrefix.TACTICAL,
      CachePrefix.MATCH_ANALYTICS,
      CachePrefix.DASHBOARD,
    ]),
    logAudit(
      "DELETE",
      "tactical_kpi_scores",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      "Tactical KPI deleted",
    ),
  ]).catch(() => {});
  sendSuccess(res, result);
});

export const compute = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { playerId, matchId } = req.body;
  const record = await svc.computeTacticalKpis(playerId, matchId, req.user!.id);
  Promise.all([
    invalidateMultiple([CachePrefix.TACTICAL, CachePrefix.MATCH_ANALYTICS]),
    logAudit(
      "UPDATE",
      "tactical_kpi_scores",
      record.id,
      buildAuditContext(req.user!, req.ip),
      `KPIs computed for player ${playerId} / match ${matchId}`,
    ),
  ]).catch(() => {});
  sendSuccess(res, record);
});

export const playerTrend = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { playerId } = req.params;
    const last = parseInt(req.query.last as string) || 10;
    const trend = await svc.getPlayerTacticalTrend(playerId, last);
    sendSuccess(res, trend);
  },
);
