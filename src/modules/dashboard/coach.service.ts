import { QueryTypes } from "sequelize";
import { sequelize } from "@config/database";
import type { AuthUser } from "@shared/types";
import { camelCaseKeys } from "@shared/utils/caseTransform";

/**
 * Coach Dashboard aggregation queries.
 *
 * All queries scope to the authenticated coach via:
 *   EXISTS (
 *     SELECT 1 FROM player_coach_assignments pca
 *     WHERE pca.player_id = <player_id> AND pca.coach_user_id = :coachId
 *   )
 *
 * (Same pattern as wellness.service.ts — duplicated locally rather than
 * exporting it from wellness, since that module's helper is private and
 * pulling it out would be an unprompted refactor.)
 */

function playerScoped(playerColumn: string): string {
  return `EXISTS (
    SELECT 1 FROM player_coach_assignments pca
    WHERE pca.player_id = ${playerColumn} AND pca.coach_user_id = :coachId
  )`;
}

// ── KPI strip ─────────────────────────────────────────────────────────

export async function getKpiStrip(user: AuthUser) {
  const coachId = user.id;

  const [todaySessions, players, openInjuries, pendingTasks] =
    await Promise.all([
      sequelize.query<{ count: string }>(
        `SELECT COUNT(*)::INT AS count FROM sessions s
         WHERE s.session_date = CURRENT_DATE
           AND ${playerScoped("s.player_id")}`,
        { type: QueryTypes.SELECT, replacements: { coachId } },
      ),
      sequelize.query<{ count: string }>(
        `SELECT COUNT(DISTINCT pca.player_id)::INT AS count
         FROM player_coach_assignments pca
         WHERE pca.coach_user_id = :coachId`,
        { type: QueryTypes.SELECT, replacements: { coachId } },
      ),
      sequelize.query<{ count: string }>(
        `SELECT COUNT(*)::INT AS count FROM injuries i
         WHERE i.status NOT IN ('Resolved', 'Closed')
           AND ${playerScoped("i.player_id")}`,
        { type: QueryTypes.SELECT, replacements: { coachId } },
      ),
      sequelize.query<{ count: string }>(
        `SELECT COUNT(*)::INT AS count FROM tasks t
         WHERE t.assigned_to = :coachId AND t.status != 'Completed'`,
        { type: QueryTypes.SELECT, replacements: { coachId } },
      ),
    ]);

  return {
    todaySessionsCount: Number(todaySessions[0]?.count ?? 0),
    assignedPlayersCount: Number(players[0]?.count ?? 0),
    openAlertsCount: Number(openInjuries[0]?.count ?? 0),
    pendingTasksCount: Number(pendingTasks[0]?.count ?? 0),
  };
}

// ── Today's agenda (sessions + tasks due today) ───────────────────────

export async function getAgenda(user: AuthUser) {
  const coachId = user.id;

  const [sessions, tasks] = await Promise.all([
    sequelize.query<Record<string, unknown>>(
      `SELECT s.id,
              'session'::text AS type,
              COALESCE(s.title, s.session_type) AS title,
              s.title_ar,
              s.session_date AS date,
              s.completion_status AS status,
              s.player_id,
              p.first_name || ' ' || p.last_name AS player_name,
              COALESCE(p.first_name_ar, '') || ' ' || COALESCE(p.last_name_ar, '') AS player_name_ar
         FROM sessions s
         LEFT JOIN players p ON p.id = s.player_id
        WHERE s.session_date = CURRENT_DATE
          AND ${playerScoped("s.player_id")}
        ORDER BY s.created_at ASC
        LIMIT 25`,
      { type: QueryTypes.SELECT, replacements: { coachId } },
    ),
    sequelize.query<Record<string, unknown>>(
      `SELECT t.id,
              'task'::text AS type,
              t.title,
              t.title_ar,
              t.due_date AS date,
              t.status,
              t.priority,
              t.player_id,
              p.first_name || ' ' || p.last_name AS player_name,
              COALESCE(p.first_name_ar, '') || ' ' || COALESCE(p.last_name_ar, '') AS player_name_ar
         FROM tasks t
         LEFT JOIN players p ON p.id = t.player_id
        WHERE t.due_date = CURRENT_DATE
          AND t.assigned_to = :coachId
          AND t.status != 'Completed'
        ORDER BY CASE t.priority
                   WHEN 'critical' THEN 0
                   WHEN 'high' THEN 1
                   WHEN 'medium' THEN 2
                   ELSE 3
                 END
        LIMIT 25`,
      { type: QueryTypes.SELECT, replacements: { coachId } },
    ),
  ]);

  return {
    items: [...sessions, ...tasks].map(camelCaseKeys),
  };
}

