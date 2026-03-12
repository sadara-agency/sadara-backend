/**
 * Match Analysis Integration Service
 *
 * Pluggable provider interface for external match analysis APIs
 * (Wyscout, InStat, etc.). Includes the sync orchestration layer
 * that persists imported data into Match + PlayerMatchStats.
 */

import { Op } from "sequelize";
import { sequelize } from "@config/database";
import { logger } from "@config/logger";
import { Match } from "@modules/matches/match.model";
import { PlayerMatchStats } from "@modules/matches/playerMatchStats.model";
import { Club } from "@modules/clubs/club.model";
import { ExternalProviderMapping } from "@modules/players/externalProvider.model";
import { AppError } from "@middleware/errorHandler";

// ── Provider interface ──

export interface MatchAnalysisProvider {
  name: string;
  /** Fetch match list for a player from the external system */
  fetchPlayerMatches(
    externalId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<ExternalMatch[]>;
  /** Fetch detailed stats for a single match */
  fetchMatchStats(
    externalMatchId: string,
    externalPlayerId?: string,
  ): Promise<ExternalMatchStats>;
  /** Test the connection / API key validity */
  testConnection(): Promise<boolean>;
}

export interface ExternalMatch {
  externalId: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  season?: string;
  minutesPlayed: number;
  goals: number;
  assists: number;
  rating?: number;
  homeScore?: number | null;
  awayScore?: number | null;
  venue?: string | null;
}

export interface ExternalMatchStats {
  externalMatchId: string;
  passes: number;
  passAccuracy: number;
  shots: number;
  shotsOnTarget: number;
  tackles: number;
  interceptions: number;
  duelsWon: number;
  duelsTotal: number;
  distanceCovered: number;
  sprintDistance: number;
  heatmap?: number[][];
  extra?: Record<string, unknown>;
  keyPasses?: number;
  dribblesCompleted?: number;
  dribblesAttempted?: number;
  foulsCommitted?: number;
  foulsDrawn?: number;
  yellowCards?: number;
  redCards?: number;
  positionInMatch?: string;
}

export interface SyncResult {
  imported: number;
  updated: number;
  matches: Array<{
    externalMatchId: string;
    matchId: string;
    date: string;
    homeTeam: string;
    awayTeam: string;
    isNew: boolean;
  }>;
}

// ── Provider Registry ──

const providers = new Map<string, MatchAnalysisProvider>();

export function registerProvider(provider: MatchAnalysisProvider): void {
  providers.set(provider.name, provider);
}

export function getProvider(name: string): MatchAnalysisProvider | undefined {
  return providers.get(name);
}

export function listProviders(): string[] {
  return Array.from(providers.keys());
}

/**
 * Refresh stats for a player from a configured provider (raw fetch, no persistence).
 */
export async function refreshPlayerStats(
  providerName: string,
  externalPlayerId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<ExternalMatch[]> {
  const provider = getProvider(providerName);
  if (!provider) {
    throw new AppError(
      `Match analysis provider "${providerName}" is not configured. Set the API key in environment variables.`,
      400,
    );
  }
  return provider.fetchPlayerMatches(externalPlayerId, dateFrom, dateTo);
}

// ── Club name resolution cache (per-sync) ──

const clubCache = new Map<string, string | null>();

async function resolveClubId(teamName: string): Promise<string | null> {
  if (!teamName) return null;
  const lower = teamName.toLowerCase().trim();
  if (clubCache.has(lower)) return clubCache.get(lower)!;

  const club = await Club.findOne({
    where: {
      [Op.or]: [
        { name: { [Op.iLike]: `%${lower}%` } },
        { nameAr: { [Op.iLike]: `%${lower}%` } },
      ],
    },
    attributes: ["id"],
  });

  const id = club?.id ?? null;
  clubCache.set(lower, id);
  return id;
}

/**
 * Full sync: fetch matches from provider, persist Match + PlayerMatchStats,
 * and update the ExternalProviderMapping.lastSyncedAt.
 */
export async function syncPlayerMatches(
  providerName: string,
  playerId: string,
  externalPlayerId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<SyncResult> {
  const provider = getProvider(providerName);
  if (!provider) {
    throw new AppError(
      `Match analysis provider "${providerName}" is not configured. Set the API key in environment variables.`,
      400,
    );
  }

  // 1. Fetch match list from external provider
  const externalMatches = await provider.fetchPlayerMatches(
    externalPlayerId,
    dateFrom,
    dateTo,
  );

  if (externalMatches.length === 0) {
    // Still update lastSyncedAt even if no matches
    await ExternalProviderMapping.update(
      { lastSyncedAt: new Date() },
      { where: { playerId, providerName } },
    );
    return { imported: 0, updated: 0, matches: [] };
  }

  const result: SyncResult = { imported: 0, updated: 0, matches: [] };
  const t = await sequelize.transaction();

  try {
    for (const ext of externalMatches) {
      // 2. Upsert Match record keyed by externalMatchId
      const [match, created] = await Match.findOrCreate({
        where: { externalMatchId: ext.externalId },
        defaults: {
          matchDate: new Date(ext.date),
          homeClubId: await resolveClubId(ext.homeTeam),
          awayClubId: await resolveClubId(ext.awayTeam),
          homeTeamName: ext.homeTeam,
          awayTeamName: ext.awayTeam,
          competition: ext.competition,
          season: ext.season ?? null,
          venue: ext.venue ?? null,
          homeScore: ext.homeScore ?? null,
          awayScore: ext.awayScore ?? null,
          status: ext.homeScore != null ? "completed" : "upcoming",
          providerSource: providerName,
          externalMatchId: ext.externalId,
        } as any,
        transaction: t,
      });

      // If match already existed, update score/status if now available
      if (!created && ext.homeScore != null && match.homeScore == null) {
        await match.update(
          {
            homeScore: ext.homeScore,
            awayScore: ext.awayScore,
            status: "completed" as const,
          },
          { transaction: t },
        );
      }

      if (created) result.imported++;
      else result.updated++;

      // 3. Fetch detailed stats for this match and this player
      let detailedStats: ExternalMatchStats | null = null;
      try {
        detailedStats = await provider.fetchMatchStats(
          ext.externalId,
          externalPlayerId,
        );
      } catch (statsErr) {
        // Non-fatal: log and continue with basic stats from match list
        logger.warn(
          `[MatchSync] Could not fetch detailed stats for match ${ext.externalId}: ${(statsErr as Error).message}`,
        );
      }

      // 4. Upsert PlayerMatchStats
      const statsRecord: any = {
        playerId,
        matchId: match.id,
        minutesPlayed: ext.minutesPlayed,
        goals: ext.goals,
        assists: ext.assists,
        rating: ext.rating ?? null,
      };

      // Merge detailed stats if available
      if (detailedStats) {
        statsRecord.passesTotal = detailedStats.passes || null;
        statsRecord.passesCompleted = detailedStats.passAccuracy
          ? Math.round(
              (detailedStats.passes * detailedStats.passAccuracy) / 100,
            )
          : null;
        statsRecord.shotsTotal = detailedStats.shots || null;
        statsRecord.shotsOnTarget = detailedStats.shotsOnTarget || null;
        statsRecord.tacklesTotal = detailedStats.tackles || null;
        statsRecord.interceptions = detailedStats.interceptions || null;
        statsRecord.duelsWon = detailedStats.duelsWon || null;
        statsRecord.duelsTotal = detailedStats.duelsTotal || null;
        statsRecord.dribblesCompleted = detailedStats.dribblesCompleted || null;
        statsRecord.dribblesAttempted = detailedStats.dribblesAttempted || null;
        statsRecord.foulsCommitted = detailedStats.foulsCommitted || null;
        statsRecord.foulsDrawn = detailedStats.foulsDrawn || null;
        statsRecord.yellowCards = detailedStats.yellowCards ?? 0;
        statsRecord.redCards = detailedStats.redCards ?? 0;
        statsRecord.keyPasses = detailedStats.keyPasses || null;
        statsRecord.positionInMatch = detailedStats.positionInMatch || null;
      }

      await PlayerMatchStats.upsert(statsRecord, { transaction: t });

      result.matches.push({
        externalMatchId: ext.externalId,
        matchId: match.id,
        date: ext.date,
        homeTeam: ext.homeTeam,
        awayTeam: ext.awayTeam,
        isNew: created,
      });
    }

    // 5. Update lastSyncedAt on the provider mapping
    await ExternalProviderMapping.update(
      { lastSyncedAt: new Date() },
      { where: { playerId, providerName }, transaction: t },
    );

    await t.commit();

    // Clear the per-sync club cache
    clubCache.clear();

    return result;
  } catch (err) {
    await t.rollback();
    clubCache.clear();
    throw err;
  }
}
