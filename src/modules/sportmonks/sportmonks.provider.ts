/**
 * Sportmonks API v3 Client
 *
 * Handles authentication, rate limiting, and data fetching from the
 * Sportmonks Football API. Auth via ?api_token= query parameter.
 */

import axios, { type AxiosInstance, type AxiosError } from "axios";
import { env } from "../../config/env";
import type {
  SmApiResponse,
  SmFixture,
  SmLeague,
  SmTeam,
} from "./sportmonks.types";

const BASE_URL = "https://api.sportmonks.com/v3/football";
const REQUEST_TIMEOUT = 15_000;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1_000;

function getToken(): string {
  return env.sportmonks.apiToken;
}

function createClient(): AxiosInstance {
  return axios.create({
    baseURL: BASE_URL,
    timeout: REQUEST_TIMEOUT,
    headers: { Accept: "application/json" },
  });
}

async function request<T>(
  method: "GET",
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const token = getToken();
  if (!token) {
    throw new Error("Sportmonks API token is not configured. Set SPORTMONKS_API_TOKEN in environment.");
  }

  const client = createClient();
  const allParams = { ...params, api_token: token };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await client.request<T>({ method, url: path, params: allParams });
      return res.data;
    } catch (err) {
      const axErr = err as AxiosError;
      const status = axErr.response?.status;

      if (status === 429) {
        const delay = RETRY_BASE_MS * Math.pow(2, attempt);
        console.warn(`[Sportmonks] Rate limited (429). Retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise((r) => setTimeout(r, delay));
        lastError = axErr;
        continue;
      }

      if (status === 401 || status === 403) {
        throw new Error(`Sportmonks authentication failed (${status}). Check your API token.`);
      }

      if (status === 404) {
        throw new Error(`Sportmonks resource not found: ${path}`);
      }

      throw new Error(`Sportmonks API error: ${axErr.message} (status: ${status ?? "unknown"})`);
    }
  }

  throw lastError ?? new Error("Sportmonks API request failed after retries");
}

// ── Public API ──

export async function testConnection(): Promise<boolean> {
  try {
    await request("GET", "/leagues", { per_page: 1 });
    return true;
  } catch (err: any) {
    if (err.message?.includes("authentication failed")) return false;
    return false;
  }
}

export async function fetchLeagues(): Promise<SmLeague[]> {
  const all: SmLeague[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await request<SmApiResponse<SmLeague[]>>("GET", "/leagues", {
      per_page: 100,
      page,
    });
    all.push(...res.data);
    hasMore = res.pagination?.has_more ?? false;
    page++;
    if (page > 10) break; // safety limit
  }

  return all;
}

export async function fetchFixtures(
  from: string,
  to: string,
  leagueId?: number,
): Promise<SmFixture[]> {
  const all: SmFixture[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const params: Record<string, string | number | undefined> = {
      include: "participants;scores;venue;league;season",
      per_page: 100,
      page,
    };
    if (leagueId) {
      params.filters = `fixtureLeagues:${leagueId}`;
    }

    const res = await request<SmApiResponse<SmFixture[]>>(
      "GET",
      `/fixtures/between/${from}/${to}`,
      params,
    );
    all.push(...res.data);
    hasMore = res.pagination?.has_more ?? false;
    page++;
    if (page > 20) break; // safety limit
  }

  return all;
}

export async function searchTeams(query: string): Promise<SmTeam[]> {
  const res = await request<SmApiResponse<SmTeam[]>>(
    "GET",
    `/teams/search/${encodeURIComponent(query)}`,
    { per_page: 25 },
  );
  return res.data;
}
