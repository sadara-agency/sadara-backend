import { Op } from "sequelize";
import { sequelize } from "@config/database";
import { QueryTypes } from "sequelize";
import { PositionalBenchmark } from "./matchAnalytics.model";
import { AppError } from "@middleware/errorHandler";
import type {
  KpiDashboardQuery,
  StatTrendQuery,
  BenchmarkCompareQuery,
  SeasonSummaryQuery,
  CreateBenchmarkInput,
  UpdateBenchmarkInput,
  BenchmarkQuery,
} from "./matchAnalytics.validation";

// ── Helpers ──

function safeRate(num: number, den: number): number {
  if (!den || den === 0) return 0;
  return parseFloat(((num / den) * 100).toFixed(1));
}

function seasonWhere(season?: string): string {
  if (!season) return "";
  return `AND m.season = '${season.replace(/'/g, "''")}'`;
}

// ── KPI Dashboard ──

export async function getPlayerKpiDashboard(query: KpiDashboardQuery) {
  const { playerId, season } = query;

  type AggRow = {
    matches_played: string;
    total_minutes: string;
    total_goals: string;
    total_assists: string;
    total_shots: string;
    total_shots_on_target: string;
    total_passes: string;
    total_passes_completed: string;
    total_tackles: string;
    total_interceptions: string;
    total_duels: string;
    total_duels_won: string;
    total_dribbles: string;
    total_dribbles_completed: string;
    total_key_passes: string;
    total_yellow_cards: string;
    total_red_cards: string;
    avg_rating: string;
    total_saves: string;
    total_goals_conceded: string;
  };

  const rows = await sequelize.query<AggRow>(
    `SELECT
       COUNT(DISTINCT pms.match_id)::int          AS matches_played,
       COALESCE(SUM(pms.minutes_played), 0)::int  AS total_minutes,
       COALESCE(SUM(pms.goals), 0)::int           AS total_goals,
       COALESCE(SUM(pms.assists), 0)::int         AS total_assists,
       COALESCE(SUM(pms.shots_total), 0)::int     AS total_shots,
       COALESCE(SUM(pms.shots_on_target), 0)::int AS total_shots_on_target,
       COALESCE(SUM(pms.passes_total), 0)::int    AS total_passes,
       COALESCE(SUM(pms.passes_completed), 0)::int AS total_passes_completed,
       COALESCE(SUM(pms.tackles_total), 0)::int   AS total_tackles,
       COALESCE(SUM(pms.interceptions), 0)::int   AS total_interceptions,
       COALESCE(SUM(pms.duels_total), 0)::int     AS total_duels,
       COALESCE(SUM(pms.duels_won), 0)::int       AS total_duels_won,
       COALESCE(SUM(pms.dribbles_attempted), 0)::int AS total_dribbles,
       COALESCE(SUM(pms.dribbles_completed), 0)::int AS total_dribbles_completed,
       COALESCE(SUM(pms.key_passes), 0)::int      AS total_key_passes,
       COALESCE(SUM(pms.yellow_cards), 0)::int    AS total_yellow_cards,
       COALESCE(SUM(pms.red_cards), 0)::int       AS total_red_cards,
       ROUND(AVG(pms.rating)::numeric, 2)         AS avg_rating,
       COALESCE(SUM(pms.saves), 0)::int           AS total_saves,
       COALESCE(SUM(pms.goals_conceded), 0)::int  AS total_goals_conceded
     FROM player_match_stats pms
     JOIN matches m ON m.id = pms.match_id
     WHERE pms.player_id = :playerId
       AND m.status = 'completed'
       ${seasonWhere(season)}`,
    { replacements: { playerId }, type: QueryTypes.SELECT },
  );

  const r = rows[0];
  const mp = Number(r.matches_played);

  // Derived KPIs
  const passAccuracy = safeRate(
    Number(r.total_passes_completed),
    Number(r.total_passes),
  );
  const shotConversion = safeRate(Number(r.total_goals), Number(r.total_shots));
  const duelWinRate = safeRate(
    Number(r.total_duels_won),
    Number(r.total_duels),
  );
  const dribbleSuccess = safeRate(
    Number(r.total_dribbles_completed),
    Number(r.total_dribbles),
  );

  // Per-90 values (uses actual minutes)
  const per90 = (val: number) =>
    mp > 0 && Number(r.total_minutes) > 0
      ? parseFloat(((val / Number(r.total_minutes)) * 90).toFixed(2))
      : 0;

  return {
    playerId,
    season: season ?? "all",
    matchesPlayed: mp,
    totalMinutes: Number(r.total_minutes),
    totals: {
      goals: Number(r.total_goals),
      assists: Number(r.total_assists),
      shots: Number(r.total_shots),
      shotsOnTarget: Number(r.total_shots_on_target),
      passes: Number(r.total_passes),
      passesCompleted: Number(r.total_passes_completed),
      tackles: Number(r.total_tackles),
      interceptions: Number(r.total_interceptions),
      keyPasses: Number(r.total_key_passes),
      yellowCards: Number(r.total_yellow_cards),
      redCards: Number(r.total_red_cards),
      saves: Number(r.total_saves),
      goalsConceded: Number(r.total_goals_conceded),
    },
    derived: {
      passAccuracy,
      shotConversion,
      duelWinRate,
      dribbleSuccess,
      avgRating: r.avg_rating ? parseFloat(r.avg_rating) : null,
    },
    per90: {
      goals: per90(Number(r.total_goals)),
      assists: per90(Number(r.total_assists)),
      shots: per90(Number(r.total_shots)),
      keyPasses: per90(Number(r.total_key_passes)),
      tackles: per90(Number(r.total_tackles)),
    },
  };
}

