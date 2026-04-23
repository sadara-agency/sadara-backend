// ── Staff Monitoring Service — lifecycle + analytics

import { QueryTypes } from "sequelize";
import { sequelize } from "@config/database";
import { logger } from "@config/logger";
import {
  cacheOrFetch,
  buildCacheKey,
  CacheTTL,
  CachePrefix,
} from "@shared/utils/cache";

const P = CachePrefix.STAFF_MON;

// ══════════════════════════════════════════════════════════════
// Session Lifecycle
// ══════════════════════════════════════════════════════════════

export interface CreateSessionInput {
  userId: string;
  userType?: "user" | "player";
  ipAddress?: string;
  userAgent?: string;
}

export async function createSession(
  input: CreateSessionInput,
): Promise<{ id: string }> {
  const { userId, userType = "user", ipAddress, userAgent } = input;

  const rows = await sequelize.query<{ id: string }>(
    `INSERT INTO user_sessions
       (user_id, user_type, started_at, last_heartbeat_at, ip_address, user_agent, created_at, updated_at)
     VALUES
       (:userId, :userType, NOW(), NOW(), :ipAddress, :userAgent, NOW(), NOW())
     RETURNING id`,
    {
      replacements: {
        userId,
        userType,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
      type: QueryTypes.SELECT,
    },
  );

  return { id: (rows[0] as { id: string }).id };
}

export async function heartbeat(userId: string): Promise<void> {
  await sequelize.query(
    `UPDATE user_sessions
     SET last_heartbeat_at = NOW(), updated_at = NOW()
     WHERE user_id = :userId AND ended_at IS NULL`,
    { replacements: { userId } },
  );
}

export async function endSession(
  userId: string,
  reason: string,
): Promise<void> {
  await sequelize.query(
    `UPDATE user_sessions
     SET ended_at = NOW(),
         end_reason = :reason,
         duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER,
         updated_at = NOW()
     WHERE user_id = :userId AND ended_at IS NULL`,
    { replacements: { userId, reason } },
  );
}

export async function endAllOpenSessions(
  userId: string,
  reason: string,
): Promise<number> {
  const result = await sequelize.query(
    `UPDATE user_sessions
     SET ended_at = NOW(),
         end_reason = :reason,
         duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER,
         updated_at = NOW()
     WHERE user_id = :userId AND ended_at IS NULL`,
    { replacements: { userId, reason } },
  );

  // result[1] is metadata; rowCount may be on the metadata object
  const meta = result[1] as { rowCount?: number } | undefined;
  return meta?.rowCount ?? 0;
}

// ══════════════════════════════════════════════════════════════
// Idle Session Closer (called by cron every 10 min)
// Closes sessions where last_heartbeat_at is older than 30 min.
// Sets ended_at = last_heartbeat_at + 5 min (the last known-active moment)
// so duration does not over-count.
// ══════════════════════════════════════════════════════════════

export async function closeIdleSessions(): Promise<number> {
  try {
    const result = await sequelize.query(
      `UPDATE user_sessions
       SET ended_at = last_heartbeat_at + INTERVAL '5 minutes',
           end_reason = 'idle_timeout',
           duration_seconds = EXTRACT(EPOCH FROM (last_heartbeat_at + INTERVAL '5 minutes' - started_at))::INTEGER,
           updated_at = NOW()
       WHERE ended_at IS NULL
         AND last_heartbeat_at < NOW() - INTERVAL '30 minutes'`,
    );

    const meta = result[1] as { rowCount?: number } | undefined;
    const closed = meta?.rowCount ?? 0;

    if (closed > 0) {
      logger.info(`[StaffMonitoring] Closed ${closed} idle sessions`);
    }

    return closed;
  } catch (err) {
    logger.error("[StaffMonitoring] closeIdleSessions failed", {
      error: (err as Error).message,
    });
    return 0;
  }
}

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

export interface StaffEngagementRow {
  userId: string;
  fullName: string;
  fullNameAr: string | null;
  role: string;
  loginCount: number;
  activeDays: number;
  totalHours: number;
  avgSessionMinutes: number;
  lastLoginAt: string | null;
  onlineStatus: "online" | "idle" | "offline";
}

export interface SessionRow {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  ipAddress: string | null;
  endReason: string | null;
}

export interface StaffEngagementDetail extends StaffEngagementRow {
  dailyHours: { date: string; hours: number }[];
  recentSessions: SessionRow[];
}

export interface HeatmapCell {
  dayOfWeek: number;
  hour: number;
  count: number;
}

export interface StaffTaskPerformanceRow {
  userId: string;
  fullName: string;
  fullNameAr: string | null;
  role: string;
  totalAssigned: number;
  completed: number;
  overdue: number;
  completionRate: number;
  onTimeRate: number;
  avgCompletionHours: number;
  priorityWeightedCompleted: number;
}

export interface StaffRankingRow extends StaffTaskPerformanceRow {
  activeDays: number;
  totalHours: number;
  productivityScore: number;
  qualityScore: number;
  engagementScore: number;
  kpiScore: number;
  rank: number;
  isTopPerformer: boolean;
  isUnderperformer: boolean;
}

// ══════════════════════════════════════════════════════════════
// Peer role buckets for KPI fairness
// ══════════════════════════════════════════════════════════════

const ROLE_BUCKETS: Record<string, string> = {
  Coach: "coaches",
  SkillCoach: "coaches",
  TacticalCoach: "coaches",
  FitnessCoach: "coaches",
  GymCoach: "coaches",
  GoalkeeperCoach: "coaches",
  MentalCoach: "coaches",
  NutritionSpecialist: "coaches",
  Analyst: "scouting",
  Scout: "scouting",
  Media: "media",
  Manager: "ops",
  Executive: "ops",
  SportingDirector: "ops",
  Legal: "ops",
  Finance: "ops",
  Admin: "ops",
};

function roleBucket(role: string): string {
  return ROLE_BUCKETS[role] ?? "other";
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

const EPSILON = 0.01;

// ══════════════════════════════════════════════════════════════
// KPI Computation (pure function — testable)
// ══════════════════════════════════════════════════════════════

export interface KpiInputRow {
  userId: string;
  role: string;
  priorityWeightedCompleted: number;
  overdue: number;
  totalAssigned: number;
  completed: number;
  onTimeRate: number;
  activeDays: number;
  totalHours: number;
}

export interface KpiOutputRow extends KpiInputRow {
  productivityScore: number;
  qualityScore: number;
  engagementScore: number;
  kpiScore: number;
}

export function computeKpiScores(rows: KpiInputRow[]): KpiOutputRow[] {
  // Group by peer bucket and compute median priorityWeightedCompleted
  const bucketMap: Record<string, number[]> = {};
  for (const r of rows) {
    const b = roleBucket(r.role);
    if (!bucketMap[b]) bucketMap[b] = [];
    bucketMap[b].push(r.priorityWeightedCompleted);
  }
  const bucketMedians: Record<string, number> = {};
  for (const [b, vals] of Object.entries(bucketMap)) {
    const m = median(vals);
    // Single-member bucket — set median to 80% of their own score to avoid self-comparison
    bucketMedians[b] = vals.length === 1 ? m * 0.8 : m;
  }

  return rows.map((r) => {
    const b = roleBucket(r.role);
    const medianC = bucketMedians[b] ?? 0;

    const productivityScore = clamp(
      Math.max(
        0,
        100 *
          Math.min(
            r.priorityWeightedCompleted / Math.max(medianC * 1.5, EPSILON),
            1,
          ) -
          10 * Math.min(r.overdue, 5),
      ),
      0,
      100,
    );

    const qualityScore =
      r.completed === 0 && r.totalAssigned < 3 ? 100 : 100 * r.onTimeRate;

    const dSafe = Math.max(r.activeDays, 1);
    const engagementScore =
      100 *
      Math.min(r.activeDays / 20, 1) *
      Math.min(r.totalHours / dSafe / 6, 1);

    const kpiScore = Math.round(
      clamp(
        0.5 * productivityScore + 0.3 * qualityScore + 0.2 * engagementScore,
        0,
        100,
      ),
    );

    return {
      ...r,
      productivityScore: Math.round(productivityScore),
      qualityScore: Math.round(qualityScore),
      engagementScore: Math.round(engagementScore),
      kpiScore,
    };
  });
}

// ══════════════════════════════════════════════════════════════
// Aggregation Queries
// ══════════════════════════════════════════════════════════════

export async function getEngagementSummary(params: {
  roleFilter?: string[];
  rangeDays?: number;
}): Promise<StaffEngagementRow[]> {
  const { roleFilter, rangeDays = 30 } = params;
  const cacheKey = buildCacheKey(`${P}:engagement`, {
    rangeDays,
    role: roleFilter?.join(","),
  });

  return cacheOrFetch(
    cacheKey,
    async () => {
      const roleClause =
        roleFilter && roleFilter.length > 0
          ? `AND u.role = ANY(ARRAY[${roleFilter.map((r) => `'${r.replace(/'/g, "''")}'`).join(",")}])`
          : "";

      type RawRow = {
        user_id: string;
        full_name: string;
        full_name_ar: string | null;
        role: string;
        login_count: string;
        active_days: string;
        total_hours: string;
        avg_session_minutes: string;
        last_login_at: string | null;
        last_heartbeat: string | null;
      };

      const rows = await sequelize.query<RawRow>(
        `SELECT
           u.id                                                            AS user_id,
           u.full_name,
           u.full_name_ar,
           u.role,
           COUNT(s.id)                                                     AS login_count,
           COUNT(DISTINCT DATE(s.started_at))                             AS active_days,
           COALESCE(
             SUM(COALESCE(s.duration_seconds, EXTRACT(EPOCH FROM (NOW() - s.started_at))))
             / 3600.0, 0
           )                                                               AS total_hours,
           COALESCE(
             AVG(COALESCE(s.duration_seconds, EXTRACT(EPOCH FROM (NOW() - s.started_at))))
             / 60.0, 0
           )                                                               AS avg_session_minutes,
           MAX(s.started_at)                                               AS last_login_at,
           MAX(s.last_heartbeat_at) FILTER (WHERE s.ended_at IS NULL)      AS last_heartbeat
         FROM users u
         LEFT JOIN user_sessions s
           ON s.user_id = u.id
           AND s.started_at >= NOW() - INTERVAL '1 day' * :rangeDays
           AND s.user_type = 'user'
         WHERE u.role != 'Player'
           AND u.is_active = TRUE
           ${roleClause}
         GROUP BY u.id, u.full_name, u.full_name_ar, u.role
         ORDER BY total_hours DESC`,
        { replacements: { rangeDays }, type: QueryTypes.SELECT },
      );

      return rows.map((r) => {
        const lastHeartbeat = r.last_heartbeat
          ? new Date(r.last_heartbeat)
          : null;
        const now = Date.now();
        const diffMin = lastHeartbeat
          ? (now - lastHeartbeat.getTime()) / 60000
          : Infinity;
        const onlineStatus: "online" | "idle" | "offline" =
          diffMin < 6 ? "online" : diffMin < 31 ? "idle" : "offline";

        return {
          userId: r.user_id,
          fullName: r.full_name,
          fullNameAr: r.full_name_ar,
          role: r.role,
          loginCount: Number(r.login_count),
          activeDays: Number(r.active_days),
          totalHours: Math.round(Number(r.total_hours) * 10) / 10,
          avgSessionMinutes: Math.round(Number(r.avg_session_minutes)),
          lastLoginAt: r.last_login_at,
          onlineStatus,
        };
      });
    },
    CacheTTL.MEDIUM,
  );
}

