import { Op } from "sequelize";
import PlayerSeasonStats from "./playerStats.model";
import { PlayerMatchStats } from "@modules/matches/playerMatchStats.model";
import { AppError } from "@middleware/errorHandler";
import type { UpsertPlayerSeasonStatsDTO } from "./playerStats.validation";

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
) {
  const [record] = await PlayerSeasonStats.upsert(
    { playerId, season, ...data, source: "manual" },
    { returning: true },
  );
  return record;
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
