/**
 * Match Stats → Auto-Task Generator
 *
 * Runs after stats are upserted for a match.
 * Evaluates each player's stats against configurable rules and
 * creates tasks automatically (type: 'Match', isAutoCreated: true).
 *
 * Rules:
 *  1. Red card       → "Review suspension" (critical priority)
 *  2. 2+ yellow cards → "Review accumulated bookings" (high)
 *  3. Rating < 5.0   → "Performance review needed" (high)
 *  4. Rating < 3.0   → "Urgent performance intervention" (critical)
 *  5. Injury flag     → "Arrange medical assessment" (critical)
 *     (player has availability = 'injured' in match_players)
 *  6. 90 min played + rating ≥ 8 → "Highlight for report" (low, positive)
 */

import { Task } from "@modules/tasks/task.model";
import { MatchPlayer } from "@modules/matches/matchPlayer.model";
import { PlayerMatchStats } from "@modules/matches/playerMatchStats.model";
import { Player } from "@modules/players/player.model";
import { Match } from "@modules/matches/match.model";
import { Club } from "@modules/clubs/club.model";
import { sequelize } from "@config/database";
import { Op } from "sequelize";
import {
  notifyUser,
  notifyByRole,
} from "@modules/notifications/notification.service";
import { User } from "@modules/users/user.model";
import { logger } from "@config/logger";
import {
  createAutoTaskIfNotExists,
  findUserByRole,
} from "@shared/utils/autoTaskHelpers";

// ── Configurable thresholds ──
// Defaults can be overridden via the settings API (GET/PATCH /settings/task-rules)

export interface TaskRuleConfig {
  enabled: boolean;
  dueDays: number;
  threshold?: number;
}

