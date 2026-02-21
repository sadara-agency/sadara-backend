"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKpis = getKpis;
exports.getAlerts = getAlerts;
exports.getTodayOverview = getTodayOverview;
exports.getTopPlayers = getTopPlayers;
exports.getContractStatusDistribution = getContractStatusDistribution;
exports.getPlayerDistribution = getPlayerDistribution;
exports.getRecentOffers = getRecentOffers;
exports.getUpcomingMatches = getUpcomingMatches;
exports.getUrgentTasks = getUrgentTasks;
exports.getRevenueChart = getRevenueChart;
exports.getPerformanceAverages = getPerformanceAverages;
exports.getRecentActivity = getRecentActivity;
exports.getQuickStats = getQuickStats;
exports.getFullDashboard = getFullDashboard;
const sequelize_1 = require("sequelize");
const database_1 = require("../../config/database");
/** Main KPI counters from the dashboard view. */
async function getKpis() {
    const result = await database_1.sequelize.query('SELECT * FROM vw_dashboard_kpis', { type: sequelize_1.QueryTypes.SELECT });
    return result[0] ?? {};
}
/** Smart alerts: expiring contracts, overdue payments, injury conflicts, referrals. */
async function getAlerts() {
    const [expiringContracts, overduePayments, injuryConflicts, openReferrals] = await Promise.all([
        database_1.sequelize.query('SELECT * FROM vw_expiring_contracts LIMIT 5', {
            type: sequelize_1.QueryTypes.SELECT,
        }),
        database_1.sequelize.query('SELECT * FROM vw_overdue_payments LIMIT 5', {
            type: sequelize_1.QueryTypes.SELECT,
        }),
        database_1.sequelize.query('SELECT * FROM vw_injury_match_conflicts LIMIT 5', {
            type: sequelize_1.QueryTypes.SELECT,
        }),
        database_1.sequelize.query(`SELECT r.*, p.first_name || ' ' || p.last_name AS player_name
         FROM referrals r
         JOIN players p ON r.player_id = p.id
         WHERE r.status IN ('Open', 'InProgress')
         ORDER BY r.created_at DESC LIMIT 5`, { type: sequelize_1.QueryTypes.SELECT }),
    ]);
    return { expiringContracts, overduePayments, injuryConflicts, openReferrals };
}
/** Today's matches, due tasks, and due payments. Uses CURRENT_DATE to avoid timezone issues. */
async function getTodayOverview() {
    const [matches, tasks, payments] = await Promise.all([
        database_1.sequelize.query(`SELECT m.*, hc.name AS home_team, ac.name AS away_team
       FROM matches m
       LEFT JOIN clubs hc ON m.home_club_id = hc.id
       LEFT JOIN clubs ac ON m.away_club_id = ac.id
       WHERE DATE(m.match_date) = CURRENT_DATE
       ORDER BY m.match_date`, { type: sequelize_1.QueryTypes.SELECT }),
        database_1.sequelize.query(`SELECT t.*, p.first_name || ' ' || p.last_name AS player_name,
              u.full_name AS assigned_to_name
       FROM tasks t
       LEFT JOIN players p ON t.player_id = p.id
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.due_date = CURRENT_DATE AND t.status != 'Completed'
       ORDER BY CASE t.priority
         WHEN 'critical' THEN 0 WHEN 'high' THEN 1
         WHEN 'medium' THEN 2 ELSE 3 END`, { type: sequelize_1.QueryTypes.SELECT }),
        database_1.sequelize.query(`SELECT py.*, p.first_name || ' ' || p.last_name AS player_name
       FROM payments py
       LEFT JOIN players p ON py.player_id = p.id
       WHERE py.due_date = CURRENT_DATE AND py.status != 'Paid'
       ORDER BY py.amount DESC`, { type: sequelize_1.QueryTypes.SELECT }),
    ]);
    return { matches, tasks, payments };
}
/** Top players ranked by market value with club, risk, and trend data. */
async function getTopPlayers(limit = 5) {
    return database_1.sequelize.query(`SELECT
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
     LIMIT $1`, { bind: [limit], type: sequelize_1.QueryTypes.SELECT });
}
/** Contract count grouped by status (for pie chart). */
async function getContractStatusDistribution() {
    return database_1.sequelize.query(`SELECT status, COUNT(*)::INT AS count
     FROM contracts
     GROUP BY status
     ORDER BY count DESC`, { type: sequelize_1.QueryTypes.SELECT });
}
/** Active player count grouped by type: Pro vs Youth. */
async function getPlayerDistribution() {
    return database_1.sequelize.query(`SELECT player_type, COUNT(*)::INT AS count
     FROM players
     WHERE status = 'active'
     GROUP BY player_type`, { type: sequelize_1.QueryTypes.SELECT });
}
/** Most recent offers with player and club names. */
async function getRecentOffers(limit = 5) {
    return database_1.sequelize.query(`SELECT
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
     LIMIT $1`, { bind: [limit], type: sequelize_1.QueryTypes.SELECT });
}
/** Upcoming matches with managed player count per match. */
async function getUpcomingMatches(limit = 5) {
    return database_1.sequelize.query(`SELECT
       m.id, m.match_date, m.venue, m.competition, m.status,
       hc.name AS home_team,
       ac.name AS away_team,
       (SELECT COUNT(*) FROM match_players mp WHERE mp.match_id = m.id) AS managed_players
     FROM matches m
     LEFT JOIN clubs hc ON m.home_club_id = hc.id
     LEFT JOIN clubs ac ON m.away_club_id = ac.id
     WHERE m.status = 'upcoming' AND m.match_date >= NOW()
     ORDER BY m.match_date ASC
     LIMIT $1`, { bind: [limit], type: sequelize_1.QueryTypes.SELECT });
}
/** Non-completed tasks sorted by priority (critical first). */
async function getUrgentTasks(limit = 5) {
    return database_1.sequelize.query(`SELECT
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
     LIMIT $1`, { bind: [limit], type: sequelize_1.QueryTypes.SELECT });
}
/**
 * Monthly revenue & commission for charts.
 *
 * FIX: The old code string-interpolated `months` directly into
 * the SQL query (`INTERVAL '${months} months'`), which is a
 * SQL injection vector. Now we use `make_interval(months => $1)`
 * with a parameterized bind.
 */
