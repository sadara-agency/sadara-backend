import { QueryTypes } from 'sequelize';
import { sequelize } from '../../config/database';

// ── KPIs (main dashboard counters) ──
export async function getKpis() {
  const result = await sequelize.query(
    'SELECT * FROM vw_dashboard_kpis',
    { type: QueryTypes.SELECT }
  );
  return result[0] ?? {};
}

// ── Smart Alerts ──
export async function getAlerts() {
  const [expiringContracts, overduePayments, injuryConflicts, openReferrals] =
    await Promise.all([
      sequelize.query('SELECT * FROM vw_expiring_contracts LIMIT 5', {
        type: QueryTypes.SELECT,
      }),
      sequelize.query('SELECT * FROM vw_overdue_payments LIMIT 5', {
        type: QueryTypes.SELECT,
      }),
      sequelize.query('SELECT * FROM vw_injury_match_conflicts LIMIT 5', {
        type: QueryTypes.SELECT,
      }),
      sequelize.query(
        `SELECT r.*, p.first_name || ' ' || p.last_name AS player_name
         FROM referrals r
         JOIN players p ON r.player_id = p.id
         WHERE r.status IN ('Open','InProgress')
         ORDER BY r.created_at DESC LIMIT 5`,
        { type: QueryTypes.SELECT }
      ),
    ]);

  return { expiringContracts, overduePayments, injuryConflicts, openReferrals };
}

// ── Today's Overview ──
export async function getTodayOverview() {
  const today = new Date().toISOString().split('T')[0];

  const [matches, tasks, payments] = await Promise.all([
    sequelize.query(
      `SELECT m.*, hc.name AS home_team, ac.name AS away_team
       FROM matches m
       LEFT JOIN clubs hc ON m.home_club_id = hc.id
       LEFT JOIN clubs ac ON m.away_club_id = ac.id
       WHERE DATE(m.match_date) = $1
       ORDER BY m.match_date`,
      { bind: [today], type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT t.*, p.first_name || ' ' || p.last_name AS player_name,
              u.full_name AS assigned_to_name
       FROM tasks t
       LEFT JOIN players p ON t.player_id = p.id
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.due_date = $1 AND t.status != 'Completed'
       ORDER BY CASE t.priority
         WHEN 'critical' THEN 0 WHEN 'high' THEN 1
         WHEN 'medium' THEN 2 ELSE 3 END`,
      { bind: [today], type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT py.*, p.first_name || ' ' || p.last_name AS player_name
       FROM payments py
       LEFT JOIN players p ON py.player_id = p.id
       WHERE py.due_date = $1 AND py.status != 'Paid'
       ORDER BY py.amount DESC`,
      { bind: [today], type: QueryTypes.SELECT }
    ),
  ]);

  return { matches, tasks, payments };
}

// ── Top Players (by market value) ──
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
       rr.overall_risk,
       (SELECT AVG(perf.average_rating)
        FROM performances perf WHERE perf.player_id = p.id) AS avg_rating,
       (SELECT v.trend FROM valuations v
        WHERE v.player_id = p.id
        ORDER BY v.valued_at DESC LIMIT 1) AS value_trend
     FROM players p
     LEFT JOIN clubs c ON p.current_club_id = c.id
     LEFT JOIN risk_radars rr ON rr.player_id = p.id
     WHERE p.status = 'active'
     ORDER BY p.market_value DESC NULLS LAST
     LIMIT $1`,
    { bind: [limit], type: QueryTypes.SELECT }
  );
}

// ── Contract Status Distribution (pie chart) ──
export async function getContractStatusDistribution() {
  return sequelize.query(
    `SELECT
       status,
       COUNT(*)::INT AS count
     FROM contracts
     GROUP BY status
     ORDER BY count DESC`,
    { type: QueryTypes.SELECT }
  );
}

// ── Player Type Distribution (pro vs youth) ──
export async function getPlayerDistribution() {
  return sequelize.query(
    `SELECT
       player_type,
       COUNT(*)::INT AS count
     FROM players
     WHERE status = 'active'
     GROUP BY player_type`,
    { type: QueryTypes.SELECT }
  );
}

// ── Recent Offers ──
export async function getRecentOffers(limit = 5) {
  return sequelize.query(
    `SELECT
       o.id,
       o.offer_type,
       o.status,
       o.transfer_fee,
       o.fee_currency,
       o.deadline,
       o.created_at,
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
    { bind: [limit], type: QueryTypes.SELECT }
  );
}

