/**
 * Wyscout API v3 Provider
 *
 * Implements the MatchAnalysisProvider interface for Wyscout.
 * Uses Basic Auth (API key is "username:password" base64-encoded).
 *
 * Requires WYSCOUT_API_KEY and optionally WYSCOUT_BASE_URL in environment.
 */

import axios, { type AxiosInstance, type AxiosError } from "axios";
import { logger } from "@config/logger";
import type {
  MatchAnalysisProvider,
  ExternalMatch,
  ExternalMatchStats,
} from "@modules/integrations/matchAnalysis.service";

const REQUEST_TIMEOUT = 15_000; // 15 seconds
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1_000;

export class WyscoutProvider implements MatchAnalysisProvider {
  name = "Wyscout";
  private client: AxiosInstance;

  constructor(apiKey?: string, baseUrl?: string) {
    const key = apiKey || process.env.WYSCOUT_API_KEY || "";
    const base =
      baseUrl ||
      process.env.WYSCOUT_BASE_URL ||
      "https://apirest.wyscout.com/v3";

    this.client = axios.create({
      baseURL: base,
      timeout: REQUEST_TIMEOUT,
      headers: {
        Authorization: `Basic ${Buffer.from(key).toString("base64")}`,
        Accept: "application/json",
      },
    });
  }

  // ── Private helpers ──

  private async request<T>(
    method: "GET",
    path: string,
    params?: Record<string, string | number | undefined>,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const res = await this.client.request<T>({
          method,
          url: path,
          params,
        });
        return res.data;
      } catch (err) {
        const axErr = err as AxiosError;
        const status = axErr.response?.status;

        // Rate-limited — retry with exponential backoff
        if (status === 429) {
          const delay = RETRY_BASE_MS * Math.pow(2, attempt);
          logger.warn(
            `[Wyscout] Rate limited (429). Retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
          );
          await new Promise((r) => setTimeout(r, delay));
          lastError = axErr;
          continue;
        }

        // Auth error — don't retry
        if (status === 401 || status === 403) {
          throw new Error(
            `Wyscout authentication failed (${status}). Check your API key.`,
          );
        }

        // Not found
        if (status === 404) {
          throw new Error(`Wyscout resource not found: ${path}`);
        }

        // Other errors — don't retry
        throw new Error(
          `Wyscout API error: ${axErr.message} (status: ${status ?? "unknown"})`,
        );
      }
    }

    throw lastError ?? new Error("Wyscout API request failed after retries");
  }

  // ── Public interface ──

  async testConnection(): Promise<boolean> {
    try {
      // Use a lightweight endpoint to verify credentials
      await this.request("GET", "/coaches/0");
      return true;
    } catch (err: any) {
      // A 404 means auth worked but resource doesn't exist — that's fine
      if (err.message?.includes("not found")) return true;
      // Auth failure means credentials are bad
      if (err.message?.includes("authentication failed")) return false;
      return false;
    }
  }

  async fetchPlayerMatches(
    externalId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<ExternalMatch[]> {
    const params: Record<string, string | number | undefined> = {};
    if (dateFrom) params.startDate = dateFrom;
    if (dateTo) params.endDate = dateTo;

    const data = await this.request<any>(
      "GET",
      `/players/${externalId}/matches`,
      params,
    );

    // Wyscout returns { matches: [...] }
    const matches: any[] = data?.matches ?? [];

    return matches.map((m: any) => ({
      externalId: String(m.matchId ?? m.wyId ?? m.id),
      date: m.dateutc ?? m.date ?? "",
      homeTeam:
        m.teamsData?.home?.team?.name ?? m.label?.split(" - ")?.[0] ?? "",
      awayTeam:
        m.teamsData?.away?.team?.name ?? m.label?.split(" - ")?.[1] ?? "",
      competition: m.competitionId
        ? String(m.competitionId)
        : (m.competition?.name ?? ""),
      season: m.seasonId ? String(m.seasonId) : "",
      minutesPlayed: m.minutesPlayed ?? m.player?.minutesPlayed ?? 0,
      goals: m.player?.goals ?? m.goals ?? 0,
      assists: m.player?.assists ?? m.assists ?? 0,
      rating: m.player?.rating ?? m.rating ?? undefined,
      homeScore: m.teamsData?.home?.score ?? m.homeScore ?? null,
      awayScore: m.teamsData?.away?.score ?? m.awayScore ?? null,
      venue: m.venue ?? null,
    }));
  }

  async fetchMatchStats(
    externalMatchId: string,
    externalPlayerId?: string,
  ): Promise<ExternalMatchStats> {
    // Fetch full match data
    const data = await this.request<any>("GET", `/matches/${externalMatchId}`);

    // If a specific player ID is provided, extract their stats
    let playerStats: any = {};
    if (externalPlayerId && data?.players) {
      // Wyscout v3 match response includes players with stats
      const allPlayers = Object.values(data.players ?? {}).flat() as any[];
      playerStats =
        allPlayers.find(
          (p: any) => String(p.playerId ?? p.wyId) === externalPlayerId,
        ) ?? {};
    }

    const total = playerStats?.total ?? playerStats ?? {};

    return {
      externalMatchId,
      passes: total.accuratePasses ?? total.totalPasses ?? 0,
      passAccuracy:
        total.accuratePasses && total.totalPasses
          ? Math.round((total.accuratePasses / total.totalPasses) * 100)
          : 0,
      shots: total.shots ?? total.totalShots ?? 0,
      shotsOnTarget: total.shotsOnTarget ?? 0,
      tackles: total.tackles ?? total.totalTackles ?? 0,
      interceptions: total.interceptions ?? 0,
      duelsWon: total.duelsWon ?? 0,
      duelsTotal: total.duels ?? total.totalDuels ?? 0,
      distanceCovered: total.distanceCovered ?? 0,
      sprintDistance: total.sprintDistance ?? 0,
      keyPasses: total.keyPasses ?? 0,
      dribblesCompleted: total.successfulDribbles ?? 0,
      dribblesAttempted: total.dribbles ?? total.totalDribbles ?? 0,
      foulsCommitted: total.fouls ?? 0,
      foulsDrawn: total.foulsDrawn ?? total.foulsSuffered ?? 0,
      yellowCards: total.yellowCards ?? 0,
      redCards: total.redCards ?? 0,
      positionInMatch: total.position?.name ?? total.role?.name ?? undefined,
    };
  }
}
