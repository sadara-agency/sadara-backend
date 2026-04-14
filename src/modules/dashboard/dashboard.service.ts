import { QueryTypes } from "sequelize";
import { sequelize } from "@config/database";
import type { UserRole } from "@shared/types";
import { camelCaseKeys } from "@shared/utils/caseTransform";
import {
  cacheOrFetch,
  buildCacheKey,
  CacheTTL,
  CachePrefix,
} from "@shared/utils/cache";

const P = CachePrefix.DASHBOARD;

/**
 * Roles that see ALL upcoming matches on the dashboard. Matches are not
 * privacy-sensitive — finance/legal/media need full visibility for their
 * cross-functional oversight.
 */
const MATCH_VIEW_ALL_ROLES: UserRole[] = [
  "Admin",
  "Manager",
  "Executive",
  "Finance",
  "Legal",
  "Media",
];

/**
 * Roles that bypass task scoping on the dashboard widget.
 * Matches the central `BYPASS_ROLES` in `@shared/utils/rowScope` so that
 * the dashboard urgent-tasks widget stays consistent with the raw /tasks
 * endpoint. Finance/Legal/Media fall through to the role-scoped branch
 * and see only their own assigned tasks.
 */
const TASK_BYPASS_ROLES: UserRole[] = ["Admin", "Manager", "Executive"];

/** Main KPI counters from the dashboard view. */
export async function getKpis() {
  return cacheOrFetch(
    `${P}:kpis`,
    async () => {
      const result = await sequelize.query("SELECT * FROM vw_dashboard_kpis", {
        type: QueryTypes.SELECT,
      });
      return result[0] ?? {};
    },
    CacheTTL.SHORT,
  );
}

/** Smart alerts: expiring contracts, overdue payments, injury conflicts, referrals. */
export async function getAlerts() {
  return cacheOrFetch(
    `${P}:alerts`,
    async () => {
      const [
        expiringContracts,
        overduePayments,
        injuryConflicts,
        openReferrals,
      ] = await Promise.all([
        sequelize.query(
          `SELECT vc.*, COALESCE(p.first_name_ar, '') || ' ' || COALESCE(p.last_name_ar, '') AS player_name_ar
           FROM vw_expiring_contracts vc
           JOIN contracts c ON vc.contract_id = c.id
           JOIN players p ON c.player_id = p.id
           LIMIT 5`,
          { type: QueryTypes.SELECT },
        ),
        sequelize.query(
          `SELECT vp.*, COALESCE(p.first_name_ar, '') || ' ' || COALESCE(p.last_name_ar, '') AS player_name_ar
           FROM vw_overdue_payments vp
           LEFT JOIN payments py ON vp.payment_id = py.id
           LEFT JOIN players p ON py.player_id = p.id
           LIMIT 5`,
          { type: QueryTypes.SELECT },
        ),
        sequelize.query(
          `SELECT vi.*,
                  COALESCE(p.first_name_ar, '') || ' ' || COALESCE(p.last_name_ar, '') AS player_name_ar,
                  hc.name_ar AS home_team_ar, ac.name_ar AS away_team_ar
           FROM vw_injury_match_conflicts vi
           JOIN match_players mp2 ON mp2.match_id = vi.match_id AND mp2.availability = 'injured'
           JOIN players p ON mp2.player_id = p.id
           LEFT JOIN matches m ON vi.match_id = m.id
           LEFT JOIN clubs hc ON m.home_club_id = hc.id
           LEFT JOIN clubs ac ON m.away_club_id = ac.id
           LIMIT 5`,
          { type: QueryTypes.SELECT },
        ),
        sequelize.query(
          `SELECT r.*,
                  p.first_name || ' ' || p.last_name AS player_name,
                  COALESCE(p.first_name_ar, '') || ' ' || COALESCE(p.last_name_ar, '') AS player_name_ar
             FROM referrals r
             JOIN players p ON r.player_id = p.id
             WHERE r.status IN ('Open', 'InProgress')
             ORDER BY r.created_at DESC LIMIT 5`,
          { type: QueryTypes.SELECT },
        ),
      ]);

      return {
        expiringContracts,
        overduePayments,
        injuryConflicts,
        openReferrals,
      };
    },
    CacheTTL.SHORT,
  );
}

/** Today's matches, due tasks, and due payments. Uses CURRENT_DATE to avoid timezone issues. */
export async function getTodayOverview() {
  return cacheOrFetch(
    `${P}:today`,
    async () => {
      const [matches, tasks, payments] = await Promise.all([
        sequelize.query(
          `SELECT m.*, hc.name AS home_team, ac.name AS away_team
           FROM matches m
           LEFT JOIN clubs hc ON m.home_club_id = hc.id
           LEFT JOIN clubs ac ON m.away_club_id = ac.id
           WHERE DATE(m.match_date) = CURRENT_DATE
           ORDER BY m.match_date`,
          { type: QueryTypes.SELECT },
        ),
        sequelize.query(
          `SELECT t.*, p.first_name || ' ' || p.last_name AS player_name,
                  u.full_name AS assigned_to_name
           FROM tasks t
           LEFT JOIN players p ON t.player_id = p.id
           LEFT JOIN users u ON t.assigned_to = u.id
           WHERE t.due_date = CURRENT_DATE AND t.status != 'Completed'
           ORDER BY CASE t.priority
             WHEN 'critical' THEN 0 WHEN 'high' THEN 1
             WHEN 'medium' THEN 2 ELSE 3 END`,
          { type: QueryTypes.SELECT },
        ),
        sequelize.query(
          `SELECT py.*, p.first_name || ' ' || p.last_name AS player_name
           FROM payments py
           LEFT JOIN players p ON py.player_id = p.id
           WHERE py.due_date = CURRENT_DATE AND py.status != 'Paid'
           ORDER BY py.amount DESC`,
          { type: QueryTypes.SELECT },
        ),
      ]);

      return { matches, tasks, payments };
    },
    CacheTTL.SHORT,
  );
}