// ── Upcoming Matches (with managed player count) ──
export async function getUpcomingMatches(limit = 5) {
  return sequelize.query(
    `SELECT
       m.id,
       m.match_date,
       m.venue,
       m.competition,
       m.status,
       hc.name AS home_team,
       ac.name AS away_team,
       (SELECT COUNT(*)
        FROM match_players mp WHERE mp.match_id = m.id) AS managed_players
     FROM matches m
     LEFT JOIN clubs hc ON m.home_club_id = hc.id
     LEFT JOIN clubs ac ON m.away_club_id = ac.id
     WHERE m.status = 'upcoming' AND m.match_date >= NOW()
     ORDER BY m.match_date ASC
     LIMIT $1`,
    { bind: [limit], type: QueryTypes.SELECT }
  );
}

// ── Urgent Tasks ──
export async function getUrgentTasks(limit = 5) {
  return sequelize.query(
    `SELECT
       t.id,
       t.title,
       t.title_ar,
       t.type,
       t.priority,
       t.status,
       t.due_date,
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
    { bind: [limit], type: QueryTypes.SELECT }
  );
}

// ── Revenue & Commission (monthly for charts) ──
export async function getRevenueChart(months = 12) {
  return sequelize.query(
    `SELECT
       TO_CHAR(DATE_TRUNC('month', py.paid_date), 'YYYY-MM') AS month,
       SUM(py.amount)::NUMERIC AS revenue,
       SUM(CASE WHEN py.payment_type = 'Commission' THEN py.amount ELSE 0 END)::NUMERIC AS commission
     FROM payments py
     WHERE py.status = 'Paid'
       AND py.paid_date >= DATE_TRUNC('month', NOW()) - INTERVAL '${months} months'
     GROUP BY DATE_TRUNC('month', py.paid_date)
     ORDER BY month ASC`,
    { type: QueryTypes.SELECT }
  );
}

// ── Performance Averages (radar chart) ──
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
    { type: QueryTypes.SELECT }
  );
}

// ── Recent Activity (audit log) ──
export async function getRecentActivity(limit = 10) {
  return sequelize.query(
    `SELECT
       al.id,
       al.action,
       al.entity,
       al.entity_id,
       al.detail,
       al.logged_at,
       al.user_id,
       u.full_name AS user_name
     FROM audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
     ORDER BY al.logged_at DESC
     LIMIT $1`,
    { bind: [limit], type: QueryTypes.SELECT }
  );
}

// ── Quick Stats (gates, referrals, watchlist, completion) ──
export async function getQuickStats() {
  const [gates, referrals, watchlist, taskCompletion] = await Promise.all([
    sequelize.query(
      `SELECT COUNT(*)::INT AS count FROM gates WHERE status = 'Completed'`,
      { type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT COUNT(*)::INT AS count FROM referrals WHERE status IN ('Open','InProgress')`,
      { type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT COUNT(*)::INT AS count FROM watchlists WHERE status = 'Active'`,
      { type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT
         CASE WHEN COUNT(*) = 0 THEN 0
         ELSE ROUND(
           COUNT(*) FILTER (WHERE status = 'Completed')::NUMERIC /
           COUNT(*)::NUMERIC * 100
         ) END AS completion_rate
       FROM tasks`,
      { type: QueryTypes.SELECT }
    ),
  ]);

  return {
    completedGates: (gates[0] as any)?.count ?? 0,
    activeReferrals: (referrals[0] as any)?.count ?? 0,
    watchlistCount: (watchlist[0] as any)?.count ?? 0,
    taskCompletionRate: (taskCompletion[0] as any)?.completion_rate ?? 0,
  };
}

// ── Full Dashboard (aggregated single call) ──
export async function getFullDashboard() {
  const [
    kpis,
    alerts,
    topPlayers,
    contractStatus,
    playerDistribution,
    recentOffers,
    upcomingMatches,
    urgentTasks,
    revenueChart,
    performanceAvg,
    recentActivity,
    quickStats,
  ] = await Promise.all([
    getKpis(),
    getAlerts(),
    getTopPlayers(),
    getContractStatusDistribution(),
    getPlayerDistribution(),
    getRecentOffers(),
    getUpcomingMatches(),
    getUrgentTasks(),
    getRevenueChart(),
    getPerformanceAverages(),
    getRecentActivity(),
    getQuickStats(),
  ]);

  return {
    kpis,
    alerts,
    topPlayers,
    contractStatus,
    playerDistribution,
    recentOffers,
    upcomingMatches,
    urgentTasks,
    revenueChart,
    performanceAvg,
    recentActivity,
    quickStats,
  };
}