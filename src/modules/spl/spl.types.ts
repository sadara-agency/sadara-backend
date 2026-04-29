// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.types.ts
// ─────────────────────────────────────────────────────────────

// ── Scraped from spl.com.sa ──

export interface ScrapedPlayerBio {
  splPlayerId: string;
  slug: string;
  fullName: string;
  jerseyNumber: number | null;
  nationality: string | null;
  position: string | null;
  dateOfBirth: string | null;
  heightCm: number | null;
  photoUrl: string | null;
  pulseLiveId: string | null;
  clubName: string | null;
  splTeamId: string | null;
}

export interface ScrapedSeasonStats {
  season: string;
  appearances: number;
  substitutions: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

export interface ScrapedCareerEntry {
  season: string;
  club: string;
  appearances: number;
  goals: number;
}

export interface ScrapedPlayerFull {
  bio: ScrapedPlayerBio;
  currentSeasonStats: ScrapedSeasonStats | null;
  careerHistory: ScrapedCareerEntry[];
  scrapedAt: Date;
}

// ── Sync Results ──

export interface PlayerSyncResult {
  splPlayerId: string;
  playerName: string;
  sadaraPlayerId: string;
  action: "created" | "updated" | "skipped";
  reason?: string;
}

export interface SplSyncSummary {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  results: PlayerSyncResult[];
  syncedAt: Date;
  durationMs: number;
}

// ── Club Registry ──

export interface SplClubEntry {
  splTeamId: string;
  splCode: string;
  espnTeamId: string;
  nameEn: string;
  nameAr: string;
  city: string;
  /** PulseLive team ID (API integer, not same as splTeamId) */
  pulseLiveTeamId?: number;
  /** Which PulseLive competition this club belongs to ("roshn" | "yelo") */
  pulseLiveLeague?: "roshn" | "yelo";
}

// ═══════════════════════════════════════════
// PulseLive API Types
// ═══════════════════════════════════════════

export interface PulseLiveStatEntry {
  name: string;
  value: number;
  description?: string;
}

export interface PulseLivePlayerOwner {
  playerId: number;
  info: {
    position: string;
    positionInfo: string;
    shirtNum: number;
    loan: boolean;
  };
  nationalTeam?: {
    isoCode: string;
    country: string;
    demonym: string;
  };
  currentTeam?: {
    id: number;
    name: string;
    shortName: string;
    club: { id: number; abbr: string; name: string };
    altIds?: { opta?: string };
  };
  birth?: {
    date: { millis: number; label: string };
    country?: { isoCode: string; country: string; demonym: string };
    place?: string;
  };
  age?: string;
  name: { display: string; first: string; last: string };
  id: number;
  altIds?: { opta?: string };
}

export interface PulseLivePlayerStatsResponse {
  entity: {
    id: number;
    name: { display: string; first: string; last: string };
    currentTeam?: { name: string; club: { abbr: string } };
  };
  stats: PulseLiveStatEntry[];
}

export interface PulseLiveTeamStatsResponse {
  entity: { id: number; name: string; shortName: string };
  stats: PulseLiveStatEntry[];
}

export interface PulseLiveRankedEntry {
  owner: PulseLivePlayerOwner;
  rank: number;
  name: string;
  value: number;
}

export interface PulseLivePageInfo {
  page: number;
  numPages: number;
  pageSize: number;
  numEntries: number;
}

export interface PulseLiveRankedResponse {
  entity: string;
  stats: {
    pageInfo: PulseLivePageInfo;
    content: PulseLiveRankedEntry[];
  };
}

export interface PulseLiveStandingEntry {
  team: {
    id: number;
    name: string;
    shortName: string;
    club: { id: number; abbr: string; name: string };
    altIds?: { opta?: string };
  };
  position: number;
  overall: {
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalsDifference: number;
    points: number;
  };
}

export interface PulseLiveStandingsResponse {
  compSeason: { id: number; label: string };
  tables: Array<{
    entries: PulseLiveStandingEntry[];
  }>;
}

export interface PulseLiveTeamGround {
  name: string;
  city: string;
  capacity?: number;
}

export interface PulseLiveTeam {
  id: number;
  name: string;
  shortName: string;
  club: { id: number; abbr: string; name: string };
  grounds?: PulseLiveTeamGround[];
  altIds?: { opta?: string };
}

export interface PulseLiveTeamsResponse {
  pageInfo: PulseLivePageInfo;
  content: PulseLiveTeam[];
}

// ── Mapped types for Sadara consumption ──

export interface StandingRow {
  position: number;
  teamName: string;
  teamAbbr: string;
  pulseLiveTeamId: number;
  sadaraClubId: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerName: string;
  teamName: string;
  teamAbbr: string;
  value: number;
  stat: string;
  pulseLivePlayerId: number;
  sadaraPlayerId: string | null;
  position: string;
  nationality: string | null;
  shirtNumber: number | null;
}

export interface DetailedPlayerStats {
  playerId: string;
  pulseLiveId: number;
  season: string;
  categories: Record<string, Record<string, number>>;
  raw: Record<string, number>;
}

export type PulseLiveRankedStat =
  | "goals"
  | "goal_assist"
  | "total_pass"
  | "appearances"
  | "saves"
  | "clean_sheet"
  | "red_card"
  | "yellow_card"
  | "total_tackle"
  | "interceptions_won"
  | "aerial_won"
  | "total_scoring_att";
