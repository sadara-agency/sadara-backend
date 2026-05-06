import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendCreated, sendSuccess } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";
import * as heatmapService from "./heatmap.service";

const CACHE_PREFIXES = [CachePrefix.HEATMAPS];

export async function create(req: AuthRequest, res: Response) {
  const item = await heatmapService.saveHeatmapData(req.body, req.user!.id);

  Promise.all([
    invalidateMultiple(CACHE_PREFIXES),
    logAudit(
      "CREATE",
      "heatmaps",
      item.id,
      buildAuditContext(req.user!, req.ip),
      `Heatmap data saved for player ${item.playerId}` +
        (item.matchId ? ` (match ${item.matchId})` : ""),
    ),
  ]).catch(() => {});

  sendCreated(res, item, "Heatmap data saved");
}

export async function getById(req: AuthRequest, res: Response) {
  const item = await heatmapService.getHeatmapById(req.params.id);
  sendSuccess(res, item);
}

export async function listByPlayer(req: AuthRequest, res: Response) {
  const result = await heatmapService.getPlayerHeatmaps(
    req.params.playerId,
    req.query as any,
  );
  sendSuccess(res, result);
}

export async function aggregateByPlayer(req: AuthRequest, res: Response) {
  const result = await heatmapService.getAggregatedHeatmap(
    req.params.playerId,
    req.query as any,
  );
  sendSuccess(res, result);
}

export async function listByMatch(req: AuthRequest, res: Response) {
  const result = await heatmapService.getMatchHeatmaps(req.params.matchId);
  sendSuccess(res, result);
}

export async function remove(req: AuthRequest, res: Response) {
  const result = await heatmapService.deleteHeatmap(req.params.id);

  Promise.all([
    invalidateMultiple(CACHE_PREFIXES),
    logAudit(
      "DELETE",
      "heatmaps",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      `Heatmap deleted`,
    ),
  ]).catch(() => {});

  sendSuccess(res, result, "Heatmap deleted");
}