// ── Player alerts (4 grouped lists) ───────────────────────────────────

export async function getAlerts(user: AuthUser) {
  const coachId = user.id;

  const [missedTraining, missedPulse, dietNonCompliance, openInjuries] =
    await Promise.all([
      sequelize.query<Record<string, unknown>>(
        `SELECT s.id,
                s.player_id,
                s.session_date,
                s.completion_status,
                p.first_name || ' ' || p.last_name AS player_name,
                COALESCE(p.first_name_ar, '') || ' ' || COALESCE(p.last_name_ar, '') AS player_name_ar
           FROM sessions s
           JOIN players p ON p.id = s.player_id
          WHERE s.session_date >= CURRENT_DATE - INTERVAL '7 days'
            AND s.session_date < CURRENT_DATE
            AND s.completion_status IN ('NoShow', 'Scheduled')
            AND ${playerScoped("s.player_id")}
          ORDER BY s.session_date DESC
          LIMIT 10`,
        { type: QueryTypes.SELECT, replacements: { coachId } },
      ),
      sequelize.query<Record<string, unknown>>(
        `SELECT p.id AS player_id,
                p.first_name || ' ' || p.last_name AS player_name,
                COALESCE(p.first_name_ar, '') || ' ' || COALESCE(p.last_name_ar, '') AS player_name_ar,
                MAX(wc.checkin_date) AS last_checkin
           FROM players p
           LEFT JOIN wellness_checkins wc ON wc.player_id = p.id
          WHERE ${playerScoped("p.id")}
            AND NOT EXISTS (
              SELECT 1 FROM wellness_checkins wc2
               WHERE wc2.player_id = p.id AND wc2.checkin_date = CURRENT_DATE
            )
          GROUP BY p.id, p.first_name, p.last_name, p.first_name_ar, p.last_name_ar
          ORDER BY last_checkin NULLS FIRST
          LIMIT 10`,
        { type: QueryTypes.SELECT, replacements: { coachId } },
      ),
      sequelize.query<Record<string, unknown>>(
        `SELECT p.id AS player_id,
                p.first_name || ' ' || p.last_name AS player_name,
                COALESCE(p.first_name_ar, '') || ' ' || COALESCE(p.last_name_ar, '') AS player_name_ar,
                MAX(wl.logged_at) AS last_weight_log,
                (CURRENT_DATE - MAX(wl.logged_at)::date) AS days_since_log
           FROM players p
           LEFT JOIN wellness_weight_logs wl ON wl.player_id = p.id
          WHERE ${playerScoped("p.id")}
          GROUP BY p.id, p.first_name, p.last_name, p.first_name_ar, p.last_name_ar
         HAVING MAX(wl.logged_at) IS NULL
             OR (CURRENT_DATE - MAX(wl.logged_at)::date) > 7
          ORDER BY days_since_log DESC NULLS FIRST
          LIMIT 10`,
        { type: QueryTypes.SELECT, replacements: { coachId } },
      ),
      sequelize.query<Record<string, unknown>>(
        `SELECT i.id,
                i.player_id,
                i.injury_type,
                i.injury_type_ar,
                i.body_part,
                i.body_part_ar,
                i.status,
                i.injury_date,
                i.expected_return_date,
                p.first_name || ' ' || p.last_name AS player_name,
                COALESCE(p.first_name_ar, '') || ' ' || COALESCE(p.last_name_ar, '') AS player_name_ar
           FROM injuries i
           JOIN players p ON p.id = i.player_id
          WHERE i.status NOT IN ('Resolved', 'Closed')
            AND ${playerScoped("i.player_id")}
          ORDER BY i.injury_date DESC
          LIMIT 10`,
        { type: QueryTypes.SELECT, replacements: { coachId } },
      ),
    ]);

  return {
    missedTraining: missedTraining.map(camelCaseKeys),
    missedPulse: missedPulse.map(camelCaseKeys),
    dietNonCompliance: dietNonCompliance.map(camelCaseKeys),
    openInjuries: openInjuries.map(camelCaseKeys),
  };
}

