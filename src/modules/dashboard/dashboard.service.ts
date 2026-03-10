import { QueryTypes } from "sequelize";
import { sequelize } from "../../config/database";
import { logger } from "../../config/logger";
import type { UserRole } from "../../shared/types";

/** Roles that see ALL data (no player-level filtering). */
const UNFILTERED_ROLES: UserRole[] = [
  "Admin",
  "Manager",
  "Executive",
  "Finance",
  "Legal",
  "Media",
];

/** Main KPI counters from the dashboard view. */
export async function getKpis() {
  const result = await sequelize.query("SELECT * FROM vw_dashboard_kpis", {
    type: QueryTypes.SELECT,
  });
  return result[0] ?? {};
}

/** Smart alerts: expiring contracts, overdue payments, injury conflicts, referrals. */
export async function getAlerts() {
  const [expiringContracts, overduePayments, injuryConflicts, openReferrals] =
    await Promise.all([
      sequelize.query("SELECT * FROM vw_expiring_contracts LIMIT 5", {
        type: QueryTypes.SELECT,
      }),
      sequelize.query("SELECT * FROM vw_overdue_payments LIMIT 5", {
        type: QueryTypes.SELECT,
      }),
      sequelize.query("SELECT * FROM vw_injury_match_conflicts LIMIT 5", {
        type: QueryTypes.SELECT,
      }),
      sequelize.query(
        `SELECT r.*, p.first_name || ' ' || p.last_name AS player_name
         FROM referrals r
         JOIN players p ON r.player_id = p.id
         WHERE r.status IN ('Open', 'InProgress')
         ORDER BY r.created_at DESC LIMIT 5`,
        { type: QueryTypes.SELECT },
      ),
    ]);

  return { expiringContracts, overduePayments, injuryConflicts, openReferrals };
}

/** Today's matches, due tasks, and due payments. Uses CURRENT_DATE to avoid timezone issues. */
export async function getTodayOverview() {
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
}

