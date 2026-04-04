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

// ── Normalized types (mapped to existing SAFF scraper interfaces) ──

export interface NormalizedStanding {
  position: number;
  saffTeamId: number;
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
  saffHomeTeamId: number;
  homeTeamNameEn: string;
  homeTeamNameAr: string;
  saffAwayTeamId: number;
  awayTeamNameEn: string;
  awayTeamNameAr: string;
  homeScore: number | null;
  awayScore: number | null;
  stadium: string;
  city: string;
}

export interface NormalizedTeam {
  saffTeamId: number;
  teamNameEn: string;
  teamNameAr: string;
  logoUrl?: string;
}