export async function getEngagementDetail(
  userId: string,
  rangeDays: number,
): Promise<StaffEngagementDetail> {
  const cacheKey = `${P}:engagement:${userId}:${rangeDays}`;

  return cacheOrFetch(
    cacheKey,
    async () => {
      const summaryRows = await getEngagementSummary({ rangeDays });
      const summary = summaryRows.find((r) => r.userId === userId);

      if (!summary) {
        // User exists but has no sessions — fetch user directly
        type UserRow = {
          user_id: string;
          full_name: string;
          full_name_ar: string | null;
          role: string;
        };
        const [user] = await sequelize.query<UserRow>(
          `SELECT id AS user_id, full_name, full_name_ar, role FROM users WHERE id = :userId`,
          { replacements: { userId }, type: QueryTypes.SELECT },
        );
        const base: StaffEngagementRow = {
          userId,
          fullName: user?.full_name ?? "Unknown",
          fullNameAr: user?.full_name_ar ?? null,
          role: user?.role ?? "Unknown",
          loginCount: 0,
          activeDays: 0,
          totalHours: 0,
          avgSessionMinutes: 0,
          lastLoginAt: null,
          onlineStatus: "offline",
        };
        return { ...base, dailyHours: [], recentSessions: [] };
      }

      // Daily hours breakdown
      type DayRow = { date: string; hours: string };
      const dailyRaw = await sequelize.query<DayRow>(
        `SELECT
           DATE(s.started_at)::TEXT AS date,
           SUM(COALESCE(s.duration_seconds, EXTRACT(EPOCH FROM (NOW() - s.started_at))))
             / 3600.0               AS hours
         FROM user_sessions s
         WHERE s.user_id = :userId
           AND s.started_at >= NOW() - INTERVAL '1 day' * :rangeDays
           AND s.user_type = 'user'
         GROUP BY DATE(s.started_at)
         ORDER BY DATE(s.started_at)`,
        { replacements: { userId, rangeDays }, type: QueryTypes.SELECT },
      );

      // Recent sessions (last 20)
      type SessRow = {
        id: string;
        started_at: string;
        ended_at: string | null;
        duration_seconds: number | null;
        ip_address: string | null;
        end_reason: string | null;
      };
      const sessRaw = await sequelize.query<SessRow>(
        `SELECT id, started_at, ended_at, duration_seconds, ip_address, end_reason
         FROM user_sessions
         WHERE user_id = :userId AND user_type = 'user'
         ORDER BY started_at DESC
         LIMIT 20`,
        { replacements: { userId }, type: QueryTypes.SELECT },
      );

      return {
        ...summary,
        dailyHours: dailyRaw.map((d) => ({
          date: d.date,
          hours: Math.round(Number(d.hours) * 10) / 10,
        })),
        recentSessions: sessRaw.map((s) => ({
          id: s.id,
          startedAt: s.started_at,
          endedAt: s.ended_at,
          durationSeconds: s.duration_seconds,
          ipAddress: s.ip_address,
          endReason: s.end_reason,
        })),
      };
    },
    CacheTTL.MEDIUM,
  );
}