// ── Stat Trend ──

export async function getPlayerStatTrend(query: StatTrendQuery) {
  const { playerId, stat, last } = query;

  // Map frontend stat name to DB column (whitelist to prevent SQL injection)
  const STAT_COLUMNS: Record<string, string> = {
    goals: "pms.goals",
    assists: "pms.assists",
    rating: "pms.rating",
    shotsTotal: "pms.shots_total",
    shotsOnTarget: "pms.shots_on_target",
    passesCompleted: "pms.passes_completed",
    passesTotal: "pms.passes_total",
    tackles: "pms.tackles_total",
    interceptions: "pms.interceptions",
    keyPasses: "pms.key_passes",
    duelsWon: "pms.duels_won",
    minutesPlayed: "pms.minutes_played",
    saves: "pms.saves",
  };

  const col = STAT_COLUMNS[stat];
  if (!col) throw new AppError(`Unknown stat: ${stat}`, 422);

  type TrendRow = {
    match_date: string;
    match_id: string;
    value: string;
    opponent: string;
  };

  const rows = await sequelize.query<TrendRow>(
    `SELECT
       m.match_date::text,
       m.id AS match_id,
       COALESCE(${col}, 0)::numeric AS value,
       CASE
         WHEN m.home_club_id = (SELECT current_club_id FROM players WHERE id = :playerId)
           THEN COALESCE(m.away_team_name, 'Away')
         ELSE COALESCE(m.home_team_name, 'Home')
       END AS opponent
     FROM player_match_stats pms
     JOIN matches m ON m.id = pms.match_id
     WHERE pms.player_id = :playerId
       AND m.status = 'completed'
     ORDER BY m.match_date DESC
     LIMIT :last`,
    { replacements: { playerId, last }, type: QueryTypes.SELECT },
  );

  return {
    playerId,
    stat,
    trend: rows.reverse().map((r) => ({
      matchDate: r.match_date,
      matchId: r.match_id,
      value: parseFloat(r.value),
      opponent: r.opponent,
    })),
  };
}

// ── Benchmark Comparison ──

