// ═══════════════════════════════════════════════════════════════
// Performance Trend Engine
//
// Detects multi-match performance patterns that single-match
// auto-tasks miss: declining trends, fatigue risk, breakout
// youth players, minutes drought, and assist streaks.
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "../../config/database";
import { logger } from "../../config/logger";
import { Task } from "../../modules/tasks/task.model";
import {
  notifyByRole,
  notifyUser,
} from "../../modules/notifications/notification.service";

// ── Configurable thresholds (loaded from app_settings) ──

export interface PerformanceTrendConfig {
  enabled: boolean;
  // performance-trend-check
  trendWindowMatches: number; // last N matches to analyze (default 5)
  trendDropThreshold: number; // avg rating drop vs season avg (default 1.5)
  // fatigue-risk-detector
  fatigueWindowMatches: number; // look-back window (default 4)
  fatigueMinFullMatches: number; // 90-min matches threshold (default 3)
  // breakout-player-alert
  breakoutWindowMatches: number; // last N matches (default 5)
  breakoutMinRating: number; // avg rating threshold (default 7.5)
}

const DEFAULT_CONFIG: PerformanceTrendConfig = {
  enabled: true,
  trendWindowMatches: 5,
  trendDropThreshold: 1.5,
  fatigueWindowMatches: 4,
  fatigueMinFullMatches: 3,
  breakoutWindowMatches: 5,
  breakoutMinRating: 7.5,
};

let _config: PerformanceTrendConfig = { ...DEFAULT_CONFIG };

export function getPerformanceTrendConfig(): PerformanceTrendConfig {
  return { ..._config };
}

