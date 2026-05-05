/**
 * SAFF+ Service
 *
 * Orchestrates data fetching from saffplus.sa API and normalizes
 * responses to match the existing SAFF scraper data format so they
 * can be imported using the same importToSadara() pipeline.
 */

import { Op } from "sequelize";
import { logger } from "@config/logger";
import { AppError } from "@middleware/errorHandler";
import * as provider from "./saffplus.provider";
import {
  isWomensCompetition,
  normalizeArabicName,
  type SaffPlusRosterEntry,
} from "./saffplus.provider";
import { Player } from "@modules/players/player.model";
import { Squad } from "@modules/squads/squad.model";
import { SquadMembership } from "@modules/squads/squadMembership.model";
import { findOrCreateSquad } from "@modules/squads/squad.service";
import { upsertPendingReview } from "./playerReview.service";
import type { PlayerReviewSuggestion } from "./playerReview.model";
import { MatchEvent } from "@modules/matches/matchEvent.model";
import { MatchMedia } from "@modules/matches/matchMedia.model";
import { extractMatchVideoUrl } from "./saffplus.video";
import type { SaffPlusMatchEvent } from "./saffplus.provider";
import type {
  SaffPlusCompetition,
  SaffPlusTeam,
  SaffPlusStanding,
  SaffPlusMatch,
  NormalizedStanding,
  NormalizedFixture,
  NormalizedTeam,
  SaffPlusPlayerProfile,
  SyncPlayerResult,
} from "./saffplus.types";
import {
  fetchFromSaff,
  importToSadara,
  getCurrentSeason,
  getMenLeagueSaffIds,
} from "@modules/saff/saff.service";
import { Competition } from "@modules/competitions/competition.model";
import { Club } from "@modules/clubs/club.model";
import { Match } from "@modules/matches/match.model";
import { SeasonSync } from "@modules/saff/seasonSync.model";
import { sequelize } from "@config/database";
import { ExternalProviderMapping } from "@modules/players/externalProvider.model";
import { PlayerClubHistory } from "@modules/players/playerClubHistory.model";
import { MatchPlayer } from "@modules/matches/matchPlayer.model";
import { PlayerCoachAssignment } from "@modules/player-coach-assignments/playerCoachAssignment.model";
import { notifyUser } from "@modules/notifications/notification.service";
import type { AuthUser } from "@shared/types";

// ══════════════════════════════════════════
// NORMALIZATION — Convert SAFF+ types to scraper-compatible format
// ══════════════════════════════════════════

function normalizeTeam(team: SaffPlusTeam): NormalizedTeam {
  return {
    saffTeamId: String(team.id),
    teamNameEn: team.name || "",
    teamNameAr: team.nameAr || team.name || "",
    logoUrl: team.logo,
  };
}

