import { QueryTypes } from "sequelize";
import { sequelize } from "@config/database";
import { camelCaseKeys } from "@shared/utils/caseTransform";
import { cacheOrFetch, buildCacheKey, CacheTTL } from "@shared/utils/cache";
import { getAssignedPlayerIds } from "@shared/utils/rowScope";
import { getAllPlayerSeasonStats } from "@modules/playerStats/playerStats.service";
import { getPlayerTacticalTrend } from "@modules/tactical/kpis/tacticalKpi.service";
import { AppError } from "@middleware/errorHandler";
import type { AuthUser } from "@shared/types";
import type {
  AssignedPlayerRow,
  RecentMatchStatRow,
  PlayerProfileResponse,
  ComparePlayerRow,
} from "./analyst.types";

const P = "analyst";

export async function listAssignedPlayers(
  user: AuthUser,
): Promise<AssignedPlayerRow[]> {
  const cacheKey = buildCacheKey(`${P}:players`, { userId: user.id });
  return cacheOrFetch(
    cacheKey,
    async () => {
      const assignedPlayerIds = await getAssignedPlayerIds(user);
      if (assignedPlayerIds.length === 0) return [];

      const rows = await sequelize.query<Record<string, unknown>>(
        `SELECT
           p.id, p.first_name, p.last_name, p.first_name_ar, p.last_name_ar,
           p.photo_url, p.position, p.nationality, p.height_cm, p.weight_kg,
           p.date_of_birth,
           tk.overall_tactical_score,
           tk.computed_at AS last_kpi_date
         FROM players p
         LEFT JOIN LATERAL (
           SELECT overall_tactical_score, computed_at
           FROM tactical_kpi_scores
           WHERE player_id = p.id
           ORDER BY computed_at DESC NULLS LAST
           LIMIT 1
         ) tk ON TRUE
         WHERE p.id IN (:playerIds)
         ORDER BY p.last_name ASC, p.first_name ASC`,
        {
          type: QueryTypes.SELECT,
          replacements: { playerIds: assignedPlayerIds },
        },
      );

      return rows.map((r) => camelCaseKeys(r) as unknown as AssignedPlayerRow);
    },
    CacheTTL.SHORT,
  );
}

async function assertAssigned(playerId: string, user: AuthUser): Promise<void> {
  const ids = await getAssignedPlayerIds(user);
  if (!ids.includes(playerId)) {
    throw new AppError("Player not assigned to you", 403);
  }
}

export async function getRecentMatchStats(
  playerId: string,
  user: AuthUser,
  page: number,
  limit: number,
): Promise<{ data: RecentMatchStatRow[]; total: number }> {
  await assertAssigned(playerId, user);

  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey(`${P}:match-stats`, { playerId, page, limit });

  return cacheOrFetch(
    cacheKey,
    async () => {
      const [rows, countRows] = await Promise.all([
        sequelize.query<Record<string, unknown>>(
          `SELECT
             pms.match_id, m.match_date,
             m.home_club_id, m.away_club_id, m.home_score, m.away_score,
             pms.minutes_played, pms.goals, pms.assists,
             pms.shots_total, pms.shots_on_target,
             pms.passes_total, pms.passes_completed,
             pms.tackles_total, pms.interceptions,
             pms.duels_won, pms.duels_total,
             pms.key_passes, pms.xg, pms.xa, pms.progressive_passes,
             pms.yellow_cards, pms.red_cards,
             pms.rating, pms.position_in_match
           FROM player_match_stats pms
           JOIN matches m ON m.id = pms.match_id
           WHERE pms.player_id = :playerId
             AND m.status = 'completed'
           ORDER BY m.match_date DESC
           LIMIT :limit OFFSET :offset`,
          {
            type: QueryTypes.SELECT,
            replacements: { playerId, limit, offset },
          },
        ),
        sequelize.query<Record<string, unknown>>(
          `SELECT COUNT(*) AS total
           FROM player_match_stats pms
           JOIN matches m ON m.id = pms.match_id
           WHERE pms.player_id = :playerId AND m.status = 'completed'`,
          { type: QueryTypes.SELECT, replacements: { playerId } },
        ),
      ]);

      return {
        data: rows.map(
          (r) => camelCaseKeys(r) as unknown as RecentMatchStatRow,
        ),
        total: Number((countRows[0] as Record<string, unknown>)?.total ?? 0),
      };
    },
    CacheTTL.SHORT,
  );
}

