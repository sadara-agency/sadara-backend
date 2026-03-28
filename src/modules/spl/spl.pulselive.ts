// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.pulselive.ts
// HTTP client for the PulseLive API (powers spl.com.sa).
// Public API — no auth required.
// Rate limit: 500ms between requests.
// ─────────────────────────────────────────────────────────────

import axios, { AxiosInstance } from "axios";
import { logger } from "@config/logger";
import type {
  PulseLivePlayerStatsResponse,
  PulseLiveTeamStatsResponse,
  PulseLiveRankedResponse,
  PulseLiveStandingsResponse,
  PulseLiveTeamsResponse,
  PulseLiveRankedStat,
  PulseLiveStatEntry,
} from "@modules/spl/spl.types";

// ── Constants ──

const BASE_URL = "https://api.saudi-pro-league.pulselive.com";
const COMP_ID = 72; // Roshn Saudi League
const DEFAULT_SEASON_ID = 859; // 2025-26
const REQUEST_DELAY = 500;
const REQUEST_TIMEOUT = 15_000;

// ── Rate-limited HTTP client ──

let lastRequestTime = 0;

async function rateLimitedDelay(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < REQUEST_DELAY) {
    await new Promise((r) => setTimeout(r, REQUEST_DELAY - elapsed));
  }
  lastRequestTime = Date.now();
}

const client: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    Accept: "application/json",
    Origin: "https://www.spl.com.sa",
  },
});

// ── Helpers ──

function seasonParam(seasonId?: number): number {
  return seasonId ?? DEFAULT_SEASON_ID;
}

function statsArrayToMap(stats: PulseLiveStatEntry[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const s of stats) {
    map[s.name] = s.value;
  }
  return map;
}

// ── API Functions ──

/**
 * Fetch detailed stats for a single player (155+ metrics).
 * Endpoint: GET /football/stats/player/{playerId}
 */
export async function fetchPlayerStats(
  pulseLivePlayerId: number,
  seasonId?: number,
  compId?: number,
): Promise<{
  entity: PulseLivePlayerStatsResponse["entity"];
  stats: Record<string, number>;
} | null> {
  await rateLimitedDelay();
  try {
    const { data } = await client.get<PulseLivePlayerStatsResponse>(
      `/football/stats/player/${pulseLivePlayerId}`,
      {
        params: {
          comps: compId ?? COMP_ID,
          compSeasons: seasonParam(seasonId),
        },
      },
    );

    if (!data.stats || data.stats.length === 0) return null;

    return {
      entity: data.entity,
      stats: statsArrayToMap(data.stats),
    };
  } catch (err: any) {
    if (err.response?.status === 404) return null;
    logger.error(
      `[PulseLive] fetchPlayerStats(${pulseLivePlayerId}): ${err.message}`,
    );
    throw err;
  }
}

/**
 * Fetch detailed stats for a team (196 metrics).
 * Endpoint: GET /football/stats/team/{teamId}
 */
export async function fetchTeamStats(
  pulseLiveTeamId: number,
  seasonId?: number,
  compId?: number,
): Promise<{
  entity: PulseLiveTeamStatsResponse["entity"];
  stats: Record<string, number>;
} | null> {
  await rateLimitedDelay();
  try {
    const { data } = await client.get<PulseLiveTeamStatsResponse>(
      `/football/stats/team/${pulseLiveTeamId}`,
      {
        params: {
          comps: compId ?? COMP_ID,
          compSeasons: seasonParam(seasonId),
        },
      },
    );

    if (!data.stats || data.stats.length === 0) return null;

    return {
      entity: data.entity,
      stats: statsArrayToMap(data.stats),
    };
  } catch (err: any) {
    if (err.response?.status === 404) return null;
    logger.error(
      `[PulseLive] fetchTeamStats(${pulseLiveTeamId}): ${err.message}`,
    );
    throw err;
  }
}

/**
 * Fetch league standings.
 * Endpoint: GET /football/standings
 */
export async function fetchStandings(
  seasonId?: number,
  compId?: number,
): Promise<PulseLiveStandingsResponse | null> {
  await rateLimitedDelay();
  try {
    const { data } = await client.get<PulseLiveStandingsResponse>(
      "/football/standings",
      {
        params: {
          comps: compId ?? COMP_ID,
          compSeasons: seasonParam(seasonId),
          altIds: true,
        },
      },
    );
    return data;
  } catch (err: any) {
    if (err.response?.status === 404) return null;
    logger.error(`[PulseLive] fetchStandings: ${err.message}`);
    throw err;
  }
}

/**
 * Fetch ranked player list for a given stat.
 * Endpoint: GET /football/stats/ranked/players/{stat}
 */
export async function fetchRankedPlayers(
  stat: PulseLiveRankedStat,
  page = 0,
  pageSize = 20,
  seasonId?: number,
  compId?: number,
): Promise<PulseLiveRankedResponse | null> {
  await rateLimitedDelay();
  try {
    const { data } = await client.get<PulseLiveRankedResponse>(
      `/football/stats/ranked/players/${stat}`,
      {
        params: {
          page,
          pageSize,
          comps: compId ?? COMP_ID,
          compSeasons: seasonParam(seasonId),
          altIds: true,
        },
      },
    );
    return data;
  } catch (err: any) {
    if (err.response?.status === 404) return null;
    logger.error(`[PulseLive] fetchRankedPlayers(${stat}): ${err.message}`);
    throw err;
  }
}

/**
 * Fetch all teams in the competition.
 * Endpoint: GET /football/teams
 */
export async function fetchTeams(
  seasonId?: number,
  compId?: number,
): Promise<PulseLiveTeamsResponse | null> {
  await rateLimitedDelay();
  try {
    const { data } = await client.get<PulseLiveTeamsResponse>(
      "/football/teams",
      {
        params: {
          comps: compId ?? COMP_ID,
          compSeasons: seasonParam(seasonId),
          altIds: true,
          page: 0,
          pageSize: 30,
        },
      },
    );
    return data;
  } catch (err: any) {
    if (err.response?.status === 404) return null;
    logger.error(`[PulseLive] fetchTeams: ${err.message}`);
    throw err;
  }
}

/**
 * Fetch ALL ranked players for a stat by paginating through every page.
 * Used by the intelligence engine to analyze the full league.
 * Returns up to maxEntries players (default 200).
 */
export async function fetchAllRankedPlayers(
  stat: PulseLiveRankedStat,
  seasonId?: number,
  compId?: number,
  maxEntries = 200,
): Promise<PulseLiveRankedResponse["stats"]["content"]> {
  const allEntries: PulseLiveRankedResponse["stats"]["content"] = [];
  const pageSize = 50;

  for (let page = 0; allEntries.length < maxEntries; page++) {
    const resp = await fetchRankedPlayers(
      stat,
      page,
      pageSize,
      seasonId,
      compId,
    );
    if (!resp?.stats?.content?.length) break;

    allEntries.push(...resp.stats.content);

    // No more pages
    if (page + 1 >= resp.stats.pageInfo.numPages) break;
  }

  return allEntries.slice(0, maxEntries);
}

// ── Exports for constants ──

export { COMP_ID, DEFAULT_SEASON_ID, statsArrayToMap };
