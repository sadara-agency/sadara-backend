// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.rosters.controller.ts
// Phase C handlers — squad rosters + team-season stats.
// ─────────────────────────────────────────────────────────────

import { Response } from "express";
import { sendSuccess } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import type { AuthRequest } from "@shared/types";
import * as rostersSync from "@modules/spl/spl.rosters.sync";
import * as teamStatsSync from "@modules/spl/spl.teamStats.sync";

export async function triggerSyncTeamRoster(req: AuthRequest, res: Response) {
  const teamId = Number(req.params.pulseLiveTeamId);
  const { seasonId } = req.body as { seasonId?: number };
  const result = await rostersSync.syncTeamRoster(teamId, seasonId);
  await logAudit(
    "CREATE",
    "squad_memberships",
    result.clubId,
    buildAuditContext(req.user!, req.ip),
    `SPL roster team=${teamId} season=${seasonId ?? "default"}: ${result.members} members, ${result.unmappedPulseLivePlayerIds.length} unmapped`,
  );
  sendSuccess(
    res,
    result,
    `Synced ${result.members} memberships for team ${teamId}`,
  );
}

export async function triggerSyncAllTeamRosters(
  req: AuthRequest,
  res: Response,
) {
  const { seasonId } = req.body as { seasonId?: number };
  const result = await rostersSync.syncAllTeamRosters(seasonId);
  await logAudit(
    "CREATE",
    "squad_memberships",
    null,
    buildAuditContext(req.user!, req.ip),
    `SPL all-rosters sync — teams=${result.teams} members=${result.members} unmapped=${result.unmappedTotal}`,
  );
  sendSuccess(res, result, `Processed ${result.teams} teams`);
}

export async function triggerSyncTeamSeasonStats(
  req: AuthRequest,
  res: Response,
) {
  const teamId = Number(req.params.pulseLiveTeamId);
  const { seasonId } = req.body as { seasonId?: number };
  const result = await teamStatsSync.syncTeamSeasonStats(teamId, seasonId);
  await logAudit(
    "CREATE",
    "team_season_stats",
    result.clubId,
    buildAuditContext(req.user!, req.ip),
    `SPL team-stats team=${teamId}: ${result.metrics} metrics`,
  );
  sendSuccess(
    res,
    result,
    `Synced ${result.metrics} metrics for team ${teamId}`,
  );
}

export async function triggerSyncAllTeamSeasonStats(
  req: AuthRequest,
  res: Response,
) {
  const { seasonId } = req.body as { seasonId?: number };
  const result = await teamStatsSync.syncAllTeamSeasonStats(seasonId);
  await logAudit(
    "CREATE",
    "team_season_stats",
    null,
    buildAuditContext(req.user!, req.ip),
    `SPL all-team-stats sync — teams=${result.teams} upserted=${result.upserted}`,
  );
  sendSuccess(res, result, `Processed ${result.teams} teams`);
}