/** Top players ranked by market value with club, risk, and trend data. */
export async function getTopPlayers(limit = 5) {
  return cacheOrFetch(
    buildCacheKey(`${P}:top-players`, { limit }),
    async () => {
      const rows = await sequelize.query<Record<string, unknown>>(
        `SELECT
           p.id,
           p.first_name,
           p.last_name,
           COALESCE(p.first_name_ar, '') || ' ' || COALESCE(p.last_name_ar, '') AS full_name_ar,
           p.first_name || ' ' || p.last_name AS full_name,
           p.position,
           p.player_type,
           p.market_value,
           p.photo_url,
           c.name AS club_name,
           c.name_ar AS club_name_ar,
           c.logo_url AS club_logo_url,
           rr.overall_risk,
           perf_agg.avg_rating,
           val_latest.trend AS value_trend
         FROM players p
         LEFT JOIN clubs c ON p.current_club_id = c.id
         LEFT JOIN risk_radars rr ON rr.player_id = p.id
         LEFT JOIN LATERAL (
           SELECT ROUND(AVG(perf.average_rating), 1) AS avg_rating
           FROM performances perf WHERE perf.player_id = p.id
         ) perf_agg ON true
         LEFT JOIN LATERAL (
           SELECT v.trend FROM valuations v
           WHERE v.player_id = p.id
           ORDER BY v.valued_at DESC LIMIT 1
         ) val_latest ON true
         WHERE p.status = 'active'
         ORDER BY p.market_value DESC NULLS LAST
         LIMIT $1`,
        { bind: [limit], type: QueryTypes.SELECT },
      );
      return rows.map(camelCaseKeys);
    },
    CacheTTL.MEDIUM,
  );
}

/** Contract count grouped by status (for pie chart). */
export async function getContractStatusDistribution() {
  return cacheOrFetch(
    `${P}:contract-status`,
    () =>
      sequelize.query(
        `SELECT status, COUNT(*)::INT AS count
         FROM contracts
         GROUP BY status
         ORDER BY count DESC`,
        { type: QueryTypes.SELECT },
      ),
    CacheTTL.MEDIUM,
  );
}

/** Active player count grouped by contract type: Professional / Amateur / Youth. */
export async function getPlayerDistribution() {
  return cacheOrFetch(
    `${P}:player-dist`,
    () =>
      sequelize.query(
        `SELECT contract_type AS player_type, COUNT(*)::INT AS count
         FROM players
         WHERE status = 'active'
         GROUP BY contract_type`,
        { type: QueryTypes.SELECT },
      ),
    CacheTTL.MEDIUM,
  );
}

/** Most recent offers with player and club names. */
export async function getRecentOffers(limit = 5) {
  return cacheOrFetch(
    buildCacheKey(`${P}:offers`, { limit }),
    () =>
      sequelize.query(
        `SELECT
           o.id, o.offer_type, o.status, o.transfer_fee,
           o.fee_currency, o.deadline, o.created_at,
           p.first_name || ' ' || p.last_name AS player_name,
           COALESCE(p.first_name_ar, '') || ' ' || COALESCE(p.last_name_ar, '') AS player_name_ar,
           fc.name AS from_club,
           tc.name AS to_club
         FROM offers o
         JOIN players p ON o.player_id = p.id
         LEFT JOIN clubs fc ON o.from_club_id = fc.id
         LEFT JOIN clubs tc ON o.to_club_id = tc.id
         ORDER BY o.created_at DESC
         LIMIT $1`,
        { bind: [limit], type: QueryTypes.SELECT },
      ),
    CacheTTL.SHORT,
  );
}

/** Upcoming matches with managed player count per match (role-filtered). */
export async function getUpcomingMatches(
  limit = 5,
  userId?: string,
  userRole?: UserRole,
  playerId?: string | null,
) {
  const cacheKey = buildCacheKey(`${P}:matches`, {
    limit,
    userId,
    userRole,
    playerId,
  });

  return cacheOrFetch(
    cacheKey,
    async () => {
      // Match-view-all roles — see all matches
      if (!userId || !userRole || MATCH_VIEW_ALL_ROLES.includes(userRole)) {
        return sequelize.query(
          `SELECT
             m.id, m.match_date, m.venue, m.competition, m.status,
             hc.name AS home_team, hc.name_ar AS home_team_ar,
             ac.name AS away_team, ac.name_ar AS away_team_ar,
             (SELECT COUNT(*) FROM match_players mp WHERE mp.match_id = m.id) AS managed_players
           FROM matches m
           LEFT JOIN clubs hc ON m.home_club_id = hc.id
           LEFT JOIN clubs ac ON m.away_club_id = ac.id
           WHERE m.status = 'upcoming' AND m.match_date >= NOW()
           ORDER BY m.match_date ASC
           LIMIT $1`,
          { bind: [limit], type: QueryTypes.SELECT },
        );
      }

      // Player role — only matches they participate in
      if (userRole === "Player" && playerId) {
        return sequelize.query(
          `SELECT DISTINCT ON (m.id)
             m.id, m.match_date, m.venue, m.competition, m.status,
             hc.name AS home_team, hc.name_ar AS home_team_ar,
             ac.name AS away_team, ac.name_ar AS away_team_ar,
             1 AS managed_players
           FROM matches m
           LEFT JOIN clubs hc ON m.home_club_id = hc.id
           LEFT JOIN clubs ac ON m.away_club_id = ac.id
           INNER JOIN match_players mp ON m.id = mp.match_id
           WHERE m.status = 'upcoming' AND m.match_date >= NOW()
             AND mp.player_id = $2
           ORDER BY m.id, m.match_date ASC
           LIMIT $1`,
          { bind: [limit, playerId], type: QueryTypes.SELECT },
        );
      }

      // Coach / Analyst / Scout / Agent — matches involving their assigned players
      return sequelize.query(
        `SELECT DISTINCT ON (m.id)
           m.id, m.match_date, m.venue, m.competition, m.status,
           hc.name AS home_team, hc.name_ar AS home_team_ar,
           ac.name AS away_team, ac.name_ar AS away_team_ar,
           (SELECT COUNT(*) FROM match_players mp2
            JOIN players p2 ON mp2.player_id = p2.id
            WHERE mp2.match_id = m.id
              AND (p2.agent_id = $2 OR p2.coach_id = $2 OR p2.analyst_id = $2)
           ) AS managed_players
         FROM matches m
         LEFT JOIN clubs hc ON m.home_club_id = hc.id
         LEFT JOIN clubs ac ON m.away_club_id = ac.id
         INNER JOIN match_players mp ON m.id = mp.match_id
         INNER JOIN players p ON mp.player_id = p.id
         WHERE m.status = 'upcoming' AND m.match_date >= NOW()
           AND (p.agent_id = $2 OR p.coach_id = $2 OR p.analyst_id = $2)
         ORDER BY m.id, m.match_date ASC
         LIMIT $1`,
        { bind: [limit, userId], type: QueryTypes.SELECT },
      );
    },
    CacheTTL.SHORT,
  );
}