export const DEFAULT_TASK_RULE_CONFIG: Record<string, TaskRuleConfig> = {
  // Post-match rules (triggered when match completes / stats uploaded)
  red_card: { enabled: true, dueDays: 1 },
  yellow_cards_accumulated: { enabled: true, dueDays: 2, threshold: 2 },
  critical_performance: { enabled: true, dueDays: 1, threshold: 3.0 },
  low_performance: { enabled: true, dueDays: 3, threshold: 5.0 },
  injury_assessment: { enabled: true, dueDays: 1 },
  highlight_performance: { enabled: true, dueDays: 5, threshold: 8.0 },
  high_fouls: { enabled: true, dueDays: 3, threshold: 4 },
  // Pre-match rules (triggered by cron X days before match)
  pre_confirm_availability: { enabled: true, dueDays: 2 },
  pre_tactical_report: { enabled: true, dueDays: 1 },
  pre_travel_logistics: { enabled: true, dueDays: 3 },
  // Performance trend rules (triggered by performance.engine.ts cron jobs)
  perf_trend_decline: { enabled: true, dueDays: 3, threshold: 1.5 },
  fatigue_risk: { enabled: true, dueDays: 2 },
  breakout_player: { enabled: true, dueDays: 5, threshold: 7.5 },
  minutes_drought: { enabled: true, dueDays: 5 },
  consecutive_low_rating: { enabled: true, dueDays: 1, threshold: 5.0 },
  // Injury intelligence rules (triggered by injury.engine.ts cron jobs)
  injury_recurrence: { enabled: true, dueDays: 1, threshold: 3 },
  return_to_play_validation: { enabled: true, dueDays: 1 },
  injury_risk_high: { enabled: true, dueDays: 3 },
  surgery_milestone_30d: { enabled: true, dueDays: 2 },
  surgery_milestone_60d: { enabled: true, dueDays: 2 },
  surgery_milestone_90d: { enabled: true, dueDays: 2 },
  // Contract lifecycle rules (triggered by contract.engine.ts cron jobs)
  contract_renewal_window: { enabled: true, dueDays: 7 },
  contract_value_mismatch: { enabled: true, dueDays: 7, threshold: 30 },
  loan_return_tracker: { enabled: true, dueDays: 5 },
  draft_contract_stale: { enabled: true, dueDays: 3, threshold: 14 },
  commission_due_upcoming: { enabled: true, dueDays: 5 },
  commission_due_overdue: { enabled: true, dueDays: 1 },
  // Financial intelligence rules (triggered by financial.engine.ts cron jobs)
  invoice_aging_30: { enabled: true, dueDays: 5 },
  invoice_aging_60: { enabled: true, dueDays: 3 },
  invoice_aging_90: { enabled: true, dueDays: 1 },
  revenue_anomaly: { enabled: true, dueDays: 5, threshold: 20 },
  expense_budget_overage: { enabled: true, dueDays: 5, threshold: 50 },
  player_roi_negative: { enabled: true, dueDays: 7 },
  valuation_stale: { enabled: true, dueDays: 5, threshold: 90 },
  // Gate & onboarding rules (triggered by gate.engine.ts cron jobs)
  gate_stale: { enabled: true, dueDays: 3, threshold: 14 },
  checklist_overdue: { enabled: true, dueDays: 2, threshold: 7 },
  gate_progression_nudge: { enabled: true, dueDays: 3, threshold: 80 },
  clearance_stale: { enabled: true, dueDays: 2, threshold: 7 },
  // Scouting pipeline rules (triggered by scouting.engine.ts cron jobs)
  watchlist_stale: { enabled: true, dueDays: 5, threshold: 30 },
  screening_incomplete: { enabled: true, dueDays: 3, threshold: 14 },
  prospect_unrated: { enabled: true, dueDays: 3, threshold: 7 },
  deferred_decision_followup: { enabled: true, dueDays: 5, threshold: 30 },
  approved_not_actioned: { enabled: true, dueDays: 3, threshold: 14 },
  // Training & development rules (triggered by training.engine.ts cron jobs)
  enrollment_stale: { enabled: true, dueDays: 5, threshold: 14 },
  no_training_plan: { enabled: true, dueDays: 5 },
  // System health rules (triggered by systemhealth.engine.ts cron jobs)
  orphan_records: { enabled: true, dueDays: 7 },
  player_data_incomplete: { enabled: true, dueDays: 5 },
  stale_task_escalation: { enabled: true, dueDays: 7, threshold: 60 },
  risk_radar_inconsistency: { enabled: true, dueDays: 3 },
  duplicate_records: { enabled: true, dueDays: 7 },

  // ── NEW: Real-time + cron auto-task rules ──

  // Contract real-time triggers
  contract_legal_review: { enabled: true, dueDays: 3 },
  contract_submit_review: { enabled: true, dueDays: 3 },
  contract_get_signatures: { enabled: true, dueDays: 5 },
  contract_player_followup: { enabled: true, dueDays: 7 },

  // Match-level pre-match tasks (cron, assigned by role)
  pre_scout_opponent_report: { enabled: true, dueDays: 3 },
  pre_analyst_match_analysis: { enabled: true, dueDays: 2 },
  pre_analyst_postmatch_template: { enabled: true, dueDays: 1 },

  // Offer triggers (real-time + cron)
  offer_new_review: { enabled: true, dueDays: 3 },
  offer_accepted_convert: { enabled: true, dueDays: 5 },
  offer_deadline_approaching: { enabled: true, dueDays: 3, threshold: 3 },
  offer_negotiation_stale: { enabled: true, dueDays: 3, threshold: 14 },

  // Injury real-time + cron triggers
  injury_new_critical: { enabled: true, dueDays: 1 },
  injury_return_overdue: { enabled: true, dueDays: 2 },
  injury_treatment_stale: { enabled: true, dueDays: 3, threshold: 14 },

  // Training triggers
  training_course_completed: { enabled: true, dueDays: 5 },

  // Approval triggers
  approval_step_overdue: { enabled: true, dueDays: 1 },
  approval_rejected_action: { enabled: true, dueDays: 3 },

  // Document triggers (cron)
  document_expiry_30d: { enabled: true, dueDays: 14, threshold: 30 },
  document_expiry_7d: { enabled: true, dueDays: 3, threshold: 7 },
  player_missing_documents: { enabled: true, dueDays: 7 },

  // Referral triggers
  referral_critical_created: { enabled: true, dueDays: 1 },
  referral_overdue: { enabled: true, dueDays: 1 },

  // Gate triggers
  gate_completed_next: { enabled: true, dueDays: 5 },

  // Report triggers
  report_generation_failed: { enabled: true, dueDays: 1 },

  // Media auto-task triggers
  media_match_cover: { enabled: true, dueDays: 1 },
  media_injury_update: { enabled: true, dueDays: 1 },
  media_return_from_injury: { enabled: true, dueDays: 1 },

  // System health proactive rules
  overdue_task_threshold: { enabled: true, dueDays: 0, threshold: 10 },
  approval_escalation_48h: { enabled: true, dueDays: 0 },
};

let _ruleConfig: Record<string, TaskRuleConfig> = {
  ...DEFAULT_TASK_RULE_CONFIG,
};

export function getTaskRuleConfig(): Record<string, TaskRuleConfig> {
  return { ...DEFAULT_TASK_RULE_CONFIG, ..._ruleConfig };
}

export function updateTaskRuleConfig(
  updates: Partial<Record<string, Partial<TaskRuleConfig>>>,
) {
  for (const [ruleId, patch] of Object.entries(updates)) {
    if (_ruleConfig[ruleId] && patch) {
      _ruleConfig[ruleId] = { ..._ruleConfig[ruleId], ...patch };
    }
  }
}