export async function getPlayerProfile(
  playerId: string,
  user: AuthUser,
): Promise<PlayerProfileResponse> {
  await assertAssigned(playerId, user);

  const cacheKey = buildCacheKey(`${P}:profile`, { playerId, userId: user.id });

  return cacheOrFetch(
    cacheKey,
    async () => {
      const [
        playerRows,
        recentMatchRows,
        seasonStats,
        kpiTrend,
        evolutionRows,
      ] = await Promise.all([
        sequelize.query<Record<string, unknown>>(
          `SELECT
               p.id, p.first_name, p.last_name, p.first_name_ar, p.last_name_ar,
               p.photo_url, p.position, p.nationality, p.height_cm, p.weight_kg,
               p.date_of_birth,
               tk.overall_tactical_score,
               tk.computed_at AS last_kpi_date
             FROM players p
             LEFT JOIN LATERAL (
               SELECT overall_tactical_score, computed_at
               FROM tactical_kpi_scores
               WHERE player_id = p.id
               ORDER BY computed_at DESC NULLS LAST
               LIMIT 1
             ) tk ON TRUE
             WHERE p.id = :playerId`,
          { type: QueryTypes.SELECT, replacements: { playerId } },
        ),
        sequelize.query<Record<string, unknown>>(
          `SELECT
               pms.match_id, m.match_date,
               m.home_club_id, m.away_club_id, m.home_score, m.away_score,
               pms.minutes_played, pms.goals, pms.assists,
               pms.shots_total, pms.shots_on_target,
               pms.passes_total, pms.passes_completed,
               pms.tackles_total, pms.interceptions,
               pms.duels_won, pms.duels_total,
               pms.key_passes, pms.xg, pms.xa, pms.progressive_passes,
               pms.yellow_cards, pms.red_cards,
               pms.rating, pms.position_in_match
             FROM player_match_stats pms
             JOIN matches m ON m.id = pms.match_id
             WHERE pms.player_id = :playerId AND m.status = 'completed'
             ORDER BY m.match_date DESC
             LIMIT 10`,
          { type: QueryTypes.SELECT, replacements: { playerId } },
        ),
        getAllPlayerSeasonStats(playerId),
        getPlayerTacticalTrend(playerId, 10),
        sequelize.query<Record<string, unknown>>(
          `SELECT *
             FROM evolution_cycles
             WHERE player_id = :playerId AND status = 'Active'
             ORDER BY created_at DESC
             LIMIT 1`,
          { type: QueryTypes.SELECT, replacements: { playerId } },
        ),
      ]);

      if (!playerRows[0]) throw new AppError("Player not found", 404);

      return {
        player: camelCaseKeys(playerRows[0]) as unknown as AssignedPlayerRow,
        recentMatchStats: recentMatchRows.map(
          (r) => camelCaseKeys(r) as unknown as RecentMatchStatRow,
        ),
        seasonStats: seasonStats as unknown as Record<string, unknown>[],
        kpiTrend: kpiTrend as unknown as Record<string, unknown>[],
        activeEvolutionCycle: evolutionRows[0]
          ? (camelCaseKeys(evolutionRows[0]) as Record<string, unknown>)
          : null,
      };
    },
    CacheTTL.SHORT,
  );
}

