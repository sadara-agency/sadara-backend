// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.liveMatch.poller.ts
//
// Polls Pulselive every 30 seconds for live fixtures, upserts
// updated score/events into the DB, and broadcasts score + new
// events to all connected SSE clients via broadcastToAll().
//
// State: Redis Set `spl:live:{matchId}:eventIds` (TTL 4 h) tracks
// which events have already been broadcast so each goal/card is
// pushed exactly once regardless of how many times we poll.
// Falls back to an in-memory Map when Redis is unavailable.
// ─────────────────────────────────────────────────────────────

import { logger } from "@config/logger";
import { getRedisClient, isRedisConnected } from "@config/redis";
import { broadcastToAll } from "@modules/notifications/notification.sse";
import { Match } from "@modules/matches/match.model";
import { MatchEvent } from "@modules/matches/matchEvent.model";
import {
  fetchFixtures,
  fetchFixtureDetail,
} from "@modules/spl/spl.fixtures.pulselive";
import { syncFixtureDetail } from "@modules/spl/spl.matches.sync";

// ── Types ──

export interface LiveMatchUpdate {
  matchId: string;
  providerMatchId: string;
  homeTeamName: string | null;
  awayTeamName: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: "live" | "completed";
  newEvents: LiveMatchEvent[];
}

export interface LiveMatchEvent {
  type: string;
  teamSide: string;
  minute: number;
  descriptionEn: string | null;
}

// ── In-memory fallback (single-instance / Redis-less) ──

const _memoryState = new Map<string, Set<string>>();

// ── Redis helpers ──

const LIVE_KEY_TTL = 4 * 60 * 60; // 4 hours

async function getSeenEventIds(matchId: string): Promise<Set<string>> {
  if (isRedisConnected()) {
    const client = getRedisClient();
    if (client) {
      try {
        const members = await client.sMembers(`spl:live:${matchId}:eventIds`);
        return new Set(members);
      } catch {
        // Fall through to in-memory
      }
    }
  }
  return _memoryState.get(matchId) ?? new Set();
}

async function markEventIdsSeen(matchId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  if (isRedisConnected()) {
    const client = getRedisClient();
    if (client) {
      try {
        const key = `spl:live:${matchId}:eventIds`;
        await client.sAdd(key, ids);
        await client.expire(key, LIVE_KEY_TTL);
        return;
      } catch {
        // Fall through to in-memory
      }
    }
  }

  const existing = _memoryState.get(matchId) ?? new Set<string>();
  for (const id of ids) existing.add(id);
  _memoryState.set(matchId, existing);
}

async function clearMatchState(matchId: string): Promise<void> {
  _memoryState.delete(matchId);
  if (isRedisConnected()) {
    const client = getRedisClient();
    if (client) {
      await client.del(`spl:live:${matchId}:eventIds`).catch(() => {});
    }
  }
}

// ── Core poll ──