/** Load persisted config from DB (called on server startup) */
export async function loadTaskRuleConfigFromDB() {
  try {
    const [row] = (await sequelize.query(
      `SELECT value FROM app_settings WHERE key = 'task_rule_config' LIMIT 1`,
      { type: "SELECT" as any },
    )) as any[];
    if (row?.value) {
      const parsed =
        typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      _ruleConfig = { ...DEFAULT_TASK_RULE_CONFIG, ...parsed };
    }
  } catch {
    // Table may not exist yet — use defaults silently
  }
}

/** Persist current config to DB */
export async function saveTaskRuleConfigToDB() {
  try {
    await sequelize.query(
      `INSERT INTO app_settings (key, value) VALUES ('task_rule_config', :val)
       ON CONFLICT (key) DO UPDATE SET value = :val`,
      {
        replacements: { val: JSON.stringify(_ruleConfig) },
        type: "RAW" as any,
      },
    );
  } catch {
    // Table may not exist yet — silently ignore
  }
}

// ── Rule definitions ──

interface AutoTaskRule {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: (ctx: RuleContext) => string;
  descriptionAr: (ctx: RuleContext) => string;
  priority: "low" | "medium" | "high" | "critical";
  condition: (ctx: RuleContext) => boolean;
  /** Days from now for due date (reads from config) */
  dueDays: number;
}

interface RuleContext {
  playerName: string;
  playerNameAr: string;
  matchLabel: string;
  stats: PlayerMatchStats;
  availability: string | null;
}

function cfg(ruleId: string): TaskRuleConfig {
  return getTaskRuleConfig()[ruleId] ?? { enabled: true, dueDays: 3 };
}

const RULES: AutoTaskRule[] = [
  {
    id: "red_card",
    titleEn: "Review player suspension",
    titleAr: "مراجعة إيقاف اللاعب",
    descriptionEn: (ctx) =>
      `${ctx.playerName} received a red card in ${ctx.matchLabel}. Review suspension rules and upcoming match availability.`,
    descriptionAr: (ctx) =>
      `${ctx.playerNameAr} حصل على بطاقة حمراء في ${ctx.matchLabel}. مراجعة قواعد الإيقاف وجاهزية المباريات القادمة.`,
    priority: "critical",
    condition: (ctx) =>
      cfg("red_card").enabled && (ctx.stats.redCards ?? 0) > 0,
    get dueDays() {
      return cfg("red_card").dueDays;
    },
  },
  {
    id: "yellow_cards_accumulated",
    titleEn: "Review accumulated bookings",
    titleAr: "مراجعة البطاقات المتراكمة",
    descriptionEn: (ctx) =>
      `${ctx.playerName} received ${ctx.stats.yellowCards} yellow card(s) in ${ctx.matchLabel}. Check accumulated bookings threshold.`,
    descriptionAr: (ctx) =>
      `${ctx.playerNameAr} حصل على ${ctx.stats.yellowCards} بطاقة صفراء في ${ctx.matchLabel}. تحقق من عتبة البطاقات المتراكمة.`,
    priority: "high",
    condition: (ctx) =>
      cfg("yellow_cards_accumulated").enabled &&
      (ctx.stats.yellowCards ?? 0) >=
        (cfg("yellow_cards_accumulated").threshold ?? 2),
    get dueDays() {
      return cfg("yellow_cards_accumulated").dueDays;
    },
  },
  {
    id: "critical_performance",
    titleEn: "Urgent performance intervention",
    titleAr: "تدخل عاجل لأداء اللاعب",
    descriptionEn: (ctx) =>
      `${ctx.playerName} rated ${ctx.stats.rating?.toFixed(1)} in ${ctx.matchLabel}. Immediate coaching review required.`,
    descriptionAr: (ctx) =>
      `${ctx.playerNameAr} حصل على تقييم ${ctx.stats.rating?.toFixed(1)} في ${ctx.matchLabel}. مطلوب مراجعة تدريبية فورية.`,
    priority: "critical",
    condition: (ctx) =>
      cfg("critical_performance").enabled &&
      ctx.stats.rating != null &&
      Number(ctx.stats.rating) < (cfg("critical_performance").threshold ?? 3.0),
    get dueDays() {
      return cfg("critical_performance").dueDays;
    },
  },
  {
    id: "low_performance",
    titleEn: "Performance review needed",
    titleAr: "مطلوب مراجعة الأداء",
    descriptionEn: (ctx) =>
      `${ctx.playerName} rated ${ctx.stats.rating?.toFixed(1)} in ${ctx.matchLabel}. Schedule a performance review session.`,
    descriptionAr: (ctx) =>
      `${ctx.playerNameAr} حصل على تقييم ${ctx.stats.rating?.toFixed(1)} في ${ctx.matchLabel}. جدولة جلسة مراجعة أداء.`,
    priority: "high",
    condition: (ctx) => {
      const c = cfg("low_performance");
      return (
        c.enabled &&
        ctx.stats.rating != null &&
        Number(ctx.stats.rating) >=
          (cfg("critical_performance").threshold ?? 3.0) &&
        Number(ctx.stats.rating) < (c.threshold ?? 5.0)
      );
    },
    get dueDays() {
      return cfg("low_performance").dueDays;
    },
  },
  {
    id: "injury_assessment",
    titleEn: "Arrange medical assessment",
    titleAr: "ترتيب تقييم طبي",
    descriptionEn: (ctx) =>
      `${ctx.playerName} was marked as injured for ${ctx.matchLabel}. Arrange medical assessment and update injury records.`,
    descriptionAr: (ctx) =>
      `${ctx.playerNameAr} تم تسجيله مصاباً في ${ctx.matchLabel}. ترتيب تقييم طبي وتحديث سجل الإصابات.`,
    priority: "critical",
    condition: (ctx) =>
      cfg("injury_assessment").enabled && ctx.availability === "injured",
    get dueDays() {
      return cfg("injury_assessment").dueDays;
    },
  },
  {
    id: "highlight_performance",
    titleEn: "Highlight outstanding performance",
    titleAr: "إبراز الأداء المتميز",
    descriptionEn: (ctx) =>
      `${ctx.playerName} rated ${ctx.stats.rating?.toFixed(1)} (${ctx.stats.goals ?? 0}G, ${ctx.stats.assists ?? 0}A) in ${ctx.matchLabel}. Add to performance report and consider for media highlight.`,
    descriptionAr: (ctx) =>
      `${ctx.playerNameAr} حصل على تقييم ${ctx.stats.rating?.toFixed(1)} (${ctx.stats.goals ?? 0} أهداف، ${ctx.stats.assists ?? 0} تمريرات) في ${ctx.matchLabel}. إضافة لتقرير الأداء والنظر في إبراز إعلامي.`,
    priority: "low",
    condition: (ctx) => {
      const c = cfg("highlight_performance");
      return (
        c.enabled &&
        ctx.stats.rating != null &&
        Number(ctx.stats.rating) >= (c.threshold ?? 8.0) &&
        (ctx.stats.minutesPlayed ?? 0) >= 60
      );
    },
    get dueDays() {
      return cfg("highlight_performance").dueDays;
    },
  },
  {
    id: "high_fouls",
    titleEn: "Review player discipline",
    titleAr: "مراجعة انضباط اللاعب",
    descriptionEn: (ctx) =>
      `${ctx.playerName} committed ${ctx.stats.foulsCommitted} fouls in ${ctx.matchLabel}. Review with coaching staff.`,
    descriptionAr: (ctx) =>
      `${ctx.playerNameAr} ارتكب ${ctx.stats.foulsCommitted} أخطاء في ${ctx.matchLabel}. مراجعة مع الجهاز الفني.`,
    priority: "medium",
    condition: (ctx) =>
      cfg("high_fouls").enabled &&
      (ctx.stats.foulsCommitted ?? 0) >= (cfg("high_fouls").threshold ?? 4),
    get dueDays() {
      return cfg("high_fouls").dueDays;
    },
  },
];