/** Non-completed tasks sorted by priority (critical first, role-filtered). */
export async function getUrgentTasks(
  limit = 5,
  userId?: string,
  userRole?: UserRole,
  playerId?: string | null,
) {
  const cacheKey = buildCacheKey(`${P}:tasks`, {
    limit,
    userId,
    userRole,
    playerId,
  });

  return cacheOrFetch(
    cacheKey,
    async () => {
      // Task-bypass roles (Admin/Manager/Executive) — see all tasks
      if (!userId || !userRole || TASK_BYPASS_ROLES.includes(userRole)) {
        return sequelize.query(
          `SELECT
             t.id, t.title, t.title_ar, t.type, t.priority, t.status, t.due_date,
             p.first_name || ' ' || p.last_name AS player_name,
             u.full_name AS assigned_to_name
           FROM tasks t
           LEFT JOIN players p ON t.player_id = p.id
           LEFT JOIN users u ON t.assigned_to = u.id
           WHERE t.status != 'Completed'
           ORDER BY CASE t.priority
             WHEN 'critical' THEN 0 WHEN 'high' THEN 1
             WHEN 'medium' THEN 2 ELSE 3 END,
             t.due_date ASC NULLS LAST
           LIMIT $1`,
          { bind: [limit], type: QueryTypes.SELECT },
        );
      }

      // Player role — only tasks assigned to them or about their player profile
      if (userRole === "Player" && playerId) {
        return sequelize.query(
          `SELECT
             t.id, t.title, t.title_ar, t.type, t.priority, t.status, t.due_date,
             p.first_name || ' ' || p.last_name AS player_name,
             u.full_name AS assigned_to_name
           FROM tasks t
           LEFT JOIN players p ON t.player_id = p.id
           LEFT JOIN users u ON t.assigned_to = u.id
           WHERE t.status != 'Completed'
             AND (t.assigned_to = $2 OR t.player_id = $3)
           ORDER BY CASE t.priority
             WHEN 'critical' THEN 0 WHEN 'high' THEN 1
             WHEN 'medium' THEN 2 ELSE 3 END,
             t.due_date ASC NULLS LAST
           LIMIT $1`,
          { bind: [limit, userId, playerId], type: QueryTypes.SELECT },
        );
      }

      // Coach / Analyst / Scout / Agent — tasks for their assigned players or assigned to them
      return sequelize.query(
        `SELECT
           t.id, t.title, t.title_ar, t.type, t.priority, t.status, t.due_date,
           p.first_name || ' ' || p.last_name AS player_name,
           u.full_name AS assigned_to_name
         FROM tasks t
         LEFT JOIN players p ON t.player_id = p.id
         LEFT JOIN users u ON t.assigned_to = u.id
         WHERE t.status != 'Completed'
           AND (t.assigned_to = $2 OR t.player_id IS NULL OR t.player_id IN (
             SELECT id FROM players WHERE agent_id = $2 OR coach_id = $2 OR analyst_id = $2
           ))
         ORDER BY CASE t.priority
           WHEN 'critical' THEN 0 WHEN 'high' THEN 1
           WHEN 'medium' THEN 2 ELSE 3 END,
           t.due_date ASC NULLS LAST
         LIMIT $1`,
        { bind: [limit, userId], type: QueryTypes.SELECT },
      );
    },
    CacheTTL.SHORT,
  );
}

/**
 * Monthly revenue & commission for charts.
 *
 * FIX: The old code string-interpolated `months` directly into
 * the SQL query (`INTERVAL '${months} months'`), which is a
 * SQL injection vector. Now we use `make_interval(months => $1)`
 * with a parameterized bind.
 */
export async function getRevenueChart(months = 12) {
  return cacheOrFetch(
    buildCacheKey(`${P}:revenue`, { months }),
    () =>
      sequelize.query(
        `SELECT
           TO_CHAR(DATE_TRUNC('month', py.paid_date), 'YYYY-MM') AS month,
           SUM(py.amount)::NUMERIC AS revenue,
           SUM(CASE WHEN py.payment_type = 'Commission' THEN py.amount ELSE 0 END)::NUMERIC AS commission
         FROM payments py
         WHERE py.status = 'Paid'
           AND py.paid_date >= DATE_TRUNC('month', NOW()) - make_interval(months => $1)
         GROUP BY DATE_TRUNC('month', py.paid_date)
         ORDER BY month ASC`,
        { bind: [months], type: QueryTypes.SELECT },
      ),
    CacheTTL.MEDIUM,
  );
}

