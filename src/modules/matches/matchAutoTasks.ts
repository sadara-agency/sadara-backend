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

import { Task } from '../tasks/task.model';
import { MatchPlayer } from './matchPlayer.model';
import { PlayerMatchStats } from './playerMatchStats.model';
import { Player } from '../players/player.model';
import { Match } from './match.model';
import { Club } from '../clubs/club.model';
import { Op } from 'sequelize';

// ── Rule definitions ──

interface AutoTaskRule {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: (ctx: RuleContext) => string;
  descriptionAr: (ctx: RuleContext) => string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  condition: (ctx: RuleContext) => boolean;
  /** Days from now for due date */
  dueDays: number;
}

interface RuleContext {
  playerName: string;
  playerNameAr: string;
  matchLabel: string;
  stats: PlayerMatchStats;
  availability: string | null;
}

const RULES: AutoTaskRule[] = [
  {
    id: 'red_card',
    titleEn: 'Review player suspension',
    titleAr: 'مراجعة إيقاف اللاعب',
    descriptionEn: (ctx) =>
      `${ctx.playerName} received a red card in ${ctx.matchLabel}. Review suspension rules and upcoming match availability.`,
    descriptionAr: (ctx) =>
      `${ctx.playerNameAr} حصل على بطاقة حمراء في ${ctx.matchLabel}. مراجعة قواعد الإيقاف وجاهزية المباريات القادمة.`,
    priority: 'critical',
    condition: (ctx) => (ctx.stats.redCards ?? 0) > 0,
    dueDays: 1,
  },
  {
    id: 'yellow_cards_accumulated',
    titleEn: 'Review accumulated bookings',
    titleAr: 'مراجعة البطاقات المتراكمة',
    descriptionEn: (ctx) =>
      `${ctx.playerName} received ${ctx.stats.yellowCards} yellow card(s) in ${ctx.matchLabel}. Check accumulated bookings threshold.`,
    descriptionAr: (ctx) =>
      `${ctx.playerNameAr} حصل على ${ctx.stats.yellowCards} بطاقة صفراء في ${ctx.matchLabel}. تحقق من عتبة البطاقات المتراكمة.`,
    priority: 'high',
    condition: (ctx) => (ctx.stats.yellowCards ?? 0) >= 2,
    dueDays: 2,
  },
  {
    id: 'critical_performance',
    titleEn: 'Urgent performance intervention',
    titleAr: 'تدخل عاجل لأداء اللاعب',
    descriptionEn: (ctx) =>
      `${ctx.playerName} rated ${ctx.stats.rating?.toFixed(1)} in ${ctx.matchLabel}. Immediate coaching review required.`,
    descriptionAr: (ctx) =>
      `${ctx.playerNameAr} حصل على تقييم ${ctx.stats.rating?.toFixed(1)} في ${ctx.matchLabel}. مطلوب مراجعة تدريبية فورية.`,
    priority: 'critical',
    condition: (ctx) => ctx.stats.rating != null && Number(ctx.stats.rating) < 3.0,
    dueDays: 1,
  },
  {
    id: 'low_performance',
    titleEn: 'Performance review needed',
    titleAr: 'مطلوب مراجعة الأداء',
    descriptionEn: (ctx) =>
      `${ctx.playerName} rated ${ctx.stats.rating?.toFixed(1)} in ${ctx.matchLabel}. Schedule a performance review session.`,
    descriptionAr: (ctx) =>
      `${ctx.playerNameAr} حصل على تقييم ${ctx.stats.rating?.toFixed(1)} في ${ctx.matchLabel}. جدولة جلسة مراجعة أداء.`,
    priority: 'high',
    condition: (ctx) =>
      ctx.stats.rating != null &&
      Number(ctx.stats.rating) >= 3.0 &&
      Number(ctx.stats.rating) < 5.0,
    dueDays: 3,
  },
  {
    id: 'injury_assessment',
    titleEn: 'Arrange medical assessment',
    titleAr: 'ترتيب تقييم طبي',
    descriptionEn: (ctx) =>
      `${ctx.playerName} was marked as injured for ${ctx.matchLabel}. Arrange medical assessment and update injury records.`,
    descriptionAr: (ctx) =>
      `${ctx.playerNameAr} تم تسجيله مصاباً في ${ctx.matchLabel}. ترتيب تقييم طبي وتحديث سجل الإصابات.`,
    priority: 'critical',
    condition: (ctx) => ctx.availability === 'injured',
    dueDays: 1,
  },
  {
    id: 'highlight_performance',
    titleEn: 'Highlight outstanding performance',
    titleAr: 'إبراز الأداء المتميز',
    descriptionEn: (ctx) =>
      `${ctx.playerName} rated ${ctx.stats.rating?.toFixed(1)} (${ctx.stats.goals ?? 0}G, ${ctx.stats.assists ?? 0}A) in ${ctx.matchLabel}. Add to performance report and consider for media highlight.`,
    descriptionAr: (ctx) =>
      `${ctx.playerNameAr} حصل على تقييم ${ctx.stats.rating?.toFixed(1)} (${ctx.stats.goals ?? 0} أهداف، ${ctx.stats.assists ?? 0} تمريرات) في ${ctx.matchLabel}. إضافة لتقرير الأداء والنظر في إبراز إعلامي.`,
    priority: 'low',
    condition: (ctx) =>
      ctx.stats.rating != null &&
      Number(ctx.stats.rating) >= 8.0 &&
      (ctx.stats.minutesPlayed ?? 0) >= 60,
    dueDays: 5,
  },
  {
    id: 'high_fouls',
    titleEn: 'Review player discipline',
    titleAr: 'مراجعة انضباط اللاعب',
    descriptionEn: (ctx) =>
      `${ctx.playerName} committed ${ctx.stats.foulsCommitted} fouls in ${ctx.matchLabel}. Review with coaching staff.`,
    descriptionAr: (ctx) =>
      `${ctx.playerNameAr} ارتكب ${ctx.stats.foulsCommitted} أخطاء في ${ctx.matchLabel}. مراجعة مع الجهاز الفني.`,
    priority: 'medium',
    condition: (ctx) => (ctx.stats.foulsCommitted ?? 0) >= 4,
    dueDays: 3,
  },
];