export async function pollLiveMatches(): Promise<{
  liveMatches: number;
  errors: number;
}> {
  // Fetch all currently-live fixtures from Pulselive
  const liveFixtures = await fetchFixtures(undefined, { statuses: ["L"] });

  if (liveFixtures.length === 0) {
    logger.debug("[SPL live poller] No live matches");
    return { liveMatches: 0, errors: 0 };
  }

  logger.info(
    `[SPL live poller] ${liveFixtures.length} live fixture(s) detected`,
  );

  let errors = 0;

  for (const fx of liveFixtures) {
    try {
      // 1. Sync full fixture detail (score + events) into the DB
      const syncResult = await syncFixtureDetail(fx.id);
      if (!syncResult.matchId) {
        logger.warn(
          `[SPL live poller] sync failed for fixture ${fx.id}: ${syncResult.reason ?? "unknown"}`,
        );
        errors++;
        continue;
      }

      const matchId = syncResult.matchId;

      // 2. Load the updated match row
      const match = await Match.findByPk(matchId, {
        attributes: [
          "id",
          "providerMatchId",
          "homeTeamName",
          "awayTeamName",
          "homeScore",
          "awayScore",
          "status",
        ],
      });
      if (!match) {
        errors++;
        continue;
      }

      // 3. Load all events for this match from the DB
      const allEvents = await MatchEvent.findAll({
        where: { matchId },
        attributes: [
          "id",
          "type",
          "teamSide",
          "minute",
          "descriptionEn",
          "externalEventId",
        ],
        order: [["minute", "ASC"]],
      });

      // 4. Diff: find net-new events not yet broadcast
      const seenIds = await getSeenEventIds(matchId);
      const newEvents: LiveMatchEvent[] = [];
      const newlySeen: string[] = [];

      for (const ev of allEvents) {
        // Use externalEventId when present, otherwise fall back to DB uuid
        const stableId = ev.externalEventId ?? ev.id;
        if (seenIds.has(stableId)) continue;

        // Filter to the event types the user cares about
        const relevant = [
          "goal",
          "own_goal",
          "penalty_goal",
          "yellow",
          "second_yellow",
          "red",
          "sub_in",
          "kickoff",
          "halftime",
          "fulltime",
        ].includes(ev.type);
        if (!relevant) continue;

        newEvents.push({
          type: ev.type,
          teamSide: ev.teamSide,
          minute: ev.minute,
          descriptionEn: ev.descriptionEn ?? null,
        });
        newlySeen.push(stableId);
      }

      await markEventIdsSeen(matchId, newlySeen);

      // 5. Broadcast — always send current score even if no new events
      const update: LiveMatchUpdate = {
        matchId,
        providerMatchId: match.getDataValue("providerMatchId") ?? String(fx.id),
        homeTeamName: match.getDataValue("homeTeamName"),
        awayTeamName: match.getDataValue("awayTeamName"),
        homeScore: match.getDataValue("homeScore"),
        awayScore: match.getDataValue("awayScore"),
        status: match.getDataValue("status") as "live" | "completed",
        newEvents,
      };

      broadcastToAll("live_match_update", update);

      logger.info(
        `[SPL live poller] matchId=${matchId} score=${update.homeScore}-${update.awayScore} newEvents=${newEvents.length}`,
      );

      // 6. If match just completed, clear state so Redis TTL can do cleanup
      if (update.status === "completed") {
        await clearMatchState(matchId);
      }
    } catch (err) {
      errors++;
      logger.warn(
        `[SPL live poller] fixture ${fx.id} failed: ${(err as Error).message}`,
      );
    }
  }

  // Also check for matches that were previously live but are now completed
  // (they may have dropped off the statuses=L filter)
  try {
    await _finalizeJustCompletedMatches();
  } catch (err) {
    logger.warn(
      `[SPL live poller] finalize-completed step failed: ${(err as Error).message}`,
    );
  }

  return { liveMatches: liveFixtures.length, errors };
}

// Sweep recently-transitioned matches: if we have Redis state for a matchId
// but the match is now "completed" in the DB, emit one final broadcast + cleanup.
async function _finalizeJustCompletedMatches(): Promise<void> {
  if (!isRedisConnected()) {
    // In-memory: iterate the map
    for (const [matchId] of _memoryState) {
      const match = await Match.findByPk(matchId, {
        attributes: [
          "id",
          "providerMatchId",
          "homeTeamName",
          "awayTeamName",
          "homeScore",
          "awayScore",
          "status",
        ],
      });
      if (!match || match.getDataValue("status") !== "completed") continue;
      broadcastToAll("live_match_update", {
        matchId,
        providerMatchId: match.getDataValue("providerMatchId"),
        homeTeamName: match.getDataValue("homeTeamName"),
        awayTeamName: match.getDataValue("awayTeamName"),
        homeScore: match.getDataValue("homeScore"),
        awayScore: match.getDataValue("awayScore"),
        status: "completed",
        newEvents: [],
      } satisfies LiveMatchUpdate);
      await clearMatchState(matchId);
    }
    return;
  }

  // Redis: scan keys matching spl:live:*:eventIds
  const client = getRedisClient();
  if (!client) return;
  const keys = await client
    .keys("spl:live:*:eventIds")
    .catch(() => [] as string[]);
  for (const key of keys) {
    // key = "spl:live:{matchId}:eventIds"
    const parts = key.split(":");
    if (parts.length < 4) continue;
    const matchId = parts[2];
    const match = await Match.findByPk(matchId, {
      attributes: [
        "id",
        "providerMatchId",
        "homeTeamName",
        "awayTeamName",
        "homeScore",
        "awayScore",
        "status",
      ],
    }).catch(() => null);
    if (!match || match.getDataValue("status") !== "completed") continue;
    broadcastToAll("live_match_update", {
      matchId,
      providerMatchId: match.getDataValue("providerMatchId"),
      homeTeamName: match.getDataValue("homeTeamName"),
      awayTeamName: match.getDataValue("awayTeamName"),
      homeScore: match.getDataValue("homeScore"),
      awayScore: match.getDataValue("awayScore"),
      status: "completed",
      newEvents: [],
    } satisfies LiveMatchUpdate);
    await clearMatchState(matchId);
  }
}