/** Average performance metrics across all active players (for radar chart). */
export async function getPerformanceAverages() {
  return cacheOrFetch(
    `${P}:perf-avg`,
    () =>
      sequelize.query(
        `SELECT
           ROUND(AVG(perf.average_rating), 1) AS avg_rating,
           ROUND(AVG(perf.goals), 1) AS avg_goals,
           ROUND(AVG(perf.assists), 1) AS avg_assists,
           ROUND(AVG(perf.key_passes), 1) AS avg_passes,
           ROUND(AVG(perf.successful_dribbles), 1) AS avg_dribbles,
           ROUND(AVG(perf.minutes), 0) AS avg_minutes
         FROM performances perf
         JOIN players p ON perf.player_id = p.id
         WHERE p.status = 'active'`,
        { type: QueryTypes.SELECT },
      ),
    CacheTTL.MEDIUM,
  );
}

/** Recent audit log entries with user names. */
export async function getRecentActivity(limit = 10) {
  return cacheOrFetch(
    buildCacheKey(`${P}:activity`, { limit }),
    () =>
      sequelize.query(
        `SELECT
           al.id, al.action, al.entity, al.entity_id,
           al.detail, al.logged_at, al.user_id,
           u.full_name AS user_name
         FROM audit_logs al
         LEFT JOIN users u ON al.user_id = u.id
         ORDER BY al.logged_at DESC
         LIMIT $1`,
        { bind: [limit], type: QueryTypes.SELECT },
      ),
    CacheTTL.SHORT,
  );
}

/** Quick counters: completed gates, active referrals, watchlist, task completion rate. */
export async function getQuickStats() {
  return cacheOrFetch(
    `${P}:quick-stats`,
    async () => {
      // Single query instead of 4 parallel queries — all are simple COUNTs
      const [result] = await sequelize.query<{
        completed_gates: number;
        active_referrals: number;
        watchlist_count: number;
        completion_rate: number;
      }>(
        `SELECT
           (SELECT COUNT(*)::INT FROM gates WHERE status = 'Completed') AS completed_gates,
           (SELECT COUNT(*)::INT FROM referrals WHERE status IN ('Open', 'InProgress')) AS active_referrals,
           (SELECT COUNT(*)::INT FROM watchlists WHERE status = 'Active') AS watchlist_count,
           (SELECT CASE WHEN COUNT(*) = 0 THEN 0
             ELSE ROUND(COUNT(*) FILTER (WHERE status = 'Completed')::NUMERIC / COUNT(*)::NUMERIC * 100)
           END FROM tasks) AS completion_rate`,
        { type: QueryTypes.SELECT },
      );

      return {
        completedGates: result?.completed_gates ?? 0,
        activeReferrals: result?.active_referrals ?? 0,
        watchlistCount: result?.watchlist_count ?? 0,
        taskCompletionRate: result?.completion_rate ?? 0,
      };
    },
    CacheTTL.SHORT,
  );
}

/** Offer counts grouped by status (for pipeline chart). */
export async function getOfferPipeline() {
  return cacheOrFetch(
    `${P}:offer-pipeline`,
    () =>
      sequelize.query(
        `SELECT status::TEXT, COUNT(*)::INT AS count
         FROM offers
         GROUP BY status
         ORDER BY CASE status::TEXT
           WHEN 'New' THEN 1 WHEN 'Under Review' THEN 2
           WHEN 'Negotiation' THEN 3 WHEN 'Closed' THEN 4
           WHEN 'Converted' THEN 5 ELSE 6 END`,
        { type: QueryTypes.SELECT },
      ),
    CacheTTL.MEDIUM,
  );
}

/** Monthly injury counts by severity for the last 6 months (for trend chart). */
export async function getInjuryTrends(months = 6) {
  return cacheOrFetch(
    buildCacheKey(`${P}:injury-trends`, { months }),
    async () => {
      const rows = await sequelize.query<{
        month: string;
        severity: string;
        count: number;
      }>(
        `SELECT
           TO_CHAR(DATE_TRUNC('month', injury_date), 'YYYY-MM') AS month,
           severity,
           COUNT(*)::INT AS count
         FROM injuries
         WHERE injury_date >= DATE_TRUNC('month', NOW()) - make_interval(months => $1)
         GROUP BY DATE_TRUNC('month', injury_date), severity
         ORDER BY month`,
        { bind: [months], type: QueryTypes.SELECT },
      );

      // Pivot rows into { month, minor, moderate, severe, critical }[]
      const map = new Map<
        string,
        {
          month: string;
          minor: number;
          moderate: number;
          severe: number;
          critical: number;
        }
      >();
      for (const r of rows) {
        if (!map.has(r.month)) {
          map.set(r.month, {
            month: r.month,
            minor: 0,
            moderate: 0,
            severe: 0,
            critical: 0,
          });
        }
        const entry = map.get(r.month)!;
        type SeverityKey = Exclude<keyof typeof entry, "month">;
        const key = r.severity.toLowerCase() as SeverityKey;
        if (key in entry) {
          entry[key] = r.count;
        }
      }
      return Array.from(map.values());
    },
    CacheTTL.MEDIUM,
  );
}

