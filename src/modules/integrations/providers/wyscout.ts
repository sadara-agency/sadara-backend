/**
 * Wyscout API Provider (Placeholder)
 *
 * Implements the MatchAnalysisProvider interface for Wyscout.
 * Requires WYSCOUT_API_KEY and WYSCOUT_BASE_URL in environment.
 *
 * This is a placeholder — actual API calls should be filled in
 * once Wyscout API credentials and docs are available.
 */

import type {
  MatchAnalysisProvider,
  ExternalMatch,
  ExternalMatchStats,
} from "../matchAnalysis.service";

export class WyscoutProvider implements MatchAnalysisProvider {
  name = "Wyscout";
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.WYSCOUT_API_KEY || "";
    this.baseUrl =
      baseUrl ||
      process.env.WYSCOUT_BASE_URL ||
      "https://apirest.wyscout.com/v3";
  }

  async testConnection(): Promise<boolean> {
    if (!this.apiKey) return false;
    // TODO: Call Wyscout health/me endpoint
    // const res = await fetch(`${this.baseUrl}/me`, { headers: { Authorization: `Bearer ${this.apiKey}` } });
    // return res.ok;
    return !!this.apiKey;
  }

  async fetchPlayerMatches(
    externalId: string,
    _dateFrom?: string,
    _dateTo?: string,
  ): Promise<ExternalMatch[]> {
    if (!this.apiKey) throw new Error("Wyscout API key not configured");

    // TODO: Implement actual Wyscout API call
    // GET /players/{externalId}/matches?from={dateFrom}&to={dateTo}
    console.log(`[Wyscout] Placeholder: fetchPlayerMatches(${externalId})`);

    return [];
  }

  async fetchMatchStats(externalMatchId: string): Promise<ExternalMatchStats> {
    if (!this.apiKey) throw new Error("Wyscout API key not configured");

    // TODO: Implement actual Wyscout API call
    // GET /matches/{externalMatchId}/stats
    console.log(`[Wyscout] Placeholder: fetchMatchStats(${externalMatchId})`);

    return {
      externalMatchId,
      passes: 0,
      passAccuracy: 0,
      shots: 0,
      shotsOnTarget: 0,
      tackles: 0,
      interceptions: 0,
      duelsWon: 0,
      duelsTotal: 0,
      distanceCovered: 0,
      sprintDistance: 0,
    };
  }
}
