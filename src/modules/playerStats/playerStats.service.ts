import { Op } from "sequelize";
import { sequelize } from "@config/database";
import PlayerSeasonStats from "./playerStats.model";
import PlayerStatEdit from "./playerStatEdit.model";
import { STAT_FIELD_KINDS, isEditableStatField } from "./playerStats.fields";
import { PlayerMatchStats } from "@modules/matches/playerMatchStats.model";
import { MatchPlayer } from "@modules/matches/matchPlayer.model";
import { Match } from "@modules/matches/match.model";
import { User } from "@modules/users/user.model";
import { AuditLog } from "@modules/audit/AuditLog.model";
import { AppError } from "@middleware/errorHandler";
import { logAudit, buildChanges } from "@shared/utils/audit";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import type { AuditContext } from "@shared/types";
import type {
  UpsertPlayerSeasonStatsDTO,
  ApplyMatchToSeasonDTO,
  SeasonStatsEditDTO,
  EditHistoryQueryDTO,
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
    { returning: true },
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

/**
 * Accountable season-stats edit. Validates each changed field against the canonical
 * field map (needs the stored value for the lower-than-current rule), then writes the
 * season row AND one immutable player_stat_edits row per changed field in a single
 * transaction. Returns the updated season row.
 *
 * Throws AppError(400) with field-level `errorDetail` on any validation failure —
 * user-input issues never surface as 500.
 */
export async function applySeasonStatsEdit(
  playerId: string,
  season: string,
  body: SeasonStatsEditDTO,
  ctx?: AuditContext,
) {
  const { changes, matchId, justification, isCorrection } = body;

  const before = await PlayerSeasonStats.findOne({
    where: { playerId, season },
  });

  const errors: { field: string; message: string }[] = [];

  for (const [field, rawValue] of Object.entries(changes)) {
    if (!isEditableStatField(field)) {
      errors.push({ field, message: "Unknown stat field" });
      continue;
    }
    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      errors.push({ field, message: "Value must be a number" });
      continue;
    }
    const kind = STAT_FIELD_KINDS[field];

    if (kind === "percentage" && (value < 0 || value > 100)) {
      errors.push({ field, message: "Percentage must be between 0 and 100" });
      continue;
    }
    if ((kind === "counter" || kind === "rate") && value < 0) {
      errors.push({ field, message: "Value cannot be negative" });
      continue;
    }
    if (kind === "counter") {
      const current = Number(
        (before as unknown as Record<string, unknown>)?.[field] ?? 0,
      );
      if (
        value < current &&
        !(isCorrection && justification.trim().length >= 30)
      ) {
        errors.push({
          field,
          message:
            "Value is lower than the current value. Mark this as a correction with a justification of at least 30 characters.",
        });
      }
    }
  }

  // Match-ownership: the match must exist and the player must be in its lineup.
  if (matchId) {
    const matchRow = await Match.findByPk(matchId, { attributes: ["id"] });
    if (!matchRow) {
      errors.push({ field: "matchId", message: "Match not found" });
    } else {
      const link = await MatchPlayer.findOne({
        where: { matchId, playerId },
        attributes: ["id"],
      });
      if (!link) {
        errors.push({
          field: "matchId",
          message: "Match does not belong to this player",
        });
      }
    }
  }

  if (errors.length > 0) {
    const err = new AppError("Validation failed", 400);
    err.errorDetail = errors;
    throw err;
  }

  try {
    return await sequelize.transaction(async (t) => {
      // Sequelize upsert uses ON CONFLICT (pk) which breaks on a secondary unique
      // index. Use findOrCreate + update instead so the (player_id, season) unique
      // constraint is respected correctly.
      const [row] = await PlayerSeasonStats.findOrCreate({
        where: { playerId, season },
        defaults: { playerId, season, ...changes, source: "manual" },
        transaction: t,
      });
      await row.update({ ...changes, source: "manual" }, { transaction: t });
      const record = row;

      const editRows = Object.entries(changes).map(([field, rawValue]) => {
        const beforeVal =
          before == null
            ? null
            : (() => {
                const v = (before as unknown as Record<string, unknown>)[field];
                return v == null ? null : Number(v);
              })();
        const afterVal = Number(rawValue);
        return {
          playerId,
          season,
          matchId: matchId ?? null,
          analystId: ctx?.userId ?? null,
          fieldName: field,
          beforeValue: beforeVal,
          afterValue: afterVal,
          delta: beforeVal == null ? afterVal : afterVal - beforeVal,
          justification: justification.trim(),
          isCorrection,
          ipAddress: ctx?.ip ?? null,
        };
      });
      await PlayerStatEdit.bulkCreate(editRows, { transaction: t });

      if (ctx) {
        const auditChanges = buildChanges(before?.toJSON() ?? {}, {
          ...changes,
        });
        logAudit(
          "update",
          "player_season_stats",
          record.id,
          ctx,
          `Season stats edit — player ${playerId}, season ${season}${
            matchId ? `, match ${matchId}` : ""
          }${isCorrection ? " (correction)" : ""}`,
          auditChanges ?? undefined,
        ).catch(() => null);
      }

      return record;
    });
  } catch (e) {
    if (e instanceof AppError) throw e;
    const name = (e as { name?: string })?.name;
    if (
      name === "SequelizeValidationError" ||
      name === "SequelizeDatabaseError" ||
      name === "SequelizeUniqueConstraintError"
    ) {
      const err = new AppError("Could not save stats", 400);
      err.errorDetail = [{ field: "changes", message: (e as Error).message }];
      throw err;
    }
    throw e;
  }
}

/** Paginated, filterable edit history over the immutable player_stat_edits table. */
export async function getStatEditHistory(
  playerId: string,
  season: string,
  query: EditHistoryQueryDTO,
) {
  const { limit, offset, page } = parsePagination(query, "createdAt");

  const where: Record<string, unknown> = { playerId, season };
  if (query.fieldName) where.fieldName = query.fieldName;
  if (query.matchId) where.matchId = query.matchId;
  if (typeof query.isCorrection === "boolean")
    where.isCorrection = query.isCorrection;

  const { count, rows } = await PlayerStatEdit.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
  });

  // Resolve analyst display names without relying on a registered association.
  const analystIds = [
    ...new Set(rows.map((r) => r.analystId).filter((id): id is string => !!id)),
  ];
  const analysts = analystIds.length
    ? await User.findAll({
        where: { id: { [Op.in]: analystIds } },
        attributes: ["id", "fullName", "fullNameAr"],
      })
    : [];
  const nameById = new Map(
    analysts.map((u) => [u.id, { en: u.fullName, ar: u.fullNameAr }]),
  );

  const data = rows.map((r) => {
    const j = r.toJSON() as unknown as Record<string, unknown>;
    return {
      ...j,
      beforeValue: j.beforeValue == null ? null : Number(j.beforeValue),
      afterValue: j.afterValue == null ? null : Number(j.afterValue),
      delta: j.delta == null ? null : Number(j.delta),
      analystName: r.analystId ? (nameById.get(r.analystId)?.en ?? null) : null,
      analystNameAr: r.analystId
        ? (nameById.get(r.analystId)?.ar ?? null)
        : null,
    };
  });

  return { data, meta: buildMeta(count, page, limit) };
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
    { returning: true },
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