/** Monthly KPI snapshots for sparklines (last 6 months). */
export async function getKpiTrends(months = 6) {
  return cacheOrFetch(
    buildCacheKey(`${P}:kpi-trends`, { months }),
    async () => {
      const [players, contracts, revenue, injuries, tasks, matches] =
        await Promise.all([
          sequelize.query<{ month: string; value: number }>(
            `SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month, COUNT(*)::INT AS value
           FROM players WHERE created_at >= DATE_TRUNC('month', NOW()) - make_interval(months => $1)
           GROUP BY DATE_TRUNC('month', created_at) ORDER BY month`,
            { bind: [months], type: QueryTypes.SELECT },
          ),
          sequelize.query<{ month: string; value: number }>(
            `SELECT TO_CHAR(DATE_TRUNC('month', start_date), 'YYYY-MM') AS month, COUNT(*)::INT AS value
           FROM contracts WHERE status = 'Active'
             AND start_date >= DATE_TRUNC('month', NOW()) - make_interval(months => $1)
           GROUP BY DATE_TRUNC('month', start_date) ORDER BY month`,
            { bind: [months], type: QueryTypes.SELECT },
          ),
          sequelize.query<{ month: string; value: number }>(
            `SELECT TO_CHAR(DATE_TRUNC('month', paid_date), 'YYYY-MM') AS month, SUM(amount)::NUMERIC AS value
           FROM payments WHERE status = 'Paid'
             AND paid_date >= DATE_TRUNC('month', NOW()) - make_interval(months => $1)
           GROUP BY DATE_TRUNC('month', paid_date) ORDER BY month`,
            { bind: [months], type: QueryTypes.SELECT },
          ),
          sequelize.query<{ month: string; value: number }>(
            `SELECT TO_CHAR(DATE_TRUNC('month', injury_date), 'YYYY-MM') AS month, COUNT(*)::INT AS value
           FROM injuries WHERE injury_date >= DATE_TRUNC('month', NOW()) - make_interval(months => $1)
           GROUP BY DATE_TRUNC('month', injury_date) ORDER BY month`,
            { bind: [months], type: QueryTypes.SELECT },
          ),
          sequelize.query<{ month: string; value: number }>(
            `SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month, COUNT(*)::INT AS value
           FROM tasks WHERE created_at >= DATE_TRUNC('month', NOW()) - make_interval(months => $1)
           GROUP BY DATE_TRUNC('month', created_at) ORDER BY month`,
            { bind: [months], type: QueryTypes.SELECT },
          ),
          sequelize.query<{ month: string; value: number }>(
            `SELECT TO_CHAR(DATE_TRUNC('month', match_date), 'YYYY-MM') AS month, COUNT(*)::INT AS value
           FROM matches WHERE match_date >= DATE_TRUNC('month', NOW()) - make_interval(months => $1)
           GROUP BY DATE_TRUNC('month', match_date) ORDER BY month`,
            { bind: [months], type: QueryTypes.SELECT },
          ),
        ]);

      const toValues = (rows: { month: string; value: number }[]) =>
        rows.map((r) => Number(r.value));

      return {
        players: toValues(players),
        contracts: toValues(contracts),
        revenue: toValues(revenue),
        injuries: toValues(injuries),
        tasks: toValues(tasks),
        matches: toValues(matches),
      };
    },
    CacheTTL.MEDIUM,
  );
}

// ════════════════════════════════════════════════════════════════
// EXECUTIVE DASHBOARD
// ════════════════════════════════════════════════════════════════

/** Employee performance — top users by actions in the last 30 days. */
export async function getEmployeePerformance(limit = 20) {
  const cacheKey = buildCacheKey(`${P}:exec:employees`, { limit });

  return cacheOrFetch(
    cacheKey,
    async () => {
      const rows = await sequelize.query<Record<string, unknown>>(
        `WITH action_counts AS (
           SELECT user_id, COUNT(*)::int AS actions30d
           FROM audit_logs
           WHERE logged_at >= NOW() - INTERVAL '30 days'
           GROUP BY user_id
         ),
         completed_counts AS (
           SELECT assigned_to, COUNT(*)::int AS tasksCompleted30d
           FROM tasks
           WHERE status = 'Completed'
             AND completed_at >= NOW() - INTERVAL '30 days'
           GROUP BY assigned_to
         ),
         overdue_counts AS (
           SELECT assigned_to, COUNT(*)::int AS overdue_tasks
           FROM tasks
           WHERE status NOT IN ('Completed', 'Canceled')
             AND due_date < CURRENT_DATE
           GROUP BY assigned_to
         )
         SELECT
           u.id, u.full_name, u.full_name_ar, u.role, u.avatar_url,
           u.last_login,
           COALESCE(a.actions30d, 0) AS actions30d,
           COALESCE(c.tasksCompleted30d, 0) AS tasksCompleted30d,
           COALESCE(o.overdue_tasks, 0) AS overdue_tasks
         FROM users u
         LEFT JOIN action_counts a ON a.user_id = u.id
         LEFT JOIN completed_counts c ON c.assigned_to = u.id
         LEFT JOIN overdue_counts o ON o.assigned_to = u.id
         WHERE u.is_active = true AND u.role != 'Player'
         ORDER BY actions30d DESC
         LIMIT $1`,
        { bind: [limit], type: QueryTypes.SELECT },
      );
      return camelCaseKeys(rows);
    },
    CacheTTL.MEDIUM,
  );
}

/** Platform-wide stats: active users, module usage, actions this month. */
export async function getPlatformStats() {
  const cacheKey = buildCacheKey(`${P}:exec:platform`, {});

  return cacheOrFetch(
    cacheKey,
    async () => {
      const [stats] = await sequelize.query<Record<string, unknown>>(
        `SELECT
           (SELECT COUNT(*)::int FROM users WHERE is_active = true
            AND last_login >= NOW() - INTERVAL '7 days') AS active_7d,
           (SELECT COUNT(*)::int FROM users WHERE is_active = true
            AND last_login >= NOW() - INTERVAL '30 days') AS active_30d,
           (SELECT COUNT(*)::int FROM users WHERE is_active = true) AS total_active,
           (SELECT COUNT(*)::int FROM audit_logs
            WHERE logged_at >= DATE_TRUNC('month', NOW())) AS actions_this_month`,
        { type: QueryTypes.SELECT },
      );

      const moduleUsage = await sequelize.query<Record<string, unknown>>(
        `SELECT entity AS module, COUNT(*)::int AS action_count
         FROM audit_logs
         WHERE logged_at >= NOW() - INTERVAL '30 days'
         GROUP BY entity ORDER BY action_count DESC LIMIT 10`,
        { type: QueryTypes.SELECT },
      );

      return {
        ...camelCaseKeys([stats])[0],
        moduleUsage: camelCaseKeys(moduleUsage),
      };
    },
    CacheTTL.MEDIUM,
  );
}

