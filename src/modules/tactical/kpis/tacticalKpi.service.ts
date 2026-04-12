import { sequelize } from "@config/database";
import { QueryTypes } from "sequelize";
import { TacticalKpi } from "./tacticalKpi.model";
import { Player } from "@modules/players/player.model";
import { Match } from "@modules/matches/match.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import type {
  CreateTacticalKpiInput,
  UpdateTacticalKpiInput,
  TacticalKpiQuery,
} from "./tacticalKpi.validation";

const PLAYER_ATTRS = [
  "id",
  "firstName",
  "lastName",
  "firstNameAr",
  "lastNameAr",
  "position",
  "photoUrl",
] as const;
const USER_ATTRS = ["id", "fullName", "fullNameAr"] as const;

function kpiIncludes() {
  return [
    { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
    {
      model: Match,
      as: "match",
      attributes: [
        "id",
        "matchDate",
        "homeTeamName",
        "awayTeamName",
        "homeScore",
        "awayScore",
        "season",
      ],
    },
  ];
}

function round2(n: number): number {
  return parseFloat(n.toFixed(2));
}

function per90(value: number, minutes: number): number {
  if (!minutes || minutes === 0) return 0;
  return round2((value / minutes) * 90);
}

// ── List ──

export async function listTacticalKpis(query: TacticalKpiQuery) {
  const where: Record<string, unknown> = {};
  if (query.playerId) where.playerId = query.playerId;
  if (query.matchId) where.matchId = query.matchId;

  const offset = (query.page - 1) * query.limit;
  const { rows, count } = await TacticalKpi.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit: query.limit,
    offset,
    include: kpiIncludes(),
    distinct: true,
  });

  return {
    data: rows,
    meta: {
      total: count,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(count / query.limit),
    },
  };
}

// ── Get by ID ──

export async function getTacticalKpiById(id: string) {
  const record = await TacticalKpi.findByPk(id, { include: kpiIncludes() });
  if (!record) throw new AppError("Tactical KPI record not found", 404);
  return record;
}

// ── Get by Player+Match ──

export async function getTacticalKpiByMatch(playerId: string, matchId: string) {
  return TacticalKpi.findOne({
    where: { playerId, matchId },
    include: kpiIncludes(),
  });
}

// ── Create (manual) ──

export async function createTacticalKpi(
  body: CreateTacticalKpiInput,
  userId: string,
) {
  const existing = await TacticalKpi.findOne({
    where: { playerId: body.playerId, matchId: body.matchId },
  });
  if (existing)
    throw new AppError(
      "Tactical KPI record already exists for this player/match. Use update.",
      409,
    );

  const record = await TacticalKpi.create({
    ...body,
    rawData: body.rawData ?? {},
    computedAt: new Date(),
    createdBy: userId,
  });
  return getTacticalKpiById(record.id);
}

// ── Update ──

export async function updateTacticalKpi(
  id: string,
  body: UpdateTacticalKpiInput,
) {
  const record = await TacticalKpi.findByPk(id);
  if (!record) throw new AppError("Tactical KPI record not found", 404);
  await record.update({ ...body, computedAt: new Date() });
  return getTacticalKpiById(id);
}

// ── Delete ──

export async function deleteTacticalKpi(id: string) {
  const record = await TacticalKpi.findByPk(id);
  if (!record) throw new AppError("Tactical KPI record not found", 404);
  await record.destroy();
  return { id };
}

// ── Compute from player_match_stats ──

export async function computeTacticalKpis(
  playerId: string,
  matchId: string,
  userId: string,
) {
  type StatsRow = {
    minutes_played: string;
    goals: string;
    assists: string;
    shots_total: string;
    passes_total: string;
    passes_completed: string;
    tackles_total: string;
    interceptions: string;
    duels_won: string;
    duels_total: string;
    dribbles_completed: string;
    dribbles_attempted: string;
    key_passes: string;
  };

  const rows = await sequelize.query<StatsRow>(
    `SELECT
       COALESCE(minutes_played, 0)::int          AS minutes_played,
       COALESCE(goals, 0)::int                   AS goals,
       COALESCE(assists, 0)::int                 AS assists,
       COALESCE(shots_total, 0)::int             AS shots_total,
       COALESCE(passes_total, 0)::int            AS passes_total,
       COALESCE(passes_completed, 0)::int        AS passes_completed,
       COALESCE(tackles_total, 0)::int           AS tackles_total,
       COALESCE(interceptions, 0)::int           AS interceptions,
       COALESCE(duels_won, 0)::int               AS duels_won,
       COALESCE(duels_total, 0)::int             AS duels_total,
       COALESCE(dribbles_completed, 0)::int      AS dribbles_completed,
       COALESCE(dribbles_attempted, 0)::int      AS dribbles_attempted,
       COALESCE(key_passes, 0)::int              AS key_passes
     FROM player_match_stats
     WHERE player_id = :playerId AND match_id = :matchId
     LIMIT 1`,
    { replacements: { playerId, matchId }, type: QueryTypes.SELECT },
  );

  if (!rows.length)
    throw new AppError(
      "No match stats found for this player/match combination",
      404,
    );

  const s = rows[0];
  const minutes = Number(s.minutes_played) || 1;
  const goals = Number(s.goals);
  const passesTotal = Number(s.passes_total);
  const passesCompleted = Number(s.passes_completed);
  const tackles = Number(s.tackles_total);
  const interceptions = Number(s.interceptions);
  const duelsWon = Number(s.duels_won);
  const duelsTotal = Number(s.duels_total);
  const keyPasses = Number(s.key_passes);

  // Compute tactical metrics
  const pressIntensity = per90(tackles + interceptions, minutes);
  const progressivePassRate =
    passesTotal > 0 ? round2((passesCompleted / passesTotal) * 100) : 0;
  const chancesCreatedPer90 = per90(keyPasses, minutes);
  const xgContribution = round2(goals + keyPasses * 0.25);
  const counterPressSuccess =
    duelsTotal > 0 ? round2((duelsWon / duelsTotal) * 100) : 0;
  const buildUpInvolvement = per90(passesTotal, minutes);

  // Weighted composite (0-100)
  const overallTacticalScore = round2(
    Math.min(
      100,
      pressIntensity * 2 +
        progressivePassRate * 0.2 +
        chancesCreatedPer90 * 5 +
        counterPressSuccess * 0.3 +
        buildUpInvolvement * 1,
    ),
  );

  const kpiData = {
    pressIntensity,
    progressivePassRate,
    chancesCreatedPer90,
    xgContribution,
    counterPressSuccess,
    buildUpInvolvement,
    overallTacticalScore,
    defensiveContributionPct: null, // Requires team data — set manually
    territorialControl: null, // Requires event data — set manually
    computedBy: "system" as const,
    computedAt: new Date(),
    rawData: { source: "player_match_stats", stats: s },
  };

  const existing = await TacticalKpi.findOne({ where: { playerId, matchId } });
  if (existing) {
    await existing.update(kpiData);
    return getTacticalKpiById(existing.id);
  }

  const record = await TacticalKpi.create({
    playerId,
    matchId,
    createdBy: userId,
    ...kpiData,
  });
  return getTacticalKpiById(record.id);
}

// ── Player trend (last N matches) ──

export async function getPlayerTacticalTrend(playerId: string, lastN = 10) {
  const records = await TacticalKpi.findAll({
    where: { playerId },
    order: [["createdAt", "DESC"]],
    limit: lastN,
    include: [
      {
        model: Match,
        as: "match",
        attributes: ["id", "matchDate", "homeTeamName", "awayTeamName"],
      },
    ],
  });
  return records.reverse();
}
