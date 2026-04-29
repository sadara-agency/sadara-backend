// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.matchStats.controller.ts
// Phase B handlers — per-match player stats from Pulselive.
// ─────────────────────────────────────────────────────────────

import { Response } from "express";
import { sendSuccess } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import type { AuthRequest } from "@shared/types";
import * as matchStatsSync from "@modules/spl/spl.matchStats.sync";

export async function triggerSyncMatchStats(req: AuthRequest, res: Response) {
  const id = Number(req.params.pulselivefixtureId);
  const result = await matchStatsSync.syncMatchPlayerStats(id);
  await logAudit(
    "CREATE",
    "player_match_stats",
    result.matchId,
    buildAuditContext(req.user!, req.ip),
    `SPL match stats ${id}: ${result.statsUpserted} rows, ${result.unmappedPulseLivePlayerIds.length} unmapped`,
  );
  sendSuccess(res, result, `Synced ${result.statsUpserted} player stat rows`);
}

export async function triggerSyncAllMatchStats(
  req: AuthRequest,
  res: Response,
) {
  const { seasonId, sinceDate } = req.body as {
    seasonId?: number;
    sinceDate?: string;
  };
  const result = await matchStatsSync.syncAllMatchPlayerStats(
    seasonId,
    sinceDate,
  );
  await logAudit(
    "CREATE",
    "player_match_stats",
    null,
    buildAuditContext(req.user!, req.ip),
    `SPL all-match-stats sync — fixtures=${result.fixtures} rows=${result.statsRows} unmapped=${result.unmappedTotal}`,
  );
  sendSuccess(res, result, `Processed ${result.fixtures} fixtures`);
}
