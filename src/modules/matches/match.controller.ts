import { Response } from "express";
import { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { logger } from "@config/logger";
import { createCrudController } from "@shared/utils/crudController";
import * as svc from "@modules/matches/match.service";
import { generateAutoTasks } from "@modules/matches/matchAutoTasks";

// Matches create doesn't take userId, so we adapt.
const crud = createCrudController({
  service: {
    list: (query) => svc.listMatches(query),
    getById: (id) => svc.getMatchById(id),
    create: (body) => svc.createMatch(body),
    update: (id, body) => svc.updateMatch(id, body),
    delete: (id) => svc.deleteMatch(id),
  },
  entity: "matches",
  cachePrefixes: [],
  label: (m) => `${m.competition || "Match"} on ${m.matchDate}`,
});

export const { list, getById, create, update, remove } = crud;

// ═══════════════════════════════════════════════════════════════
//  CUSTOM MATCH HANDLERS
// ═══════════════════════════════════════════════════════════════

export async function upcoming(req: AuthRequest, res: Response) {
  const days = Number(req.query.days) || 7;
  const limit = Number(req.query.limit) || 10;
  const matches = await svc.getUpcomingMatches(days, limit);
  sendSuccess(res, matches);
}

export async function updateScore(req: AuthRequest, res: Response) {
  const match = await svc.updateScore(req.params.id, req.body);
  await logAudit(
    "UPDATE",
    "matches",
    match.id,
    buildAuditContext(req.user!, req.ip),
    `Score updated: ${match.homeScore}-${match.awayScore}`,
  );
  sendSuccess(res, match, "Score updated");
}

export async function updateStatus(req: AuthRequest, res: Response) {
  const match = await svc.updateMatchStatus(req.params.id, req.body.status);
  await logAudit(
    "UPDATE",
    "matches",
    match.id,
    buildAuditContext(req.user!, req.ip),
    `Match status changed to ${match.status}`,
  );

  // ── Auto-generate tasks when match is completed ──
  if (req.body.status === "completed") {
    generateAutoTasks(req.params.id, req.user!.id)
      .then((result) => {
        if (result.created > 0) {
          logger.info(
            `[AutoTasks] Match completed → Created ${result.created} tasks for match ${req.params.id}`,
          );
        }
      })
      .catch((err) => {
        logger.error("[AutoTasks] Error on match completion:", {
          error: err.message,
        });
      });
  }

  sendSuccess(res, match, `Match status updated to ${match.status}`);
}

// ═══════════════════════════════════════════════════════════════
//  CALENDAR
// ═══════════════════════════════════════════════════════════════

export async function calendar(req: AuthRequest, res: Response) {
  const matches = await svc.getCalendar(req.query as any);
  sendSuccess(res, matches);
}

// ═══════════════════════════════════════════════════════════════
//  MATCH PLAYERS
// ═══════════════════════════════════════════════════════════════

export async function getPlayers(req: AuthRequest, res: Response) {
  const players = await svc.getMatchPlayers(req.params.id);
  sendSuccess(res, players);
}

export async function assignPlayers(req: AuthRequest, res: Response) {
  const players = await svc.assignPlayers(req.params.id, req.body.players);
  await logAudit(
    "UPDATE",
    "matches",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Assigned ${req.body.players.length} players to match`,
  );
  sendSuccess(res, players, "Players assigned");
}

export async function updatePlayer(req: AuthRequest, res: Response) {
  const mp = await svc.updateMatchPlayer(
    req.params.id,
    req.params.playerId,
    req.body,
  );
  sendSuccess(res, mp, "Player assignment updated");
}

export async function removePlayer(req: AuthRequest, res: Response) {
  const result = await svc.removePlayerFromMatch(
    req.params.id,
    req.params.playerId,
  );
  await logAudit(
    "DELETE",
    "matches",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Removed player ${req.params.playerId} from match`,
  );
  sendSuccess(res, result, "Player removed from match");
}

// ═══════════════════════════════════════════════════════════════
//  PLAYER MATCH STATS
// ═══════════════════════════════════════════════════════════════

export async function getStats(req: AuthRequest, res: Response) {
  const stats = await svc.getMatchStats(req.params.id);
  sendSuccess(res, stats);
}

export async function upsertStats(req: AuthRequest, res: Response) {
  const stats = await svc.upsertStats(req.params.id, req.body.stats);
  await logAudit(
    "UPDATE",
    "matches",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Updated stats for ${req.body.stats.length} players`,
  );

  // ── Auto-generate tasks based on stats (fire-and-forget) ──
  generateAutoTasks(req.params.id, req.user!.id)
    .then((result) => {
      if (result.created > 0) {
        logger.info(
          `[AutoTasks] Created ${result.created} tasks for match ${req.params.id}: ${result.rules.join(", ")}`,
        );
      }
    })
    .catch((err) => {
      logger.error("[AutoTasks] Error generating auto-tasks:", {
        error: err.message,
      });
    });

  sendSuccess(res, stats, "Stats saved");
}

export async function updatePlayerStats(req: AuthRequest, res: Response) {
  const stats = await svc.updatePlayerStats(
    req.params.id,
    req.params.playerId,
    req.body,
  );
  sendSuccess(res, stats, "Player stats updated");
}

export async function deletePlayerStats(req: AuthRequest, res: Response) {
  const result = await svc.deletePlayerStats(
    req.params.id,
    req.params.playerId,
  );
  sendSuccess(res, result, "Player stats deleted");
}

// ═══════════════════════════════════════════════════════════════
//  PLAYER-CENTRIC (for player profile)
// ═══════════════════════════════════════════════════════════════

export async function playerMatches(req: AuthRequest, res: Response) {
  const result = await svc.getPlayerMatches(req.params.playerId, req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function playerAggregateStats(req: AuthRequest, res: Response) {
  const stats = await svc.getPlayerAggregateStats(
    req.params.playerId,
    req.query as any,
  );
  sendSuccess(res, stats);
}

// ═══════════════════════════════════════════════════════════════
//  MATCH ANALYSIS
// ═══════════════════════════════════════════════════════════════

export async function listAnalyses(req: AuthRequest, res: Response) {
  const analyses = await svc.getMatchAnalyses(req.params.id);
  sendSuccess(res, analyses);
}

export async function getAnalysis(req: AuthRequest, res: Response) {
  const analysis = await svc.getMatchAnalysisById(
    req.params.id,
    req.params.analysisId,
  );
  sendSuccess(res, analysis);
}

export async function createAnalysis(req: AuthRequest, res: Response) {
  const analysis = await svc.createMatchAnalysis(
    req.params.id,
    req.user!.id,
    req.body,
  );
  await logAudit(
    "CREATE",
    "match_analyses",
    analysis.id,
    buildAuditContext(req.user!, req.ip),
    `Created ${req.body.type} analysis: ${req.body.title}`,
  );
  sendCreated(res, analysis);
}

export async function updateAnalysis(req: AuthRequest, res: Response) {
  const analysis = await svc.updateMatchAnalysis(
    req.params.id,
    req.params.analysisId,
    req.body,
  );
  await logAudit(
    "UPDATE",
    "match_analyses",
    req.params.analysisId,
    buildAuditContext(req.user!, req.ip),
    `Updated analysis: ${analysis.title}`,
  );
  sendSuccess(res, analysis, "Analysis updated");
}

export async function publishAnalysis(req: AuthRequest, res: Response) {
  const analysis = await svc.publishMatchAnalysis(
    req.params.id,
    req.params.analysisId,
  );
  await logAudit(
    "UPDATE",
    "match_analyses",
    req.params.analysisId,
    buildAuditContext(req.user!, req.ip),
    `Published analysis: ${analysis.title}`,
  );
  sendSuccess(res, analysis, "Analysis published");
}

export async function removeAnalysis(req: AuthRequest, res: Response) {
  const result = await svc.deleteMatchAnalysis(
    req.params.id,
    req.params.analysisId,
  );
  await logAudit(
    "DELETE",
    "match_analyses",
    req.params.analysisId,
    buildAuditContext(req.user!, req.ip),
    "Analysis deleted",
  );
  sendSuccess(res, result, "Analysis deleted");
}
