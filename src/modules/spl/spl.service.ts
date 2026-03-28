// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.service.ts
// Service layer — club seeding, sync state.
// Club external IDs use Sequelize model columns (splTeamId, espnTeamId).
// ─────────────────────────────────────────────────────────────

import { Op, Sequelize, QueryTypes } from "sequelize";
import { logger } from "@config/logger";
import { sequelize } from "@config/database";
import { Club } from "@modules/clubs/club.model";
import {
  Competition,
  ClubCompetition,
} from "@modules/competitions/competition.model";
import {
  SPL_CLUB_REGISTRY,
  findByPulseLiveTeamId,
} from "@modules/spl/spl.registry";
import {
  fetchStandings,
  fetchRankedPlayers,
  fetchPlayerStats,
  fetchTeamStats,
} from "@modules/spl/spl.pulselive";
import type {
  StandingRow,
  LeaderboardEntry,
  DetailedPlayerStats,
  PulseLiveRankedStat,
} from "@modules/spl/spl.types";

// ══════════════════════════════════════════
// SEED CLUB EXTERNAL IDS
// ══════════════════════════════════════════

export async function seedClubExternalIds(): Promise<{
  updated: number;
  notFound: string[];
}> {
  let updated = 0;
  const notFound: string[] = [];

  for (const entry of SPL_CLUB_REGISTRY) {
    const club = await Club.findOne({
      where: {
        [Op.or]: [
          Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("name")),
            entry.nameEn.toLowerCase(),
          ),
          { name: { [Op.iLike]: `%${entry.nameEn}%` } },
          ...(entry.nameAr
            ? [{ nameAr: { [Op.like]: `%${entry.nameAr}%` } }]
            : []),
        ],
      },
    });

    if (club) {
      await club.update({
        splTeamId: parseInt(entry.splTeamId, 10),
        espnTeamId: parseInt(entry.espnTeamId, 10),
      });

      // Auto-enroll in Roshn Saudi League competition
      const splComp = await Competition.findOne({
        where: { name: "Roshn Saudi League" },
        attributes: ["id"],
      });
      if (splComp) {
        await ClubCompetition.findOrCreate({
          where: {
            clubId: club.id,
            competitionId: splComp.id,
            season: "2025-2026",
          },
          defaults: {
            clubId: club.id,
            competitionId: splComp.id,
            season: "2025-2026",
          },
        });
      }

      updated++;
      logger.info(
        `[SPL Service] ✓ ${entry.nameEn} → spl=${entry.splTeamId} espn=${entry.espnTeamId}`,
      );
    } else {
      notFound.push(entry.nameEn);
      logger.warn(`[SPL Service] ✗ No Sadara club for "${entry.nameEn}"`);
    }
  }

  return { updated, notFound };
}

// ══════════════════════════════════════════
// SYNC STATE (in-memory)
// ══════════════════════════════════════════

interface SyncState {
  isRunning: boolean;
  lastRun: Date | null;
  lastResult: any | null;
}

const state: SyncState = { isRunning: false, lastRun: null, lastResult: null };

export function getSyncState() {
  return { ...state };
}
export function updateSyncState(p: Partial<SyncState>) {
  Object.assign(state, p);
}

// ══════════════════════════════════════════
// STANDINGS (PulseLive API)
// ══════════════════════════════════════════

export async function getStandings(seasonId?: number): Promise<StandingRow[]> {
  const data = await fetchStandings(seasonId);
  if (!data?.tables?.[0]?.entries) return [];

  const rows: StandingRow[] = [];

  for (const entry of data.tables[0].entries) {
    const reg = findByPulseLiveTeamId(entry.team.id);
    let sadaraClubId: string | null = null;

    if (reg) {
      const club = await Club.findOne({
        where: {
          [Op.or]: [
            { splTeamId: parseInt(reg.splTeamId, 10) },
            { name: { [Op.iLike]: `%${reg.nameEn}%` } },
          ],
        },
        attributes: ["id"],
      });
      sadaraClubId = club?.id ?? null;
    }

    rows.push({
      position: entry.position,
      teamName: entry.team.name,
      teamAbbr: entry.team.club.abbr,
      pulseLiveTeamId: entry.team.id,
      sadaraClubId,
      played: entry.overall.played,
      won: entry.overall.won,
      drawn: entry.overall.drawn,
      lost: entry.overall.lost,
      goalsFor: entry.overall.goalsFor,
      goalsAgainst: entry.overall.goalsAgainst,
      goalDifference: entry.overall.goalsDifference,
      points: entry.overall.points,
    });
  }

  return rows;
}

// ══════════════════════════════════════════
// LEADERBOARD (PulseLive API)
// ══════════════════════════════════════════

export async function getLeaderboard(
  stat: PulseLiveRankedStat,
  page = 0,
  pageSize = 20,
  seasonId?: number,
): Promise<{ data: LeaderboardEntry[]; total: number; pages: number }> {
  const resp = await fetchRankedPlayers(stat, page, pageSize, seasonId);
  if (!resp?.stats?.content) return { data: [], total: 0, pages: 0 };

  const entries: LeaderboardEntry[] = [];

  // Lazy import to avoid circular dependency in test environments
  const { ExternalProviderMapping } =
    await import("@modules/players/externalProvider.model");

  for (const item of resp.stats.content) {
    // Try to find linked Sadara player via PulseLive provider mapping
    let sadaraPlayerId: string | null = null;
    const mapping = await ExternalProviderMapping.findOne({
      where: {
        providerName: "PulseLive",
        externalPlayerId: String(item.owner.id),
      },
      attributes: ["playerId"],
    });
    if (mapping) sadaraPlayerId = mapping.playerId;

    entries.push({
      rank: item.rank,
      playerName: item.owner.name.display,
      teamName: item.owner.currentTeam?.name ?? "",
      teamAbbr: item.owner.currentTeam?.club.abbr ?? "",
      value: item.value,
      stat: item.name,
      pulseLivePlayerId: item.owner.id,
      sadaraPlayerId,
      position: item.owner.info.positionInfo,
      nationality: item.owner.nationalTeam?.country ?? null,
      shirtNumber: item.owner.info.shirtNum ?? null,
    });
  }

  return {
    data: entries,
    total: resp.stats.pageInfo.numEntries,
    pages: resp.stats.pageInfo.numPages,
  };
}