/** Financial summary: portfolio value, revenue YTD, outstanding payments. */
export async function getFinancialSummary() {
  const cacheKey = buildCacheKey(`${P}:exec:financial`, {});

  return cacheOrFetch(
    cacheKey,
    async () => {
      const [result] = await sequelize.query<Record<string, unknown>>(
        `SELECT
           (SELECT COALESCE(SUM(market_value), 0)::numeric FROM players
            WHERE status = 'active') AS total_portfolio_value,
           (SELECT COALESCE(SUM(amount), 0)::numeric FROM payments
            WHERE status = 'Paid'
            AND paid_date >= DATE_TRUNC('year', NOW())) AS revenue_ytd,
           (SELECT COALESCE(SUM(amount), 0)::numeric FROM payments
            WHERE status != 'Paid'
            AND due_date < CURRENT_DATE) AS outstanding_payments,
           (SELECT COUNT(*)::int FROM payments
            WHERE status != 'Paid'
            AND due_date < CURRENT_DATE) AS overdue_payment_count,
           (SELECT COALESCE(SUM(amount), 0)::numeric FROM payments
            WHERE payment_type = 'Commission'
            AND status = 'Paid'
            AND paid_date >= DATE_TRUNC('year', NOW())) AS commission_ytd`,
        { type: QueryTypes.SELECT },
      );
      return camelCaseKeys([result])[0];
    },
    CacheTTL.MEDIUM,
  );
}

// ════════════════════════════════════════════════════════════════
// ADMIN METRICS
// ════════════════════════════════════════════════════════════════

/** Task turnaround time grouped by assignee role (last 30 days). */
export async function getTaskTurnaround() {
  const cacheKey = buildCacheKey(`${P}:exec:task-turnaround`, {});

  return cacheOrFetch(
    cacheKey,
    async () => {
      const rows = await sequelize.query<Record<string, unknown>>(
        `SELECT
           u.role,
           COUNT(*)::INT AS tasks_completed,
           ROUND((AVG(EXTRACT(EPOCH FROM (t.completed_at - t.created_at)) / 3600))::NUMERIC, 1) AS avg_hours,
           ROUND((MIN(EXTRACT(EPOCH FROM (t.completed_at - t.created_at)) / 3600))::NUMERIC, 1) AS min_hours,
           ROUND((MAX(EXTRACT(EPOCH FROM (t.completed_at - t.created_at)) / 3600))::NUMERIC, 1) AS max_hours,
           ROUND(((PERCENTILE_CONT(0.5) WITHIN GROUP (
             ORDER BY EXTRACT(EPOCH FROM (t.completed_at - t.created_at))
           )) / 3600)::NUMERIC, 1) AS median_hours
         FROM tasks t
         JOIN users u ON t.assigned_to = u.id
         WHERE t.status = 'Completed'
           AND t.completed_at >= NOW() - INTERVAL '30 days'
         GROUP BY u.role
         ORDER BY avg_hours ASC`,
        { type: QueryTypes.SELECT },
      );
      return camelCaseKeys(rows);
    },
    CacheTTL.MEDIUM,
  );
}

/** Stuck / overdue volume grouped by assignee role. */
export async function getStuckVolume() {
  const cacheKey = buildCacheKey(`${P}:exec:stuck-volume`, {});

  return cacheOrFetch(
    cacheKey,
    async () => {
      const rows = await sequelize.query<Record<string, unknown>>(
        `SELECT
           u.role,
           COUNT(*) FILTER (WHERE t.status = 'Open' AND t.due_date < CURRENT_DATE)::INT AS overdue_open,
           COUNT(*) FILTER (WHERE t.status = 'InProgress' AND t.due_date < CURRENT_DATE)::INT AS overdue_in_progress,
           COUNT(*) FILTER (WHERE t.status NOT IN ('Completed', 'Canceled'))::INT AS total_active,
           COUNT(*) FILTER (WHERE t.priority = 'critical' AND t.status NOT IN ('Completed', 'Canceled'))::INT AS critical_stuck,
           ROUND(AVG(
             CASE WHEN t.due_date < CURRENT_DATE AND t.status NOT IN ('Completed', 'Canceled')
             THEN CURRENT_DATE - t.due_date ELSE NULL END
           ), 1) AS avg_days_overdue
         FROM tasks t
         JOIN users u ON t.assigned_to = u.id
         WHERE t.status NOT IN ('Completed', 'Canceled')
         GROUP BY u.role
         ORDER BY (
           COUNT(*) FILTER (WHERE t.status = 'Open' AND t.due_date < CURRENT_DATE) +
           COUNT(*) FILTER (WHERE t.status = 'InProgress' AND t.due_date < CURRENT_DATE)
         ) DESC`,
        { type: QueryTypes.SELECT },
      );
      return camelCaseKeys(rows);
    },
    CacheTTL.MEDIUM,
  );
}

/** Efficiency: assigned vs completed per role in last 30 days. */
export async function getEfficiency() {
  const cacheKey = buildCacheKey(`${P}:exec:efficiency`, {});

  return cacheOrFetch(
    cacheKey,
    async () => {
      const rows = await sequelize.query<Record<string, unknown>>(
        `SELECT
           u.role,
           COUNT(*)::INT AS tasks_assigned,
           COUNT(*) FILTER (WHERE t.status = 'Completed')::INT AS tasks_completed,
           COUNT(*) FILTER (WHERE t.status = 'Canceled')::INT AS tasks_canceled,
           ROUND(
             COUNT(*) FILTER (WHERE t.status = 'Completed')::NUMERIC /
             NULLIF(COUNT(*), 0) * 100, 1
           ) AS efficiency_pct
         FROM tasks t
         JOIN users u ON t.assigned_to = u.id
         WHERE t.created_at >= NOW() - INTERVAL '30 days'
         GROUP BY u.role
         ORDER BY efficiency_pct DESC`,
        { type: QueryTypes.SELECT },
      );
      return camelCaseKeys(rows);
    },
    CacheTTL.MEDIUM,
  );
}

