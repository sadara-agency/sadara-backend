// ─────────────────────────────────────────────────────────────
// SPL Intelligence Service
//
// Business logic for insights, tracked players, and competitions.
// ─────────────────────────────────────────────────────────────

import { Op } from "sequelize";
import { sequelize } from "@config/database";
import { AppError } from "@middleware/errorHandler";
import {
  SplCompetition,
  SplInsight,
  SplTrackedPlayer,
} from "@modules/spl/spl.intelligence.model";
import { ExternalProviderMapping } from "@modules/players/externalProvider.model";
import { Watchlist } from "@modules/scouting/scouting.model";
import { fetchPlayerStats } from "@modules/spl/spl.pulselive";
import {
  getSplIntelligenceConfig,
  saveSplIntelligenceConfig,
  type SplIntelligenceConfig,
} from "@cron/engines/spl.intelligence.engine";

// ══════════════════════════════════════════
// INSIGHTS
// ══════════════════════════════════════════

interface InsightQuery {
  page?: number;
  pageSize?: number;
  insightType?: string;
  position?: string;
  nationality?: string;
  competitionId?: string;
  showDismissed?: boolean;
}

export async function listInsights(query: InsightQuery) {
  const page = query.page ?? 0;
  const pageSize = Math.min(query.pageSize ?? 20, 50);

  // Map broad position categories to PulseLive position patterns
  const POSITION_GROUPS: Record<string, string[]> = {
    Forward: [
      "Forward",
      "Striker",
      "Winger",
      "Left Winger",
      "Right Winger",
      "Centre Forward",
      "Second Striker",
      "Left/Right Striker",
      "Left/Centre/Right Striker",
    ],
    Midfielder: [
      "Midfielder",
      "Central Midfielder",
      "Defensive Midfielder",
      "Attacking Midfielder",
      "Left Midfielder",
      "Right Midfielder",
      "Left/Right Midfielder",
    ],
    Defender: [
      "Defender",
      "Centre Back",
      "Centre Central Defender",
      "Central Defender",
      "Left Back",
      "Right Back",
      "Full Back",
      "Left Full Back",
      "Right Full Back",
      "Wing Back",
      "Left Wing Back",
      "Right Wing Back",
    ],
    Goalkeeper: ["Goalkeeper", "Keeper"],
  };

  const where: Record<string, unknown> = {};
  if (!query.showDismissed) where.isDismissed = false;
  if (query.insightType) where.insightType = query.insightType;
  if (query.position && POSITION_GROUPS[query.position]) {
    where.position = { [Op.in]: POSITION_GROUPS[query.position] };
  } else if (query.position) {
    where.position = query.position;
  }
  if (query.nationality)
    where.nationality = { [Op.iLike]: `%${query.nationality}%` };
  if (query.competitionId) where.competitionId = query.competitionId;

  // Exclude expired
  where[Op.or as any] = [
    { expiresAt: null },
    { expiresAt: { [Op.gt]: new Date() } },
  ];

  const { count, rows } = await SplInsight.findAndCountAll({
    where,
    include: [
      {
        model: SplCompetition,
        as: "competition",
        attributes: ["id", "name", "nameAr", "tier"],
      },
    ],
    order: [
      ["score", "DESC"],
      ["detectedAt", "DESC"],
    ],
    limit: pageSize,
    offset: page * pageSize,
  });

  return {
    data: rows,
    total: count,
    page,
    pageSize,
    pages: Math.ceil(count / pageSize),
  };
}

export async function dismissInsight(id: string) {
  const insight = await SplInsight.findByPk(id);
  if (!insight) throw new AppError("Insight not found", 404);
  await insight.update({ isDismissed: true });
  return insight;
}

export async function addInsightToWatchlist(insightId: string, userId: string) {
  const insight = await SplInsight.findByPk(insightId, {
    include: [{ model: SplCompetition, as: "competition" }],
  });
  if (!insight) throw new AppError("Insight not found", 404);
  if (insight.watchlistId)
    throw new AppError("Already added to watchlist", 409);

  const comp = (insight as any).competition as SplCompetition | null;

  const watchlistEntry = await Watchlist.create({
    prospectName: insight.playerName,
    nationality: insight.nationality,
    position: insight.position,
    currentClub: insight.teamName,
    currentLeague: comp?.name ?? "Saudi Pro League",
    source: "SPL Intelligence",
    scoutedBy: userId,
    priority:
      insight.score >= 70 ? "High" : insight.score >= 40 ? "Medium" : "Low",
    notes: `Auto-discovered: ${insight.headline}\n\nInsight type: ${insight.insightType}\nScore: ${insight.score}`,
  });

  await insight.update({ watchlistId: watchlistEntry.id });

  return { insight, watchlistId: watchlistEntry.id };
}

// ══════════════════════════════════════════
// TRACKED PLAYERS
// ══════════════════════════════════════════