async function getRevenueChart(months = 12) {
    return database_1.sequelize.query(`SELECT
       TO_CHAR(DATE_TRUNC('month', py.paid_date), 'YYYY-MM') AS month,
       SUM(py.amount)::NUMERIC AS revenue,
       SUM(CASE WHEN py.payment_type = 'Commission' THEN py.amount ELSE 0 END)::NUMERIC AS commission
     FROM payments py
     WHERE py.status = 'Paid'
       AND py.paid_date >= DATE_TRUNC('month', NOW()) - make_interval(months => $1)
     GROUP BY DATE_TRUNC('month', py.paid_date)
     ORDER BY month ASC`, { bind: [months], type: sequelize_1.QueryTypes.SELECT });
}
/** Average performance metrics across all active players (for radar chart). */
async function getPerformanceAverages() {
    return database_1.sequelize.query(`SELECT
       ROUND(AVG(perf.average_rating), 1) AS avg_rating,
       ROUND(AVG(perf.goals), 1) AS avg_goals,
       ROUND(AVG(perf.assists), 1) AS avg_assists,
       ROUND(AVG(perf.key_passes), 1) AS avg_passes,
       ROUND(AVG(perf.successful_dribbles), 1) AS avg_dribbles,
       ROUND(AVG(perf.minutes), 0) AS avg_minutes
     FROM performances perf
     JOIN players p ON perf.player_id = p.id
     WHERE p.status = 'active'`, { type: sequelize_1.QueryTypes.SELECT });
}
/** Recent audit log entries with user names. */
async function getRecentActivity(limit = 10) {
    return database_1.sequelize.query(`SELECT
       al.id, al.action, al.entity, al.entity_id,
       al.detail, al.logged_at, al.user_id,
       u.full_name AS user_name
     FROM audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
     ORDER BY al.logged_at DESC
     LIMIT $1`, { bind: [limit], type: sequelize_1.QueryTypes.SELECT });
}
/** Quick counters: completed gates, active referrals, watchlist, task completion rate. */
async function getQuickStats() {
    const [gates, referrals, watchlist, taskCompletion] = await Promise.all([
        database_1.sequelize.query(`SELECT COUNT(*)::INT AS count FROM gates WHERE status = 'Completed'`, { type: sequelize_1.QueryTypes.SELECT }),
        database_1.sequelize.query(`SELECT COUNT(*)::INT AS count FROM referrals WHERE status IN ('Open', 'InProgress')`, { type: sequelize_1.QueryTypes.SELECT }),
        database_1.sequelize.query(`SELECT COUNT(*)::INT AS count FROM watchlists WHERE status = 'Active'`, { type: sequelize_1.QueryTypes.SELECT }),
        database_1.sequelize.query(`SELECT
         CASE WHEN COUNT(*) = 0 THEN 0
         ELSE ROUND(
           COUNT(*) FILTER (WHERE status = 'Completed')::NUMERIC /
           COUNT(*)::NUMERIC * 100
         ) END AS completion_rate
       FROM tasks`, { type: sequelize_1.QueryTypes.SELECT }),
    ]);
    return {
        completedGates: gates[0]?.count ?? 0,
        activeReferrals: referrals[0]?.count ?? 0,
        watchlistCount: watchlist[0]?.count ?? 0,
        taskCompletionRate: taskCompletion[0]?.completion_rate ?? 0,
    };
}
/** Full dashboard — fires all queries in parallel for initial page load. */
async function getFullDashboard() {
    const [kpis, alerts, topPlayers, contractStatus, playerDistribution, recentOffers, upcomingMatches, urgentTasks, revenueChart, performanceAvg, recentActivity, quickStats,] = await Promise.all([
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
        kpis, alerts, topPlayers, contractStatus, playerDistribution,
        recentOffers, upcomingMatches, urgentTasks, revenueChart,
        performanceAvg, recentActivity, quickStats,
    };
}
//# sourceMappingURL=dashboard.service.js.map