// ── Rule → player role field mapping (determines task assignee) ──

const RULE_ASSIGNEE_FIELD: Record<string, "agentId" | "coachId" | "analystId"> =
  {
    red_card: "agentId",
    yellow_cards_accumulated: "agentId",
    critical_performance: "coachId",
    low_performance: "coachId",
    injury_assessment: "agentId",
    highlight_performance: "agentId",
    high_fouls: "coachId",
    pre_confirm_availability: "coachId",
    pre_tactical_report: "analystId",
    pre_travel_logistics: "agentId",
  };

// ── Helper: format due date ──

export function dueDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

// ── Main generator function ──

export async function generateAutoTasks(
  matchId: string,
  triggeredBy: string,
): Promise<{ created: number; rules: string[] }> {
  // Load match info for labels
  const match = await Match.findByPk(matchId, {
    include: [
      { model: Club, as: "homeClub", attributes: ["name", "nameAr"] },
      { model: Club, as: "awayClub", attributes: ["name", "nameAr"] },
    ],
  });
  if (!match) return { created: 0, rules: [] };

  const homeClub = (match as any).homeClub;
  const awayClub = (match as any).awayClub;
  const matchLabel = `${homeClub?.name ?? "TBD"} vs ${awayClub?.name ?? "TBD"}`;

  // Load all stats for this match
  const allStats = await PlayerMatchStats.findAll({
    where: { matchId },
    include: [
      {
        model: Player,
        as: "player",
        attributes: [
          "id",
          "firstName",
          "lastName",
          "firstNameAr",
          "lastNameAr",
          "agentId",
          "coachId",
          "analystId",
        ],
      },
    ],
  });

  // Load match_players for availability info
  const matchPlayers = await MatchPlayer.findAll({
    where: { matchId },
    attributes: ["playerId", "availability"],
  });
  const availabilityMap = new Map(
    matchPlayers.map((mp) => [mp.playerId, mp.availability]),
  );

  const createdRules: string[] = [];

  for (const statRow of allStats) {
    const player = (statRow as any).player;
    if (!player) continue;

    const playerName = `${player.firstName} ${player.lastName}`.trim();
    const playerNameAr = player.firstNameAr
      ? `${player.firstNameAr} ${player.lastNameAr || ""}`.trim()
      : playerName;

    const ctx: RuleContext = {
      playerName,
      playerNameAr,
      matchLabel,
      stats: statRow,
      availability: availabilityMap.get(statRow.playerId) || null,
    };

    for (const rule of RULES) {
      if (!rule.condition(ctx)) continue;

      // Check if this exact auto-task already exists (prevent duplicates)
      const existing = await Task.findOne({
        where: {
          matchId,
          playerId: player.id,
          triggerRuleId: rule.id,
          isAutoCreated: true,
        },
      });

      if (existing) continue;

      // Create the task — assign to the player's agent/coach/analyst based on rule
      const assignee = player[RULE_ASSIGNEE_FIELD[rule.id]] || null;
      await Task.create({
        title: rule.titleEn,
        titleAr: rule.titleAr,
        description: rule.descriptionEn(ctx),
        type: "Match",
        priority: rule.priority,
        status: "Open",
        playerId: player.id,
        matchId,
        assignedTo: assignee,
        assignedBy: triggeredBy,
        isAutoCreated: true,
        triggerRuleId: rule.id,
        dueDate: dueDate(rule.dueDays),
        notes: rule.descriptionAr(ctx),
      } as any);

      // Notify assignee (fire-and-forget)
      if (assignee) {
        notifyUser(assignee, {
          type: "task",
          title: rule.titleEn,
          titleAr: rule.titleAr,
          body: rule.descriptionEn(ctx),
          bodyAr: rule.descriptionAr(ctx),
          link: "/dashboard/tasks",
          sourceType: "task",
          priority: rule.priority === "critical" ? "critical" : "normal",
        }).catch((err) =>
          logger.warn("Auto-task notification failed", {
            error: (err as Error).message,
          }),
        );
      }

      createdRules.push(`${rule.id}:${player.id}`);
    }
  }

  // Also check injured players who might not have stats yet
  for (const mp of matchPlayers) {
    if (mp.availability !== "injured") continue;

    // Skip if already processed via stats
    const hasStats = allStats.some((s) => s.playerId === mp.playerId);
    if (hasStats) continue;

    // Load player info
    const player = await Player.findByPk(mp.playerId, {
      attributes: [
        "id",
        "firstName",
        "lastName",
        "firstNameAr",
        "lastNameAr",
        "agentId",
        "coachId",
        "analystId",
      ],
    });
    if (!player) continue;

    const playerName = `${player.firstName} ${player.lastName}`.trim();
    const playerNameAr = player.firstNameAr
      ? `${player.firstNameAr} ${player.lastNameAr || ""}`.trim()
      : playerName;

    const injuryRule = RULES.find((r) => r.id === "injury_assessment")!;

    const existing = await Task.findOne({
      where: {
        matchId,
        playerId: player.id,
        triggerRuleId: "injury_assessment",
        isAutoCreated: true,
      },
    });

    if (!existing) {
      const dummyStats = {
        redCards: 0,
        yellowCards: 0,
        rating: null,
        foulsCommitted: 0,
        minutesPlayed: 0,
        goals: 0,
        assists: 0,
      } as any;
      const ctx: RuleContext = {
        playerName,
        playerNameAr,
        matchLabel,
        stats: dummyStats,
        availability: "injured",
      };

      const injuryAssignee =
        player[RULE_ASSIGNEE_FIELD["injury_assessment"]] || null;
      await Task.create({
        title: injuryRule.titleEn,
        titleAr: injuryRule.titleAr,
        description: injuryRule.descriptionEn(ctx),
        type: "Match",
        priority: "critical",
        status: "Open",
        playerId: player.id,
        matchId,
        assignedTo: injuryAssignee,
        assignedBy: triggeredBy,
        isAutoCreated: true,
        triggerRuleId: "injury_assessment",
        dueDate: dueDate(1),
        notes: injuryRule.descriptionAr(ctx),
      } as any);

      if (injuryAssignee) {
        notifyUser(injuryAssignee, {
          type: "task",
          title: injuryRule.titleEn,
          titleAr: injuryRule.titleAr,
          body: injuryRule.descriptionEn(ctx),
          bodyAr: injuryRule.descriptionAr(ctx),
          link: "/dashboard/tasks",
          sourceType: "task",
          priority: "critical",
        }).catch((err) =>
          logger.warn("Auto-task notification failed", {
            error: (err as Error).message,
          }),
        );
      }

      createdRules.push(`injury_assessment:${player.id}`);
    }
  }

  return { created: createdRules.length, rules: createdRules };
}

