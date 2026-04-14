/**
 * SAFF+ Service
 *
 * Orchestrates data fetching from saffplus.sa API and normalizes
 * responses to match the existing SAFF scraper data format so they
 * can be imported using the same importToSadara() pipeline.
 */

import { Op } from "sequelize";
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
import {
  fetchFromSaff,
  importToSadara,
  getCurrentSeason,
} from "@modules/saff/saff.service";
import { Competition } from "@modules/competitions/competition.model";
import { Club } from "@modules/clubs/club.model";
import { Match } from "@modules/matches/match.model";
import { SeasonSync } from "@modules/saff/seasonSync.model";
import { sequelize } from "@config/database";

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

// ══════════════════════════════════════════
// SYNC COMPETITION MATCHES → SADARA MATCHES TABLE
// ══════════════════════════════════════════

/**
 * Resolve a club by Arabic name → English name → pg_trgm fuzzy similarity.
 * Per-call Map cache avoids repeated DB hits within the same sync run.
 */
async function resolveClubByNames(
  nameAr: string | undefined,
  nameEn: string | undefined,
  cache: Map<string, string | null>,
): Promise<string | null> {
  const key = `${nameAr ?? ""}|${nameEn ?? ""}`;
  if (cache.has(key)) return cache.get(key)!;

  let club: Club | null = null;

  // Try Arabic name first
  if (nameAr) {
    club = await Club.findOne({ where: { nameAr } });
  }

  // Try English name
  if (!club && nameEn) {
    club = await Club.findOne({ where: { name: nameEn } });
  }

  // Fuzzy fallback via pg_trgm (threshold 0.6)
  if (!club && (nameAr || nameEn)) {
    const searchName = nameAr ?? nameEn!;
    const [rows] = (await sequelize.query(
      `SELECT id FROM clubs
       WHERE similarity(COALESCE(name_ar, name), :name) > 0.6
       ORDER BY similarity(COALESCE(name_ar, name), :name) DESC
       LIMIT 1`,
      { replacements: { name: searchName } },
    )) as [Array<{ id: string }>, unknown];
    if (rows.length > 0) {
      club = await Club.findByPk(rows[0].id);
    }
  }

  const id = club?.id ?? null;
  cache.set(key, id);
  return id;
}

/**
 * Sync SAFF+ fixtures for a single competition into the matches table.
 *
 * Steps:
 * 1. Load the competition row; discover saffplusSlug if not set.
 * 2. Fetch fixtures from SAFF+ provider.
 * 3. Resolve club IDs via name matching (with per-run cache).
 * 4. Upsert into matches on (provider_source, external_match_id).
 * 5. Write SeasonSync audit row.
 */
export async function syncCompetitionMatches(
  competitionId: string,
  season: string = getCurrentSeason(),
): Promise<{
  upserted: number;
  skipped: number;
  unmapped: number;
  errors: string[];
}> {
  const result = {
    upserted: 0,
    skipped: 0,
    unmapped: 0,
    errors: [] as string[],
  };

  const competition = await Competition.findByPk(competitionId);
  if (!competition) {
    throw new Error(`Competition ${competitionId} not found`);
  }

  // Discover slug if missing — try matching by competition name against SAFF+ list
  let slug = competition.saffplusSlug;
  if (!slug) {
    const discovered = await provider.fetchCompetitions();
    const match = discovered.find(
      (c) =>
        c.name.toLowerCase().includes(competition.name.toLowerCase()) ||
        competition.name.toLowerCase().includes(c.name.toLowerCase()),
    );
    if (match) {
      slug = match.id as string;
      await competition.update({ saffplusSlug: slug });
      logger.info(
        `[SAFF+] Auto-discovered slug '${slug}' for '${competition.name}'`,
      );
    }
  }

  if (!slug) {
    logger.warn(
      `[SAFF+] No slug found for competition '${competition.name}' — skipping`,
    );
    await SeasonSync.upsert({
      source: "saff",
      competition: competition.name,
      competitionId,
      season,
      dataType: "fixtures",
      status: "failed",
      syncedAt: new Date(),
      recordCount: 0,
      errorMessage: "No saffplus_slug found — manual mapping required",
    } as any);
    return result;
  }

  const rawFixtures = await provider.fetchMatches(slug, season);

  if (rawFixtures.length === 0) {
    logger.warn(`[SAFF+] fetchMatches(${slug}) returned 0 fixtures`);
    await SeasonSync.upsert({
      source: "saff",
      competition: competition.name,
      competitionId,
      season,
      dataType: "fixtures",
      status: "completed",
      syncedAt: new Date(),
      recordCount: 0,
      errorMessage: null,
      metadata: {
        note: "empty — may indicate no data on SAFF+ or parsing gap",
      },
    } as any);
    return result;
  }

  const clubCache = new Map<string, string | null>();

  for (const fixture of rawFixtures) {
    try {
      const externalMatchId = `saffplus:${slug}:${fixture.date ?? ""}:${fixture.homeTeamId}-${fixture.awayTeamId}`;

      const homeClubId = await resolveClubByNames(
        fixture.homeTeamNameAr,
        fixture.homeTeamName,
        clubCache,
      );
      const awayClubId = await resolveClubByNames(
        fixture.awayTeamNameAr,
        fixture.awayTeamName,
        clubCache,
      );

      if (!homeClubId || !awayClubId) result.unmapped++;

      const status =
        fixture.status === "finished" || fixture.status === "completed"
          ? ("completed" as const)
          : fixture.status === "live"
            ? ("live" as const)
            : ("upcoming" as const);

      const matchValues = {
        providerSource: "saffplus",
        externalMatchId,
        competitionId,
        season,
        matchDate: fixture.date ? new Date(fixture.date) : new Date(),
        homeClubId,
        awayClubId,
        homeTeamName: fixture.homeTeamName || null,
        awayTeamName: fixture.awayTeamName || null,
        homeScore: fixture.homeScore ?? null,
        awayScore: fixture.awayScore ?? null,
        venue: fixture.stadium ?? null,
        status,
        round: fixture.week != null ? `Week ${fixture.week}` : null,
      };

      const existing = await Match.findOne({
        where: { providerSource: "saffplus", externalMatchId },
      });

      if (existing) {
        await existing.update(matchValues);
      } else {
        await Match.create(matchValues);
      }

      result.upserted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`[SAFF+] Fixture upsert failed: ${msg}`);
      result.errors.push(msg);
      result.skipped++;
    }
  }

  await SeasonSync.upsert({
    source: "saff",
    competition: competition.name,
    competitionId,
    season,
    dataType: "fixtures",
    status: result.errors.length === 0 ? "completed" : "failed",
    syncedAt: new Date(),
    recordCount: result.upserted,
    errorMessage:
      result.errors.length > 0 ? result.errors.slice(0, 3).join("; ") : null,
    metadata: { unmapped: result.unmapped, slug },
  } as any);

  logger.info(
    `[SAFF+] syncCompetitionMatches(${competition.name}): ${result.upserted} upserted, ` +
      `${result.skipped} skipped, ${result.unmapped} unmapped clubs`,
  );

  return result;
}