// ── Helper: format due date ──

function dueDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

// ── Main generator function ──

export async function generateAutoTasks(
  matchId: string,
  triggeredBy: string,
): Promise<{ created: number; rules: string[] }> {
  // Load match info for labels
  const match = await Match.findByPk(matchId, {
    include: [
      { model: Club, as: 'homeClub', attributes: ['name', 'nameAr'] },
      { model: Club, as: 'awayClub', attributes: ['name', 'nameAr'] },
    ],
  });
  if (!match) return { created: 0, rules: [] };

  const homeClub = (match as any).homeClub;
  const awayClub = (match as any).awayClub;
  const matchLabel = `${homeClub?.name ?? 'TBD'} vs ${awayClub?.name ?? 'TBD'}`;

  // Load all stats for this match
  const allStats = await PlayerMatchStats.findAll({
    where: { matchId },
    include: [
      {
        model: Player,
        as: 'player',
        attributes: ['id', 'firstName', 'lastName', 'firstNameAr', 'lastNameAr'],
      },
    ],
  });

  // Load match_players for availability info
  const matchPlayers = await MatchPlayer.findAll({
    where: { matchId },
    attributes: ['playerId', 'availability'],
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
      ? `${player.firstNameAr} ${player.lastNameAr || ''}`.trim()
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

      // Create the task
      await Task.create({
        title: rule.titleEn,
        titleAr: rule.titleAr,
        description: rule.descriptionEn(ctx),
        type: 'Match',
        priority: rule.priority,
        status: 'Open',
        playerId: player.id,
        matchId,
        assignedBy: triggeredBy,
        isAutoCreated: true,
        triggerRuleId: rule.id,
        dueDate: dueDate(rule.dueDays),
        notes: rule.descriptionAr(ctx),
      } as any);

      createdRules.push(`${rule.id}:${player.id}`);
    }
  }

  // Also check injured players who might not have stats yet
  for (const mp of matchPlayers) {
    if (mp.availability !== 'injured') continue;

    // Skip if already processed via stats
    const hasStats = allStats.some((s) => s.playerId === mp.playerId);
    if (hasStats) continue;

    // Load player info
    const player = await Player.findByPk(mp.playerId, {
      attributes: ['id', 'firstName', 'lastName', 'firstNameAr', 'lastNameAr'],
    });
    if (!player) continue;

    const playerName = `${player.firstName} ${player.lastName}`.trim();
    const playerNameAr = player.firstNameAr
      ? `${player.firstNameAr} ${player.lastNameAr || ''}`.trim()
      : playerName;

    const injuryRule = RULES.find((r) => r.id === 'injury_assessment')!;

    const existing = await Task.findOne({
      where: {
        matchId,
        playerId: player.id,
        triggerRuleId: 'injury_assessment',
        isAutoCreated: true,
      },
    });

    if (!existing) {
      const dummyStats = { redCards: 0, yellowCards: 0, rating: null, foulsCommitted: 0, minutesPlayed: 0, goals: 0, assists: 0 } as any;
      const ctx: RuleContext = {
        playerName,
        playerNameAr,
        matchLabel,
        stats: dummyStats,
        availability: 'injured',
      };

      await Task.create({
        title: injuryRule.titleEn,
        titleAr: injuryRule.titleAr,
        description: injuryRule.descriptionEn(ctx),
        type: 'Match',
        priority: 'critical',
        status: 'Open',
        playerId: player.id,
        matchId,
        assignedBy: triggeredBy,
        isAutoCreated: true,
        triggerRuleId: 'injury_assessment',
        dueDate: dueDate(1),
        notes: injuryRule.descriptionAr(ctx),
      } as any);

      createdRules.push(`injury_assessment:${player.id}`);
    }
  }

  return { created: createdRules.length, rules: createdRules };
}