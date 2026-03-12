/**
 * Sportmonks API v3 type definitions
 */

// ── Raw API response types ──

export interface SmApiResponse<T> {
  data: T;
  pagination?: {
    count: number;
    per_page: number;
    current_page: number;
    next_page: string | null;
    has_more: boolean;
  };
  rate_limit?: { remaining: number; requested_entity: string };
}

export interface SmFixture {
  id: number;
  sport_id: number;
  league_id: number;
  season_id: number;
  stage_id: number;
  group_id: number | null;
  round_id: number | null;
  state_id: number;
  venue_id: number | null;
  name: string | null;
  starting_at: string | null;
  result_info: string | null;
  leg: string;
  details: string | null;
  length: number | null;
  // Included relations
  participants?: SmParticipant[];
  scores?: SmScore[];
  venue?: { id: number; name: string; city_name: string } | null;
  league?: { id: number; name: string; image_path: string } | null;
  season?: { id: number; name: string } | null;
}

export interface SmParticipant {
  id: number;
  name: string;
  short_code: string;
  image_path: string;
  meta: { location: "home" | "away" };
}

export interface SmScore {
  id: number;
  fixture_id: number;
  type_id: number;
  participant_id: number;
  score: { goals: number; participant: string };
  description: string; // "CURRENT", "1ST_HALF", "2ND_HALF", "FT"
}

export interface SmLeague {
  id: number;
  sport_id: number;
  country_id: number;
  name: string;
  active: boolean;
  image_path: string;
  category: number;
}

export interface SmTeam {
  id: number;
  sport_id: number;
  name: string;
  short_code: string;
  image_path: string;
  country_id: number;
}

// ── Normalized view types (returned to frontend) ──

/** state_id → match status mapping */
export const SM_STATE_MAP: Record<number, string> = {
  1: "upcoming", // NS (Not Started)
  2: "live", // LIVE
  3: "live", // HT (Half Time)
  4: "live", // ET (Extra Time)
  5: "completed", // FT (Full Time)
  6: "completed", // AET (After Extra Time)
  7: "completed", // FT_PEN (Full Time Penalties)
  8: "cancelled", // CANCL
  9: "cancelled", // POSTP (Postponed)
  10: "cancelled", // SUSP (Suspended)
  11: "cancelled", // ABAN (Abandoned)
  13: "completed", // AU (Awarded)
  14: "cancelled", // DELAYED
  17: "cancelled", // WO (Walkover)
};

export interface NormalizedFixture {
  id: number;
  date: string;
  time: string;
  homeTeamId: number;
  homeTeam: string;
  homeShortCode: string;
  homeLogo: string;
  awayTeamId: number;
  awayTeam: string;
  awayShortCode: string;
  awayLogo: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  competition: string;
  season: string;
  venue: string;
  city: string;
  homeClubId: string | null;
  awayClubId: string | null;
  isImported: boolean;
}

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  details: Array<{
    fixtureId: number;
    matchId: string;
    action: "created" | "updated" | "skipped";
  }>;
}