/** Legal turnaround: avg time contracts spend in Review status. */
export async function getLegalTurnaround() {
  const cacheKey = buildCacheKey(`${P}:exec:legal-turnaround`, {});

  return cacheOrFetch(
    cacheKey,
    async () => {
      const [summary] = await sequelize.query<Record<string, unknown>>(
        `SELECT
           COUNT(CASE WHEN completed_log.logged_at IS NOT NULL THEN 1 END)::INT AS contracts_reviewed,
           ROUND(AVG(
             CASE WHEN completed_log.logged_at IS NOT NULL
             THEN EXTRACT(EPOCH FROM (completed_log.logged_at - review_log.logged_at)) / 3600
             END
           )::NUMERIC, 1) AS avg_review_hours,
           ROUND(((PERCENTILE_CONT(0.5) WITHIN GROUP (
             ORDER BY CASE WHEN completed_log.logged_at IS NOT NULL
               THEN EXTRACT(EPOCH FROM (completed_log.logged_at - review_log.logged_at))
               ELSE NULL END
           )) / 3600)::NUMERIC, 1) AS median_review_hours,
           COUNT(*) FILTER (WHERE c.status = 'Review')::INT AS currently_in_review
         FROM contracts c
         LEFT JOIN LATERAL (
           SELECT logged_at FROM audit_logs
           WHERE entity = 'contracts' AND entity_id = c.id
             AND action = 'UPDATE' AND detail ILIKE '%Review%'
           ORDER BY logged_at ASC LIMIT 1
         ) review_log ON true
         LEFT JOIN LATERAL (
           SELECT logged_at FROM audit_logs
           WHERE entity = 'contracts' AND entity_id = c.id
             AND action = 'UPDATE' AND detail ILIKE '%Signing%'
             AND logged_at > review_log.logged_at
           ORDER BY logged_at ASC LIMIT 1
         ) completed_log ON true
         WHERE review_log.logged_at IS NOT NULL`,
        { type: QueryTypes.SELECT },
      );

      // Oldest contract still in Review
      const [oldest] = await sequelize.query<Record<string, unknown>>(
        `SELECT
           c.id AS contract_id,
           c.title,
           EXTRACT(DAY FROM NOW() - al.logged_at)::INT AS days_in_review
         FROM contracts c
         JOIN LATERAL (
           SELECT logged_at FROM audit_logs
           WHERE entity = 'contracts' AND entity_id = c.id
             AND action = 'UPDATE' AND detail ILIKE '%Review%'
           ORDER BY logged_at DESC LIMIT 1
         ) al ON true
         WHERE c.status = 'Review'
         ORDER BY al.logged_at ASC
         LIMIT 1`,
        { type: QueryTypes.SELECT },
      );

      return {
        ...camelCaseKeys([summary])[0],
        oldest: oldest ? camelCaseKeys([oldest])[0] : null,
      };
    },
    CacheTTL.MEDIUM,
  );
}

/** Approval bottleneck: pending approvals grouped by assigned role. */
export async function getApprovalBottleneck() {
  const cacheKey = buildCacheKey(`${P}:exec:approval-bottleneck`, {});

  return cacheOrFetch(
    cacheKey,
    async () => {
      const rows = await sequelize.query<Record<string, unknown>>(
        `SELECT
           ar.assigned_role AS role,
           COUNT(*)::INT AS pending_count,
           ROUND((AVG(EXTRACT(EPOCH FROM (NOW() - ar.created_at)) / 3600))::NUMERIC, 1) AS avg_wait_hours,
           COUNT(*) FILTER (WHERE ar.priority IN ('high', 'critical'))::INT AS high_priority,
           MIN(ar.created_at) AS oldest_request,
           ROUND((EXTRACT(EPOCH FROM (NOW() - MIN(ar.created_at))) / 86400)::NUMERIC, 1) AS oldest_days
         FROM approval_requests ar
         WHERE ar.status = 'Pending'
         GROUP BY ar.assigned_role
         ORDER BY avg_wait_hours DESC`,
        { type: QueryTypes.SELECT },
      );
      return camelCaseKeys(rows);
    },
    CacheTTL.MEDIUM,
  );
}

/** Operational efficiency: task completion rate, avg time, overdue count. */
export async function getOperationalEfficiency() {
  const cacheKey = buildCacheKey(`${P}:exec:ops`, {});

  return cacheOrFetch(
    cacheKey,
    async () => {
      const [result] = await sequelize.query<Record<string, unknown>>(
        `SELECT
           (SELECT ROUND(
             COUNT(*) FILTER (WHERE status = 'Completed')::numeric /
             NULLIF(COUNT(*), 0) * 100, 1
           ) FROM tasks WHERE created_at >= NOW() - INTERVAL '30 days') AS completion_rate_30d,
           (SELECT ROUND((AVG(
             EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600
           ))::NUMERIC, 1) FROM tasks
            WHERE status = 'Completed'
            AND completed_at >= NOW() - INTERVAL '30 days') AS avg_completion_hours,
           (SELECT COUNT(*)::int FROM tasks
            WHERE status NOT IN ('Completed', 'Canceled')
            AND due_date < CURRENT_DATE) AS total_overdue_tasks,
           (SELECT COUNT(*)::int FROM approval_requests
            WHERE status = 'Pending') AS pending_approvals`,
        { type: QueryTypes.SELECT },
      );
      return camelCaseKeys([result])[0];
    },
    CacheTTL.MEDIUM,
  );
}

// ═══════════════════════════════════════════════════════════════
// SPORTS MANAGER DASHBOARD
// ═══════════════════════════════════════════════════════════════