/** Load config from app_settings (called once at startup) */
export async function loadPerformanceTrendConfig() {
  try {
    const [row] = (await sequelize.query(
      `SELECT value FROM app_settings WHERE key = 'performance_trend_config' LIMIT 1`,
      { type: "SELECT" as any },
    )) as any[];
    if (row?.value) {
      const parsed =
        typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      _config = { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch {
    // Table may not exist yet — use defaults
  }
}

/** Persist config to app_settings */
export async function savePerformanceTrendConfig(
  updates: Partial<PerformanceTrendConfig>,
) {
  _config = { ..._config, ...updates };
  try {
    await sequelize.query(
      `INSERT INTO app_settings (key, value) VALUES ('performance_trend_config', :val)
       ON CONFLICT (key) DO UPDATE SET value = :val`,
      { replacements: { val: JSON.stringify(_config) }, type: "RAW" as any },
    );
  } catch {
    // silently ignore if table missing
  }
}

// ── Helpers ──

function dueDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

async function createTrendTask(opts: {
  playerId: string;
  triggerRuleId: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  priority: "low" | "medium" | "high" | "critical";
  dueDays: number;
  assignedTo: string | null;
  type?: "Match" | "Health" | "General";
}): Promise<boolean> {
  // Prevent duplicates: same rule + player within last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const existing = await Task.findOne({
    where: sequelize.literal(`
      player_id = '${opts.playerId}'
      AND trigger_rule_id = '${opts.triggerRuleId}'
      AND is_auto_created = true
      AND created_at > '${sevenDaysAgo.toISOString()}'
      AND status NOT IN ('Completed', 'Canceled')
    `),
  });
  if (existing) return false;

  await Task.create({
    title: opts.title,
    titleAr: opts.titleAr,
    description: opts.description,
    type: opts.type ?? "Match",
    priority: opts.priority,
    status: "Open",
    playerId: opts.playerId,
    assignedTo: opts.assignedTo,
    isAutoCreated: true,
    triggerRuleId: opts.triggerRuleId,
    dueDate: dueDate(opts.dueDays),
    notes: opts.descriptionAr,
  } as any);

  // Notify assignee
  if (opts.assignedTo) {
    notifyUser(opts.assignedTo, {
      type: "task",
      title: opts.title,
      titleAr: opts.titleAr,
      body: opts.description,
      bodyAr: opts.descriptionAr,
      link: "/dashboard/tasks",
      sourceType: "task",
      priority: opts.priority === "critical" ? "critical" : "normal",
    }).catch((err) =>
      logger.warn("[PerfEngine] notification failed", {
        error: (err as Error).message,
      }),
    );
  }

  return true;
}

// ══════════════════════════════════════════════════════════════
// JOB 1: Performance Trend Check (weekly — Monday 10 AM)
//
// Compares each player's avg rating over the last N matches
// against their season average. Flags significant drops.
// ══════════════════════════════════════════════════════════════

export async function checkPerformanceTrends(): Promise<{
  playersAnalyzed: number;
  declining: number;
  tasksCreated: number;
}> {
  if (!_config.enabled)
    return { playersAnalyzed: 0, declining: 0, tasksCreated: 0 };

  const window = _config.trendWindowMatches;
  const dropThreshold = _config.trendDropThreshold;

  // Get players who have enough recent match data
  const players: any[] = await sequelize.query(
    `
    WITH recent_stats AS (
      SELECT
        pms.player_id,
        pms.rating,
        m.match_date,
        ROW_NUMBER() OVER (PARTITION BY pms.player_id ORDER BY m.match_date DESC) AS rn
      FROM player_match_stats pms
      JOIN matches m ON m.id = pms.match_id
      WHERE pms.rating IS NOT NULL
        AND m.status IN ('completed', 'Completed')
    ),
    season_avg AS (
      SELECT player_id, AVG(rating) AS season_avg, COUNT(*) AS total_matches
      FROM recent_stats
      GROUP BY player_id
      HAVING COUNT(*) >= :window
    ),
    recent_avg AS (
      SELECT player_id, AVG(rating) AS recent_avg
      FROM recent_stats
      WHERE rn <= :window
      GROUP BY player_id
    )
    SELECT
      sa.player_id,
      sa.season_avg,
      sa.total_matches,
      ra.recent_avg,
      ROUND(sa.season_avg - ra.recent_avg, 2) AS drop_amount,
      p.first_name, p.last_name,
      p.first_name_ar, p.last_name_ar,
      p.coach_id, p.analyst_id, p.agent_id
    FROM season_avg sa
    JOIN recent_avg ra ON ra.player_id = sa.player_id
    JOIN players p ON p.id = sa.player_id
    WHERE p.status = 'active'
      AND (sa.season_avg - ra.recent_avg) >= :threshold
    ORDER BY (sa.season_avg - ra.recent_avg) DESC
    `,
    {
      replacements: { window, threshold: dropThreshold },
      type: "SELECT" as any,
    },
  );

  let tasksCreated = 0;

  for (const row of players) {
    const playerName = `${row.first_name} ${row.last_name}`.trim();
    const playerNameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : playerName;

    const created = await createTrendTask({
      playerId: row.player_id,
      triggerRuleId: "perf_trend_decline",
      title: `Performance decline: ${playerName}`,
      titleAr: `تراجع في الأداء: ${playerNameAr}`,
      description:
        `${playerName}'s avg rating over the last ${window} matches is ${Number(row.recent_avg).toFixed(1)} ` +
        `(season avg: ${Number(row.season_avg).toFixed(1)}, drop: ${row.drop_amount}). ` +
        `Review training plan and schedule a performance review session.`,
      descriptionAr:
        `متوسط تقييم ${playerNameAr} في آخر ${window} مباريات هو ${Number(row.recent_avg).toFixed(1)} ` +
        `(متوسط الموسم: ${Number(row.season_avg).toFixed(1)}، انخفاض: ${row.drop_amount}). ` +
        `مراجعة الخطة التدريبية وجدولة جلسة مراجعة أداء.`,
      priority:
        Number(row.drop_amount) >= dropThreshold * 1.5 ? "critical" : "high",
      dueDays: 3,
      assignedTo: row.coach_id || row.analyst_id || null,
    });

    if (created) {
      tasksCreated++;

      // Also update risk_radar performance_risk
      await sequelize
        .query(
          `INSERT INTO risk_radars (player_id, performance_risk, overall_risk, assessed_at)
         VALUES (:playerId, 'High', 'Medium', NOW())
         ON CONFLICT (player_id) DO UPDATE SET
           performance_risk = 'High',
           overall_risk = CASE
             WHEN risk_radars.injury_risk = 'High' OR risk_radars.contract_risk = 'High' THEN 'High'
             ELSE 'Medium'
           END,
           assessed_at = NOW()`,
          { replacements: { playerId: row.player_id } },
        )
        .catch((err) =>
          logger.warn("[PerfEngine] risk_radar update failed", {
            error: (err as Error).message,
          }),
        );

      // Notify coaching staff
      await notifyByRole(["Coach", "Analyst", "Manager"], {
        type: "system",
        title: `Performance decline: ${playerName}`,
        titleAr: `تراجع في الأداء: ${playerNameAr}`,
        body: `Rating dropped ${row.drop_amount} points over last ${window} matches`,
        bodyAr: `انخفض التقييم ${row.drop_amount} نقطة خلال آخر ${window} مباريات`,
        link: `/dashboard/players/${row.player_id}`,
        sourceType: "player",
        sourceId: row.player_id,
        priority: "high",
      });
    }
  }

  // Reset performance_risk for players no longer declining
  await sequelize
    .query(
      `UPDATE risk_radars SET performance_risk = 'Low', assessed_at = NOW()
     WHERE performance_risk IN ('Medium', 'High')
       AND player_id NOT IN (
         SELECT player_id FROM (
           WITH recent AS (
             SELECT pms.player_id, pms.rating,
                    ROW_NUMBER() OVER (PARTITION BY pms.player_id ORDER BY m.match_date DESC) AS rn
             FROM player_match_stats pms
             JOIN matches m ON m.id = pms.match_id
             WHERE pms.rating IS NOT NULL AND m.status IN ('completed', 'Completed')
           )
           SELECT r.player_id
           FROM recent r
           JOIN (SELECT player_id, AVG(rating) AS sa FROM recent GROUP BY player_id) s ON s.player_id = r.player_id
           WHERE r.rn <= :window
           GROUP BY r.player_id, s.sa
           HAVING (s.sa - AVG(r.rating)) >= :threshold
         ) declining
       )`,
      { replacements: { window, threshold: dropThreshold } },
    )
    .catch(() => {});

  return {
    playersAnalyzed: players.length + (await getActivePlayerCount()),
    declining: players.length,
    tasksCreated,
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 2: Fatigue Risk Detector (daily — 7 AM)
//
// Flags players who played 90 min in 3+ of the last 4 matches.
// Cross-references recent match load to suggest rotation.
// ══════════════════════════════════════════════════════════════

export async function checkFatigueRisk(): Promise<{
  playersChecked: number;
  fatigued: number;
  tasksCreated: number;
}> {
  if (!_config.enabled)
    return { playersChecked: 0, fatigued: 0, tasksCreated: 0 };

  const windowSize = _config.fatigueWindowMatches;
  const minFull = _config.fatigueMinFullMatches;

  const rows: any[] = await sequelize.query(
    `
    WITH recent_matches AS (
      SELECT
        pms.player_id,
        pms.minutes_played,
        m.match_date,
        ROW_NUMBER() OVER (PARTITION BY pms.player_id ORDER BY m.match_date DESC) AS rn
      FROM player_match_stats pms
      JOIN matches m ON m.id = pms.match_id
      WHERE m.status IN ('completed', 'Completed')
        AND pms.minutes_played IS NOT NULL
    )
    SELECT
      rm.player_id,
      COUNT(*) FILTER (WHERE rm.minutes_played >= 85) AS full_matches,
      SUM(rm.minutes_played) AS total_minutes,
      p.first_name, p.last_name,
      p.first_name_ar, p.last_name_ar,
      p.coach_id, p.agent_id
    FROM recent_matches rm
    JOIN players p ON p.id = rm.player_id
    WHERE rm.rn <= :windowSize
      AND p.status = 'active'
    GROUP BY rm.player_id, p.first_name, p.last_name,
             p.first_name_ar, p.last_name_ar, p.coach_id, p.agent_id
    HAVING COUNT(*) FILTER (WHERE rm.minutes_played >= 85) >= :minFull
    ORDER BY full_matches DESC, total_minutes DESC
    `,
    {
      replacements: { windowSize, minFull },
      type: "SELECT" as any,
    },
  );

  let tasksCreated = 0;

  for (const row of rows) {
    const playerName = `${row.first_name} ${row.last_name}`.trim();
    const playerNameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : playerName;

    const created = await createTrendTask({
      playerId: row.player_id,
      triggerRuleId: "fatigue_risk",
      title: `Fatigue risk — rotation recommended: ${playerName}`,
      titleAr: `خطر إرهاق — يُنصح بالتدوير: ${playerNameAr}`,
      description:
        `${playerName} played 85+ minutes in ${row.full_matches} of the last ${windowSize} matches ` +
        `(${row.total_minutes} total minutes). Consider rotation to prevent injury.`,
      descriptionAr:
        `${playerNameAr} لعب 85+ دقيقة في ${row.full_matches} من آخر ${windowSize} مباريات ` +
        `(${row.total_minutes} دقيقة إجمالاً). يُنصح بالتدوير لتفادي الإصابة.`,
      priority: "high",
      dueDays: 2,
      assignedTo: row.coach_id || null,
      type: "Health",
    });

    if (created) tasksCreated++;
  }

  return {
    playersChecked: await getActivePlayerCount(),
    fatigued: rows.length,
    tasksCreated,
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 3: Breakout Player Alert (weekly — Monday 10:30 AM)
//
// Youth/Amateur players with avg rating ≥ 7.5 over last 5
// matches → notify scouts + manager for promotion review.
// ══════════════════════════════════════════════════════════════

export async function checkBreakoutPlayers(): Promise<{
  youthChecked: number;
  breakouts: number;
  tasksCreated: number;
}> {
  if (!_config.enabled)
    return { youthChecked: 0, breakouts: 0, tasksCreated: 0 };

  const window = _config.breakoutWindowMatches;
  const minRating = _config.breakoutMinRating;

  const rows: any[] = await sequelize.query(
    `
    WITH recent_stats AS (
      SELECT
        pms.player_id,
        pms.rating,
        pms.goals,
        pms.assists,
        ROW_NUMBER() OVER (PARTITION BY pms.player_id ORDER BY m.match_date DESC) AS rn
      FROM player_match_stats pms
      JOIN matches m ON m.id = pms.match_id
      WHERE pms.rating IS NOT NULL
        AND m.status IN ('completed', 'Completed')
    )
    SELECT
      rs.player_id,
      ROUND(AVG(rs.rating), 2) AS avg_rating,
      SUM(COALESCE(rs.goals, 0)) AS total_goals,
      SUM(COALESCE(rs.assists, 0)) AS total_assists,
      COUNT(*) AS match_count,
      p.first_name, p.last_name,
      p.first_name_ar, p.last_name_ar,
      p.player_type, p.position,
      p.agent_id, p.coach_id
    FROM recent_stats rs
    JOIN players p ON p.id = rs.player_id
    WHERE rs.rn <= :window
      AND p.status = 'active'
      AND p.player_type IN ('Youth', 'Amateur')
    GROUP BY rs.player_id, p.first_name, p.last_name,
             p.first_name_ar, p.last_name_ar, p.player_type, p.position,
             p.agent_id, p.coach_id
    HAVING COUNT(*) >= :minMatches AND AVG(rs.rating) >= :minRating
    ORDER BY AVG(rs.rating) DESC
    `,
    {
      replacements: { window, minRating, minMatches: Math.min(3, window) },
      type: "SELECT" as any,
    },
  );

  let tasksCreated = 0;

  for (const row of rows) {
    const playerName = `${row.first_name} ${row.last_name}`.trim();
    const playerNameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : playerName;

    const created = await createTrendTask({
      playerId: row.player_id,
      triggerRuleId: "breakout_player",
      title: `Breakout ${row.player_type} player: ${playerName}`,
      titleAr: `لاعب ${row.player_type === "Youth" ? "شاب" : "هاوٍ"} متميز: ${playerNameAr}`,
      description:
        `${playerName} (${row.player_type}, ${row.position || "N/A"}) averaged ${Number(row.avg_rating).toFixed(1)} ` +
        `rating over the last ${row.match_count} matches (${row.total_goals}G, ${row.total_assists}A). ` +
        `Review for potential promotion or first-team involvement.`,
      descriptionAr:
        `${playerNameAr} (${row.player_type === "Youth" ? "شاب" : "هاوٍ"}, ${row.position || "غير محدد"}) حقق متوسط تقييم ${Number(row.avg_rating).toFixed(1)} ` +
        `في آخر ${row.match_count} مباريات (${row.total_goals} أهداف، ${row.total_assists} تمريرات). ` +
        `مراجعة لاحتمال الترقية أو الإشراك في الفريق الأول.`,
      priority: "medium",
      dueDays: 5,
      assignedTo: row.coach_id || row.agent_id || null,
    });

    if (created) {
      tasksCreated++;

      // Notify scouts and manager
      await notifyByRole(["Scout", "Manager"], {
        type: "system",
        title: `Breakout ${row.player_type}: ${playerName}`,
        titleAr: `لاعب ${row.player_type === "Youth" ? "شاب" : "هاوٍ"} متميز: ${playerNameAr}`,
        body: `Avg rating ${Number(row.avg_rating).toFixed(1)} over last ${row.match_count} matches`,
        bodyAr: `متوسط تقييم ${Number(row.avg_rating).toFixed(1)} في آخر ${row.match_count} مباريات`,
        link: `/dashboard/players/${row.player_id}`,
        sourceType: "player",
        sourceId: row.player_id,
        priority: "normal",
      });
    }
  }

  // Count total youth/amateur for stats
  const [countRow] = (await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM players WHERE status = 'active' AND player_type IN ('Youth', 'Amateur')`,
    { type: "SELECT" as any },
  )) as any[];

  return {
    youthChecked: Number(countRow?.cnt ?? 0),
    breakouts: rows.length,
    tasksCreated,
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 4: Minutes Drought Detector (weekly — Monday 10 AM)
//
// Active players with 0 minutes in the last 4 completed matches.
// Creates task for manager to review squad selection.
// ══════════════════════════════════════════════════════════════

export async function checkMinutesDrought(): Promise<{
  playersChecked: number;
  droughts: number;
  tasksCreated: number;
}> {
  if (!_config.enabled)
    return { playersChecked: 0, droughts: 0, tasksCreated: 0 };

  // Find active players who were on the squad (match_players) but got 0 minutes
  // for the last 4 completed matches
  const rows: any[] = await sequelize.query(
    `
    WITH last_matches AS (
      SELECT id, match_date,
             ROW_NUMBER() OVER (ORDER BY match_date DESC) AS rn
      FROM matches
      WHERE status IN ('completed', 'Completed')
      ORDER BY match_date DESC
      LIMIT 4
    ),
    player_involvement AS (
      SELECT
        mp.player_id,
        COUNT(*) AS squad_count,
        COALESCE(SUM(COALESCE(pms.minutes_played, 0)), 0) AS total_minutes
      FROM match_players mp
      JOIN last_matches lm ON lm.id = mp.match_id
      LEFT JOIN player_match_stats pms ON pms.player_id = mp.player_id AND pms.match_id = mp.match_id
      WHERE mp.availability IN ('bench', 'not_called')
      GROUP BY mp.player_id
      HAVING COUNT(*) >= 3 AND COALESCE(SUM(COALESCE(pms.minutes_played, 0)), 0) = 0
    )
    SELECT
      pi.player_id, pi.squad_count, pi.total_minutes,
      p.first_name, p.last_name,
      p.first_name_ar, p.last_name_ar,
      p.position, p.agent_id, p.coach_id
    FROM player_involvement pi
    JOIN players p ON p.id = pi.player_id
    WHERE p.status = 'active'
    ORDER BY pi.squad_count DESC
    `,
    { type: "SELECT" as any },
  );

  let tasksCreated = 0;

  for (const row of rows) {
    const playerName = `${row.first_name} ${row.last_name}`.trim();
    const playerNameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : playerName;

    const created = await createTrendTask({
      playerId: row.player_id,
      triggerRuleId: "minutes_drought",
      title: `No playing time: ${playerName}`,
      titleAr: `بدون وقت لعب: ${playerNameAr}`,
      description:
        `${playerName} (${row.position || "N/A"}) has had 0 minutes across the last ${row.squad_count} matches ` +
        `despite being on the squad. Review squad selection and player development plan.`,
      descriptionAr:
        `${playerNameAr} (${row.position || "غير محدد"}) لم يحصل على أي دقائق في آخر ${row.squad_count} مباريات ` +
        `رغم تواجده في القائمة. مراجعة اختيار التشكيلة وخطة تطوير اللاعب.`,
      priority: "medium",
      dueDays: 5,
      assignedTo: row.coach_id || row.agent_id || null,
    });

    if (created) tasksCreated++;
  }

  return {
    playersChecked: await getActivePlayerCount(),
    droughts: rows.length,
    tasksCreated,
  };
}

// ══════════════════════════════════════════════════════════════
// JOB 5: Consecutive Low Rating Detector (daily — 10 AM)
//
// Players with rating < 5.0 for 3 consecutive matches.
// More urgent than weekly trend — catches immediate problems.
// ══════════════════════════════════════════════════════════════

export async function checkConsecutiveLowRatings(): Promise<{
  playersChecked: number;
  flagged: number;
  tasksCreated: number;
}> {
  if (!_config.enabled)
    return { playersChecked: 0, flagged: 0, tasksCreated: 0 };

  const rows: any[] = await sequelize.query(
    `
    WITH recent_stats AS (
      SELECT
        pms.player_id,
        pms.rating,
        m.match_date,
        ROW_NUMBER() OVER (PARTITION BY pms.player_id ORDER BY m.match_date DESC) AS rn
      FROM player_match_stats pms
      JOIN matches m ON m.id = pms.match_id
      WHERE pms.rating IS NOT NULL
        AND m.status IN ('completed', 'Completed')
    )
    SELECT
      rs.player_id,
      ARRAY_AGG(rs.rating ORDER BY rs.rn) AS last_ratings,
      ROUND(AVG(rs.rating), 2) AS avg_rating,
      p.first_name, p.last_name,
      p.first_name_ar, p.last_name_ar,
      p.coach_id, p.analyst_id
    FROM recent_stats rs
    JOIN players p ON p.id = rs.player_id
    WHERE rs.rn <= 3
      AND p.status = 'active'
    GROUP BY rs.player_id, p.first_name, p.last_name,
             p.first_name_ar, p.last_name_ar, p.coach_id, p.analyst_id
    HAVING COUNT(*) = 3 AND MAX(rs.rating) < 5.0
    ORDER BY AVG(rs.rating) ASC
    `,
    { type: "SELECT" as any },
  );

  let tasksCreated = 0;

  for (const row of rows) {
    const playerName = `${row.first_name} ${row.last_name}`.trim();
    const playerNameAr = row.first_name_ar
      ? `${row.first_name_ar} ${row.last_name_ar || ""}`.trim()
      : playerName;
    const ratings = (row.last_ratings as number[])
      .map((r) => Number(r).toFixed(1))
      .join(", ");

    const created = await createTrendTask({
      playerId: row.player_id,
      triggerRuleId: "consecutive_low_rating",
      title: `3 consecutive low ratings: ${playerName}`,
      titleAr: `3 تقييمات منخفضة متتالية: ${playerNameAr}`,
      description:
        `${playerName} rated below 5.0 in 3 consecutive matches (${ratings}). ` +
        `Immediate coaching intervention and performance review required.`,
      descriptionAr:
        `${playerNameAr} حصل على تقييم أقل من 5.0 في 3 مباريات متتالية (${ratings}). ` +
        `مطلوب تدخل تدريبي فوري ومراجعة أداء.`,
      priority: "critical",
      dueDays: 1,
      assignedTo: row.coach_id || row.analyst_id || null,
    });

    if (created) tasksCreated++;
  }

  return {
    playersChecked: await getActivePlayerCount(),
    flagged: rows.length,
    tasksCreated,
  };
}

// ── Utility ──

async function getActivePlayerCount(): Promise<number> {
  const [row] = (await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM players WHERE status = 'active'`,
    { type: "SELECT" as any },
  )) as any[];
  return Number(row?.cnt ?? 0);
}
