import { Response } from "express";
import type { AuthRequest } from "@shared/types";
import { sendSuccess, sendCreated } from "@shared/utils/apiResponse";
import { invalidateByPrefix, CachePrefix } from "@shared/utils/cache";
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
  const record = await service.upsertPlayerSeasonStats(
    playerId,
    season,
    req.body,
  );
  await invalidateByPrefix(CachePrefix.PLAYER_SEASON_STATS).catch(() => null);
  sendCreated(res, record, "Season stats saved");
}

export async function recompute(req: AuthRequest, res: Response) {
  const { playerId, season } = req.params;
  service.recomputeFromMatches(playerId, season).catch(() => null);
  sendSuccess(res, null, "Recompute triggered");
}
