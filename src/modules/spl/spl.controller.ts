// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.controller.ts
// ─────────────────────────────────────────────────────────────

import { Response } from "express";
import { sendSuccess } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { logger } from "@config/logger";
import { AuthRequest } from "@shared/types";
import * as splSync from "@modules/spl/spl.sync";
import {
  seedClubExternalIds,
  getSyncState,
  updateSyncState,
  getStandings,
  getLeaderboard,
  getPlayerDetailedStats,
  getTeamDetailedStats,
} from "@modules/spl/spl.service";
import { SPL_CLUB_REGISTRY } from "@modules/spl/spl.registry";
import type { PulseLiveRankedStat } from "@modules/spl/spl.types";

export async function syncPlayer(req: AuthRequest, res: Response) {
  const { splPlayerId, slug } = req.body;
  const result = await splSync.syncPlayer(splPlayerId, slug);
  await logAudit(
    "CREATE",
    "players",
    result.sadaraPlayerId || null,
    buildAuditContext(req.user!, req.ip),
    `SPL sync player #${splPlayerId}: ${result.action} — ${result.playerName}`,
  );
  sendSuccess(res, result, `Player ${result.action}: ${result.playerName}`);
}

export async function syncTeam(req: AuthRequest, res: Response) {
  const { splTeamId } = req.body;
  const summary = await splSync.syncTeam(splTeamId);
  await logAudit(
    "CREATE",
    "players",
    null,
    buildAuditContext(req.user!, req.ip),
    `SPL team sync #${splTeamId}: ${summary.created}c ${summary.updated}u`,
  );
  sendSuccess(
    res,
    summary,
    `Synced ${summary.total} players from team ${splTeamId}`,
  );
}

export async function syncAll(req: AuthRequest, res: Response) {
  const state = getSyncState();
  if (state.isRunning) {
    sendSuccess(res, state, "Sync already running");
    return;
  }

  updateSyncState({ isRunning: true, lastRun: new Date() });
  sendSuccess(res, null, "Full SPL sync started in background.");

  splSync
    .syncAllTeams((name, i, total) => {
      logger.info(`[SPL] Syncing ${name} (${i + 1}/${total})...`);
    })
    .then((result) => {
      updateSyncState({ isRunning: false, lastResult: result });
      logger.info(
        `[SPL] ✓ Complete: ${result.totalPlayers} players, ${result.teams} teams`,
      );
    })
    .catch((err) => {
      updateSyncState({ isRunning: false });
      logger.error(`[SPL] ✗ Failed: ${err.message}`);
    });

  await logAudit(
    "CREATE",
    "players",
    null,
    buildAuditContext(req.user!, req.ip),
    "SPL full sync triggered (background)",
  );
}

export async function seedClubIds(req: AuthRequest, res: Response) {
  const result = await seedClubExternalIds();
  await logAudit(
    "UPDATE",
    "clubs",
    null,
    buildAuditContext(req.user!, req.ip),
    `Seeded SPL/ESPN IDs for ${result.updated} clubs`,
  );
  sendSuccess(res, result, `Updated ${result.updated} clubs`);
}

export async function getRegistry(_req: AuthRequest, res: Response) {
  sendSuccess(res, {
    clubs: SPL_CLUB_REGISTRY,
    total: SPL_CLUB_REGISTRY.length,
  });
}

export async function getStatus(_req: AuthRequest, res: Response) {
  sendSuccess(res, getSyncState());
}

// ── Standings (PulseLive) ──
export async function standings(req: AuthRequest, res: Response) {
  const seasonId = req.query.seasonId
    ? parseInt(req.query.seasonId as string, 10)
    : undefined;
  const data = await getStandings(seasonId);
  sendSuccess(res, data);
}

// ── Leaderboard (PulseLive) ──
export async function leaderboard(req: AuthRequest, res: Response) {
  const stat = req.params.stat as PulseLiveRankedStat;
  const page = parseInt((req.query.page as string) || "0", 10);
  const pageSize = parseInt((req.query.pageSize as string) || "20", 10);
  const seasonId = req.query.seasonId
    ? parseInt(req.query.seasonId as string, 10)
    : undefined;
  const result = await getLeaderboard(stat, page, pageSize, seasonId);
  sendSuccess(res, result);
}

// ── Player Detailed Stats (PulseLive) ──
export async function playerDetailedStats(req: AuthRequest, res: Response) {
  const seasonId = req.query.seasonId
    ? parseInt(req.query.seasonId as string, 10)
    : undefined;
  const data = await getPlayerDetailedStats(req.params.id, seasonId);
  if (!data) {
    sendSuccess(res, null, "No PulseLive data available for this player");
    return;
  }
  sendSuccess(res, data);
}

// ── Team Stats (PulseLive) ──
export async function teamStats(req: AuthRequest, res: Response) {
  const teamId = parseInt(req.params.teamId, 10);
  const seasonId = req.query.seasonId
    ? parseInt(req.query.seasonId as string, 10)
    : undefined;
  const data = await getTeamDetailedStats(teamId, seasonId);
  if (!data) {
    sendSuccess(res, null, "No PulseLive data available for this team");
    return;
  }
  sendSuccess(res, data);
}

// ── Sync Detailed Stats (PulseLive) ──
export async function syncDetailedStats(req: AuthRequest, res: Response) {
  const syncState = getSyncState();
  if (syncState.isRunning) {
    sendSuccess(res, syncState, "Sync already running");
    return;
  }

  updateSyncState({ isRunning: true, lastRun: new Date() });
  sendSuccess(
    res,
    null,
    "PulseLive detailed stats sync started in background.",
  );

  splSync
    .syncAllDetailedStats((name, i, total) => {
      logger.info(`[PulseLive] Syncing ${name} (${i + 1}/${total})...`);
    })
    .then((result) => {
      updateSyncState({ isRunning: false, lastResult: result });
      logger.info(
        `[PulseLive] ✓ Complete: ${result.synced} synced, ${result.errors} errors`,
      );
    })
    .catch((err) => {
      updateSyncState({ isRunning: false });
      logger.error(`[PulseLive] ✗ Failed: ${err.message}`);
    });

  await logAudit(
    "CREATE",
    "players",
    null,
    buildAuditContext(req.user!, req.ip),
    "PulseLive detailed stats sync triggered (background)",
  );
}