export async function comparePlayers(
  playerIds: string[],
  user: AuthUser,
  season?: string,
): Promise<ComparePlayerRow[]> {
  const assignedIds = await getAssignedPlayerIds(user);
  const unauthorized = playerIds.filter((id) => !assignedIds.includes(id));
  if (unauthorized.length > 0) {
    throw new AppError("One or more players are not assigned to you", 403);
  }

  const cacheKey = buildCacheKey(`${P}:compare`, {
    playerIds: [...playerIds].sort().join(","),
    season: season ?? "latest",
  });

  return cacheOrFetch(
    cacheKey,
    async () => {
      const seasonFilter = season ? `AND pss.season = :season` : "";

      const rows = await sequelize.query<Record<string, unknown>>(
        `SELECT
           p.id, p.first_name, p.last_name, p.first_name_ar, p.last_name_ar,
           p.photo_url, p.position,
           row_to_json(pss.*) AS season_stats,
           row_to_json(tk.*) AS last_kpi,
           COALESCE(avg_stats.avg_goals, 0) AS avg_goals,
           COALESCE(avg_stats.avg_assists, 0) AS avg_assists,
           COALESCE(avg_stats.avg_rating, 0) AS avg_rating,
           COALESCE(avg_stats.avg_xg, 0) AS avg_xg,
           COALESCE(avg_stats.avg_minutes_played, 0) AS avg_minutes_played,
           COALESCE(avg_stats.match_count, 0) AS match_count
         FROM players p
         LEFT JOIN LATERAL (
           SELECT *
           FROM player_season_stats
           WHERE player_id = p.id
           ${seasonFilter}
           ORDER BY season DESC
           LIMIT 1
         ) pss ON TRUE
         LEFT JOIN LATERAL (
           SELECT *
           FROM tactical_kpi_scores
           WHERE player_id = p.id
           ORDER BY computed_at DESC NULLS LAST
           LIMIT 1
         ) tk ON TRUE
         LEFT JOIN LATERAL (
           SELECT
             AVG(pms.goals)::numeric(5,2) AS avg_goals,
             AVG(pms.assists)::numeric(5,2) AS avg_assists,
             AVG(pms.rating)::numeric(4,1) AS avg_rating,
             AVG(pms.xg)::numeric(5,2) AS avg_xg,
             AVG(pms.minutes_played)::numeric(6,1) AS avg_minutes_played,
             COUNT(*)::int AS match_count
           FROM player_match_stats pms
           JOIN matches m ON m.id = pms.match_id
           WHERE pms.player_id = p.id AND m.status = 'completed'
           ORDER BY m.match_date DESC
           LIMIT 10
         ) avg_stats ON TRUE
         WHERE p.id IN (:playerIds)
         ORDER BY p.last_name ASC`,
        {
          type: QueryTypes.SELECT,
          replacements: { playerIds, ...(season ? { season } : {}) },
        },
      );

      return rows.map((r) => {
        const base = camelCaseKeys(r) as Record<string, unknown>;
        return {
          id: base.id as string,
          firstName: base.firstName as string,
          lastName: base.lastName as string,
          firstNameAr: base.firstNameAr as string | null,
          lastNameAr: base.lastNameAr as string | null,
          photoUrl: base.photoUrl as string | null,
          position: base.position as string | null,
          seasonStats: base.seasonStats as Record<string, unknown> | null,
          lastKpi: base.lastKpi as Record<string, unknown> | null,
          recentMatchAvg: {
            avgGoals: Number(base.avgGoals ?? 0),
            avgAssists: Number(base.avgAssists ?? 0),
            avgRating: Number(base.avgRating ?? 0),
            avgXg: Number(base.avgXg ?? 0),
            avgMinutesPlayed: Number(base.avgMinutesPlayed ?? 0),
            matchCount: Number(base.matchCount ?? 0),
          },
        } satisfies ComparePlayerRow;
      });
    },
    CacheTTL.SHORT,
  );
}
