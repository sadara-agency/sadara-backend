/**
 * SAFF+ Service
 *
 * Orchestrates data fetching from saffplus.sa API and normalizes
 * responses to match the existing SAFF scraper data format so they
 * can be imported using the same importToSadara() pipeline.
 */

import { logger } from "@config/logger";
import * as provider from "./saffplus.provider";
import type {
  SaffPlusCompetition,
  SaffPlusTeam,
  SaffPlusStanding,
  SaffPlusMatch,
  NormalizedStanding,
  NormalizedFixture,
  NormalizedTeam,
} from "./saffplus.types";
import { fetchFromSaff, importToSadara } from "@modules/saff/saff.service";

// ── SAFF ID mapping (saffplus competition ID → saff.com.sa tournament ID) ──
// These will be populated during discovery or manually configured.

const MEN_LEAGUE_SAFF_IDS = [333, 334, 335, 336, 366];

// ══════════════════════════════════════════
// NORMALIZATION — Convert SAFF+ types to scraper-compatible format
// ══════════════════════════════════════════

function normalizeTeam(team: SaffPlusTeam): NormalizedTeam {
  return {
    saffTeamId: Number(team.id),
    teamNameEn: team.name || "",
    teamNameAr: team.nameAr || team.name || "",
    logoUrl: team.logo,
  };
}

function normalizeStanding(row: SaffPlusStanding): NormalizedStanding {
  return {
    position: row.position,
    saffTeamId: Number(row.teamId),
    teamNameEn: row.teamName || "",
    teamNameAr: row.teamNameAr || row.teamName || "",
    played: row.played || 0,
    won: row.won || 0,
    drawn: row.drawn || 0,
    lost: row.lost || 0,
    goalsFor: row.goalsFor || 0,
    goalsAgainst: row.goalsAgainst || 0,
    goalDifference: row.goalDifference || 0,
    points: row.points || 0,
  };
}

function normalizeFixture(match: SaffPlusMatch): NormalizedFixture {
  return {
    date: match.date?.split("T")[0] || "",
    time: match.time || "00:00",
    saffHomeTeamId: Number(match.homeTeamId),
    homeTeamNameEn: match.homeTeamName || "",
    homeTeamNameAr: match.homeTeamNameAr || match.homeTeamName || "",
    saffAwayTeamId: Number(match.awayTeamId),
    awayTeamNameEn: match.awayTeamName || "",
    awayTeamNameAr: match.awayTeamNameAr || match.awayTeamName || "",
    homeScore: match.homeScore ?? null,
    awayScore: match.awayScore ?? null,
    stadium: match.stadium || "",
    city: match.city || "",
  };
}

// ══════════════════════════════════════════
// API DISCOVERY
// ══════════════════════════════════════════

/**
 * Discover what endpoints saffplus.sa exposes.
 * Returns discovery result with API type and available endpoints.
 */
export async function discover() {
  return provider.discoverApi();
}

// ══════════════════════════════════════════
// FETCH & NORMALIZE
// ══════════════════════════════════════════

/**
 * Fetch competitions from SAFF+ and return normalized data.
 */
export async function getCompetitions() {
  const raw = await provider.fetchCompetitions();
  return {
    total: raw.length,
    competitions: raw,
  };
}

/**
 * Fetch all clubs from SAFF+ and return normalized data.
 */
export async function getTeams() {
  const raw = await provider.fetchTeams();
  return {
    total: raw.length,
    teams: raw.map(normalizeTeam),
    raw,
  };
}

/**
 * Fetch standings for a competition from SAFF+ and return normalized data.
 */
export async function getStandings(
  competitionId: number | string,
  season?: string,
) {
  const raw = await provider.fetchStandings(competitionId, season);
  return {
    total: raw.length,
    standings: raw.map(normalizeStanding),
    raw,
  };
}

/**
 * Fetch matches for a competition from SAFF+ and return normalized data.
 */
export async function getMatches(
  competitionId: number | string,
  season?: string,
) {
  const raw = await provider.fetchMatches(competitionId, season);
  return {
    total: raw.length,
    fixtures: raw.map(normalizeFixture),
    raw,
  };
}

// ══════════════════════════════════════════
// FULL SYNC — Fetch from SAFF+ then import to Sadara
// ══════════════════════════════════════════

/**
 * Attempt to sync data using SAFF+ API first, fall back to HTML scraper.
 * This is the primary entry point for getting league data into Sadara.
 */
export async function syncLeagues(
  saffIds: number[],
  season: string,
): Promise<{
  source: "saffplus" | "scraper";
  fetch: unknown;
  import: unknown;
}> {
  // Step 1: Try SAFF+ page scraping for club data
  const discovery = await provider.discoverApi();

  if (discovery.type === "motto-platform") {
    logger.info(`[SAFF+] Platform detected: ${discovery.platform}`);

    try {
      const clubs = await provider.fetchTeams();
      if (clubs.length > 0) {
        logger.info(`[SAFF+] Found ${clubs.length} clubs from SAFF+`);
      }
    } catch {
      logger.warn("[SAFF+] Could not scrape clubs from SAFF+");
    }
  }

  // Step 2: Use SAFF HTML scraper for actual league data (standings, fixtures)
  logger.info("[SAFF+] Falling back to HTML scraper");

  const fetchResult = await fetchFromSaff({
    tournamentIds: saffIds,
    season,
    dataTypes: ["standings", "fixtures", "teams"],
  });

  const importResult = await importToSadara({
    tournamentIds: saffIds,
    season,
    importTypes: ["clubs", "matches", "standings"],
  });

  return {
    source: "scraper",
    fetch: fetchResult,
    import: importResult,
  };
}

/**
 * Sync all 5 men's pro leagues.
 */
export async function syncMenLeagues(season: string) {
  return syncLeagues(MEN_LEAGUE_SAFF_IDS, season);
}
