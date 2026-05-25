import { Response } from "express";
import type { AuthRequest } from "@shared/types";
import { sendSuccess, sendCreated } from "@shared/utils/apiResponse";
import { invalidateByPrefix, CachePrefix } from "@shared/utils/cache";
import { buildAuditContext } from "@shared/utils/audit";
import * as service from "./playerStats.service";

export async function getAllSeasons(req: AuthRequest, res: Response) {
  const { playerId } = req.params;
  const data = await service.getAllPlayerSeasonStats(playerId);
  sendSuccess(res, data);
}

export async function getOneSeason(req: AuthRequest, res: Response) {
  const { playerId, season } = req.params;
  const data = await service.getPlayerSeasonStats(playerId, season);
  sendSuccess(res, data);
}

export async function upsertSeason(req: AuthRequest, res: Response) {
  const { playerId, season } = req.params;
  const ctx = req.user ? buildAuditContext(req.user, req.ip) : undefined;
  const record = await service.upsertPlayerSeasonStats(
    playerId,
    season,
    req.body,
    ctx,
  );
  await invalidateByPrefix(CachePrefix.PLAYER_SEASON_STATS).catch(() => null);
  sendCreated(res, record, "Season stats saved");
}

export async function applyMatch(req: AuthRequest, res: Response) {
  const { playerId, season } = req.params;
  const ctx = req.user ? buildAuditContext(req.user, req.ip) : undefined;
  const record = await service.applyMatchToSeason(
    playerId,
    season,
    req.body,
    ctx,
  );
  await invalidateByPrefix(CachePrefix.PLAYER_SEASON_STATS).catch(() => null);
  sendCreated(res, record, "Match applied to season stats");
}

export async function getHistory(req: AuthRequest, res: Response) {
  const { playerId } = req.params;
  const data = await service.getPlayerStatsHistory(playerId);
  sendSuccess(res, data);
}

export async function recompute(req: AuthRequest, res: Response) {
  const { playerId, season } = req.params;
  const force = req.query.force === "true";
  service.recomputeFromMatches(playerId, season, force).catch(() => null);
  sendSuccess(res, null, "Recompute triggered");
}