export async function getSportsManagerOverview() {
  return cacheOrFetch(
    `${P}:sports-manager`,
    async () => {
      const [
        sessionsByOwner,
        thisWeekSessions,
        incompleteSessions,
        lateSessions,
        openReferralsCount,
        referralsByResponsible,
        criticalReferrals,
        waitingReferrals,
        overdueReferrals,
      ] = await Promise.all([
        // 1. Sessions grouped by program_owner
        sequelize.query(
          `SELECT program_owner, completion_status, COUNT(*)::int AS count
           FROM sessions
           GROUP BY program_owner, completion_status
           ORDER BY program_owner`,
          { type: QueryTypes.SELECT },
        ),

        // 2. This week's sessions
        sequelize.query(
          `SELECT s.id, s.session_type, s.program_owner, s.session_date,
                  s.completion_status, s.notes,
                  p.first_name || ' ' || p.last_name AS player_name,
                  COALESCE(p.first_name_ar, '') || ' ' || COALESCE(p.last_name_ar, '') AS player_name_ar,
                  u.full_name AS responsible_name
           FROM sessions s
           JOIN players p ON s.player_id = p.id
           LEFT JOIN users u ON s.responsible_id = u.id
           WHERE s.session_date >= date_trunc('week', CURRENT_DATE)
             AND s.session_date < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'
           ORDER BY s.session_date ASC
           LIMIT 50`,
          { type: QueryTypes.SELECT },
        ),

        // 3. Incomplete sessions (Scheduled, not past date)
        sequelize.query(
          `SELECT s.id, s.session_type, s.program_owner, s.session_date,
                  p.first_name || ' ' || p.last_name AS player_name,
                  COALESCE(p.first_name_ar, '') || ' ' || COALESCE(p.last_name_ar, '') AS player_name_ar
           FROM sessions s
           JOIN players p ON s.player_id = p.id
           WHERE s.completion_status = 'Scheduled'
           ORDER BY s.session_date ASC
           LIMIT 20`,
          { type: QueryTypes.SELECT },
        ),

        // 4. Late sessions (past date, not completed)
        sequelize.query(
          `SELECT s.id, s.session_type, s.program_owner, s.session_date,
                  p.first_name || ' ' || p.last_name AS player_name,
                  COALESCE(p.first_name_ar, '') || ' ' || COALESCE(p.last_name_ar, '') AS player_name_ar
           FROM sessions s
           JOIN players p ON s.player_id = p.id
           WHERE s.session_date < CURRENT_DATE
             AND s.completion_status NOT IN ('Completed', 'Cancelled')
           ORDER BY s.session_date ASC
           LIMIT 20`,
          { type: QueryTypes.SELECT },
        ),

        // 5. Open referrals count
        sequelize.query<{ count: number }>(
          `SELECT COUNT(*)::int AS count
           FROM referrals
           WHERE status IN ('Open', 'InProgress', 'Waiting')`,
          { type: QueryTypes.SELECT },
        ),

        // 6. Referrals by responsible
        sequelize.query(
          `SELECT u.full_name AS responsible_name,
                  COALESCE(u.full_name_ar, u.full_name) AS responsible_name_ar,
                  COUNT(*)::int AS count
           FROM referrals r
           JOIN users u ON r.assigned_to = u.id
           WHERE r.status IN ('Open', 'InProgress', 'Waiting')
           GROUP BY u.id, u.full_name, u.full_name_ar
           ORDER BY count DESC`,
          { type: QueryTypes.SELECT },
        ),

        // 7. Critical/urgent referrals
        sequelize.query(
          `SELECT r.id, r.referral_type, r.referral_target, r.priority, r.status,
                  r.created_at, r.due_date,
                  p.first_name || ' ' || p.last_name AS player_name,
                  COALESCE(p.first_name_ar, '') || ' ' || COALESCE(p.last_name_ar, '') AS player_name_ar
           FROM referrals r
           JOIN players p ON r.player_id = p.id
           WHERE r.priority IN ('Critical', 'High')
             AND r.status IN ('Open', 'InProgress', 'Waiting')
           ORDER BY CASE r.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 END,
                    r.created_at ASC
           LIMIT 10`,
          { type: QueryTypes.SELECT },
        ),

        // 8. Waiting referrals
        sequelize.query(
          `SELECT r.id, r.referral_type, r.referral_target, r.priority,
                  r.created_at, r.due_date,
                  p.first_name || ' ' || p.last_name AS player_name,
                  COALESCE(p.first_name_ar, '') || ' ' || COALESCE(p.last_name_ar, '') AS player_name_ar
           FROM referrals r
           JOIN players p ON r.player_id = p.id
           WHERE r.status = 'Waiting'
           ORDER BY r.created_at ASC
           LIMIT 20`,
          { type: QueryTypes.SELECT },
        ),

        // 9. Overdue referrals (past due date, still active)
        sequelize.query(
          `SELECT r.id, r.referral_type, r.referral_target, r.priority, r.status,
                  r.created_at, r.due_date,
                  p.first_name || ' ' || p.last_name AS player_name,
                  COALESCE(p.first_name_ar, '') || ' ' || COALESCE(p.last_name_ar, '') AS player_name_ar,
                  u.full_name AS assignee_name,
                  COALESCE(u.full_name_ar, u.full_name) AS assignee_name_ar
           FROM referrals r
           JOIN players p ON r.player_id = p.id
           LEFT JOIN users u ON r.assigned_to = u.id
           WHERE r.due_date < CURRENT_DATE
             AND r.status IN ('Open', 'InProgress', 'Waiting')
           ORDER BY r.due_date ASC
           LIMIT 20`,
          { type: QueryTypes.SELECT },
        ),
      ]);

      return {
        sessionsByOwner,
        thisWeekSessions,
        incompleteSessions,
        lateSessions,
        openReferralsCount: openReferralsCount[0]?.count ?? 0,
        referralsByResponsible,
        criticalReferrals,
        waitingReferrals,
        overdueReferrals,
      };
    },
    CacheTTL.SHORT,
  );
}
