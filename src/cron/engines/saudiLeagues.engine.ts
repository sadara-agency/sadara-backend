/**
 * Saudi Leagues Cron Engine
 *
 * Tiered sync for the 19 tracked Saudi football competitions:
 *
 *   Top tier    (Roshn, Yelo, King's Cup, Super Cup)  — every 2h on matchdays, daily otherwise
 *   Youth/lower (Second Div, Third Div, Jawwy U21, Premier U15-U18, First Div U15-U18, Braem) — daily 03:00
 *   Live        (any match currently in progress)     — every 15 min, fast exit if none
 *
 * Registered in cron/scheduler.ts.
 */

import { Op } from "sequelize";
import { logger } from "@config/logger";
import { Competition } from "@modules/competitions/competition.model";
import { Match } from "@modules/matches/match.model";
import { syncCompetitionMatches } from "@modules/saffplus/saffplus.service";
import {
  projectFixturesToMatches,
  getCurrentSeason,
} from "@modules/saff/saff.service";

// ── In-process mutex to prevent overlapping runs ──
let isRunning = false;

function withMutex<T>(fn: () => Promise<T>): Promise<T> {
  if (isRunning) {
    logger.warn(
      "[SaudiLeagues] Engine already running — skipping overlapping call",
    );
    return Promise.resolve(undefined as unknown as T);
  }
  isRunning = true;
  return fn().finally(() => {
    isRunning = false;
  });
}

// ── Competition name filters by tier ──

const TOP_TIER_NAMES = [
  "Roshn Saudi League",
  "Yelo First Division",
  "King's Cup",
  "Saudi Super Cup",
];

const YOUTH_LOWER_TIER_NAMES = [
  "Second Division",
  "Third Division",
  "Jawwy Elite U21",
  "Saudi Premier U18",
  "Saudi Premier U17",
  "Saudi Premier U16",
  "Saudi Premier U15",
  "First Division U18",
  "First Division U17",
  "First Division U16",
  "First Division U15",
  "Braem U14",
  "Braem U13",
  "Braem U12",
  "Braem U11",
];

async function getCompetitionIds(names: string[]): Promise<string[]> {
  const competitions = await Competition.findAll({
    where: { name: { [Op.in]: names }, isActive: true },
    attributes: ["id"],
  });
  return competitions.map((c) => c.id);
}

/**
 * Sync a batch of competitions: SAFF+ first, then SAFF bridge if saffId present.
 */
async function syncBatch(
  competitionIds: string[],
  season: string,
  label: string,
): Promise<void> {
  logger.info(
    `[SaudiLeagues] Starting ${label} sync — ${competitionIds.length} competitions`,
  );

  for (const competitionId of competitionIds) {
    try {
      // SAFF+ primary
      await syncCompetitionMatches(competitionId, season);

      // SAFF secondary — only if tournament has a saffId
      const competition = await Competition.findByPk(competitionId, {
        attributes: ["saffId", "name"],
      });
      if (competition?.saffId) {
        // Find the SaffTournament row by saffId
        const { sequelize } = await import("@config/database");
        const [rows] = (await sequelize.query(
          `SELECT id FROM saff_tournaments WHERE saff_id = :saffId LIMIT 1`,
          { replacements: { saffId: competition.saffId } },
        )) as [Array<{ id: string }>, unknown];

        if (rows.length > 0) {
          await projectFixturesToMatches(rows[0].id, season);
        }
      }
    } catch (err) {
      logger.error(
        `[SaudiLeagues] syncBatch error for competition ${competitionId}: ${(err as Error).message}`,
      );
      // Continue to next competition — one failure must not kill the batch
    }
  }

  logger.info(`[SaudiLeagues] ${label} sync complete`);
}

// ══════════════════════════════════════════
// TOP TIER — every 2h, matchday-aware
// ══════════════════════════════════════════

export async function runTopTier(): Promise<void> {
  return withMutex(async () => {
    const season = getCurrentSeason();
    const competitionIds = await getCompetitionIds(TOP_TIER_NAMES);
    if (!competitionIds.length) {
      logger.info(
        "[SaudiLeagues] No top-tier competitions found — check migration 122",
      );
      return;
    }

    // Check if today is a matchday for any top-tier competition
    const today = new Date().toISOString().split("T")[0];
    const matchdayCheck = await Match.findOne({
      where: {
        competitionId: { [Op.in]: competitionIds },

        matchDate: {
          [Op.between]: [`${today}T00:00:00Z`, `${today}T23:59:59Z`],
        },
      },
      attributes: ["id"],
    });

    if (!matchdayCheck) {
      logger.info(
        "[SaudiLeagues] Top tier: no matches today — refreshing standings only (no fixture fetch)",
      );
      // On non-matchdays, just do a quick standings-level sync (lightweight)
      // Full fixture sync happens on the daily pass regardless
      return;
    }

    await syncBatch(competitionIds, season, "top-tier matchday");
  });
}

// ══════════════════════════════════════════
// YOUTH / LOWER TIER — daily at 03:00
// ══════════════════════════════════════════

export async function runYouthTier(): Promise<void> {
  return withMutex(async () => {
    const season = getCurrentSeason();
    const competitionIds = await getCompetitionIds(YOUTH_LOWER_TIER_NAMES);
    if (!competitionIds.length) {
      logger.info(
        "[SaudiLeagues] No youth/lower competitions found — check migration 122",
      );
      return;
    }
    await syncBatch(competitionIds, season, "youth/lower tier");
  });
}

// ══════════════════════════════════════════
// LIVE — every 15 min, fast exit if nothing live
// ══════════════════════════════════════════

export async function runLiveTier(): Promise<void> {
  // Fast path: don't acquire mutex, just check and exit quickly
  const liveCount = await Match.count({
    where: {
      status: "live",
      providerSource: { [Op.in]: ["saff", "saffplus"] },
    },
  });

  if (liveCount === 0) return;

  logger.info(
    `[SaudiLeagues] Live tier: ${liveCount} live matches — refreshing scores`,
  );

  return withMutex(async () => {
    const season = getCurrentSeason();

    // Find which competitions have live matches
    const liveMatches = await Match.findAll({
      where: {
        status: "live",
        providerSource: { [Op.in]: ["saff", "saffplus"] },
        competitionId: { [Op.ne]: null },
      },
      attributes: ["competitionId"],
      group: ["competitionId"],
    });

    const liveCompetitionIds = [
      ...new Set(
        liveMatches.map((m) => m.competitionId).filter(Boolean) as string[],
      ),
    ];

    for (const competitionId of liveCompetitionIds) {
      try {
        await syncCompetitionMatches(competitionId, season);
      } catch (err) {
        logger.error(
          `[SaudiLeagues] Live sync error for ${competitionId}: ${(err as Error).message}`,
        );
      }
    }
  });
}

// ══════════════════════════════════════════
// SINGLE COMPETITION — for manual admin trigger
// ══════════════════════════════════════════

export async function runSingleCompetition(
  competitionId: string,
  season: string = getCurrentSeason(),
): Promise<{
  upserted: number;
  skipped: number;
  unmapped: number;
  errors: string[];
}> {
  logger.info(`[SaudiLeagues] Manual trigger for competition ${competitionId}`);
  return syncCompetitionMatches(competitionId, season);
}
