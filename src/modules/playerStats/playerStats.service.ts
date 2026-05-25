import { Op } from "sequelize";
import PlayerSeasonStats from "./playerStats.model";
import { PlayerMatchStats } from "@modules/matches/playerMatchStats.model";
import { AuditLog } from "@modules/audit/AuditLog.model";
import { AppError } from "@middleware/errorHandler";
import { logAudit, buildChanges } from "@shared/utils/audit";
import type { AuditContext } from "@shared/types";
import type {
  UpsertPlayerSeasonStatsDTO,
  ApplyMatchToSeasonDTO,
} from "./playerStats.validation";

export async function getAllPlayerSeasonStats(playerId: string) {
  return PlayerSeasonStats.findAll({
    where: { playerId },
    order: [["season", "DESC"]],
  });
}

export async function getPlayerSeasonStats(playerId: string, season: string) {
  const record = await PlayerSeasonStats.findOne({
    where: { playerId, season },
  });
  if (!record) throw new AppError("Season stats not found", 404);
  return record;
}

export async function upsertPlayerSeasonStats(
  playerId: string,
  season: string,
  data: UpsertPlayerSeasonStatsDTO,
  ctx?: AuditContext,
) {
  const before = await PlayerSeasonStats.findOne({
    where: { playerId, season },
  });
  const [record] = await PlayerSeasonStats.upsert(
    { playerId, season, ...data, source: "manual" },
    { returning: true, conflictFields: ["player_id", "season"] },
  );

  if (ctx) {
    const changes = buildChanges(before?.toJSON() ?? {}, { ...data });
    logAudit(
      "update",
      "player_season_stats",
      record.id,
      ctx,
      `Manual stats edit — player ${playerId}, season ${season}`,
      changes ?? undefined,
    ).catch(() => null);
  }

  return record;
}

// Season totals that a single match contributes to (delta-summed).
const MATCH_DELTA_MAP: Record<string, keyof PlayerSeasonStatsAttributesLike> = {
  minutesPlayed: "minutesPlayed",
  goals: "goals",
  assists: "assists",
  yellowCards: "yellowCards",
  redCards: "redCards",
  shotsOnTarget: "shotsOnTarget",
  keyPasses: "keyPasses",
  interceptions: "interceptions",
  saves: "savesMade",
  cleanSheet: "cleanSheets",
  goalsConceded: "goalsConceded",
  penaltiesSaved: "penaltiesSaved",
};

type PlayerSeasonStatsAttributesLike = {
  minutesPlayed: number | null;
  goals: number | null;
  assists: number | null;
  yellowCards: number | null;
  redCards: number | null;
  shotsOnTarget: number | null;
  keyPasses: number | null;
  interceptions: number | null;
  savesMade: number | null;
  cleanSheets: number | null;
  goalsConceded: number | null;
  penaltiesSaved: number | null;
};

/**
 * Records a single match's stats for a player AND adds those numbers onto the
 * season totals (matchesPlayed +1). Keeps the season as the running sum of
 * matches. Audited with the linked match in the detail.
 */
export async function applyMatchToSeason(
  playerId: string,
  season: string,
  payload: ApplyMatchToSeasonDTO,
  ctx?: AuditContext,
) {
  const { matchId, stats } = payload;

  await PlayerMatchStats.bulkCreate(
    [{ matchId, playerId, providerSource: "manual", ...stats }],
    {
      updateOnDuplicate: [
        "minutesPlayed",
        "goals",
        "assists",
        "shotsTotal",
        "shotsOnTarget",
        "yellowCards",
        "redCards",
        "rating",
        "tacklesTotal",
        "keyPasses",
        "interceptions",
        "saves",
        "cleanSheet",
        "goalsConceded",
        "penaltiesSaved",
        "updatedAt",
      ],
    },
  );

  const before = await PlayerSeasonStats.findOne({
    where: { playerId, season },
  });
  const next: Record<string, number> = {
    matchesPlayed: (before?.matchesPlayed ?? 0) + 1,
  };

  for (const [matchField, seasonField] of Object.entries(MATCH_DELTA_MAP)) {
    const raw = (stats as Record<string, unknown>)[matchField];
    const delta = typeof raw === "boolean" ? (raw ? 1 : 0) : Number(raw) || 0;
    if (delta === 0) continue;
    const current = Number(
      (before as unknown as Record<string, unknown>)?.[seasonField] ?? 0,
    );
    next[seasonField] = current + delta;
  }

  const [record] = await PlayerSeasonStats.upsert(
    { playerId, season, ...next, source: "manual" },
    { returning: true, conflictFields: ["player_id", "season"] },
  );

  if (ctx) {
    const changes = buildChanges(before?.toJSON() ?? {}, next);
    logAudit(
      "update",
      "player_season_stats",
      record.id,
      ctx,
      `Match-linked stats update — player ${playerId}, season ${season}, match ${matchId}`,
      changes ?? undefined,
    ).catch(() => null);
  }

  return record;
}

export async function getPlayerStatsHistory(playerId: string) {
  const seasonRows = await PlayerSeasonStats.findAll({
    where: { playerId },
    attributes: ["id"],
  });
  const ids = seasonRows.map((r) => r.id);
  if (ids.length === 0) return [];

  return AuditLog.findAll({
    where: { entity: "player_season_stats", entityId: { [Op.in]: ids } },
    order: [["loggedAt", "DESC"]],
    limit: 100,
  });
}

export async function recomputeFromMatches(
  playerId: string,
  season: string,
  force = false,
) {
  const startYear = parseInt(season.split("-")[0], 10);
  const from = `${startYear}-07-01`;
  const to = `${startYear + 1}-06-30`;

  const existing = await PlayerSeasonStats.findOne({
    where: { playerId, season },
  });
  if (!force && existing?.source === "manual") return;

  const rows = await PlayerMatchStats.findAll({
    where: {
      playerId,
      "$match.match_date$": { [Op.between]: [from, to] },
    },
    include: [{ association: "match", attributes: ["matchDate"] }],
  });

  if (rows.length === 0) return;

  const sum = (field: string) =>
    rows.reduce(
      (acc: number, r) =>
        acc + (Number((r as unknown as Record<string, unknown>)[field]) || 0),
      0,
    );

  await PlayerSeasonStats.upsert({
    playerId,
    season,
    source: "computed",
    matchesPlayed: rows.length,
    minutesPlayed: sum("minutesPlayed"),
    goals: sum("goals"),
    assists: sum("assists"),
    yellowCards: sum("yellowCards"),
    redCards: sum("redCards"),
    passCompletionRate:
      sum("passesTotal") > 0
        ? Math.round((sum("passesCompleted") / sum("passesTotal")) * 100 * 10) /
          10
        : undefined,
    cleanSheets: sum("cleanSheet"),
    savesMade: sum("saves"),
    savePercentage:
      sum("saves") + sum("goalsConceded") > 0
        ? Math.round(
            (sum("saves") / (sum("saves") + sum("goalsConceded"))) * 100 * 10,
          ) / 10
        : undefined,
    penaltiesSaved: sum("penaltiesSaved"),
    goalsConceded: sum("goalsConceded"),
    interceptions: sum("interceptions"),
    keyPasses: sum("keyPasses"),
    shotsOnTarget: sum("shotsOnTarget"),
    shotAccuracy:
      sum("shotsTotal") > 0
        ? Math.round((sum("shotsOnTarget") / sum("shotsTotal")) * 100 * 10) / 10
        : undefined,
  });
}