// ══════════════════════════════════════════════════════════════
// Pre-Match Auto-Task Rules
// ══════════════════════════════════════════════════════════════

interface PreMatchRule {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: (ctx: PreMatchContext) => string;
  descriptionAr: (ctx: PreMatchContext) => string;
  priority: "low" | "medium" | "high" | "critical";
}

interface PreMatchContext {
  playerName: string;
  playerNameAr: string;
  matchLabel: string;
  matchDate: string;
}

const PRE_MATCH_RULES: PreMatchRule[] = [
  {
    id: "pre_confirm_availability",
    titleEn: "Confirm player availability",
    titleAr: "تأكيد جاهزية اللاعب",
    descriptionEn: (ctx) =>
      `Confirm ${ctx.playerName}'s fitness and availability for ${ctx.matchLabel} on ${ctx.matchDate}. Check with club medical and coaching staff.`,
    descriptionAr: (ctx) =>
      `تأكيد لياقة وجاهزية ${ctx.playerNameAr} لمباراة ${ctx.matchLabel} بتاريخ ${ctx.matchDate}. التحقق مع الطاقم الطبي والفني للنادي.`,
    priority: "high",
  },
  {
    id: "pre_tactical_report",
    titleEn: "Prepare tactical match report",
    titleAr: "إعداد التقرير التكتيكي للمباراة",
    descriptionEn: (ctx) =>
      `Prepare tactical analysis and match preview for ${ctx.playerName} ahead of ${ctx.matchLabel} on ${ctx.matchDate}.`,
    descriptionAr: (ctx) =>
      `إعداد التحليل التكتيكي ومعاينة المباراة لـ ${ctx.playerNameAr} قبل ${ctx.matchLabel} بتاريخ ${ctx.matchDate}.`,
    priority: "medium",
  },
  {
    id: "pre_travel_logistics",
    titleEn: "Arrange match day logistics",
    titleAr: "ترتيب لوجستيات يوم المباراة",
    descriptionEn: (ctx) =>
      `Arrange travel, accommodation, and match day logistics for ${ctx.playerName} for ${ctx.matchLabel} on ${ctx.matchDate}.`,
    descriptionAr: (ctx) =>
      `ترتيب السفر والإقامة ولوجستيات يوم المباراة لـ ${ctx.playerNameAr} لمباراة ${ctx.matchLabel} بتاريخ ${ctx.matchDate}.`,
    priority: "medium",
  },
];

