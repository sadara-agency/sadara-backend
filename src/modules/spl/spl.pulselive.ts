// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.pulselive.ts
// HTTP client for the PulseLive API (powers spl.com.sa).
// Public API — no auth required.
// Rate limit: 500ms between requests.
// ─────────────────────────────────────────────────────────────

import axios, { AxiosInstance, AxiosResponse } from "axios";
import { logger } from "@config/logger";
import { env } from "@config/env";
import { createBreaker, CircuitOpenError } from "@shared/utils/circuitBreaker";
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
// Season ID comes from SPL_DEFAULT_SEASON_ID env var (validated in config/env.ts).
// Bump the env var when SPL rolls a new season — no code change required.
const DEFAULT_SEASON_ID = env.spl.defaultSeasonId;
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

export const client: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    Accept: "application/json",
    Origin: "https://www.spl.com.sa",
  },
});

// ── Retry + circuit breaker (shared across all fetch* functions) ──

const MAX_RETRIES = 2;
const RETRY_BASE_MS = 1_500;

const splBreaker = createBreaker({
  name: "spl-pulselive",
  failureThreshold: 5,
  monitoringWindowMs: 30_000,
  resetTimeoutMs: 60_000,
});

export function getSplBreakerState() {
  return splBreaker.state;
}

export { CircuitOpenError };

/**
 * Single retry+breaker entry point for every PulseLive call.
 *  - 404 → return null (resource not found is not a breaker failure).
 *  - Other failures → up to MAX_RETRIES retries with exponential backoff,
 *    all wrapped by the breaker so repeated outages short-circuit.
 */
export async function fetchJson<T>(
  label: string,
  request: () => Promise<AxiosResponse<T>>,
): Promise<T | null> {
  await rateLimitedDelay();
  return splBreaker.run(async () => {
    let lastErr: unknown = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, RETRY_BASE_MS * attempt));
        }
        const { data } = await request();
        return data;
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } }).response
          ?.status;
        if (status === 404) return null;
        lastErr = err;
        if (attempt < MAX_RETRIES) {
          logger.warn(
            `[PulseLive] Retry ${attempt + 1}/${MAX_RETRIES} ${label}: ${(err as Error).message}`,
          );
        }
      }
    }
    logger.error(
      `[PulseLive] ${label} failed after ${MAX_RETRIES} retries: ${(lastErr as Error)?.message}`,
    );
    throw lastErr;
  });
}

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
  const data = await fetchJson<PulseLivePlayerStatsResponse>(
    `fetchPlayerStats(${pulseLivePlayerId})`,
    () =>
      client.get<PulseLivePlayerStatsResponse>(
        `/football/stats/player/${pulseLivePlayerId}`,
        {
          params: {
            comps: compId ?? COMP_ID,
            compSeasons: seasonParam(seasonId),
          },
        },
      ),
  );
  if (!data || !data.stats || data.stats.length === 0) return null;
  return { entity: data.entity, stats: statsArrayToMap(data.stats) };
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
  const data = await fetchJson<PulseLiveTeamStatsResponse>(
    `fetchTeamStats(${pulseLiveTeamId})`,
    () =>
      client.get<PulseLiveTeamStatsResponse>(
        `/football/stats/team/${pulseLiveTeamId}`,
        {
          params: {
            comps: compId ?? COMP_ID,
            compSeasons: seasonParam(seasonId),
          },
        },
      ),
  );
  if (!data || !data.stats || data.stats.length === 0) return null;
  return { entity: data.entity, stats: statsArrayToMap(data.stats) };
}

/**
 * Fetch league standings.
 * Endpoint: GET /football/standings
 */
export async function fetchStandings(
  seasonId?: number,
  compId?: number,
): Promise<PulseLiveStandingsResponse | null> {
  return fetchJson<PulseLiveStandingsResponse>("fetchStandings", () =>
    client.get<PulseLiveStandingsResponse>("/football/standings", {
      params: {
        comps: compId ?? COMP_ID,
        compSeasons: seasonParam(seasonId),
        altIds: true,
      },
    }),
  );
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
  return fetchJson<PulseLiveRankedResponse>(`fetchRankedPlayers(${stat})`, () =>
    client.get<PulseLiveRankedResponse>(
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
    ),
  );
}

/**
 * Fetch all teams in the competition.
 * Endpoint: GET /football/teams
 */
export async function fetchTeams(
  seasonId?: number,
  compId?: number,
): Promise<PulseLiveTeamsResponse | null> {
  return fetchJson<PulseLiveTeamsResponse>("fetchTeams", () =>
    client.get<PulseLiveTeamsResponse>("/football/teams", {
      params: {
        comps: compId ?? COMP_ID,
        compSeasons: seasonParam(seasonId),
        altIds: true,
        page: 0,
        pageSize: 30,
      },
    }),
  );
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