export async function getTaskPerformance(params: {
  roleFilter?: string[];
  rangeDays?: number;
}): Promise<StaffTaskPerformanceRow[]> {
  const { roleFilter, rangeDays = 30 } = params;
  const cacheKey = buildCacheKey(`${P}:task-perf`, {
    rangeDays,
    role: roleFilter?.join(","),
  });

  return cacheOrFetch(
    cacheKey,
    async () => {
      const roleClause =
        roleFilter && roleFilter.length > 0
          ? `AND u.role = ANY(ARRAY[${roleFilter.map((r) => `'${r.replace(/'/g, "''")}'`).join(",")}])`
          : "";

      type RawRow = {
        user_id: string;
        full_name: string;
        full_name_ar: string | null;
        role: string;
        total_assigned: string;
        completed: string;
        overdue: string;
        completed_on_time: string;
        avg_completion_hours: string;
        priority_weighted: string;
      };

      const rows = await sequelize.query<RawRow>(
        `SELECT
           u.id                                                          AS user_id,
           u.full_name,
           u.full_name_ar,
           u.role,
           COUNT(t.id)                                                   AS total_assigned,
           COUNT(t.id) FILTER (WHERE t.status = 'Completed')            AS completed,
           COUNT(t.id) FILTER (
             WHERE t.status NOT IN ('Completed','Canceled')
               AND t.due_date IS NOT NULL
               AND t.due_date < CURRENT_DATE
           )                                                             AS overdue,
           COUNT(t.id) FILTER (
             WHERE t.status = 'Completed'
               AND t.due_date IS NOT NULL
               AND t.completed_at::DATE <= t.due_date::DATE
           )                                                             AS completed_on_time,
           COALESCE(AVG(
             EXTRACT(EPOCH FROM (t.completed_at - t.created_at)) / 3600.0
           ) FILTER (WHERE t.status = 'Completed'), 0)                  AS avg_completion_hours,
           COALESCE(SUM(
             CASE t.priority
               WHEN 'critical' THEN 3
               WHEN 'high'     THEN 2
               WHEN 'medium'   THEN 1
               ELSE 0.5
             END
           ) FILTER (WHERE t.status = 'Completed'), 0)                  AS priority_weighted
         FROM users u
         LEFT JOIN tasks t
           ON t.assigned_to = u.id
           AND t.created_at >= NOW() - INTERVAL '1 day' * :rangeDays
         WHERE u.role != 'Player'
           AND u.is_active = TRUE
           ${roleClause}
         GROUP BY u.id, u.full_name, u.full_name_ar, u.role
         ORDER BY priority_weighted DESC`,
        { replacements: { rangeDays }, type: QueryTypes.SELECT },
      );

      return rows.map((r) => {
        const completed = Number(r.completed);
        const totalAssigned = Number(r.total_assigned);
        const completedOnTime = Number(r.completed_on_time);

        return {
          userId: r.user_id,
          fullName: r.full_name,
          fullNameAr: r.full_name_ar,
          role: r.role,
          totalAssigned,
          completed,
          overdue: Number(r.overdue),
          completionRate:
            totalAssigned > 0
              ? Math.round((completed / totalAssigned) * 100)
              : 0,
          onTimeRate:
            completed > 0
              ? Math.round((completedOnTime / completed) * 100) / 100
              : 1,
          avgCompletionHours:
            Math.round(Number(r.avg_completion_hours) * 10) / 10,
          priorityWeightedCompleted:
            Math.round(Number(r.priority_weighted) * 10) / 10,
        };
      });
    },
    CacheTTL.MEDIUM,
  );
}