/**
 * Generate pre-match tasks for an upcoming match.
 * Called by the cron scheduler for matches within the next 1-7 days.
 * Only creates tasks for rules whose `dueDays` matches `daysUntilMatch`.
 */
export async function generatePreMatchTasks(
  matchId: string,
  daysUntilMatch: number,
): Promise<{ created: number; rules: string[] }> {
  // Find which pre-match rules fire at this day count.
  // Use >= so that if a cron run was missed, the task still gets created
  // on subsequent days (deduplication prevents duplicates).
  const config = getTaskRuleConfig();
  const activeRules = PRE_MATCH_RULES.filter((rule) => {
    const rc = config[rule.id];
    return rc?.enabled && daysUntilMatch <= rc.dueDays && daysUntilMatch >= 0;
  });

  if (activeRules.length === 0) return { created: 0, rules: [] };

  // Load match info
  const match = await Match.findByPk(matchId, {
    include: [
      { model: Club, as: "homeClub", attributes: ["name", "nameAr"] },
      { model: Club, as: "awayClub", attributes: ["name", "nameAr"] },
    ],
  });
  if (!match) return { created: 0, rules: [] };

  const homeClub = (match as any).homeClub;
  const awayClub = (match as any).awayClub;
  const matchLabel = `${homeClub?.name ?? "TBD"} vs ${awayClub?.name ?? "TBD"}`;
  const matchDate = match.matchDate
    ? new Date(match.matchDate).toISOString().split("T")[0]
    : "TBD";

  // Load all players assigned to this match
  const matchPlayers = await MatchPlayer.findAll({
    where: { matchId },
    include: [
      {
        model: Player,
        as: "player",
        attributes: [
          "id",
          "firstName",
          "lastName",
          "firstNameAr",
          "lastNameAr",
          "agentId",
          "coachId",
          "analystId",
        ],
      },
    ],
  });

  const createdRules: string[] = [];

  for (const mp of matchPlayers) {
    const player = (mp as any).player;
    if (!player) continue;

    const playerName = `${player.firstName} ${player.lastName}`.trim();
    const playerNameAr = player.firstNameAr
      ? `${player.firstNameAr} ${player.lastNameAr || ""}`.trim()
      : playerName;

    const ctx: PreMatchContext = {
      playerName,
      playerNameAr,
      matchLabel,
      matchDate,
    };

    for (const rule of activeRules) {
      // Duplicate prevention
      const existing = await Task.findOne({
        where: {
          matchId,
          playerId: player.id,
          triggerRuleId: rule.id,
          isAutoCreated: true,
        },
      });
      if (existing) continue;

      const preAssignee = player[RULE_ASSIGNEE_FIELD[rule.id]] || null;
      await Task.create({
        title: rule.titleEn,
        titleAr: rule.titleAr,
        description: rule.descriptionEn(ctx),
        type: "Match",
        priority: rule.priority,
        status: "Open",
        playerId: player.id,
        matchId,
        assignedTo: preAssignee,
        isAutoCreated: true,
        triggerRuleId: rule.id,
        dueDate: matchDate,
        notes: rule.descriptionAr(ctx),
      } as any);

      if (preAssignee) {
        notifyUser(preAssignee, {
          type: "task",
          title: rule.titleEn,
          titleAr: rule.titleAr,
          body: rule.descriptionEn(ctx),
          bodyAr: rule.descriptionAr(ctx),
          link: "/dashboard/tasks",
          sourceType: "task",
          priority: rule.priority === "critical" ? "critical" : "normal",
        }).catch((err) =>
          logger.warn("Auto-task notification failed", {
            error: (err as Error).message,
          }),
        );
      }

      createdRules.push(`${rule.id}:${player.id}`);
    }
  }

  return { created: createdRules.length, rules: createdRules };
}