// ── Attendance trend (zero-filled time series) ────────────────────────

export async function getAttendanceTrend(user: AuthUser, days: number) {
  const coachId = user.id;

  const rows = await sequelize.query<{
    date: string;
    attended: number;
    missed: number;
    total: number;
  }>(
    `WITH series AS (
       SELECT generate_series(
         (CURRENT_DATE - (:days::int - 1) * INTERVAL '1 day')::date,
         CURRENT_DATE,
         INTERVAL '1 day'
       )::date AS d
     )
     SELECT series.d AS date,
            COALESCE(SUM(CASE WHEN s.completion_status = 'Completed' THEN 1 ELSE 0 END), 0)::int AS attended,
            COALESCE(SUM(CASE WHEN s.completion_status IN ('NoShow', 'Cancelled') THEN 1 ELSE 0 END), 0)::int AS missed,
            COALESCE(COUNT(s.id), 0)::int AS total
       FROM series
       LEFT JOIN sessions s
         ON s.session_date = series.d
        AND ${playerScoped("s.player_id")}
       GROUP BY series.d
       ORDER BY series.d ASC`,
    { type: QueryTypes.SELECT, replacements: { coachId, days } },
  );

  return rows.map((r) => ({
    date: r.date,
    attended: r.attended,
    missed: r.missed,
    total: r.total,
    rate: r.total > 0 ? Math.round((r.attended / r.total) * 100) : null,
  }));
}

// ── Task velocity per ISO week ────────────────────────────────────────

export async function getTaskVelocity(user: AuthUser, weeks: number) {
  const coachId = user.id;

  const rows = await sequelize.query<{
    week_start: string;
    completed: number;
    overdue: number;
    created: number;
  }>(
    `WITH series AS (
       SELECT generate_series(
         date_trunc('week', CURRENT_DATE) - ((:weeks::int - 1) * INTERVAL '1 week'),
         date_trunc('week', CURRENT_DATE),
         INTERVAL '1 week'
       )::date AS week_start
     )
     SELECT series.week_start,
            COALESCE(SUM(CASE
              WHEN t.status = 'Completed'
                AND t.completed_at >= series.week_start
                AND t.completed_at < series.week_start + INTERVAL '1 week'
              THEN 1 ELSE 0 END), 0)::int AS completed,
            COALESCE(SUM(CASE
              WHEN t.status != 'Completed'
                AND t.due_date >= series.week_start
                AND t.due_date < series.week_start + INTERVAL '1 week'
                AND t.due_date < CURRENT_DATE
              THEN 1 ELSE 0 END), 0)::int AS overdue,
            COALESCE(SUM(CASE
              WHEN t.created_at >= series.week_start
                AND t.created_at < series.week_start + INTERVAL '1 week'
              THEN 1 ELSE 0 END), 0)::int AS created
       FROM series
       LEFT JOIN tasks t ON t.assigned_to = :coachId
      GROUP BY series.week_start
      ORDER BY series.week_start ASC`,
    { type: QueryTypes.SELECT, replacements: { coachId, weeks } },
  );

  return rows.map((r) => ({
    weekStart: r.week_start,
    completed: r.completed,
    overdue: r.overdue,
    created: r.created,
  }));
}