export async function comparePlayerToBenchmark(query: BenchmarkCompareQuery) {
  const { playerId, position, league, season } = query;

  // Get player's per-match averages
  type AvgRow = Record<string, string>;
  const avgs = await sequelize.query<AvgRow>(
    `SELECT
       AVG(pms.goals)::numeric(8,4)                AS goals,
       AVG(pms.assists)::numeric(8,4)              AS assists,
       AVG(pms.rating)::numeric(8,4)               AS rating,
       AVG(pms.passes_completed)::numeric(8,4)     AS passes_completed,
       AVG(pms.tackles_total)::numeric(8,4)        AS tackles,
       AVG(pms.key_passes)::numeric(8,4)           AS key_passes,
       AVG(pms.shots_total)::numeric(8,4)          AS shots_total,
       CASE WHEN AVG(pms.passes_total) > 0
         THEN (AVG(pms.passes_completed) / AVG(pms.passes_total) * 100)::numeric(8,2)
         ELSE 0 END AS pass_accuracy,
       CASE WHEN AVG(pms.duels_total) > 0
         THEN (AVG(pms.duels_won) / AVG(pms.duels_total) * 100)::numeric(8,2)
         ELSE 0 END AS duel_win_rate
     FROM player_match_stats pms
     JOIN matches m ON m.id = pms.match_id
     WHERE pms.player_id = :playerId
       AND m.status = 'completed'
       ${seasonWhere(season)}`,
    { replacements: { playerId }, type: QueryTypes.SELECT },
  );

  const playerAvgs = avgs[0] ?? {};

  // Fetch relevant benchmarks
  const benchmarks = await PositionalBenchmark.findAll({
    where: {
      position,
      league,
      ...(season ? { season } : {}),
    },
  });

  const benchmarkMap = new Map(benchmarks.map((b) => [b.stat, b]));

  const STATS = [
    "goals",
    "assists",
    "rating",
    "passAccuracy",
    "duelWinRate",
    "keyPasses",
    "tackles",
  ];

  const playerStatMap: Record<string, number> = {
    goals: parseFloat(playerAvgs.goals ?? "0"),
    assists: parseFloat(playerAvgs.assists ?? "0"),
    rating: parseFloat(playerAvgs.rating ?? "0"),
    passAccuracy: parseFloat(playerAvgs.pass_accuracy ?? "0"),
    duelWinRate: parseFloat(playerAvgs.duel_win_rate ?? "0"),
    keyPasses: parseFloat(playerAvgs.key_passes ?? "0"),
    tackles: parseFloat(playerAvgs.tackles ?? "0"),
  };

  const comparison = STATS.map((s) => {
    const bench = benchmarkMap.get(s);
    const playerVal = playerStatMap[s] ?? 0;
    let percentile: number | null = null;

    if (bench?.avgValue != null && bench?.p90Value != null) {
      const avg = Number(bench.avgValue);
      const p90 = Number(bench.p90Value);
      if (p90 > avg) {
        percentile = Math.min(
          100,
          Math.round(((playerVal - avg) / (p90 - avg)) * 40 + 50),
        );
      }
    }

    return {
      stat: s,
      playerValue: playerVal,
      benchmarkAvg: bench?.avgValue != null ? Number(bench.avgValue) : null,
      benchmarkP75: bench?.p75Value != null ? Number(bench.p75Value) : null,
      benchmarkP90: bench?.p90Value != null ? Number(bench.p90Value) : null,
      estimatedPercentile: percentile,
    };
  });

  return { playerId, position, league, season: season ?? "all", comparison };
}

// ── Season Summary ──

export async function getSeasonSummary(query: SeasonSummaryQuery) {
  const kpi = await getPlayerKpiDashboard({
    playerId: query.playerId,
    season: query.season,
  });

  type BestMatch = {
    match_date: string;
    opponent: string;
    goals: string;
    assists: string;
    rating: string;
  };
  const best = await sequelize.query<BestMatch>(
    `SELECT
       m.match_date::text,
       CASE WHEN m.home_club_id = (SELECT current_club_id FROM players WHERE id = :playerId)
         THEN COALESCE(m.away_team_name, 'Away')
         ELSE COALESCE(m.home_team_name, 'Home')
       END AS opponent,
       COALESCE(pms.goals, 0)    AS goals,
       COALESCE(pms.assists, 0)  AS assists,
       COALESCE(pms.rating, 0)   AS rating
     FROM player_match_stats pms
     JOIN matches m ON m.id = pms.match_id
     WHERE pms.player_id = :playerId
       AND m.status = 'completed'
       ${seasonWhere(query.season)}
     ORDER BY pms.rating DESC NULLS LAST
     LIMIT 5`,
    { replacements: { playerId: query.playerId }, type: QueryTypes.SELECT },
  );

  return {
    ...kpi,
    topPerformances: best.map((r) => ({
      matchDate: r.match_date,
      opponent: r.opponent,
      goals: Number(r.goals),
      assists: Number(r.assists),
      rating: Number(r.rating),
    })),
  };
}

// ── Benchmark CRUD ──

export async function listBenchmarks(query: BenchmarkQuery) {
  const where: Record<string, unknown> = {};
  if (query.position) where.position = query.position;
  if (query.league) where.league = query.league;
  if (query.season) where.season = query.season;

  const offset = (query.page - 1) * query.limit;
  const { rows, count } = await PositionalBenchmark.findAndCountAll({
    where,
    order: [
      ["position", "ASC"],
      ["stat", "ASC"],
    ],
    limit: query.limit,
    offset,
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

export async function upsertBenchmark(
  body: CreateBenchmarkInput,
  userId: string,
) {
  const [record] = await PositionalBenchmark.findOrCreate({
    where: {
      position: body.position,
      league: body.league,
      season: body.season,
      stat: body.stat,
    },
    defaults: { ...body, createdBy: userId },
  });
  if (record.createdAt !== record.updatedAt) {
    await record.update({ ...body });
  }
  return record;
}

export async function deleteBenchmark(id: string) {
  const record = await PositionalBenchmark.findByPk(id);
  if (!record) throw new AppError("Benchmark not found", 404);
  await record.destroy();
  return { id };
}