// ══════════════════════════════════════════════════════════════
// Match-Level Pre-Match Auto-Tasks (assigned by ROLE, not per-player)
// ══════════════════════════════════════════════════════════════

interface MatchLevelPreRule {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: (ctx: MatchLevelContext) => string;
  descriptionAr: (ctx: MatchLevelContext) => string;
  priority: "low" | "medium" | "high" | "critical";
  targetRole: string;
}

interface MatchLevelContext {
  matchLabel: string;
  matchDate: string;
}

const MATCH_LEVEL_PRE_RULES: MatchLevelPreRule[] = [
  {
    id: "pre_scout_opponent_report",
    titleEn: "Prepare opponent scouting report",
    titleAr: "إعداد تقرير استكشاف الخصم",
    descriptionEn: (ctx) =>
      `Prepare a comprehensive scouting report on the opponent for ${ctx.matchLabel} on ${ctx.matchDate}. Include key players, tactical patterns, strengths, and weaknesses.`,
    descriptionAr: (ctx) =>
      `إعداد تقرير استكشاف شامل عن الخصم لمباراة ${ctx.matchLabel} بتاريخ ${ctx.matchDate}. يشمل اللاعبين الرئيسيين والأنماط التكتيكية ونقاط القوة والضعف.`,
    priority: "high",
    targetRole: "Scout",
  },
  {
    id: "pre_analyst_match_analysis",
    titleEn: "Prepare pre-match analysis",
    titleAr: "إعداد تحليل ما قبل المباراة",
    descriptionEn: (ctx) =>
      `Prepare pre-match tactical analysis for ${ctx.matchLabel} on ${ctx.matchDate}. Include formation analysis, set-piece patterns, and key matchup insights.`,
    descriptionAr: (ctx) =>
      `إعداد التحليل التكتيكي قبل مباراة ${ctx.matchLabel} بتاريخ ${ctx.matchDate}. يشمل تحليل التشكيل وأنماط الكرات الثابتة والمواجهات الرئيسية.`,
    priority: "high",
    targetRole: "Analyst",
  },
  {
    id: "pre_analyst_postmatch_template",
    titleEn: "Prepare post-match analysis template",
    titleAr: "إعداد قالب تحليل ما بعد المباراة",
    descriptionEn: (ctx) =>
      `Prepare the post-match analysis template and data collection framework for ${ctx.matchLabel} on ${ctx.matchDate}. Ensure KPIs and tracking metrics are configured.`,
    descriptionAr: (ctx) =>
      `إعداد قالب تحليل ما بعد المباراة وإطار جمع البيانات لمباراة ${ctx.matchLabel} بتاريخ ${ctx.matchDate}. التأكد من تكوين مؤشرات الأداء والمقاييس.`,
    priority: "medium",
    targetRole: "Analyst",
  },
];

/**
 * Generate match-level pre-match tasks for Scout and Analyst roles.
 * Called by the cron scheduler alongside generatePreMatchTasks().
 * Creates ONE task per rule per match (not per-player).
 */
