// ═══════════════════════════════════════════════════════════════
// SPL Intelligence Engine
//
// Analyzes PulseLive data to auto-discover scouting opportunities:
// - Rising Star: Young players (U-23) with strong output
// - Form Surge: Players whose recent rate exceeds season average
// - Hidden Gem: High-quality passers at bottom-half clubs
// - Defensive Rock: Top-percentile tacklers/interceptors
// - Available Soon: Strong performers at bottom-6 clubs
//
// Also handles tracked player digest and insight cleanup.
// ═══════════════════════════════════════════════════════════════

import { Op, QueryTypes } from "sequelize";
import { sequelize } from "@config/database";
import { logger } from "@config/logger";
import {
  SplCompetition,
  SplInsight,
  SplTrackedPlayer,
  type InsightType,
  type SplInsightCreation,
} from "@modules/spl/spl.intelligence.model";
import {
  fetchAllRankedPlayers,
  fetchPlayerStats,
  fetchStandings,
} from "@modules/spl/spl.pulselive";
import type { PulseLiveRankedStat } from "@modules/spl/spl.types";
import {
  notifyByRole,
  notifyUser,
} from "@modules/notifications/notification.service";

// ── Configurable thresholds ──

export interface SplIntelligenceConfig {
  enabled: boolean;
  risingStarMaxAge: number;
  risingStarMinGoalsOrAssists: number;
  formSurgeMultiplier: number;
  hiddenGemMinPassAccuracy: number;
  hiddenGemMaxTeamPosition: number;
  defensiveRockTopPercentile: number;
  insightExpiryDays: number;
}

const DEFAULT_CONFIG: SplIntelligenceConfig = {
  enabled: true,
  risingStarMaxAge: 23,
  risingStarMinGoalsOrAssists: 3,
  formSurgeMultiplier: 1.5,
  hiddenGemMinPassAccuracy: 80,
  hiddenGemMaxTeamPosition: 12,
  defensiveRockTopPercentile: 10,
  insightExpiryDays: 14,
};

let _config: SplIntelligenceConfig = { ...DEFAULT_CONFIG };

export function getSplIntelligenceConfig(): SplIntelligenceConfig {
  return { ..._config };
}