function normalizeStanding(row: SaffPlusStanding): NormalizedStanding {
  return {
    position: row.position,
    saffTeamId: String(row.teamId),
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
    saffHomeTeamId: String(match.homeTeamId),
    homeTeamNameEn: match.homeTeamName || "",
    homeTeamNameAr: match.homeTeamNameAr || match.homeTeamName || "",
    saffAwayTeamId: String(match.awayTeamId),
    awayTeamNameEn: match.awayTeamName || "",
    awayTeamNameAr: match.awayTeamNameAr || match.awayTeamName || "",
    homeScore: match.homeScore ?? null,
    awayScore: match.awayScore ?? null,
    status: match.status,
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
  // competitionId comes from the SAFF+ competitions list — it is a slug or
  // numeric SAFF+ ID, NOT a Sadara UUID. Look up by saffplusSlug first; if
  // not found in our DB, use it directly as the provider slug.
  const slug = await resolveCompetitionSlug(competitionId);
  const raw = await provider.fetchStandings(slug, season);
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
  const slug = await resolveCompetitionSlug(competitionId);
  const raw = await provider.fetchMatches(slug, season);
  return {
    total: raw.length,
    fixtures: raw.map(normalizeFixture),
    raw,
  };
}

async function resolveCompetitionSlug(
  competitionId: number | string,
): Promise<string> {
  const raw = String(competitionId);
  // Try lookup by saffplusSlug first
  const bySlug = await Competition.findOne({
    where: { saffplusSlug: raw },
    attributes: ["saffplusSlug"],
  });
  if (bySlug?.saffplusSlug) return bySlug.saffplusSlug;
  // Try lookup by saffId (numeric)
  const numId = Number(raw);
  if (!isNaN(numId)) {
    const byId = await Competition.findOne({
      where: { saffId: numId },
      attributes: ["saffplusSlug"],
    });
    if (byId?.saffplusSlug) return byId.saffplusSlug;
  }
  // Not in our DB yet — use the raw value directly as the provider slug
  return raw;
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
 * Sync all men's senior pro leagues (IDs derived from saff_tournaments).
 */
export async function syncMenLeagues(season: string) {
  const ids = await getMenLeagueSaffIds();
  return syncLeagues(ids, season);
}

// ══════════════════════════════════════════
// PLAYER MATCHER (Phase 2)
// ══════════════════════════════════════════

const PLAYER_MATCH_AUTO_THRESHOLD = 0.85;
const PLAYER_MATCH_SUGGESTION_THRESHOLD = 0.5;
const PLAYER_MATCH_SUGGESTION_LIMIT = 5;

export interface PlayerMatchResult {
  playerId: string | null;
  /** When playerId is null, suggestions for the review queue. */
  suggestions: PlayerReviewSuggestion[];
}

/**
 * Resolve a SAFF+ scraped roster entry to a Sadara player.
 *
 * Reconciliation order (per the approved plan):
 *   1. Exact match on `players.external_ids.saffplus`.
 *   2. Fuzzy similarity (pg_trgm) on the Arabic-normalized name with
 *      a DOB + nationality boost when those fields are present.
 *   3. Below the auto-link threshold → null + top-N suggestions for
 *      the review queue.
 *
 * Auto-link threshold is conservative (0.85) to honor the user's
 * "match-only, no auto-create" decision: we'd rather queue something
 * for human review than incorrectly merge two players.
 */
export async function matchPlayer(
  scraped: SaffPlusRosterEntry,
  providerSource = "saffplus",
): Promise<PlayerMatchResult> {
  // ── Layer 1: external id ──
  if (scraped.externalId) {
    const [direct] = (await sequelize.query(
      `SELECT id FROM players
       WHERE external_ids @> jsonb_build_object(:provider, :ext)
       LIMIT 1`,
      {
        replacements: {
          provider: providerSource,
          ext: scraped.externalId,
        },
      },
    )) as [Array<{ id: string }>, unknown];
    if (direct.length > 0) {
      return { playerId: direct[0].id, suggestions: [] };
    }
  }

  // ── Layer 2: fuzzy match ──
  // Use the Arabic-normalized name when available; otherwise the English
  // name. pg_trgm is case-insensitive on text already; we lower-case as
  // a defense-in-depth measure.
  const arNorm = scraped.nameAr ? normalizeArabicName(scraped.nameAr) : null;
  const enNorm = scraped.name ? scraped.name.toLowerCase() : null;
  const probe = arNorm ?? enNorm;
  if (!probe) {
    return { playerId: null, suggestions: [] };
  }

  const [rows] = (await sequelize.query(
    `WITH candidates AS (
       SELECT p.id,
              GREATEST(
                similarity(
                  COALESCE(p.first_name_ar, '') || ' ' || COALESCE(p.last_name_ar, ''),
                  :probeAr
                ),
                similarity(
                  LOWER(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')),
                  :probeEn
                )
              ) AS name_score,
              p.date_of_birth,
              p.nationality
       FROM players p
       WHERE
         (
           similarity(
             COALESCE(p.first_name_ar, '') || ' ' || COALESCE(p.last_name_ar, ''),
             :probeAr
           ) > 0.3
           OR similarity(
             LOWER(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')),
             :probeEn
           ) > 0.3
         )
       ORDER BY name_score DESC
       LIMIT 20
     )
     SELECT id,
            name_score,
            -- Boost when DOB matches (or is unknown on either side)
            CASE
              WHEN :dob IS NULL OR date_of_birth IS NULL THEN 0
              WHEN date_of_birth = :dob THEN 0.10
              ELSE -0.10
            END
            +
            -- Smaller boost for nationality match
            CASE
              WHEN :nat IS NULL OR nationality IS NULL THEN 0
              WHEN nationality = :nat THEN 0.05
              ELSE 0
            END
            AS boost,
            name_score AS base_score
     FROM candidates
     ORDER BY name_score DESC
     LIMIT :limit`,
    {
      replacements: {
        probeAr: arNorm ?? "",
        probeEn: enNorm ?? "",
        dob: scraped.dob,
        nat: scraped.nationality,
        limit: PLAYER_MATCH_SUGGESTION_LIMIT,
      },
    },
  )) as [
    Array<{
      id: string;
      name_score: number;
      boost: number;
      base_score: number;
    }>,
    unknown,
  ];

  const ranked = rows
    .map((r) => ({
      playerId: r.id,
      score: Math.min(1, Number(r.name_score) + Number(r.boost)),
      reason: `fuzzy_name${scraped.dob ? "+dob" : ""}${
        scraped.nationality ? "+nat" : ""
      }`,
    }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  if (top && top.score >= PLAYER_MATCH_AUTO_THRESHOLD) {
    return { playerId: top.playerId, suggestions: [] };
  }

  const suggestions = ranked.filter(
    (r) => r.score >= PLAYER_MATCH_SUGGESTION_THRESHOLD,
  );
  return { playerId: null, suggestions };
}

// ══════════════════════════════════════════
// SYNC SQUAD ROSTERS (Phase 2)
// ══════════════════════════════════════════

/**
 * Sync a single SAFF+ club's squads + their season rosters into
 * Sadara. Honors the "match-only, no auto-create" rule:
 *
 *   • Squads that don't yet exist as a Sadara `squads` row are
 *     created via `findOrCreateSquad` (parent club must already
 *     exist; we do NOT auto-create clubs from SAFF+).
 *   • Roster entries that match an existing Sadara player at
 *     similarity ≥ 0.85 → upsert squad_memberships.
 *   • Roster entries that don't match → row in player_match_review.
 *
 * Returns counters for each outcome so callers can audit.
 */
export async function syncClubSquadsAndRosters(
  clubId: string,
  clubSlug: string,
  season: string = getCurrentSeason(),
): Promise<{
  squadsCreated: number;
  squadsExisting: number;
  membershipsUpserted: number;
  reviewQueued: number;
  unparented: number;
  errors: string[];
}> {
  const result = {
    squadsCreated: 0,
    squadsExisting: 0,
    membershipsUpserted: 0,
    reviewQueued: 0,
    unparented: 0,
    errors: [] as string[],
  };

  const squads = await provider.scrapeClubSquads(clubSlug);
  if (squads.length === 0) {
    logger.warn(`[SAFF+] No squads scraped for club ${clubSlug}`);
    return result;
  }

  for (const sq of squads) {
    try {
      const [squad, wasCreated] = await findOrCreateSquad(clubId, {
        ageCategory: sq.ageCategory,
        division: sq.division,
      });
      if (wasCreated) result.squadsCreated++;
      else result.squadsExisting++;

      const roster = await provider.scrapeSquadRoster(clubSlug, sq.id, season);
      for (const entry of roster) {
        try {
          const match = await matchPlayer(entry);
          if (match.playerId) {
            // Upsert squad_membership (idempotent on (squad,player,season))
            await SquadMembership.findOrCreate({
              where: {
                squadId: squad.id,
                playerId: match.playerId,
                season,
              },
              defaults: {
                squadId: squad.id,
                playerId: match.playerId,
                season,
                jerseyNumber: entry.jerseyNumber,
                position: entry.position,
                externalMembershipId: entry.externalId,
                providerSource: "saffplus",
                joinedAt: null,
                leftAt: null,
              },
            });
            result.membershipsUpserted++;

            // Auto-enrich the matched player with their full SAFF+ profile
            // (DOB, nationality, photo, club history, match links). Fire-and-forget
            // so a slow API response doesn't block the roster sync.
            if (entry.externalId) {
              autoEnrichPlayerFromSaffPlus(
                match.playerId,
                entry.externalId,
              ).catch((err) =>
                logger.warn(
                  `[SAFF+] autoEnrich fire-and-forget failed (${match.playerId}): ${(err as Error).message}`,
                ),
              );
            }
          } else {
            await upsertPendingReview({
              scrapedNameAr: entry.nameAr ?? null,
              scrapedNameEn: entry.name,
              scrapedDob: entry.dob,
              scrapedNationality: entry.nationality,
              scrapedJerseyNumber: entry.jerseyNumber,
              scrapedPosition: entry.position,
              squadId: squad.id,
              season,
              suggestedPlayerIds: match.suggestions,
              externalPlayerId: entry.externalId,
              providerSource: "saffplus",
              rawPayload: entry.raw,
            });
            result.reviewQueued++;
          }
        } catch (rosterErr) {
          const msg =
            rosterErr instanceof Error ? rosterErr.message : String(rosterErr);
          logger.warn(`[SAFF+] Roster row failed (${entry.name}): ${msg}`);
          result.errors.push(msg);
        }
      }
    } catch (squadErr) {
      const msg =
        squadErr instanceof Error ? squadErr.message : String(squadErr);
      logger.warn(`[SAFF+] Squad ${sq.id} failed: ${msg}`);
      if (msg.includes("Parent club not found")) {
        result.unparented++;
      } else {
        result.errors.push(msg);
      }
    }
  }

  logger.info(
    `[SAFF+] syncClubSquadsAndRosters(${clubSlug}, ${season}): ` +
      `${result.squadsCreated} new squads, ${result.squadsExisting} existing, ` +
      `${result.membershipsUpserted} memberships, ${result.reviewQueued} queued, ` +
      `${result.unparented} unparented, ${result.errors.length} errors`,
  );

  return result;
}

// Suppress unused-import warnings — Squad is used transitively via findOrCreateSquad
void Squad;

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
    throw new AppError(`Competition ${competitionId} not found`, 404);
  }

  // ── Layer-2 women's filter ──
  // The provider already drops women's competitions at scrape time.
  // This is the belt-and-suspenders check at persistence time: if the
  // Sadara `Competition` row has gender=women OR name/slug signals it,
  // skip and emit an audit row so the omission is visible.
  const compGender = (
    (competition as unknown as { gender?: string }).gender ?? ""
  )
    .toLowerCase()
    .trim();
  const womenSignal =
    compGender === "women" ||
    compGender === "female" ||
    isWomensCompetition({
      name: competition.name,
      nameAr: (competition as unknown as { nameAr?: string }).nameAr,
      slug: competition.saffplusSlug ?? null,
    });

  if (womenSignal) {
    logger.info(
      `[SAFF+] Skipping women's competition '${competition.name}' (id=${competitionId}) — out of scope`,
    );
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
      metadata: { skipReason: "women_league", layer: "service" },
    } as any);
    return result;
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
      const updateFields: Record<string, unknown> = { saffplusSlug: slug };
      if (!competition.logoUrl && match.logo) updateFields.logoUrl = match.logo;
      await competition.update(updateFields);
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
  const saffDebug = process.env.SAFF_DEBUG === "1";
  if (saffDebug && rawFixtures.length > 0) {
    logger.info(
      `[SAFF+ DEBUG] First raw fixture for ${slug}: ${JSON.stringify(rawFixtures[0])}`,
    );
  }

  const now = Date.now();
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

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

      const rawStatus = fixture.status?.toLowerCase();
      const homeScore = fixture.homeScore ?? null;
      const awayScore = fixture.awayScore ?? null;
      // Combine date + time if both are present (provider returns them separately).
      // fixture.date is "YYYY-MM-DD", fixture.time is "HH:MM" or "HH:MM:SS".
      const matchDate = fixture.date
        ? fixture.time
          ? new Date(`${fixture.date}T${fixture.time}`)
          : new Date(fixture.date)
        : new Date();
      const matchTime = matchDate.getTime();

      // Primary: explicit status from provider
      let status: "completed" | "live" | "upcoming" =
        rawStatus === "finished" ||
        rawStatus === "completed" ||
        rawStatus === "ft" ||
        rawStatus === "full_time"
          ? "completed"
          : rawStatus === "live" ||
              rawStatus === "in_progress" ||
              rawStatus === "1h" ||
              rawStatus === "2h" ||
              rawStatus === "ht"
            ? "live"
            : rawStatus === "scheduled" ||
                rawStatus === "upcoming" ||
                rawStatus === "ns"
              ? "upcoming"
              : // Fallback inference when provider status is missing/unknown
                homeScore != null && awayScore != null
                ? "completed"
                : matchTime < now - TWO_HOURS_MS
                  ? "completed"
                  : matchTime < now + TWO_HOURS_MS
                    ? "live"
                    : "upcoming";

      if (status === "completed" && (homeScore == null || awayScore == null)) {
        logger.warn(
          `[SAFF+] completed fixture missing scores: ${externalMatchId} (rawStatus=${fixture.status ?? "null"})`,
        );
      }

      const matchValues = {
        providerSource: "saffplus",
        externalMatchId,
        // Phase 3: store the raw SAFF+ match id so the events scraper can
        // hit /ar/event/match/:providerMatchId without re-derivation.
        providerMatchId: String(fixture.id),
        competitionId,
        season,
        matchDate,
        homeClubId,
        awayClubId,
        homeTeamName: fixture.homeTeamName || null,
        awayTeamName: fixture.awayTeamName || null,
        homeScore,
        awayScore,
        venue: fixture.stadium ?? null,
        status,
        round: fixture.week != null ? `Week ${fixture.week}` : null,
      };

      const existing = await Match.findOne({
        where: { providerSource: "saffplus", externalMatchId },
      });

      if (existing) {
        // Don't overwrite a real non-zero score with 0 — CDA returns home_score=0
        // for pre-match/in-progress states, which would corrupt a correct result.
        const safeValues = { ...matchValues };
        if (
          existing.homeScore != null &&
          existing.homeScore !== 0 &&
          homeScore === 0 &&
          awayScore === 0 &&
          status !== "completed"
        ) {
          delete (safeValues as Partial<typeof safeValues>).homeScore;
          delete (safeValues as Partial<typeof safeValues>).awayScore;
        }
        await existing.update(safeValues);
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

// ══════════════════════════════════════════
// MATCH EVENTS + MEDIA (Phase 3)
// ══════════════════════════════════════════

/**
 * Resolve a scraped event's player to a Sadara player.id when possible,
 * using the same matcher as roster sync. Returns null when the player
 * isn't tracked in Sadara — events still persist, just without a
 * player FK. We do NOT queue review rows from event scraping; the
 * roster sync is the canonical source of player creation prompts.
 */
async function resolveEventPlayerId(
  name: string | null,
  nameAr: string | null,
): Promise<string | null> {
  if (!name && !nameAr) return null;
  const result = await matchPlayer({
    externalId: null,
    name: name ?? "",
    nameAr,
    dob: null,
    nationality: null,
    jerseyNumber: null,
    position: null,
    raw: {},
  });
  return result.playerId;
}

/**
 * Sync the minute-by-minute event timeline for a single match.
 * Idempotent: re-running on the same match upserts each event by
 * its (match_id, provider_source, external_event_id) key.
 */
export async function syncMatchEvents(matchId: string): Promise<{
  matchId: string;
  upserted: number;
  unmappedPlayers: number;
  errors: string[];
}> {
  const result = {
    matchId,
    upserted: 0,
    unmappedPlayers: 0,
    errors: [] as string[],
  };

  const match = await Match.findByPk(matchId);
  if (!match) throw new AppError(`Match ${matchId} not found`, 404);
  if (match.providerSource !== "saffplus") {
    throw new AppError(
      `Match ${matchId} is not from SAFF+ (provider=${match.providerSource})`,
      422,
    );
  }
  if (!match.providerMatchId) {
    throw new AppError(
      `Match ${matchId} has no provider_match_id — re-sync the parent competition first`,
      422,
    );
  }

  const scraped: SaffPlusMatchEvent[] = await provider.scrapeMatchEvents(
    match.providerMatchId,
  );
  if (scraped.length === 0) {
    logger.info(
      `[SAFF+] syncMatchEvents(${matchId}): 0 events scraped — page may not have a timeline yet`,
    );
    return result;
  }

  for (const ev of scraped) {
    try {
      const playerId = await resolveEventPlayerId(
        ev.playerName,
        ev.playerNameAr,
      );
      if (!playerId && (ev.playerName || ev.playerNameAr)) {
        result.unmappedPlayers++;
      }
      const relatedPlayerId = await resolveEventPlayerId(
        ev.relatedPlayerName,
        ev.relatedPlayerNameAr,
      );

      const where: Record<string, unknown> = {
        matchId: match.id,
        providerSource: "saffplus",
      };
      if (ev.externalEventId) where.externalEventId = ev.externalEventId;
      else {
        // No stable external id — fall back to (minute,type,playerId) for upsert
        where.minute = ev.minute;
        where.type = ev.type;
        where.playerId = playerId;
      }

      const existing = await MatchEvent.findOne({ where });
      if (existing) {
        await existing.update({
          minute: ev.minute,
          stoppageMinute: ev.stoppageMinute,
          type: ev.type,
          teamSide: ev.teamSide,
          playerId,
          relatedPlayerId,
          descriptionAr: ev.descriptionAr,
          descriptionEn: ev.descriptionEn,
          rawPayload: ev.raw,
        });
      } else {
        await MatchEvent.create({
          matchId: match.id,
          minute: ev.minute,
          stoppageMinute: ev.stoppageMinute,
          type: ev.type,
          teamSide: ev.teamSide,
          playerId,
          relatedPlayerId,
          descriptionAr: ev.descriptionAr,
          descriptionEn: ev.descriptionEn,
          externalEventId: ev.externalEventId,
          providerSource: "saffplus",
          rawPayload: ev.raw,
        });
      }
      result.upserted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`[SAFF+] Event upsert failed: ${msg}`);
      result.errors.push(msg);
    }
  }

  logger.info(
    `[SAFF+] syncMatchEvents(${matchId}): ${result.upserted} upserted, ` +
      `${result.unmappedPlayers} unmapped players, ${result.errors.length} errors`,
  );

  return result;
}

/**
 * Run Puppeteer to extract video URLs for a single match and persist
 * them to match_media. No-op (returns reason='disabled') when the
 * SAFFPLUS_VIDEO_EXTRACTION env flag is off, so dev runs don't try
 * to spawn Chromium.
 */
export async function syncMatchMedia(matchId: string): Promise<{
  matchId: string;
  upserted: number;
  reason: "ok" | "disabled" | "circuit_open" | "no_player_found" | "error";
  errors: string[];
}> {
  const result = {
    matchId,
    upserted: 0,
    reason: "ok" as
      | "ok"
      | "disabled"
      | "circuit_open"
      | "no_player_found"
      | "error",
    errors: [] as string[],
  };

  const match = await Match.findByPk(matchId);
  if (!match) throw new AppError(`Match ${matchId} not found`, 404);
  if (!match.providerMatchId) {
    throw new AppError(
      `Match ${matchId} has no provider_match_id — re-sync the parent competition first`,
      422,
    );
  }

  const extracted = await extractMatchVideoUrl(match.providerMatchId);
  result.reason = extracted.reason;

  for (const v of extracted.videos) {
    try {
      // Heuristic: if the match is currently live, mark this as a live
      // stream; otherwise it's a VOD replay. The frontend uses media_type
      // to pick the right player chrome.
      const mediaType: "live_stream" | "vod_full" =
        match.status === "live" ? "live_stream" : "vod_full";

      const where: Record<string, unknown> = {
        matchId: match.id,
        providerSource: "saffplus",
        url: v.url,
      };
      const existing = await MatchMedia.findOne({ where });
      if (existing) {
        await existing.update({
          mediaType,
          streamProtocol: v.streamProtocol,
          cdnProvider: v.cdnProvider,
          embedOnly: v.embedOnly,
          expiresAt: v.expiresAt,
        });
      } else {
        await MatchMedia.create({
          matchId: match.id,
          mediaType,
          streamProtocol: v.streamProtocol,
          url: v.url,
          posterUrl: null,
          durationSeconds: null,
          language: "ar",
          requiresAuth: false,
          embedOnly: v.embedOnly,
          cdnProvider: v.cdnProvider,
          expiresAt: v.expiresAt,
          externalMediaId: null,
          providerSource: "saffplus",
        });
      }
      result.upserted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`[SAFF+] Media upsert failed: ${msg}`);
      result.errors.push(msg);
    }
  }

  logger.info(
    `[SAFF+] syncMatchMedia(${matchId}): ${result.upserted} upserted (reason=${result.reason})`,
  );
  return result;
}

// ── Expiring-manifest refresh ──

/**
 * Find all match_media rows whose manifest URL expires within `windowMinutes`
 * and re-run syncMatchMedia for each distinct match. Called by a cron job
 * every 15 minutes so live-stream manifests never silently expire mid-watch.
 */
export async function refreshExpiringManifests(
  windowMinutes = 60,
): Promise<{ checked: number; refreshed: number; errors: string[] }> {
  const result = { checked: 0, refreshed: 0, errors: [] as string[] };

  const cutoff = new Date(Date.now() + windowMinutes * 60 * 1000);

  const rows = await MatchMedia.findAll({
    attributes: ["matchId"],
    where: {
      expiresAt: { [Op.ne]: null, [Op.lte]: cutoff },
      streamProtocol: { [Op.ne]: "iframe_embed" },
    },
    group: ["matchId"],
  });

  result.checked = rows.length;
  if (rows.length === 0) return result;

  for (const row of rows) {
    try {
      await syncMatchMedia(row.matchId);
      result.refreshed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(
        `[SAFF+] refreshExpiringManifests: failed for match ${row.matchId}: ${msg}`,
      );
      result.errors.push(msg);
    }
  }

  logger.info(
    `[SAFF+] refreshExpiringManifests: checked=${result.checked}, refreshed=${result.refreshed}, errors=${result.errors.length}`,
  );
  return result;
}

// ── Read endpoints ──

export async function getMatchEvents(matchId: string) {
  const match = await Match.findByPk(matchId, { attributes: ["id"] });
  if (!match) throw new AppError(`Match ${matchId} not found`, 404);
  return MatchEvent.findAll({
    where: { matchId },
    order: [
      ["minute", "ASC"],
      ["stoppageMinute", "ASC"],
    ],
    include: [
      { model: Player, as: "player", required: false },
      { model: Player, as: "relatedPlayer", required: false },
    ],
  });
}

export async function getMatchMedia(matchId: string) {
  const match = await Match.findByPk(matchId, { attributes: ["id"] });
  if (!match) throw new AppError(`Match ${matchId} not found`, 404);
  return MatchMedia.findAll({
    where: { matchId },
    order: [["createdAt", "DESC"]],
  });
}

// ══════════════════════════════════════════
// PLAYER PROFILE ENRICHMENT (entity/player/:id)
// ══════════════════════════════════════════

export interface SyncPlayerOptions {
  overwrite?: boolean;
}

/**
 * Fetch the live SAFF+ profile for a Sadara player by their Sadara UUID.
 * Resolves the SAFF+ slug from players.external_ids.saffplus, then reads
 * through the Redis cache (or fetches fresh if fresh=true).
 * Returns null when the player has no linked SAFF+ ID.
 */
export async function getLiveProfileBySadaraId(
  sadaraPlayerId: string,
  { fresh = false }: { fresh?: boolean } = {},
) {
  const player = await Player.findByPk(sadaraPlayerId, {
    attributes: ["id", "externalIds"],
  });
  if (!player) throw new AppError("Player not found", 404);

  const saffPlayerId = (player.externalIds as Record<string, string> | null)
    ?.saffplus;
  if (!saffPlayerId) return null;

  return previewPlayerProfile(saffPlayerId, { fresh });
}

/**
 * Fetch the raw SAFF+ player profile without writing anything to the DB.
 * Used by the preview endpoint so operators can review data before syncing.
 */
export async function previewPlayerProfile(
  saffPlayerId: string,
  { fresh = false }: { fresh?: boolean } = {},
) {
  let profile;
  try {
    profile = await provider.fetchPlayerProfile(saffPlayerId, { fresh });
  } catch (err) {
    throw new AppError(`SAFF+ provider error: ${(err as Error).message}`, 502);
  }
  if (!profile)
    throw new AppError(`SAFF+ profile not found for id "${saffPlayerId}"`, 404);
  return profile;
}

/**
 * Silently enrich a player that was just auto-linked during a squad roster sync.
 * No initiator required — fires and forgets; errors are only logged, never thrown.
 * Called internally; not exported as an API endpoint handler.
 */
async function autoEnrichPlayerFromSaffPlus(
  sadaraPlayerId: string,
  saffPlayerId: string,
): Promise<void> {
  let profile: SaffPlusPlayerProfile | null;
  try {
    profile = await provider.fetchPlayerProfile(saffPlayerId);
  } catch (err) {
    logger.warn(
      `[SAFF+] autoEnrich(${sadaraPlayerId}): provider error — ${(err as Error).message}`,
    );
    return;
  }
  if (!profile) {
    logger.warn(
      `[SAFF+] autoEnrich(${sadaraPlayerId}): no profile returned for saffPlus id "${saffPlayerId}"`,
    );
    return;
  }

  try {
    const player = await Player.findByPk(sadaraPlayerId);
    if (!player) return;

    await sequelize.transaction(async (t) => {
      await ExternalProviderMapping.upsert(
        {
          playerId: sadaraPlayerId,
          providerName: "Other" as const,
          externalPlayerId: saffPlayerId,
          entityType: "player",
          lastSyncedAt: new Date(),
          notes: `saffplus:${saffPlayerId}`,
          isActive: true,
        },
        { transaction: t },
      );

      const updates: Partial<{
        firstName: string;
        lastName: string;
        firstNameAr: string;
        lastNameAr: string;
        dateOfBirth: string;
        nationality: string;
        position: string;
        photoUrl: string;
        externalIds: Record<string, string>;
      }> = {};

      function fill(currentVal: unknown): boolean {
        return currentVal == null || currentVal === "";
      }

      if (profile!.nameEn) {
        const parts = profile!.nameEn.trim().split(/\s+/);
        const first = parts[0] ?? "";
        const last = parts.slice(1).join(" ") || first;
        if (first && fill(player.firstName)) updates.firstName = first;
        if (last && fill(player.lastName)) updates.lastName = last;
      }
      if (profile!.nameAr) {
        const partsAr = normalizeArabicName(profile!.nameAr)
          .trim()
          .split(/\s+/);
        const firstAr = partsAr[0] ?? "";
        const lastAr = partsAr.slice(1).join(" ") || firstAr;
        if (firstAr && fill(player.firstNameAr)) updates.firstNameAr = firstAr;
        if (lastAr && fill(player.lastNameAr)) updates.lastNameAr = lastAr;
      }
      if (profile!.dateOfBirth && fill(player.dateOfBirth))
        updates.dateOfBirth = profile!.dateOfBirth;
      if (profile!.nationality && fill(player.nationality))
        updates.nationality = profile!.nationality;
      if (profile!.position && fill(player.position))
        updates.position = profile!.position;
      if (profile!.photoUrl && fill(player.photoUrl))
        updates.photoUrl = profile!.photoUrl;

      const existingExtIds: Record<string, string> = player.externalIds ?? {};
      updates.externalIds = { ...existingExtIds, saffplus: saffPlayerId };

      if (Object.keys(updates).length > 0) {
        await player.update(updates, { transaction: t });
      }

      for (const team of profile!.teams) {
        const numericTeamId =
          typeof team.saffTeamId === "number"
            ? team.saffTeamId
            : Number(team.saffTeamId);
        if (!Number.isFinite(numericTeamId)) continue;
        const club = await Club.findOne({
          where: { saffTeamId: numericTeamId },
          attributes: ["id"],
          transaction: t,
        });
        if (!club) continue;
        if (team.to == null) {
          await player.update({ currentClubId: club.id }, { transaction: t });
        }
        const startDate = team.from ?? new Date().toISOString().slice(0, 10);
        const existing = await PlayerClubHistory.findOne({
          where: { playerId: sadaraPlayerId, clubId: club.id, startDate },
          transaction: t,
        });
        if (!existing) {
          await PlayerClubHistory.create(
            {
              playerId: sadaraPlayerId,
              clubId: club.id,
              startDate,
              endDate: team.to ?? null,
            },
            { transaction: t },
          );
        }
      }

      const allMatches = [
        ...profile!.recentMatches,
        ...profile!.upcomingMatches,
      ];
      for (const m of allMatches) {
        if (!m.lineupRole) continue;
        const externalMatchId = `saffplus:${String(m.id)}`;
        const match = await Match.findOne({
          where: { providerSource: "saffplus", externalMatchId },
          attributes: ["id"],
          transaction: t,
        });
        if (!match) continue;
        await MatchPlayer.upsert(
          {
            matchId: match.id,
            playerId: sadaraPlayerId,
            availability: m.lineupRole,
            providerSource: "saffplus",
          },
          { transaction: t },
        );
      }
    });

    logger.info(
      `[SAFF+] autoEnrich(${sadaraPlayerId}): enriched from saffplus id "${saffPlayerId}"`,
    );
  } catch (err) {
    logger.warn(
      `[SAFF+] autoEnrich(${sadaraPlayerId}): transaction failed — ${(err as Error).message}`,
    );
  }
}

/**
 * Enrich an existing Sadara player with data from their SAFF+ profile page.
 *
 * Rules:
 * - NEVER creates a new Sadara player. Throws 404 if sadaraPlayerId is unknown.
 * - Only fills null/empty fields unless opts.overwrite is true.
 * - Only links clubs/matches that already exist in Sadara (skips unknowns).
 * - Match links are only created when SAFF+ explicitly returns a lineupRole.
 * - Sends a notification to all assigned staff + the initiator after commit.
 */
export async function syncPlayerFromSaffPlus(
  sadaraPlayerId: string,
  saffPlayerId: string,
  opts: SyncPlayerOptions,
  initiator: AuthUser,
): Promise<SyncPlayerResult> {
  // ── Step 1: Resolve Sadara player ──
  const player = await Player.findByPk(sadaraPlayerId);
  if (!player) throw new AppError(`Player ${sadaraPlayerId} not found`, 404);

  // ── Step 2: Fetch SAFF+ profile ──
  let profile: SaffPlusPlayerProfile | null;
  try {
    profile = await provider.fetchPlayerProfile(saffPlayerId);
  } catch (err) {
    throw new AppError(`SAFF+ provider error: ${(err as Error).message}`, 502);
  }
  if (!profile)
    throw new AppError(`SAFF+ profile not found for id "${saffPlayerId}"`, 404);

  const result: SyncPlayerResult = {
    playerId: sadaraPlayerId,
    enriched: [],
    matchesLinked: 0,
    matchesSkipped: 0,
    clubsLinked: 0,
    clubsSkipped: 0,
    notifiedUserIds: [],
  };

  // ── Steps 3-6: transaction ──
  await sequelize.transaction(async (t) => {
    // Step 3: Upsert ExternalProviderMapping
    await ExternalProviderMapping.upsert(
      {
        playerId: sadaraPlayerId,
        providerName: "Other" as const,
        externalPlayerId: saffPlayerId,
        entityType: "player",
        lastSyncedAt: new Date(),
        notes: `saffplus:${saffPlayerId}`,
        isActive: true,
      },
      { transaction: t },
    );

    // Step 4: Enrich player fields
    const updates: Partial<{
      firstName: string;
      lastName: string;
      firstNameAr: string;
      lastNameAr: string;
      dateOfBirth: string;
      nationality: string;
      position: string;
      photoUrl: string;
      externalIds: Record<string, string>;
    }> = {};

    function shouldSet(currentVal: unknown): boolean {
      if (opts.overwrite) return true;
      return currentVal == null || currentVal === "";
    }

    // Split SAFF+ name into first/last (space-split; first word = first name)
    if (profile.nameEn) {
      const parts = profile.nameEn.trim().split(/\s+/);
      const first = parts[0] ?? "";
      const last = parts.slice(1).join(" ") || first;
      if (first && shouldSet(player.firstName)) {
        updates.firstName = first;
        result.enriched.push("firstName");
      }
      if (last && shouldSet(player.lastName)) {
        updates.lastName = last;
        result.enriched.push("lastName");
      }
    }
    if (profile.nameAr) {
      const partsAr = normalizeArabicName(profile.nameAr).trim().split(/\s+/);
      const firstAr = partsAr[0] ?? "";
      const lastAr = partsAr.slice(1).join(" ") || firstAr;
      if (firstAr && shouldSet(player.firstNameAr)) {
        updates.firstNameAr = firstAr;
        result.enriched.push("firstNameAr");
      }
      if (lastAr && shouldSet(player.lastNameAr)) {
        updates.lastNameAr = lastAr;
        result.enriched.push("lastNameAr");
      }
    }
    if (profile.dateOfBirth && shouldSet(player.dateOfBirth)) {
      updates.dateOfBirth = profile.dateOfBirth;
      result.enriched.push("dateOfBirth");
    }
    if (profile.nationality && shouldSet(player.nationality)) {
      updates.nationality = profile.nationality;
      result.enriched.push("nationality");
    }
    if (profile.position && shouldSet(player.position)) {
      updates.position = profile.position;
      result.enriched.push("position");
    }
    if (profile.photoUrl && shouldSet(player.photoUrl)) {
      updates.photoUrl = profile.photoUrl;
      result.enriched.push("photoUrl");
    }

    // Always update externalIds["saffplus"]
    const existingExtIds: Record<string, string> = player.externalIds ?? {};
    updates.externalIds = { ...existingExtIds, saffplus: saffPlayerId };

    if (Object.keys(updates).length > 0) {
      await player.update(updates, { transaction: t });
    }

    // Step 5: Link to clubs (existing Sadara clubs only).
    // Club.saffTeamId is typed as number | null. Motto-sourced ids are
    // alphanumeric strings — coerce when numeric, skip otherwise (those
    // clubs aren't in the legacy SAFF-scraped table and need a separate
    // backfill before they can be linked).
    for (const team of profile.teams) {
      const numericTeamId =
        typeof team.saffTeamId === "number"
          ? team.saffTeamId
          : Number(team.saffTeamId);
      if (!Number.isFinite(numericTeamId)) {
        result.clubsSkipped++;
        continue;
      }
      const club = await Club.findOne({
        where: { saffTeamId: numericTeamId },
        attributes: ["id"],
        transaction: t,
      });
      if (!club) {
        result.clubsSkipped++;
        continue;
      }

      // Set currentClubId when this is an active membership (no endDate)
      if (team.to == null) {
        await player.update({ currentClubId: club.id }, { transaction: t });
      }

      // Append club history if not already present
      const startDate = team.from ?? new Date().toISOString().slice(0, 10);
      const existing = await PlayerClubHistory.findOne({
        where: { playerId: sadaraPlayerId, clubId: club.id, startDate },
        transaction: t,
      });
      if (!existing) {
        await PlayerClubHistory.create(
          {
            playerId: sadaraPlayerId,
            clubId: club.id,
            startDate,
            endDate: team.to ?? null,
          },
          { transaction: t },
        );
      }
      result.clubsLinked++;
    }

    // Step 6: Link matches (only when lineupRole is known + match exists in Sadara)
    const allMatches = [...profile.recentMatches, ...profile.upcomingMatches];

    for (const m of allMatches) {
      if (!m.lineupRole) {
        result.matchesSkipped++;
        continue;
      }

      const externalMatchId = `saffplus:${String(m.id)}`;
      const match = await Match.findOne({
        where: { providerSource: "saffplus", externalMatchId },
        attributes: ["id"],
        transaction: t,
      });
      if (!match) {
        result.matchesSkipped++;
        continue;
      }

      await MatchPlayer.upsert(
        {
          matchId: match.id,
          playerId: sadaraPlayerId,
          availability: m.lineupRole,
          providerSource: "saffplus",
        },
        { transaction: t },
      );
      result.matchesLinked++;
    }
  });

  // ── Step 7: Notify assigned staff (fire-and-forget) ──
  const assignments = await PlayerCoachAssignment.findAll({
    where: {
      playerId: sadaraPlayerId,
      status: ["Assigned", "Acknowledged", "InProgress"],
    },
    attributes: ["coachUserId"],
  });

  const staffIds = new Set<string>(assignments.map((a) => a.coachUserId));
  staffIds.add(initiator.id);

  const notifInput = {
    type: "system" as const,
    priority: "normal" as const,
    title: "SAFF+ data synced",
    titleAr: "تم تحديث بيانات ساف+",
    body: `Player ${player.firstName ?? ""} ${player.lastName ?? ""} updated from SAFF+ (${result.matchesLinked} matches linked)`.trim(),
    bodyAr:
      `تم تحديث بيانات اللاعب ${player.firstNameAr ?? ""} ${player.lastNameAr ?? ""} من ساف+ (${result.matchesLinked} مباراة مرتبطة)`.trim(),
    link: `/dashboard/players/${sadaraPlayerId}`,
    sourceType: "player",
    sourceId: sadaraPlayerId,
  };

  await Promise.all(
    [...staffIds].map((userId) =>
      notifyUser(userId, notifInput).catch((err) =>
        logger.warn(
          `[SAFF+] notification failed for user ${userId}: ${(err as Error).message}`,
        ),
      ),
    ),
  );

  result.notifiedUserIds = [...staffIds];

  logger.info(
    `[SAFF+] syncPlayerFromSaffPlus(${sadaraPlayerId}): enriched=[${result.enriched.join(",")}] ` +
      `clubs=${result.clubsLinked}/${result.clubsSkipped} matches=${result.matchesLinked}/${result.matchesSkipped} ` +
      `notified=${result.notifiedUserIds.length}`,
  );

  return result;
}