export async function generateMatchLevelPreTasks(
  matchId: string,
  daysUntilMatch: number,
): Promise<{ created: number; rules: string[] }> {
  const config = getTaskRuleConfig();
  const activeRules = MATCH_LEVEL_PRE_RULES.filter((rule) => {
    const rc = config[rule.id];
    return rc?.enabled && daysUntilMatch <= rc.dueDays && daysUntilMatch >= 0;
  });

  if (activeRules.length === 0) return { created: 0, rules: [] };

  // Load match info
  const match = await Match.findByPk(matchId, {
    include: [
      { model: Club, as: "homeClub", attributes: ["name", "nameAr"] },
      { model: Club, as: "awayClub", attributes: ["name", "nameAr"] },
    ],
  });
  if (!match) return { created: 0, rules: [] };

  const homeClub = (match as any).homeClub;
  const awayClub = (match as any).awayClub;
  const matchLabel = `${homeClub?.name ?? "TBD"} vs ${awayClub?.name ?? "TBD"}`;
  const matchDate = match.matchDate
    ? new Date(match.matchDate).toISOString().split("T")[0]
    : "TBD";

  const ctx: MatchLevelContext = { matchLabel, matchDate };
  const createdRules: string[] = [];

  for (const rule of activeRules) {
    // Duplicate check — match-level tasks have no playerId
    const existing = await Task.findOne({
      where: {
        matchId,
        triggerRuleId: rule.id,
        isAutoCreated: true,
        playerId: null,
      },
    });
    if (existing) continue;

    // Find first active user with the target role
    const assignee = await User.findOne({
      where: { role: rule.targetRole, isActive: true },
      attributes: ["id"],
      order: [["createdAt", "ASC"]],
    });

    await Task.create({
      title: rule.titleEn,
      titleAr: rule.titleAr,
      description: rule.descriptionEn(ctx),
      type: "Match",
      priority: rule.priority,
      status: "Open",
      playerId: null,
      matchId,
      assignedTo: assignee?.id ?? null,
      isAutoCreated: true,
      triggerRuleId: rule.id,
      dueDate: matchDate,
      notes: rule.descriptionAr(ctx),
    } as any);

    // Notify all users with the target role
    notifyByRole([rule.targetRole], {
      type: "task",
      title: rule.titleEn,
      titleAr: rule.titleAr,
      body: rule.descriptionEn(ctx),
      bodyAr: rule.descriptionAr(ctx),
      link: "/dashboard/tasks",
      sourceType: "task",
      priority: rule.priority === "critical" ? "critical" : "normal",
    }).catch((err) =>
      logger.warn("Match-level auto-task notification failed", {
        ruleId: rule.id,
        error: (err as Error).message,
      }),
    );

    if (!assignee) {
      logger.warn(
        `No active ${rule.targetRole} user found for match-level task`,
        {
          matchId,
          ruleId: rule.id,
        },
      );
    }

    createdRules.push(rule.id);
  }

  return { created: createdRules.length, rules: createdRules };
}

// ══════════════════════════════════════════════════════════════
// Media Auto-Task: Match Cover
// Triggered immediately when a new match is created.
// ══════════════════════════════════════════════════════════════

export async function generateMatchCoverTask(match: {
  id: string;
  matchDate: string | Date;
  homeClub?: { name?: string; nameAr?: string };
  awayClub?: { name?: string; nameAr?: string };
}): Promise<void> {
  const rc = cfg("media_match_cover");
  if (!rc.enabled) return;

  const mediaUser = await findUserByRole("Media");

  const homeEn = (match.homeClub as any)?.name ?? "Home";
  const awayEn = (match.awayClub as any)?.name ?? "Away";
  const homeAr = (match.homeClub as any)?.nameAr ?? homeEn;
  const awayAr = (match.awayClub as any)?.nameAr ?? awayEn;

  // Due date: rc.dueDays before match day
  const matchDay = new Date(match.matchDate);
  matchDay.setDate(matchDay.getDate() - (rc.dueDays ?? 1));
  const dueDateStr = matchDay.toISOString().split("T")[0];

  await createAutoTaskIfNotExists(
    {
      ruleId: "media_match_cover",
      title: `Design match cover — ${homeEn} vs ${awayEn}`,
      titleAr: `تصميم غلاف المباراة — ${homeAr} ضد ${awayAr}`,
      description: `Create a match day cover graphic for the upcoming fixture on ${new Date(match.matchDate).toLocaleDateString()}.`,
      type: "Media",
      mediaTaskType: "match_cover",
      mediaPlatforms: ["instagram", "twitter", "facebook"],
      priority: "high",
      matchId: match.id,
      assignedTo: mediaUser?.id ?? null,
      dueDateStr,
    },
    {
      roles: ["Admin", "Manager"],
      link: "/dashboard/media/tasks",
    },
  );
}
