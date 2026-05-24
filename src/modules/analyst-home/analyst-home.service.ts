import { QueryTypes } from "sequelize";
import { sequelize } from "@config/database";
import type { AuthUser } from "@shared/types";
import { camelCaseKeys } from "@shared/utils/caseTransform";
import { cacheOrFetch, buildCacheKey, CacheTTL } from "@shared/utils/cache";
import { getAssignedPlayerIds } from "@shared/utils/rowScope";
const P = "analyst-home";

interface MatchToAnalyze {
  id: string;
  title: string;
  matchDate: string;
  homeClubId: string | null;
  awayClubId: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

interface PlayerNeedingFollowup {
  id: string;
  firstName: string;
  lastName: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
  photoUrl: string | null;
  position: string | null;
  lastKpiDate: string | null;
}

interface AnalystHomeCounts {
  playersCount: number;
  matchesToAnalyzeCount: number;
  followupCount: number;
}

export async function getAnalystHome(user: AuthUser) {
  const cacheKey = buildCacheKey(P, { userId: user.id });

  return cacheOrFetch(
    cacheKey,
    async () => {
      const assignedPlayerIds = await getAssignedPlayerIds(user);

      if (assignedPlayerIds.length === 0) {
        return {
          matchesToAnalyze: [],
          playersNeedingFollowup: [],
          counts: {
            playersCount: 0,
            matchesToAnalyzeCount: 0,
            followupCount: 0,
          },
        };
      }

      const replacements = { playerIds: assignedPlayerIds };

      const [matchesToAnalyze, playersNeedingFollowup, countRows] =
        await Promise.all([
          sequelize.query<Record<string, unknown>>(
            `SELECT m.id,
                    COALESCE(m.home_team_name, '') || ' vs ' || COALESCE(m.away_team_name, '') AS title,
                    m.match_date,
                    m.home_club_id, m.away_club_id,
                    m.home_score, m.away_score
             FROM matches m
             WHERE m.status = 'completed'
               AND EXISTS (
                 SELECT 1 FROM match_players mp
                 WHERE mp.match_id = m.id AND mp.player_id IN (:playerIds)
               )
               AND NOT EXISTS (
                 SELECT 1 FROM match_analyses ma WHERE ma.match_id = m.id
               )
             ORDER BY m.match_date ASC
             LIMIT 8`,
            { type: QueryTypes.SELECT, replacements },
          ),
          sequelize.query<Record<string, unknown>>(
            `SELECT p.id, p.first_name, p.last_name, p.first_name_ar, p.last_name_ar,
                    p.photo_url, p.position,
                    MAX(tk.computed_at) AS last_kpi_date
             FROM players p
             LEFT JOIN tactical_kpi_scores tk ON tk.player_id = p.id
             WHERE p.id IN (:playerIds)
             GROUP BY p.id
             HAVING MAX(tk.computed_at) IS NULL
                 OR MAX(tk.computed_at) < (CURRENT_DATE - INTERVAL '14 days')
             ORDER BY last_kpi_date ASC NULLS FIRST
             LIMIT 8`,
            { type: QueryTypes.SELECT, replacements },
          ),
          sequelize.query<Record<string, unknown>>(
            `SELECT
               (SELECT COUNT(*) FROM players WHERE id IN (:playerIds)) AS players_count,
               (
                 SELECT COUNT(*) FROM matches m
                 WHERE m.status = 'completed'
                   AND EXISTS (
                     SELECT 1 FROM match_players mp
                     WHERE mp.match_id = m.id AND mp.player_id IN (:playerIds)
                   )
                   AND NOT EXISTS (
                     SELECT 1 FROM match_analyses ma WHERE ma.match_id = m.id
                   )
               ) AS matches_to_analyze_count,
               (
                 SELECT COUNT(*) FROM (
                   SELECT p.id
                   FROM players p
                   LEFT JOIN tactical_kpi_scores tk ON tk.player_id = p.id
                   WHERE p.id IN (:playerIds)
                   GROUP BY p.id
                   HAVING MAX(tk.computed_at) IS NULL
                       OR MAX(tk.computed_at) < (CURRENT_DATE - INTERVAL '14 days')
                 ) sub
               ) AS followup_count`,
            { type: QueryTypes.SELECT, replacements },
          ),
        ]);

      const rawCounts = countRows[0] ?? {};
      const counts: AnalystHomeCounts = {
        playersCount: Number(rawCounts.players_count ?? 0),
        matchesToAnalyzeCount: Number(rawCounts.matches_to_analyze_count ?? 0),
        followupCount: Number(rawCounts.followup_count ?? 0),
      };

      return {
        matchesToAnalyze: matchesToAnalyze.map(
          (r) => camelCaseKeys(r) as unknown as MatchToAnalyze,
        ),
        playersNeedingFollowup: playersNeedingFollowup.map(
          (r) => camelCaseKeys(r) as unknown as PlayerNeedingFollowup,
        ),
        counts,
      };
    },
    CacheTTL.SHORT,
  );
}
