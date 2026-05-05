/**
 * SAFF+ API Types
 *
 * saffplus.sa is a Next.js app. Typical Next.js data patterns:
 *   - /_next/data/{buildId}/page.json  (getServerSideProps / getStaticProps)
 *   - /api/...                          (API routes)
 *
 * These types model the expected response shapes. They will be refined
 * once the actual API structure is confirmed.
 */

// ── Raw API Response Wrapper ──

export interface SaffPlusApiResponse<T> {
  success?: boolean;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    hasMore?: boolean;
  };
}

// ── Competition / Tournament ──

export interface SaffPlusCompetition {
  id: number | string;
  name: string;
  nameAr?: string;
  season: string;
  type: string; // "league" | "cup" | "friendly"
  gender?: string;
  ageGroup?: string;
  logo?: string;
  teamsCount?: number;
  groupsCount?: number;
}

// ── Team ──

export interface SaffPlusTeam {
  id: number | string;
  name: string;
  nameAr?: string;
  logo?: string;
  city?: string;
  stadium?: string;
  competitionId?: number | string;
}

// ── Standing Row ──

export interface SaffPlusStanding {
  position: number;
  teamId: number | string;
  teamName: string;
  teamNameAr?: string;
  teamLogo?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  group?: string; // For multi-group leagues
}

// ── Match / Fixture ──

export interface SaffPlusMatch {
  id: number | string;
  competitionId: number | string;
  date: string; // ISO date
  time?: string; // HH:MM
  homeTeamId: number | string;
  homeTeamName: string;
  homeTeamNameAr?: string;
  homeTeamLogo?: string;
  awayTeamId: number | string;
  awayTeamName: string;
  awayTeamNameAr?: string;
  awayTeamLogo?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  status?: string; // "scheduled" | "live" | "finished" | "postponed"
  stadium?: string;
  city?: string;
  week?: number;
  group?: string;
}

// ── Player (if available) ──

export interface SaffPlusPlayer {
  id: number | string;
  name: string;
  nameAr?: string;
  teamId: number | string;
  position?: string;
  nationality?: string;
  jerseyNumber?: number;
  photo?: string;
}

// ── Player Profile (entity/player page) ──

export type SaffPlusLineupRole =
  | "starter"
  | "bench"
  | "injured"
  | "suspended"
  | "not_called";

export interface SaffPlusMatchWithLineup extends SaffPlusMatch {
  lineupRole?: SaffPlusLineupRole;
}

export interface SaffPlusPlayerTeam {
  saffTeamId: number;
  name: string;
  nameAr: string;
  logoUrl: string | null;
  from: string | null;
  to: string | null;
}

export interface SaffPlusPlayerProfile {
  saffPlayerId: string;
  nameEn: string;
  nameAr: string;
  position: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  photoUrl: string | null;
  teams: SaffPlusPlayerTeam[];
  recentMatches: SaffPlusMatchWithLineup[];
  upcomingMatches: SaffPlusMatchWithLineup[];
}

// ── Sync result ──

export interface SyncPlayerResult {
  playerId: string;
  enriched: string[];
  matchesLinked: number;
  matchesSkipped: number;
  clubsLinked: number;
  clubsSkipped: number;
  notifiedUserIds: string[];
}

// ── Normalized types (mapped to existing SAFF scraper interfaces) ──

export interface NormalizedStanding {
  position: number;
  saffTeamId: string;
  teamNameEn: string;
  teamNameAr: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface NormalizedFixture {
  date: string;
  time: string;
  saffHomeTeamId: string;
  homeTeamNameEn: string;
  homeTeamNameAr: string;
  saffAwayTeamId: string;
  awayTeamNameEn: string;
  awayTeamNameAr: string;
  homeScore: number | null;
  awayScore: number | null;
  status?: string;
  stadium: string;
  city: string;
}

export interface NormalizedTeam {
  saffTeamId: string;
  teamNameEn: string;
  teamNameAr: string;
  logoUrl?: string;
}