// ══════════════════════════════════════════
// DETAILED PLAYER STATS (PulseLive API)
// ══════════════════════════════════════════

// Stat categorization for frontend display
const STAT_CATEGORIES: Record<string, string[]> = {
  attacking: [
    "goals",
    "total_scoring_att",
    "ontarget_scoring_att",
    "att_ibox_goal",
    "att_obox_goal",
    "big_chance_scored",
    "big_chance_missed",
    "hit_woodwork",
    "att_rf_total",
    "att_lf_total",
    "att_hd_total",
    "winning_goal",
    "goals_openplay",
    "att_pen_goal",
    "att_freekick_total",
  ],
  passing: [
    "total_pass",
    "accurate_pass",
    "total_long_balls",
    "accurate_long_balls",
    "total_through_ball",
    "accurate_through_ball",
    "total_cross",
    "big_chance_created",
    "goal_assist",
    "goal_assist_intentional",
    "goal_assist_openplay",
    "goal_assist_setplay",
    "total_att_assist",
    "ontarget_att_assist",
    "successful_put_through",
  ],
  defensive: [
    "total_tackle",
    "won_tackle",
    "interception",
    "interceptions_won",
    "effective_clearance",
    "effective_head_clearance",
    "outfielder_block",
    "ball_recovery",
    "poss_won_def_3rd",
    "poss_won_mid_3rd",
    "poss_won_att_3rd",
  ],
  possession: [
    "touches",
    "total_final_third_passes",
    "successful_final_third_passes",
    "total_fwd_zone_pass",
    "accurate_fwd_zone_pass",
    "backward_pass",
    "total_offside",
    "total_flick_on",
    "accurate_flick_on",
    "carries",
    "progressive_carries",
  ],
  discipline: [
    "yellow_card",
    "red_card",
    "fouls",
    "was_fouled",
    "total_offside",
    "hand_ball",
    "penalty_won",
  ],
  duels: [
    "duel_won",
    "duel_lost",
    "aerial_won",
    "aerial_lost",
    "won_contest",
    "total_contest",
    "challenge_lost",
  ],
  general: [
    "appearances",
    "games_started",
    "mins_played",
    "total_sub_on",
    "total_sub_off",
    "clean_sheet",
    "wins",
    "draws",
    "losses",
    "goals_conceded",
    "goals_conceded_ibox",
    "goals_conceded_obox",
  ],
};

export async function getPlayerDetailedStats(
  playerId: string,
  seasonId?: number,
): Promise<DetailedPlayerStats | null> {
  // Lazy import to avoid circular dependency in test environments
  const { ExternalProviderMapping } =
    await import("@modules/players/externalProvider.model");

  // Find PulseLive mapping for this Sadara player
  const mapping = await ExternalProviderMapping.findOne({
    where: { playerId, providerName: "PulseLive" },
  });

  if (!mapping) {
    logger.debug(`[SPL Service] No PulseLive mapping for player ${playerId}`);
    return null;
  }

  const plId = parseInt(mapping.externalPlayerId, 10);
  if (isNaN(plId)) return null;

  const result = await fetchPlayerStats(plId, seasonId);
  if (!result) return null;

  // Categorize stats
  const categories: Record<string, Record<string, number>> = {};
  for (const [category, statNames] of Object.entries(STAT_CATEGORIES)) {
    const catStats: Record<string, number> = {};
    for (const name of statNames) {
      if (result.stats[name] !== undefined) {
        catStats[name] = result.stats[name];
      }
    }
    if (Object.keys(catStats).length > 0) {
      categories[category] = catStats;
    }
  }

  return {
    playerId,
    pulseLiveId: plId,
    season: "2025-2026",
    categories,
    raw: result.stats,
  };
}

// ══════════════════════════════════════════
// TEAM STATS (PulseLive API)
// ══════════════════════════════════════════

export async function getTeamDetailedStats(
  pulseLiveTeamId: number,
  seasonId?: number,
): Promise<{
  teamName: string;
  stats: Record<string, number>;
  sadaraClubId: string | null;
} | null> {
  const result = await fetchTeamStats(pulseLiveTeamId, seasonId);
  if (!result) return null;

  const reg = findByPulseLiveTeamId(pulseLiveTeamId);
  let sadaraClubId: string | null = null;

  if (reg) {
    const club = await Club.findOne({
      where: {
        [Op.or]: [
          { splTeamId: parseInt(reg.splTeamId, 10) },
          { name: { [Op.iLike]: `%${reg.nameEn}%` } },
        ],
      },
      attributes: ["id"],
    });
    sadaraClubId = club?.id ?? null;
  }

  return {
    teamName: result.entity.name,
    stats: result.stats,
    sadaraClubId,
  };
}
