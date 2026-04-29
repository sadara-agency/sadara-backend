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
import {
  syncCompetitionMatches,
  syncMatchEvents,
} from "@modules/saffplus/saffplus.service";
import {
  projectFixturesToMatches,
  getCurrentSeason,
} from "@modules/saff/saff.service";
import { syncSplCompetition } from "@modules/spl/spl.matches.sync";

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
 * Sync a batch of competitions.
 *
 * Routing priority per competition:
 *   1. pulseLiveCompId set → PulseLive API (Roshn, Yelo)
 *   2. Otherwise           → SAFF+ primary, then SAFF bridge if saffId present
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
      const competition = await Competition.findByPk(competitionId, {
        attributes: ["id", "name", "pulseLiveCompId", "saffId"],
      });

      if (competition?.pulseLiveCompId) {
        // PulseLive route — Roshn Saudi League and Yelo First Division
        logger.info(
          `[SaudiLeagues] ${competition.name}: using PulseLive (compId=${competition.pulseLiveCompId})`,
        );
        await syncSplCompetition(competitionId, season);
      } else {
        // SAFF+ primary
        await syncCompetitionMatches(competitionId, season);

        // SAFF secondary — only if tournament has a saffId
        if (competition?.saffId) {
          const { sequelize } = await import("@config/database");
          const [rows] = (await sequelize.query(
            `SELECT id FROM saff_tournaments WHERE saff_id = :saffId LIMIT 1`,
            { replacements: { saffId: competition.saffId } },
          )) as [Array<{ id: string }>, unknown];

          if (rows.length > 0) {
            await projectFixturesToMatches(rows[0].id, season);
          }
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
// TOP TIER DAILY — unconditional fixture fetch at 04:00
// Ensures upcoming fixtures are always loaded regardless of whether
// today is a matchday (breaks the matchday-gate feedback loop).
// ══════════════════════════════════════════

export async function runTopTierDaily(): Promise<void> {
  return withMutex(async () => {
    const season = getCurrentSeason();
    const competitionIds = await getCompetitionIds(TOP_TIER_NAMES);
    if (!competitionIds.length) {
      logger.info(
        "[SaudiLeagues] No top-tier competitions found — check migration 122",
      );
      return;
    }
    await syncBatch(competitionIds, season, "top-tier daily");
  });
}

// ══════════════════════════════════════════
// LIVE EVENTS TICKER — every 5 min during live windows
//
// Phase 3 of the SAFF+ comprehensive integration. Pulls the
// minute-by-minute event timeline (goals, cards, subs, VAR) for
// any matches currently in progress. Skips fast when nothing's
// live so off-hours runs are cheap.
//
// Concurrency cap (3) prevents bursts when many matches are live
// simultaneously (e.g. matchday weekends with 5–10 in-flight games).
// ══════════════════════════════════════════

const LIVE_EVENTS_CONCURRENCY = 3;

export async function runLiveEventsTier(): Promise<void> {
  // Fast path: skip the mutex acquisition if nothing's live.
  const liveCount = await Match.count({
    where: {
      status: "live",
      providerSource: "saffplus",
      providerMatchId: { [Op.ne]: null },
    },
  });
  if (liveCount === 0) return;

  logger.info(
    `[SaudiLeagues] Live events tier: ${liveCount} live SAFF+ matches — refreshing timelines`,
  );

  const liveMatches = await Match.findAll({
    where: {
      status: "live",
      providerSource: "saffplus",
      providerMatchId: { [Op.ne]: null },
    },
    attributes: ["id"],
    limit: 50, // safety cap
  });

  // Simple semaphore: process LIVE_EVENTS_CONCURRENCY matches at a time.
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < liveMatches.length) {
      const idx = cursor++;
      const m = liveMatches[idx];
      try {
        await syncMatchEvents(m.id);
      } catch (err) {
        logger.warn(
          `[SaudiLeagues] Live event sync error for match ${m.id}: ${(err as Error).message}`,
        );
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(LIVE_EVENTS_CONCURRENCY, liveMatches.length) },
      () => worker(),
    ),
  );

  logger.info(`[SaudiLeagues] Live events tier complete`);
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

  const competition = await Competition.findByPk(competitionId, {
    attributes: ["id", "name", "pulseLiveCompId"],
  });

  if (competition?.pulseLiveCompId) {
    logger.info(
      `[SaudiLeagues] ${competition.name}: routing manual sync to PulseLive`,
    );
    return syncSplCompetition(competitionId, season);
  }

  return syncCompetitionMatches(competitionId, season);
}
