// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.rosters.pulselive.ts
// HTTP wrapper for the Pulselive squad/roster endpoint.
// Endpoint: GET /football/teams/{teamId}/compseasons/{compSeasonId}/staff
// ─────────────────────────────────────────────────────────────

import {
  client,
  fetchJson,
  DEFAULT_SEASON_ID,
} from "@modules/spl/spl.pulselive";

export interface PulseLiveRosterPlayer {
  id?: number;
  playerId?: number;
  shirtNum?: number;
  position?: string;
  positionInfo?: string;
  joinDate?: string; // YYYY-MM-DD
  age?: string;
  birth?: { date?: { millis?: number; label?: string } };
  height?: number;
  weight?: number;
  loan?: boolean;
  name?: { display?: string; first?: string; last?: string };
  nationalTeam?: { country?: string; name?: string };
  altIds?: { opta?: string };
}

export interface PulseLiveRosterResponse {
  players: PulseLiveRosterPlayer[];
  officials?: unknown[];
  team?: { id: number; name: string; shortName?: string };
}

export async function fetchTeamStaff(
  pulseLiveTeamId: number,
  seasonId?: number,
): Promise<PulseLiveRosterPlayer[]> {
  const compSeasonId = seasonId ?? DEFAULT_SEASON_ID;
  const data = await fetchJson<PulseLiveRosterResponse>(
    `fetchTeamStaff(team=${pulseLiveTeamId} season=${compSeasonId})`,
    () =>
      client.get<PulseLiveRosterResponse>(
        `/football/teams/${pulseLiveTeamId}/compseasons/${compSeasonId}/staff`,
        {
          params: { altIds: true, date: new Date().toISOString().slice(0, 10) },
        },
      ),
  );
  return data?.players ?? [];
}