/** Top players ranked by market value with club, risk, and trend data. */
export async function getTopPlayers(limit = 5) {
  return sequelize.query(
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
}

/** Contract count grouped by status (for pie chart). */
export async function getContractStatusDistribution() {
  return sequelize.query(
    `SELECT status, COUNT(*)::INT AS count
     FROM contracts
     GROUP BY status
     ORDER BY count DESC`,
    { type: QueryTypes.SELECT },
  );
}

/** Active player count grouped by contract type: Professional / Amateur / Youth. */
export async function getPlayerDistribution() {
  return sequelize.query(
    `SELECT contract_type AS player_type, COUNT(*)::INT AS count
     FROM players
     WHERE status = 'active'
     GROUP BY contract_type`,
    { type: QueryTypes.SELECT },
  );
}

/** Most recent offers with player and club names. */
export async function getRecentOffers(limit = 5) {
  return sequelize.query(
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
  );
}

/** Upcoming matches with managed player count per match (role-filtered). */
export async function getUpcomingMatches(
  limit = 5,
  userId?: string,
  userRole?: UserRole,
  playerId?: string | null,
) {
  // Unfiltered roles — see all matches
  if (!userId || !userRole || UNFILTERED_ROLES.includes(userRole)) {
    return sequelize.query(
      `SELECT
         m.id, m.match_date, m.venue, m.competition, m.status,
         hc.name AS home_team,
         ac.name AS away_team,
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
         hc.name AS home_team,
         ac.name AS away_team,
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
       hc.name AS home_team,
       ac.name AS away_team,
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
}

/** Non-completed tasks sorted by priority (critical first, role-filtered). */
export async function getUrgentTasks(
  limit = 5,
  userId?: string,
  userRole?: UserRole,
  playerId?: string | null,
) {
  // Unfiltered roles — see all tasks
  if (!userId || !userRole || UNFILTERED_ROLES.includes(userRole)) {
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
  return sequelize.query(
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
  );
}

/** Average performance metrics across all active players (for radar chart). */
export async function getPerformanceAverages() {
  return sequelize.query(
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
  );
}

/** Recent audit log entries with user names. */
export async function getRecentActivity(limit = 10) {
  return sequelize.query(
    `SELECT
       al.id, al.action, al.entity, al.entity_id,
       al.detail, al.logged_at, al.user_id,
       u.full_name AS user_name
     FROM audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
     ORDER BY al.logged_at DESC
     LIMIT $1`,
    { bind: [limit], type: QueryTypes.SELECT },
  );
}

/** Quick counters: completed gates, active referrals, watchlist, task completion rate. */
export async function getQuickStats() {
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
}

/** Offer counts grouped by status (for pipeline chart). */
export async function getOfferPipeline() {
  return sequelize.query(
    `SELECT status::TEXT, COUNT(*)::INT AS count
     FROM offers
     GROUP BY status
     ORDER BY CASE status::TEXT
       WHEN 'New' THEN 1 WHEN 'Under Review' THEN 2
       WHEN 'Negotiation' THEN 3 WHEN 'Closed' THEN 4
       WHEN 'Converted' THEN 5 ELSE 6 END`,
    { type: QueryTypes.SELECT },
  );
}

/** Monthly injury counts by severity for the last 6 months (for trend chart). */
export async function getInjuryTrends(months = 6) {
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
    const key = r.severity.toLowerCase() as keyof typeof entry;
    if (key in entry && key !== "month") {
      (entry as any)[key] = r.count;
    }
  }
  return Array.from(map.values());
}

/** Monthly KPI snapshots for sparklines (last 6 months). */
export async function getKpiTrends(months = 6) {
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
}

/**
 * Full dashboard — fires all queries in parallel for initial page load.
 * Uses Promise.allSettled so a single failing query doesn't crash the entire dashboard.
 * Failed sections return safe defaults and the dashboard renders partially.
 */
export async function getFullDashboard(
  userId?: string,
  userRole?: UserRole,
  playerId?: string | null,
) {
  const labels = [
    "kpis",
    "alerts",
    "topPlayers",
    "contractStatus",
    "playerDistribution",
    "recentOffers",
    "upcomingMatches",
    "urgentTasks",
    "revenueChart",
    "performanceAvg",
    "recentActivity",
    "quickStats",
    "offerPipeline",
    "injuryTrends",
    "kpiTrends",
  ] as const;

  const defaults: Record<string, any> = {
    kpis: {},
    alerts: {
      expiringContracts: [],
      overduePayments: [],
      injuryConflicts: [],
      openReferrals: [],
    },
    topPlayers: [],
    contractStatus: [],
    playerDistribution: [],
    recentOffers: [],
    upcomingMatches: [],
    urgentTasks: [],
    revenueChart: [],
    performanceAvg: [{}],
    recentActivity: [],
    quickStats: {
      completedGates: 0,
      activeReferrals: 0,
      watchlistCount: 0,
      taskCompletionRate: 0,
    },
    offerPipeline: [],
    injuryTrends: [],
    kpiTrends: {
      players: [],
      contracts: [],
      revenue: [],
      injuries: [],
      tasks: [],
      matches: [],
    },
  };

  const results = await Promise.allSettled([
    getKpis(),
    getAlerts(),
    getTopPlayers(),
    getContractStatusDistribution(),
    getPlayerDistribution(),
    getRecentOffers(),
    getUpcomingMatches(5, userId, userRole, playerId),
    getUrgentTasks(5, userId, userRole, playerId),
    getRevenueChart(),
    getPerformanceAverages(),
    getRecentActivity(),
    getQuickStats(),
    getOfferPipeline(),
    getInjuryTrends(),
    getKpiTrends(),
  ]);

  const dashboard: Record<string, any> = {};
  results.forEach((result, i) => {
    const key = labels[i];
    if (result.status === "fulfilled") {
      dashboard[key] = result.value;
    } else {
      logger.error(`[Dashboard] ${key} query failed`, {
        error: result.reason?.message || result.reason,
      });
      dashboard[key] = defaults[key];
    }
  });

  return dashboard;
}
