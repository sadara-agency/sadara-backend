// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.matchStats.sync.ts
//
// Phase B — persists per-match player stats from a Pulselive
// fixture-detail payload into `match_players` + `player_match_stats`.
//
// Player resolution: ExternalProviderMapping (provider='PulseLive',
// externalPlayerId=<pulselivePlayerId>). Missing mappings are logged
// in the result `unmappedPulseLivePlayerIds` so an operator can reconcile.
// ─────────────────────────────────────────────────────────────

import { logger } from "@config/logger";
import { Match } from "@modules/matches/match.model";
import { MatchPlayer } from "@modules/matches/matchPlayer.model";
import { PlayerMatchStats } from "@modules/matches/playerMatchStats.model";
import { ExternalProviderMapping } from "@modules/players/externalProvider.model";
import {
  fetchFixtureDetail,
  fetchFixtures,
} from "@modules/spl/spl.fixtures.pulselive";
import {
  mapPlayerMatchStats,
  mapMatchPlayerAvailability,
} from "@modules/spl/spl.matchStats.mapping";
import type {
  PulseLiveFixtureDetail,
  PulseLiveFixtureMatchPlayer,
} from "@modules/spl/spl.fixtures.types";

const PROVIDER = "pulselive";
const PROVIDER_NAME_EPM = "PulseLive";

interface MatchStatsSyncResult {
  matchId: string | null;
  playersResolved: number;
  statsUpserted: number;
  unmappedPulseLivePlayerIds: number[];
  reason?: string;
}

async function resolveSadaraPlayerId(
  pulseLivePlayerId: number,
): Promise<string | null> {
  const mapping = await ExternalProviderMapping.findOne({
    where: {
      providerName: PROVIDER_NAME_EPM,
      externalPlayerId: String(pulseLivePlayerId),
    },
  });
  return mapping?.playerId ?? null;
}

async function findMatchByPulseLiveId(
  pulselivefixtureId: number,
): Promise<Match | null> {
  return Match.findOne({
    where: {
      providerSource: PROVIDER,
      providerMatchId: String(pulselivefixtureId),
    },
  });
}

async function upsertOnePlayer(
  matchId: string,
  pulselivefixtureId: number,
  pl: PulseLiveFixtureMatchPlayer,
  isStarter: boolean,
  unmapped: number[],
): Promise<{ resolved: boolean; statsUpserted: boolean }> {
  const sadaraPlayerId = await resolveSadaraPlayerId(pl.playerId);
  if (!sadaraPlayerId) {
    unmapped.push(pl.playerId);
    return { resolved: false, statsUpserted: false };
  }

  // 1. MatchPlayer (lineup row)
  const mpAvail = mapMatchPlayerAvailability(pl, isStarter);
  const existingMp = await MatchPlayer.findOne({
    where: { matchId, playerId: sadaraPlayerId },
  });
  if (existingMp) {
    await existingMp.update({
      ...mpAvail,
      providerSource: PROVIDER,
    });
  } else {
    await MatchPlayer.create({
      matchId,
      playerId: sadaraPlayerId,
      ...mpAvail,
      providerSource: PROVIDER,
    });
  }

  // 2. PlayerMatchStats (per-match metrics)
  const externalStatsId = `${pulselivefixtureId}:${pl.playerId}`;
  const mapped = mapPlayerMatchStats(pl, {
    matchId,
    playerId: sadaraPlayerId,
    externalStatsId,
  });

  const existingStats = await PlayerMatchStats.findOne({
    where: { matchId, playerId: sadaraPlayerId, providerSource: PROVIDER },
  });
  if (existingStats) {
    await existingStats.update(mapped);
  } else {
    await PlayerMatchStats.create(mapped);
  }
  return { resolved: true, statsUpserted: true };
}

export async function syncMatchPlayerStats(
  pulselivefixtureId: number,
): Promise<MatchStatsSyncResult> {
  const detail = await fetchFixtureDetail(pulselivefixtureId);
  if (!detail) {
    return {
      matchId: null,
      playersResolved: 0,
      statsUpserted: 0,
      unmappedPulseLivePlayerIds: [],
      reason: "fixture_not_found",
    };
  }

  const match = await findMatchByPulseLiveId(pulselivefixtureId);
  if (!match) {
    return {
      matchId: null,
      playersResolved: 0,
      statsUpserted: 0,
      unmappedPulseLivePlayerIds: [],
      reason: "match_not_synced_yet",
    };
  }

  const unmapped: number[] = [];
  let playersResolved = 0;
  let statsUpserted = 0;

  for (const lineup of detail.lineups ?? []) {
    for (const pl of lineup.lineup ?? []) {
      const r = await upsertOnePlayer(
        match.id,
        pulselivefixtureId,
        pl,
        true,
        unmapped,
      );
      if (r.resolved) playersResolved++;
      if (r.statsUpserted) statsUpserted++;
    }
    for (const pl of lineup.substitutes ?? []) {
      const r = await upsertOnePlayer(
        match.id,
        pulselivefixtureId,
        pl,
        false,
        unmapped,
      );
      if (r.resolved) playersResolved++;
      if (r.statsUpserted) statsUpserted++;
    }
  }

  logger.info(
    `[SPL matchStats] ${pulselivefixtureId}: resolved=${playersResolved} stats=${statsUpserted} unmapped=${unmapped.length}`,
  );
  return {
    matchId: match.id,
    playersResolved,
    statsUpserted,
    unmappedPulseLivePlayerIds: unmapped,
  };
}

export async function syncAllMatchPlayerStats(
  seasonId?: number,
  sinceDate?: string,
): Promise<{
  fixtures: number;
  statsRows: number;
  unmappedTotal: number;
  errors: number;
}> {
  const fixtures = await fetchFixtures(seasonId, { statuses: ["C"] });
  const since = sinceDate ? new Date(sinceDate).getTime() : null;

  let statsRows = 0;
  let unmappedTotal = 0;
  let errors = 0;

  for (const fx of fixtures) {
    if (since && fx.kickoff?.millis < since) continue;
    try {
      const r = await syncMatchPlayerStats(fx.id);
      statsRows += r.statsUpserted;
      unmappedTotal += r.unmappedPulseLivePlayerIds.length;
    } catch (err) {
      errors++;
      logger.warn(
        `[SPL matchStats] sync failed for ${fx.id}: ${(err as Error).message}`,
      );
    }
  }

  return { fixtures: fixtures.length, statsRows, unmappedTotal, errors };
}

// re-export for convenience
export type { PulseLiveFixtureDetail };
