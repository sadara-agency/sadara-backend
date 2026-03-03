/**
 * Match Analysis Integration Service
 *
 * Pluggable provider interface for external match analysis APIs
 * (Wyscout, InStat, etc.). Currently a placeholder that can be
 * wired to real providers via the settings page.
 */

export interface MatchAnalysisProvider {
  name: string;
  /** Fetch match list for a player from the external system */
  fetchPlayerMatches(
    externalId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<ExternalMatch[]>;
  /** Fetch detailed stats for a single match */
  fetchMatchStats(externalMatchId: string): Promise<ExternalMatchStats>;
  /** Test the connection / API key validity */
  testConnection(): Promise<boolean>;
}

export interface ExternalMatch {
  externalId: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  minutesPlayed: number;
  goals: number;
  assists: number;
  rating?: number;
}

export interface ExternalMatchStats {
  externalMatchId: string;
  passes: number;
  passAccuracy: number;
  shots: number;
  shotsOnTarget: number;
  tackles: number;
  interceptions: number;
  duelsWon: number;
  duelsTotal: number;
  distanceCovered: number;
  sprintDistance: number;
  heatmap?: number[][];
  extra?: Record<string, unknown>;
}

// ── Provider Registry ──

const providers = new Map<string, MatchAnalysisProvider>();

export function registerProvider(provider: MatchAnalysisProvider): void {
  providers.set(provider.name, provider);
}

export function getProvider(name: string): MatchAnalysisProvider | undefined {
  return providers.get(name);
}

export function listProviders(): string[] {
  return Array.from(providers.keys());
}

/**
 * Refresh stats for a player from a configured provider.
 * Returns the fetched matches or throws if provider is not configured.
 */
export async function refreshPlayerStats(
  providerName: string,
  externalPlayerId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<ExternalMatch[]> {
  const provider = getProvider(providerName);
  if (!provider) {
    throw new Error(
      `Match analysis provider "${providerName}" is not configured`,
    );
  }
  return provider.fetchPlayerMatches(externalPlayerId, dateFrom, dateTo);
}