export async function loadSplIntelligenceConfig() {
  try {
    const [row] = (await sequelize.query(
      `SELECT value FROM app_settings WHERE key = 'spl_intelligence_config' LIMIT 1`,
      { type: QueryTypes.SELECT },
    )) as { value: string | Record<string, unknown> }[];
    if (row?.value) {
      const parsed =
        typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      _config = { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch {
    // Table may not exist yet — use defaults
  }
}

export async function saveSplIntelligenceConfig(
  updates: Partial<SplIntelligenceConfig>,
) {
  _config = { ..._config, ...updates };
  try {
    await sequelize.query(
      `INSERT INTO app_settings (key, value) VALUES ('spl_intelligence_config', :val)
       ON CONFLICT (key) DO UPDATE SET value = :val`,
      { replacements: { val: JSON.stringify(_config) }, type: QueryTypes.RAW },
    );
  } catch {
    // silently ignore if table missing
  }
}

// ── Helpers ──

function computeAge(birthDateMillis?: number): number | null {
  if (!birthDateMillis) return null;
  const birth = new Date(birthDateMillis);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  ) {
    age--;
  }
  return age;
}

function expiryDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function upsertInsight(
  competitionId: string,
  type: InsightType,
  pulselivePlayerId: number,
  data: Omit<
    SplInsightCreation,
    "competitionId" | "insightType" | "pulselivePlayerId"
  >,
): Promise<boolean> {
  // Check for existing non-dismissed, non-expired insight of same type+player
  const existing = await SplInsight.findOne({
    where: {
      pulselivePlayerId,
      insightType: type,
      isDismissed: false,
      [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }],
    },
  });

  if (existing) {
    // Update score and details
    await existing.update({
      details: data.details,
      score: data.score,
      headline: data.headline,
      headlineAr: data.headlineAr,
      detectedAt: new Date(),
    });
    return false; // not a new insight
  }

  await SplInsight.create({
    competitionId,
    insightType: type,
    pulselivePlayerId,
    expiresAt: expiryDate(_config.insightExpiryDays),
    ...data,
  });
  return true; // new insight
}

// ══════════════════════════════════════════════════════════════
// JOB 1: Analyze League Intelligence (weekly — Saturday 8:30 AM)
//
// Fetches ranked players across key stats from all active
// competitions and runs 5 detection algorithms.
// ══════════════════════════════════════════════════════════════

export async function analyzeLeagueIntelligence(): Promise<{
  competitionsScanned: number;
  insightsCreated: number;
  playersAnalyzed: number;
}> {
  await loadSplIntelligenceConfig();
  if (!_config.enabled) {
    return { competitionsScanned: 0, insightsCreated: 0, playersAnalyzed: 0 };
  }

  const competitions = await SplCompetition.findAll({
    where: { isActive: true },
  });

  let totalInsights = 0;
  let totalPlayers = 0;

  for (const comp of competitions) {
    try {
      const result = await analyzeCompetition(comp);
      totalInsights += result.insightsCreated;
      totalPlayers += result.playersAnalyzed;

      await comp.update({ lastSyncedAt: new Date() });
    } catch (err: any) {
      logger.error(
        `[SPL Intelligence] Failed to analyze comp ${comp.name}: ${err.message}`,
      );
    }
  }

  logger.info(
    `[SPL Intelligence] Analysis complete: ${competitions.length} competitions, ${totalPlayers} players, ${totalInsights} new insights`,
  );

  return {
    competitionsScanned: competitions.length,
    insightsCreated: totalInsights,
    playersAnalyzed: totalPlayers,
  };
}

async function analyzeCompetition(
  comp: SplCompetition,
): Promise<{ insightsCreated: number; playersAnalyzed: number }> {
  const compId = comp.pulseliveCompId;
  const seasonId = comp.pulseliveSeasonId;
  let insightsCreated = 0;

  // 1. Fetch standings for team position context
  const standingsResp = await fetchStandings(seasonId, compId);
  const teamPositions = new Map<number, number>(); // pulseLiveTeamId → position
  if (standingsResp?.tables?.[0]?.entries) {
    for (const entry of standingsResp.tables[0].entries) {
      teamPositions.set(entry.team.id, entry.position);
    }
  }
  const totalTeams = teamPositions.size || 18;

  // 2. Fetch ranked players for key stats
  const statsToFetch: PulseLiveRankedStat[] = [
    "goals",
    "goal_assist",
    "total_pass",
    "total_tackle",
    "interceptions_won",
    "total_scoring_att",
  ];

  // Build a player map: pulseLivePlayerId → aggregated info
  const playerMap = new Map<
    number,
    {
      name: string;
      teamName: string;
      teamId: number;
      position: string;
      nationality: string | null;
      birthDateMillis?: number;
      stats: Record<string, number>;
    }
  >();

  for (const stat of statsToFetch) {
    const entries = await fetchAllRankedPlayers(stat, seasonId, compId, 100);
    for (const entry of entries) {
      const pid = entry.owner.id;
      if (!playerMap.has(pid)) {
        playerMap.set(pid, {
          name: entry.owner.name.display,
          teamName: entry.owner.currentTeam?.name ?? "",
          teamId: entry.owner.currentTeam?.id ?? 0,
          position: entry.owner.info.positionInfo,
          nationality: entry.owner.nationalTeam?.country ?? null,
          birthDateMillis: entry.owner.birth?.date?.millis,
          stats: {},
        });
      }
      playerMap.get(pid)!.stats[entry.name] = entry.value;
    }
  }

  const playersAnalyzed = playerMap.size;

  // 3. Run detection algorithms
  for (const [pid, player] of playerMap) {
    const age = computeAge(player.birthDateMillis);
    const teamPos = teamPositions.get(player.teamId) ?? 0;
    const goals = player.stats.goals ?? 0;
    const assists = player.stats.goal_assist ?? 0;
    const totalPasses = player.stats.total_pass ?? 0;
    const tackles = player.stats.total_tackle ?? 0;
    const interceptions = player.stats.interceptions_won ?? 0;

    // ── Rising Star ──
    if (
      age !== null &&
      age <= _config.risingStarMaxAge &&
      goals + assists >= _config.risingStarMinGoalsOrAssists
    ) {
      const score = Math.min(
        100,
        (goals + assists) * 10 + (age <= 21 ? 20 : 0),
      );
      const isNew = await upsertInsight(comp.id, "rising_star", pid, {
        playerName: player.name,
        teamName: player.teamName,
        position: player.position,
        nationality: player.nationality,
        age,
        headline: `${player.name} (${age}y) — ${goals}G, ${assists}A this season`,
        headlineAr: `${player.name} (${age} سنة) — ${goals} أهداف، ${assists} تمريرات حاسمة هذا الموسم`,
        details: {
          goals,
          assists,
          age,
          teamPosition: teamPos,
          season: "2025-2026",
        },
        score,
      });
      if (isNew) insightsCreated++;
    }

    // ── Form Surge ──
    // Players with high goal+assist output relative to appearances
    const appearances = player.stats.appearances ?? 0;
    if (appearances >= 5 && goals + assists >= 4) {
      const outputPerMatch = (goals + assists) / appearances;
      if (outputPerMatch >= 0.5) {
        // 0.5 G+A per match is strong
        const score = Math.min(100, outputPerMatch * 100);
        const isNew = await upsertInsight(comp.id, "form_surge", pid, {
          playerName: player.name,
          teamName: player.teamName,
          position: player.position,
          nationality: player.nationality,
          age,
          headline: `${player.name} — ${outputPerMatch.toFixed(2)} G+A per match (${goals}G, ${assists}A in ${appearances} apps)`,
          headlineAr: `${player.name} — ${outputPerMatch.toFixed(2)} هدف+تمريرة لكل مباراة (${goals} أهداف، ${assists} تمريرات في ${appearances} مباراة)`,
          details: {
            goals,
            assists,
            appearances,
            outputPerMatch,
            season: "2025-2026",
          },
          score,
        });
        if (isNew) insightsCreated++;
      }
    }

    // ── Hidden Gem ──
    if (totalPasses > 0 && teamPos > _config.hiddenGemMaxTeamPosition) {
      // We need accurate_pass which may not be in ranked data, check if we have it
      const accuratePass = player.stats.accurate_pass ?? 0;
      const passAccuracy =
        accuratePass > 0 ? (accuratePass / totalPasses) * 100 : 0;

      if (
        passAccuracy >= _config.hiddenGemMinPassAccuracy &&
        (assists >= 2 || (player.stats.big_chance_created ?? 0) >= 2)
      ) {
        const score = Math.min(
          100,
          passAccuracy * 0.5 + assists * 10 + (totalTeams - teamPos) * 2,
        );
        const isNew = await upsertInsight(comp.id, "hidden_gem", pid, {
          playerName: player.name,
          teamName: player.teamName,
          position: player.position,
          nationality: player.nationality,
          age,
          headline: `${player.name} — ${passAccuracy.toFixed(0)}% pass accuracy, ${assists}A at ${player.teamName} (${teamPos}th)`,
          headlineAr: `${player.name} — دقة تمرير ${passAccuracy.toFixed(0)}%، ${assists} تمريرات حاسمة في ${player.teamName} (المركز ${teamPos})`,
          details: {
            passAccuracy,
            totalPasses,
            accuratePass,
            assists,
            teamPosition: teamPos,
          },
          score,
        });
        if (isNew) insightsCreated++;
      }
    }

    // ── Defensive Rock ──
    const defensiveOutput = tackles + interceptions;
    if (defensiveOutput > 0) {
      // We'll check if this player is in the top percentile among all analyzed
      // Simple approach: top N% based on absolute numbers
      const threshold =
        playersAnalyzed * (_config.defensiveRockTopPercentile / 100);
      // Count how many have more defensive output
      let betterCount = 0;
      for (const [, other] of playerMap) {
        const otherDef =
          (other.stats.total_tackle ?? 0) +
          (other.stats.interceptions_won ?? 0);
        if (otherDef > defensiveOutput) betterCount++;
      }

      if (betterCount < threshold && defensiveOutput >= 30) {
        const score = Math.min(100, defensiveOutput * 1.5);
        const isNew = await upsertInsight(comp.id, "defensive_rock", pid, {
          playerName: player.name,
          teamName: player.teamName,
          position: player.position,
          nationality: player.nationality,
          age,
          headline: `${player.name} — ${tackles} tackles, ${interceptions} interceptions (top ${_config.defensiveRockTopPercentile}%)`,
          headlineAr: `${player.name} — ${tackles} تدخل، ${interceptions} اعتراض (أفضل ${_config.defensiveRockTopPercentile}%)`,
          details: {
            tackles,
            interceptions,
            defensiveOutput,
            percentile: _config.defensiveRockTopPercentile,
          },
          score,
        });
        if (isNew) insightsCreated++;
      }
    }

    // ── Available Soon ──
    const bottomThreshold = totalTeams - 6;
    if (
      teamPos > bottomThreshold &&
      goals + assists >= 3 &&
      age !== null &&
      age <= 30
    ) {
      const score = Math.min(
        100,
        (goals + assists) * 12 + (30 - (age ?? 25)) * 2,
      );
      const isNew = await upsertInsight(comp.id, "available_soon", pid, {
        playerName: player.name,
        teamName: player.teamName,
        position: player.position,
        nationality: player.nationality,
        age,
        headline: `${player.name} (${age}y) — ${goals}G, ${assists}A at ${player.teamName} (${teamPos}th, relegation zone)`,
        headlineAr: `${player.name} (${age} سنة) — ${goals} أهداف، ${assists} تمريرات في ${player.teamName} (المركز ${teamPos}، منطقة هبوط)`,
        details: { goals, assists, age, teamPosition: teamPos, totalTeams },
        score,
      });
      if (isNew) insightsCreated++;
    }
  }

  // Notify scouts about new insights
  if (insightsCreated > 0) {
    await notifyByRole(["Scout", "Manager", "Admin"], {
      type: "system",
      title: `SPL Intelligence: ${insightsCreated} new discoveries in ${comp.name}`,
      titleAr: `ذكاء الدوري: ${insightsCreated} اكتشافات جديدة في ${comp.nameAr || comp.name}`,
      body: `${playersAnalyzed} players analyzed. Check SPL Intelligence for details.`,
      bodyAr: `تم تحليل ${playersAnalyzed} لاعب. تحقق من ذكاء الدوري للتفاصيل.`,
      link: "/dashboard/spl-sync",
      sourceType: "spl_insight",
      priority: "normal",
    });
  }

  return { insightsCreated, playersAnalyzed };
}

// ══════════════════════════════════════════════════════════════
// JOB 2: Refresh Tracked Players (weekly — Sunday 9:00 AM)
//
// Fetches latest stats for each tracked player, compares with
// previous snapshot, and fires alert notifications.
// ══════════════════════════════════════════════════════════════

export async function refreshTrackedPlayers(): Promise<{
  playersRefreshed: number;
  alertsFired: number;
}> {
  await loadSplIntelligenceConfig();
  if (!_config.enabled) return { playersRefreshed: 0, alertsFired: 0 };

  const trackedPlayers = await SplTrackedPlayer.findAll({
    include: [{ model: SplCompetition, as: "competition" }],
  });

  let alertsFired = 0;

  for (const tp of trackedPlayers) {
    try {
      const comp = (tp as any).competition as SplCompetition | null;
      const compId = comp?.pulseliveCompId;
      const seasonId = comp?.pulseliveSeasonId;

      const result = await fetchPlayerStats(
        tp.pulselivePlayerId,
        seasonId,
        compId,
      );
      if (!result) continue;

      const currentStats = result.stats;
      const previousStats =
        (tp.lastStatsSnapshot as Record<string, number>) ?? {};

      // Compute diffs
      const goals = (currentStats.goals ?? 0) - (previousStats.goals ?? 0);
      const assists =
        (currentStats.goal_assist ?? 0) - (previousStats.goal_assist ?? 0);

      // Rotate snapshots
      await tp.update({
        previousStatsSnapshot: tp.lastStatsSnapshot,
        lastStatsSnapshot: currentStats,
      });

      // Check alert thresholds
      const alerts = tp.alertConfig as Record<string, number>;
      const goalsThreshold = alerts.goals_threshold ?? 0;
      const assistsThreshold = alerts.assists_threshold ?? 0;

      if (
        (goalsThreshold > 0 && goals >= goalsThreshold) ||
        (assistsThreshold > 0 && assists >= assistsThreshold)
      ) {
        await notifyUser(tp.userId, {
          type: "system",
          title: `Tracked player alert: ${tp.playerName}`,
          titleAr: `تنبيه لاعب مُتتبع: ${tp.playerName}`,
          body: `${tp.playerName} — +${goals} goals, +${assists} assists since last check`,
          bodyAr: `${tp.playerName} — +${goals} أهداف، +${assists} تمريرات حاسمة منذ آخر فحص`,
          link: "/dashboard/spl-sync",
          sourceType: "spl_tracked",
          priority: goals >= 3 || assists >= 3 ? "high" : "normal",
        });
        alertsFired++;
      }
    } catch (err: any) {
      logger.warn(
        `[SPL Intelligence] Failed to refresh tracked player ${tp.playerName}: ${err.message}`,
      );
    }
  }

  // Send weekly digest to users who have tracked players
  const userGroups = new Map<string, SplTrackedPlayer[]>();
  for (const tp of trackedPlayers) {
    const group = userGroups.get(tp.userId) ?? [];
    group.push(tp);
    userGroups.set(tp.userId, group);
  }

  for (const [userId, players] of userGroups) {
    const summaries = players
      .map((p) => {
        const curr = (p.lastStatsSnapshot as Record<string, number>) ?? {};
        const prev = (p.previousStatsSnapshot as Record<string, number>) ?? {};
        const gDiff = (curr.goals ?? 0) - (prev.goals ?? 0);
        const aDiff = (curr.goal_assist ?? 0) - (prev.goal_assist ?? 0);
        return `${p.playerName}: ${curr.goals ?? 0}G (+${gDiff}), ${curr.goal_assist ?? 0}A (+${aDiff})`;
      })
      .join("; ");

    await notifyUser(userId, {
      type: "system",
      title: `Weekly SPL digest: ${players.length} tracked players`,
      titleAr: `ملخص أسبوعي: ${players.length} لاعبين متتبعين`,
      body: summaries.slice(0, 300),
      bodyAr: summaries.slice(0, 300),
      link: "/dashboard/spl-sync",
      sourceType: "spl_digest",
      priority: "low",
    });
  }

  logger.info(
    `[SPL Intelligence] Refreshed ${trackedPlayers.length} tracked players, ${alertsFired} alerts fired`,
  );

  return { playersRefreshed: trackedPlayers.length, alertsFired };
}

// ══════════════════════════════════════════════════════════════
// JOB 3: Sync Competition Data (weekly — Saturday 8:00 AM)
//
// Refreshes standings for each active competition.
// ══════════════════════════════════════════════════════════════

export async function syncCompetitionData(): Promise<{
  competitionsSynced: number;
}> {
  const competitions = await SplCompetition.findAll({
    where: { isActive: true },
  });

  for (const comp of competitions) {
    try {
      // Trigger standings fetch (warms cache / validates API)
      await fetchStandings(comp.pulseliveSeasonId, comp.pulseliveCompId);
      await comp.update({ lastSyncedAt: new Date() });
    } catch (err: any) {
      logger.warn(
        `[SPL Intelligence] Failed to sync comp ${comp.name}: ${err.message}`,
      );
    }
  }

  return { competitionsSynced: competitions.length };
}

// ══════════════════════════════════════════════════════════════
// JOB 4: Cleanup Expired Insights (daily — 4:00 AM)
// ══════════════════════════════════════════════════════════════

export async function cleanupExpiredInsights(): Promise<{
  removed: number;
}> {
  await loadSplIntelligenceConfig();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - _config.insightExpiryDays);

  const removed = await SplInsight.destroy({
    where: {
      [Op.or]: [
        // Dismissed insights older than expiry
        { isDismissed: true, detectedAt: { [Op.lt]: cutoff } },
        // Un-actioned insights (no watchlist link) older than expiry
        {
          watchlistId: null,
          isDismissed: false,
          detectedAt: { [Op.lt]: cutoff },
        },
      ],
    },
  });

  if (removed > 0) {
    logger.info(`[SPL Intelligence] Cleaned up ${removed} expired insights`);
  }

  return { removed };
}