export async function getRankings(params: {
  roleFilter?: string[];
  rangeDays?: number;
  limit?: number;
}): Promise<StaffRankingRow[]> {
  const { roleFilter, rangeDays = 30, limit = 50 } = params;
  const cacheKey = buildCacheKey(`${P}:rankings`, {
    rangeDays,
    role: roleFilter?.join(","),
    limit,
  });

  return cacheOrFetch(
    cacheKey,
    async () => {
      const [taskRows, engagementRows] = await Promise.all([
        getTaskPerformance({ roleFilter, rangeDays }),
        getEngagementSummary({ roleFilter, rangeDays }),
      ]);

      const engMap = new Map(engagementRows.map((e) => [e.userId, e]));

      const combined: KpiInputRow[] = taskRows.map((t) => {
        const eng = engMap.get(t.userId);
        return {
          userId: t.userId,
          role: t.role,
          priorityWeightedCompleted: t.priorityWeightedCompleted,
          overdue: t.overdue,
          totalAssigned: t.totalAssigned,
          completed: t.completed,
          onTimeRate: t.onTimeRate,
          activeDays: eng?.activeDays ?? 0,
          totalHours: eng?.totalHours ?? 0,
        };
      });

      const scored = computeKpiScores(combined);

      scored.sort((a, b) => b.kpiScore - a.kpiScore);

      return scored.slice(0, limit).map((s, idx) => {
        const task = taskRows.find((t) => t.userId === s.userId)!;
        const eng = engMap.get(s.userId);
        return {
          userId: s.userId,
          fullName: task.fullName,
          fullNameAr: task.fullNameAr,
          role: s.role,
          totalAssigned: task.totalAssigned,
          completed: task.completed,
          overdue: task.overdue,
          completionRate: task.completionRate,
          onTimeRate: task.onTimeRate,
          avgCompletionHours: task.avgCompletionHours,
          priorityWeightedCompleted: task.priorityWeightedCompleted,
          activeDays: eng?.activeDays ?? 0,
          totalHours: eng?.totalHours ?? 0,
          productivityScore: s.productivityScore,
          qualityScore: s.qualityScore,
          engagementScore: s.engagementScore,
          kpiScore: s.kpiScore,
          rank: idx + 1,
          isTopPerformer: s.kpiScore >= 80,
          isUnderperformer: s.kpiScore < 40 && task.totalAssigned >= 5,
        };
      });
    },
    CacheTTL.MEDIUM,
  );
}

export async function getActivityHeatmap(
  userId: string,
  rangeDays: 7 | 30 | 90,
): Promise<HeatmapCell[]> {
  const cacheKey = `${P}:heatmap:${userId}:${rangeDays}`;

  return cacheOrFetch(
    cacheKey,
    async () => {
      type RawCell = { day_of_week: string; hour: string; count: string };
      const rows = await sequelize.query<RawCell>(
        `SELECT
           EXTRACT(DOW FROM logged_at)::INTEGER AS day_of_week,
           EXTRACT(HOUR FROM logged_at)::INTEGER AS hour,
           COUNT(*)                              AS count
         FROM audit_logs
         WHERE user_id = :userId
           AND logged_at >= NOW() - INTERVAL '1 day' * :rangeDays
         GROUP BY day_of_week, hour
         ORDER BY day_of_week, hour`,
        { replacements: { userId, rangeDays }, type: QueryTypes.SELECT },
      );

      return rows.map((r) => ({
        dayOfWeek: Number(r.day_of_week),
        hour: Number(r.hour),
        count: Number(r.count),
      }));
    },
    CacheTTL.MEDIUM,
  );
}