export async function listTrackedPlayers(userId: string) {
  const players = await SplTrackedPlayer.findAll({
    where: { userId },
    include: [
      {
        model: SplCompetition,
        as: "competition",
        attributes: ["id", "name", "nameAr"],
      },
    ],
    order: [["updatedAt", "DESC"]],
  });
  return players;
}

export async function trackPlayer(
  userId: string,
  input: {
    pulselivePlayerId: number;
    playerName: string;
    teamName?: string;
    position?: string;
    nationality?: string;
    competitionId?: string;
    alertConfig?: Record<string, unknown>;
  },
) {
  // Check for duplicates
  const existing = await SplTrackedPlayer.findOne({
    where: { userId, pulselivePlayerId: input.pulselivePlayerId },
  });
  if (existing) throw new AppError("Already tracking this player", 409);

  // Fetch initial stats snapshot
  let initialStats: Record<string, number> | null = null;
  try {
    const comp = input.competitionId
      ? await SplCompetition.findByPk(input.competitionId)
      : null;
    const result = await fetchPlayerStats(
      input.pulselivePlayerId,
      comp?.pulseliveSeasonId,
      comp?.pulseliveCompId,
    );
    if (result) initialStats = result.stats;
  } catch {
    // Non-fatal — proceed without initial snapshot
  }

  const tracked = await SplTrackedPlayer.create({
    userId,
    pulselivePlayerId: input.pulselivePlayerId,
    playerName: input.playerName,
    teamName: input.teamName,
    position: input.position,
    nationality: input.nationality,
    competitionId: input.competitionId,
    alertConfig: input.alertConfig ?? {},
    lastStatsSnapshot: initialStats,
  });

  return tracked;
}

export async function untrackPlayer(userId: string, id: string) {
  const tracked = await SplTrackedPlayer.findOne({
    where: { id, userId },
  });
  if (!tracked) throw new AppError("Tracked player not found", 404);
  await tracked.destroy();
}

export async function updateTrackingAlerts(
  id: string,
  userId: string,
  alertConfig: Record<string, unknown>,
) {
  const tracked = await SplTrackedPlayer.findOne({
    where: { id, userId },
  });
  if (!tracked) throw new AppError("Tracked player not found", 404);
  await tracked.update({ alertConfig });
  return tracked;
}

export async function getTrackedPlayerDetail(id: string, userId: string) {
  const tracked = await SplTrackedPlayer.findOne({
    where: { id, userId },
    include: [
      {
        model: SplCompetition,
        as: "competition",
        attributes: ["id", "name", "nameAr"],
      },
    ],
  });
  if (!tracked) throw new AppError("Tracked player not found", 404);

  // Compute diffs between snapshots
  const current = (tracked.lastStatsSnapshot as Record<string, number>) ?? {};
  const previous =
    (tracked.previousStatsSnapshot as Record<string, number>) ?? {};
  const diffs: Record<
    string,
    { current: number; previous: number; diff: number }
  > = {};

  for (const key of Object.keys(current)) {
    const cur = current[key] ?? 0;
    const prev = previous[key] ?? 0;
    if (cur !== prev) {
      diffs[key] = { current: cur, previous: prev, diff: cur - prev };
    }
  }

  return { tracked, diffs };
}

// ══════════════════════════════════════════
// COMPETITIONS
// ══════════════════════════════════════════

export async function listCompetitions() {
  return SplCompetition.findAll({
    order: [
      ["tier", "ASC"],
      ["name", "ASC"],
    ],
  });
}

export async function toggleCompetition(id: string, isActive: boolean) {
  const comp = await SplCompetition.findByPk(id);
  if (!comp) throw new AppError("Competition not found", 404);
  await comp.update({ isActive });
  return comp;
}

// ══════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════

export async function getIntelligenceStatus() {
  const config = getSplIntelligenceConfig();

  const [
    totalInsights,
    activeInsights,
    totalTracked,
    pulseLiveMappings,
    lastInsight,
  ] = await Promise.all([
    SplInsight.count(),
    SplInsight.count({
      where: {
        isDismissed: false,
        [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }],
      },
    }),
    SplTrackedPlayer.count(),
    ExternalProviderMapping.count({
      where: { providerName: "PulseLive", isActive: true },
    }),
    SplInsight.findOne({
      order: [["detectedAt", "DESC"]],
      attributes: ["detectedAt"],
    }),
  ]);

  return {
    lastAnalysisRun: lastInsight?.detectedAt ?? null,
    totalInsights,
    activeInsights,
    totalTrackedPlayers: totalTracked,
    pulseLiveMappings,
    isEnabled: config.enabled,
  };
}

export function getIntelligenceConfig(): SplIntelligenceConfig {
  return getSplIntelligenceConfig();
}

export async function updateIntelligenceConfig(
  updates: Partial<SplIntelligenceConfig>,
) {
  await saveSplIntelligenceConfig(updates);
  return getSplIntelligenceConfig();
}
