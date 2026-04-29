import { Op } from "sequelize";
import {
  SaffTournament,
  SaffStanding,
  SaffFixture,
  SaffTeamMap,
} from "@modules/saff/saff.model";
import { Club } from "@modules/clubs/club.model";
import { Match } from "@modules/matches/match.model";
import { MatchPlayer } from "@modules/matches/matchPlayer.model";
import { Player } from "@modules/players/player.model";
import { Contract } from "@modules/contracts/contract.model";
import {
  Competition,
  ClubCompetition,
} from "@modules/competitions/competition.model";
import { findExistingLeagueEnrollment } from "@modules/competitions/competition.service";
import { Watchlist } from "@modules/scouting/scouting.model";
import { sequelize } from "@config/database";
import { AppError } from "@middleware/errorHandler";
import { findOrCreateSquad } from "@modules/squads/squad.service";
import type { SquadContext } from "@modules/squads/squad.service";
import { SeasonSync } from "@modules/saff/seasonSync.model";
import { logger } from "@config/logger";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import {
  scrapeBatch,
  scrapeTeamLogos,
  scrapeTournamentList,
  getSaffBreakerState,
  type ArNameResolver,
  type ArTournamentNameResolver,
} from "@modules/saff/saff.scraper";
import type {
  TournamentQuery,
  FetchRequest,
  StandingQuery,
  FixtureQuery,
  TeamMapQuery,
  MapTeamInput,
  ImportRequest,
  UploadPayload,
} from "@modules/saff/saff.validation";
import type {
  AppliedSummary,
  PreviewPayload,
  SessionDecisions,
  TeamResolution,
} from "@modules/saff/importSession.model";
import type {
  SaffAgeCategory,
  SaffDivision,
  SaffCompetitionType,
} from "@modules/saff/saff.model";
import tournamentContextRaw from "@modules/saff/saff.tournament-context.json";

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════

/**
 * Warm-cache resolver for Arabic team names. Reads from saff_team_maps —
 * after the first scrape of a tournament, every later scrape can pull AR
 * names from the DB instead of re-fetching the AR championship page.
 */
export const teamNameArResolver: ArNameResolver = {
  async lookupTeamNamesAr(saffTeamIds) {
    if (saffTeamIds.length === 0) return new Map();
    const rows = await SaffTeamMap.findAll({
      where: { saffTeamId: { [Op.in]: saffTeamIds } },
      attributes: ["saffTeamId", "teamNameAr"],
      raw: true,
    });
    const map = new Map<number, string>();
    for (const r of rows as Array<{ saffTeamId: number; teamNameAr: string }>) {
      // Multiple seasons can share a saffTeamId — first non-empty AR name wins
      if (r.teamNameAr && !map.has(r.saffTeamId)) {
        map.set(r.saffTeamId, r.teamNameAr);
      }
    }
    return map;
  },
};

/** Same idea for the tournament index — reads from saff_tournaments.name_ar. */
export const tournamentNameArResolver: ArTournamentNameResolver = {
  async lookupTournamentNamesAr(saffIds) {
    if (saffIds.length === 0) return new Map();
    const rows = await SaffTournament.findAll({
      where: { saffId: { [Op.in]: saffIds } },
      attributes: ["saffId", "nameAr"],
      raw: true,
    });
    const map = new Map<number, string>();
    for (const r of rows as Array<{ saffId: number; nameAr: string }>) {
      if (r.nameAr) map.set(r.saffId, r.nameAr);
    }
    return map;
  },
};

/** Calculate current football season from date (season starts ~August). */
export function getCurrentSeason(): string {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

// ══════════════════════════════════════════
// TOURNAMENT CATALOG
// ══════════════════════════════════════════

// Complete tournament definitions from saff.com.sa/en/championships.php
const TOURNAMENT_SEED = [
  {
    saffId: 333,
    name: "Roshn Saudi League",
    nameAr: "دوري روشن السعودي",
    category: "pro",
    tier: 1,
    agencyValue: "Critical",
    icon: "🏟️",
  },
  {
    saffId: 342,
    name: "King Cup",
    nameAr: "كأس الملك",
    category: "pro",
    tier: 1,
    agencyValue: "High",
    icon: "🏆",
  },
  {
    saffId: 329,
    name: "Saudi Super Cup",
    nameAr: "كأس السوبر السعودي",
    category: "pro",
    tier: 1,
    agencyValue: "High",
    icon: "⭐",
  },
  {
    saffId: 334,
    name: "Saudi League 1st Division",
    nameAr: "دوري الدرجة الأولى",
    category: "pro",
    tier: 2,
    agencyValue: "High",
    icon: "🏟️",
  },
  {
    saffId: 335,
    name: "Second Division League",
    nameAr: "دوري الدرجة الثانية",
    category: "pro",
    tier: 3,
    agencyValue: "Medium",
    icon: "🏟️",
  },
  {
    saffId: 336,
    name: "Saudi League 3rd Division",
    nameAr: "دوري الدرجة الثالثة",
    category: "pro",
    tier: 4,
    agencyValue: "Medium",
    icon: "🏟️",
  },
  {
    saffId: 366,
    name: "Saudi League 4th Division",
    nameAr: "دوري الدرجة الرابعة",
    category: "pro",
    tier: 5,
    agencyValue: "Low",
    icon: "🏟️",
  },
  {
    saffId: 350,
    name: "Jawwy Elite League U-21",
    nameAr: "دوري جوي النخبة تحت 21",
    category: "youth",
    tier: 1,
    agencyValue: "Critical",
    icon: "🌟",
  },
  {
    saffId: 351,
    name: "Saudi U-18 Premier League",
    nameAr: "الدوري الممتاز تحت 18",
    category: "youth",
    tier: 1,
    agencyValue: "Critical",
    icon: "🌟",
  },
  {
    saffId: 352,
    name: "Saudi U-17 Premier League",
    nameAr: "الدوري الممتاز تحت 17",
    category: "youth",
    tier: 1,
    agencyValue: "High",
    icon: "🌟",
  },
  {
    saffId: 353,
    name: "Saudi U-16 Premier League",
    nameAr: "الدوري الممتاز تحت 16",
    category: "youth",
    tier: 1,
    agencyValue: "High",
    icon: "🌟",
  },
  {
    saffId: 354,
    name: "Saudi U-15 Premier League",
    nameAr: "الدوري الممتاز تحت 15",
    category: "youth",
    tier: 1,
    agencyValue: "Medium",
    icon: "🌟",
  },
  {
    saffId: 371,
    name: "Saudi U-21 League Div.1",
    nameAr: "دوري الأولى تحت 21",
    category: "youth-d1",
    tier: 2,
    agencyValue: "Medium",
    icon: "📋",
  },
  {
    saffId: 355,
    name: "Saudi U-18 League Div.1",
    nameAr: "دوري الأولى تحت 18",
    category: "youth-d1",
    tier: 2,
    agencyValue: "Medium",
    icon: "📋",
  },
  {
    saffId: 356,
    name: "Saudi U-17 League Div.1",
    nameAr: "دوري الأولى تحت 17",
    category: "youth-d1",
    tier: 2,
    agencyValue: "Medium",
    icon: "📋",
  },
  {
    saffId: 357,
    name: "Saudi U-16 League Div.1",
    nameAr: "دوري الأولى تحت 16",
    category: "youth-d1",
    tier: 2,
    agencyValue: "Low",
    icon: "📋",
  },
  {
    saffId: 358,
    name: "Saudi U-15 League Div.1",
    nameAr: "دوري الأولى تحت 15",
    category: "youth-d1",
    tier: 2,
    agencyValue: "Low",
    icon: "📋",
  },
  {
    saffId: 367,
    name: "Saudi U-18 League Div.2",
    nameAr: "دوري الثانية تحت 18",
    category: "youth-d2",
    tier: 3,
    agencyValue: "Low",
    icon: "🔍",
  },
  {
    saffId: 368,
    name: "Saudi U-17 League Div.2",
    nameAr: "دوري الثانية تحت 17",
    category: "youth-d2",
    tier: 3,
    agencyValue: "Low",
    icon: "🔍",
  },
  {
    saffId: 369,
    name: "Saudi U-16 League Div.2",
    nameAr: "دوري الثانية تحت 16",
    category: "youth-d2",
    tier: 3,
    agencyValue: "Low",
    icon: "🔍",
  },
  {
    saffId: 370,
    name: "Saudi U-15 League Div.2",
    nameAr: "دوري الثانية تحت 15",
    category: "youth-d2",
    tier: 3,
    agencyValue: "Low",
    icon: "🔍",
  },
  {
    saffId: 341,
    name: "Saudi U-14 Regional Tournament",
    nameAr: "بطولة المناطق تحت 14",
    category: "grassroots",
    tier: 4,
    agencyValue: "Scouting",
    icon: "🌱",
  },
  {
    saffId: 331,
    name: "Saudi U-13 Regional Tournament",
    nameAr: "بطولة المناطق تحت 13",
    category: "grassroots",
    tier: 4,
    agencyValue: "Scouting",
    icon: "🌱",
  },
  {
    saffId: 386,
    name: "League U14",
    nameAr: "دوري تحت 14",
    category: "grassroots",
    tier: 4,
    agencyValue: "Scouting",
    icon: "🌱",
  },
  {
    saffId: 387,
    name: "League U13",
    nameAr: "دوري تحت 13",
    category: "grassroots",
    tier: 4,
    agencyValue: "Scouting",
    icon: "🌱",
  },
  {
    saffId: 388,
    name: "League U12",
    nameAr: "دوري تحت 12",
    category: "grassroots",
    tier: 5,
    agencyValue: "Scouting",
    icon: "🌱",
  },
  {
    saffId: 389,
    name: "League U11",
    nameAr: "دوري تحت 11",
    category: "grassroots",
    tier: 5,
    agencyValue: "Scouting",
    icon: "🌱",
  },
];

// ── Tournament context resolution ──
//
// Phase 1 of the Club/Squad refactor. Each tournament resolves to a squad
// context: ageCategory × division × competitionType. The curated JSON is
// authoritative; for unknown saffIds we infer from the tournament title
// (regex fallback) so unseen championships still get sensible defaults
// instead of silently sliding into the senior squad.

interface RawTournamentContext {
  ageCategory: SaffAgeCategory;
  division: SaffDivision;
  competitionType: SaffCompetitionType;
  isSupported: boolean;
}

const TOURNAMENT_CONTEXT_MAP: Record<string, RawTournamentContext> =
  Object.fromEntries(
    Object.entries(tournamentContextRaw as Record<string, unknown>).filter(
      ([k]) => /^\d+$/.test(k),
    ),
  ) as Record<string, RawTournamentContext>;

/**
 * Infer squad context from a tournament title. Used when the saffId is
 * not yet in the curated JSON. Defaults to senior/premier/league but
 * marks women's, futsal, and beach soccer as unsupported.
 */
export function inferTournamentContext(
  name: string,
  nameAr = "",
): RawTournamentContext {
  const haystack = `${name} ${nameAr}`.toLowerCase();

  // Out-of-scope formats — wizard refuses to import these.
  const isUnsupported =
    /\bwomen|female|girls?|نساء|سيدات|بنات\b/.test(haystack) ||
    /\bfutsal|صالات\b/.test(haystack) ||
    /\bbeach|شاطئية|شاطئي\b/.test(haystack);

  // Age category — match U-XX patterns; "youth" alone defaults to senior.
  let ageCategory: SaffAgeCategory = "senior";
  const ageMatch = haystack.match(/u-?(\d{2})|تحت\s*(\d{2})/);
  if (ageMatch) {
    const n = parseInt(ageMatch[1] ?? ageMatch[2], 10);
    if (n >= 11 && n <= 23) {
      ageCategory = `u${n}` as SaffAgeCategory;
    }
  }

  // Division — match "Nth Division" / "Div.N" / "الدرجة Nth".
  let division: SaffDivision = null;
  if (/\b1st\s*division|div\.?\s*1|الدرجة\s*الأولى\b/.test(haystack)) {
    division = "1st-division";
  } else if (/\b2nd\s*division|div\.?\s*2|الدرجة\s*الثانية\b/.test(haystack)) {
    division = "2nd-division";
  } else if (/\b3rd\s*division|div\.?\s*3|الدرجة\s*الثالثة\b/.test(haystack)) {
    division = "3rd-division";
  } else if (/\b4th\s*division|div\.?\s*4|الدرجة\s*الرابعة\b/.test(haystack)) {
    division = "4th-division";
  } else if (/\bpremier|elite|ممتاز|نخبة\b/.test(haystack)) {
    division = "premier";
  }

  // Competition type — cup/super-cup/tournament keywords; default league.
  let competitionType: SaffCompetitionType = "league";
  if (/\bsuper\s*cup|سوبر\b/.test(haystack)) {
    competitionType = "super-cup";
  } else if (/\bcup|كأس\b/.test(haystack)) {
    competitionType = "cup";
    division = null;
  } else if (/\btournament|بطولة\b/.test(haystack)) {
    competitionType = "tournament";
    division = null;
  }

  return {
    ageCategory,
    division,
    competitionType,
    isSupported: !isUnsupported,
  };
}

/**
 * Resolve squad context for a saffId. Curated JSON wins; falls back to
 * inferTournamentContext using the tournament name when the saffId is
 * not yet curated.
 */
export function resolveTournamentContext(
  saffId: number,
  name = "",
  nameAr = "",
): RawTournamentContext {
  const curated = TOURNAMENT_CONTEXT_MAP[String(saffId)];
  if (curated) return curated;
  return inferTournamentContext(name, nameAr);
}

// ── Seed tournaments ──

export async function seedTournaments(): Promise<number> {
  let count = 0;
  for (const t of TOURNAMENT_SEED) {
    const ctx = resolveTournamentContext(t.saffId, t.name, t.nameAr);
    const [existing, created] = await SaffTournament.findOrCreate({
      where: { saffId: t.saffId },
      defaults: {
        ...t,
        ageCategory: ctx.ageCategory,
        division: ctx.division,
        competitionType: ctx.competitionType,
        isSupported: ctx.isSupported,
      } as any,
    });
    if (created) {
      count++;
    } else {
      // Backfill metadata onto rows that pre-date Migration 148. Only
      // overwrite when the existing value matches the column default
      // ("senior" / "league") so manual corrections aren't clobbered.
      const patch: Partial<{
        ageCategory: SaffAgeCategory;
        division: SaffDivision;
        competitionType: SaffCompetitionType;
        isSupported: boolean;
      }> = {};
      if (existing.ageCategory === "senior" && ctx.ageCategory !== "senior") {
        patch.ageCategory = ctx.ageCategory;
      }
      if (existing.division == null && ctx.division != null) {
        patch.division = ctx.division;
      }
      if (
        existing.competitionType === "league" &&
        ctx.competitionType !== "league"
      ) {
        patch.competitionType = ctx.competitionType;
      }
      if (existing.isSupported && !ctx.isSupported) {
        patch.isSupported = false;
      }
      if (Object.keys(patch).length > 0) {
        await existing.update(patch);
      }
    }
  }
  return count;
}

// ── Discover tournaments dynamically from saff.com.sa ──

export async function syncTournamentsFromSaff(
  _season: string = getCurrentSeason(),
): Promise<number> {
  const scraped = await scrapeTournamentList(tournamentNameArResolver);
  let created = 0;

  for (const t of scraped) {
    const ctx = resolveTournamentContext(t.saffId, t.name, t.nameAr);
    const [existing, wasCreated] = await SaffTournament.findOrCreate({
      where: { saffId: t.saffId },
      defaults: {
        saffId: t.saffId,
        name: t.name,
        nameAr: t.nameAr || t.name,
        category: "pro",
        tier: 2,
        agencyValue: "Low",
        isActive: true,
        ageCategory: ctx.ageCategory,
        division: ctx.division,
        competitionType: ctx.competitionType,
        isSupported: ctx.isSupported,
      } as any,
    });
    if (wasCreated) {
      created++;
    } else if (!existing.nameAr && t.nameAr) {
      await existing.update({ nameAr: t.nameAr });
    }
  }

  logger.info(
    `[SAFF Service] Discovery complete — ${scraped.length} found, ${created} new`,
  );
  return created;
}

// ── List tournaments ──

export async function listTournaments(query: TournamentQuery) {
  const { limit, offset, page } = parsePagination(query, "tier");
  const where: any = { isActive: true, isSupported: true };

  if (query.category) where.category = query.category;
  if (query.tier) where.tier = query.tier;
  if (query.agencyValue) where.agencyValue = query.agencyValue;
  if (query.search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${query.search}%` } },
      { nameAr: { [Op.iLike]: `%${query.search}%` } },
    ];
  }

  const { count, rows } = await SaffTournament.findAndCountAll({
    where,
    limit,
    offset,
    order: [
      ["tier", "ASC"],
      ["category", "ASC"],
      ["name", "ASC"],
    ],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ══════════════════════════════════════════
// SCRAPE & STORE
// ══════════════════════════════════════════

export async function fetchFromSaff(input: FetchRequest) {
  const { tournamentIds, season, dataTypes } = input;

  // Resolve tournament UUIDs
  const tournaments = await SaffTournament.findAll({
    where: { saffId: { [Op.in]: tournamentIds } },
  });

  const tournamentMap = new Map(tournaments.map((t) => [t.saffId, t]));

  // Run scraper — pass the warm-cache resolver so each tournament's AR-page
  // fetch is skipped when we already know all its team names.
  const results = await scrapeBatch(
    tournamentIds,
    season,
    undefined,
    teamNameArResolver,
  );

  // If the circuit broke mid-batch, leave a single audit breadcrumb so ops
  // can tell "SAFF was down" apart from "individual tournaments failed".
  const breakerState = getSaffBreakerState();
  if (breakerState === "open") {
    await SeasonSync.upsert({
      source: "saff",
      competition: "(circuit-breaker)",
      competitionId: null,
      season,
      dataType: "fixtures",
      status: "failed",
      syncedAt: new Date(),
      recordCount: 0,
      errorMessage:
        "SAFF circuit breaker open — upstream marked unreachable; remaining tournaments skipped",
    } as any).catch((err) =>
      logger.warn("[SAFF] Failed to record breaker-open audit row", {
        error: (err as Error).message,
      }),
    );
  }

  // Store results
  const summary = { standings: 0, fixtures: 0, teams: 0 };

  for (const result of results) {
    const tournament = tournamentMap.get(result.tournamentId);
    if (!tournament) continue;

    // ── Sanity guard: refuse to overwrite good data with suspiciously sparse
    // results. If SAFF changes their DOM structure, selectors silently return
    // fewer rows — this catches the drift before it reaches the DB.
    //
    // Thresholds by agency tier:
    //   Critical/High (Roshn/Yelo/King's Cup): league has ≥18 teams → expect ≥10
    //   Medium/Low/Scouting/Niche: cups/youth groups can be small → expect ≥2
    //
    // We only check when the scrape returned *something* (non-empty result);
    // total-zero is already caught by ScraperShapeError in the scraper itself.
    const isMajorLeague = ["Critical", "High"].includes(tournament.agencyValue);
    const minStandings = isMajorLeague ? 10 : 2;
    const minFixtures = isMajorLeague ? 50 : 2;

    const standingsSuspicious =
      dataTypes.includes("standings") &&
      result.standings.length > 0 &&
      result.standings.length < minStandings;
    const fixturesSuspicious =
      dataTypes.includes("fixtures") &&
      result.fixtures.length > 0 &&
      result.fixtures.length < minFixtures;

    if (standingsSuspicious || fixturesSuspicious) {
      logger.warn(
        `[SAFF Service] Sanity check failed for saffId=${result.tournamentId} ` +
          `(${tournament.name}, agencyValue=${tournament.agencyValue}): ` +
          `standings=${result.standings.length} (min ${minStandings}), ` +
          `fixtures=${result.fixtures.length} (min ${minFixtures}). ` +
          `Skipping DB write — SAFF DOM may have changed. ` +
          `Bump SELECTOR_VERSION in saff.selectors.ts after fixing selectors.`,
      );
      continue;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Per-data-type transactions:
    //
    // Previously this block used a single transaction wrapping standings +
    // fixtures + teams + tournament metadata. If ANY bulkCreate failed,
    // Postgres aborted the whole transaction and every subsequent statement
    // surfaced as "current transaction is aborted, commands ignored until
    // end of transaction block" — masking the original error and dropping
    // perfectly-valid data alongside the failing batch.
    //
    // Splitting into one txn per data type means a failure in standings
    // doesn't block fixtures + teams from persisting, and the original
    // SQL error (with `error.original?.message` and the offending SQL)
    // gets logged so we can actually debug it.
    // ─────────────────────────────────────────────────────────────────────

    const tag = `tournament ${result.tournamentId}`;

    if (dataTypes.includes("standings") && result.standings.length) {
      await runSaffUpsert(`${tag} standings`, async (txn) => {
        await SaffStanding.bulkCreate(
          result.standings.map((s) => ({
            tournamentId: tournament.id,
            season,
            position: s.position,
            saffTeamId: s.saffTeamId,
            teamNameEn: s.teamNameEn,
            teamNameAr: s.teamNameAr || "",
            played: s.played,
            won: s.won,
            drawn: s.drawn,
            lost: s.lost,
            goalsFor: s.goalsFor,
            goalsAgainst: s.goalsAgainst,
            goalDifference: s.goalDifference,
            points: s.points,
          })),
          {
            transaction: txn,
            updateOnDuplicate: [
              "position",
              "teamNameEn",
              "teamNameAr",
              "played",
              "won",
              "drawn",
              "lost",
              "goalsFor",
              "goalsAgainst",
              "goalDifference",
              "points",
              "updatedAt",
            ],
          },
        );
        summary.standings += result.standings.length;
      });
    }

    if (dataTypes.includes("fixtures") && result.fixtures.length) {
      await runSaffUpsert(`${tag} fixtures`, async (txn) => {
        await SaffFixture.bulkCreate(
          result.fixtures.map((f) => ({
            tournamentId: tournament.id,
            season,
            matchDate: f.date,
            matchTime: f.time,
            saffHomeTeamId: f.saffHomeTeamId,
            homeTeamNameEn: f.homeTeamNameEn,
            homeTeamNameAr: f.homeTeamNameAr || "",
            saffAwayTeamId: f.saffAwayTeamId,
            awayTeamNameEn: f.awayTeamNameEn,
            awayTeamNameAr: f.awayTeamNameAr || "",
            homeScore: f.homeScore,
            awayScore: f.awayScore,
            stadium: f.stadium,
            city: f.city,
            status:
              f.homeScore !== null
                ? ("completed" as const)
                : ("upcoming" as const),
          })),
          {
            transaction: txn,
            updateOnDuplicate: [
              "matchTime",
              "week",
              "homeTeamNameEn",
              "homeTeamNameAr",
              "awayTeamNameEn",
              "awayTeamNameAr",
              "homeScore",
              "awayScore",
              "stadium",
              "city",
              "status",
              "updatedAt",
            ],
          },
        );
        summary.fixtures += result.fixtures.length;
      });
    }

    if (dataTypes.includes("teams") && result.teams.length) {
      await runSaffUpsert(`${tag} teams`, async (txn) => {
        const saffTeamIds = result.teams.map((t) => t.saffTeamId);
        const existingMaps = await SaffTeamMap.findAll({
          where: { saffTeamId: { [Op.in]: saffTeamIds }, season },
          transaction: txn,
        });
        const existingById = new Map(
          existingMaps.map((m) => [m.saffTeamId, m]),
        );

        const toCreate: Array<{
          saffTeamId: number;
          season: string;
          teamNameEn: string;
          teamNameAr: string;
        }> = [];
        const arUpdates: Array<{ id: string; teamNameAr: string }> = [];

        for (const team of result.teams) {
          const existing = existingById.get(team.saffTeamId);
          if (!existing) {
            toCreate.push({
              saffTeamId: team.saffTeamId,
              season,
              teamNameEn: team.teamNameEn,
              teamNameAr: team.teamNameAr || "",
            });
          } else if (!existing.teamNameAr && team.teamNameAr) {
            arUpdates.push({ id: existing.id, teamNameAr: team.teamNameAr });
          }
        }

        if (toCreate.length) {
          await SaffTeamMap.bulkCreate(toCreate, { transaction: txn });
        }
        for (const upd of arUpdates) {
          await SaffTeamMap.update(
            { teamNameAr: upd.teamNameAr },
            { where: { id: upd.id }, transaction: txn },
          );
        }
        summary.teams += result.teams.length;
      });
    }

    // Tournament metadata is its own tiny transaction so it survives even
    // when one of the data-type batches fails.
    await runSaffUpsert(`${tag} metadata`, async (txn) => {
      const tournamentPatch: { lastSyncedAt: Date; logoUrl?: string } = {
        lastSyncedAt: new Date(),
      };
      if (result.tournamentLogoUrl) {
        tournamentPatch.logoUrl = result.tournamentLogoUrl;
      }
      await tournament.update(tournamentPatch, { transaction: txn });
    });
  }

  return { results: results.length, ...summary };
}

/**
 * Run a small SAFF upsert in its own transaction. On failure, logs the
 * original SQL error (not the cascaded "transaction is aborted"), rolls
 * back, and returns — never throws to the caller. The caller's loop
 * continues to the next tournament / data type without interruption.
 */
async function runSaffUpsert(
  label: string,
  body: (
    txn: Awaited<ReturnType<typeof sequelize.transaction>>,
  ) => Promise<void>,
): Promise<void> {
  const txn = await sequelize.transaction();
  try {
    await body(txn);
    await txn.commit();
  } catch (error: unknown) {
    try {
      await txn.rollback();
    } catch {
      /* connection may be dead — ignore */
    }
    const e = error as {
      message?: string;
      original?: { message?: string; code?: string };
      sql?: string;
      parent?: { message?: string; code?: string };
    };
    const originalMsg =
      e.original?.message ?? e.parent?.message ?? e.message ?? String(error);
    const code = e.original?.code ?? e.parent?.code;
    const sqlSnippet = e.sql ? e.sql.slice(0, 240) : undefined;
    logger.error(`[SAFF Service] ${label} upsert failed: ${originalMsg}`, {
      code,
      sql: sqlSnippet,
    });
  }
}

// ══════════════════════════════════════════
// STANDINGS
// ══════════════════════════════════════════

export async function listStandings(query: StandingQuery) {
  const { limit, offset, page } = parsePagination(query, "position");

  const where: any = {};
  if (query.tournamentId) where.tournamentId = query.tournamentId;
  if (query.season) where.season = query.season;
  if (query.clubId) where.clubId = query.clubId;

  // Support filtering by SAFF tournament ID
  const include: any[] = [
    {
      model: SaffTournament,
      as: "tournament",
      attributes: ["id", "saffId", "name", "nameAr", "category", "tier"],
    },
  ];

  if (query.saffTournamentId) {
    include[0].where = { saffId: query.saffTournamentId };
  }

  const { count, rows } = await SaffStanding.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: [["position", "ASC"]],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ══════════════════════════════════════════
// FIXTURES
// ══════════════════════════════════════════

export async function listFixtures(query: FixtureQuery) {
  const { limit, offset, page } = parsePagination(query, "match_date");

  const where: any = {};
  if (query.tournamentId) where.tournamentId = query.tournamentId;
  if (query.season) where.season = query.season;
  if (query.status) where.status = query.status;
  if (query.week) where.week = query.week;

  if (query.clubId) {
    where[Op.or] = [{ homeClubId: query.clubId }, { awayClubId: query.clubId }];
  }

  if (query.from || query.to) {
    where.matchDate = {};
    if (query.from) where.matchDate[Op.gte] = query.from;
    if (query.to) where.matchDate[Op.lte] = query.to;
  }

  const include: any[] = [
    {
      model: SaffTournament,
      as: "tournament",
      attributes: ["id", "saffId", "name", "nameAr", "category", "tier"],
    },
  ];

  if (query.saffTournamentId) {
    include[0].where = { saffId: query.saffTournamentId };
  }

  const { count, rows } = await SaffFixture.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: [
      ["matchDate", "ASC"],
      ["matchTime", "ASC"],
    ],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ══════════════════════════════════════════
// TEAM MAPPING
// ══════════════════════════════════════════

export async function listTeamMaps(query: TeamMapQuery) {
  const { limit, offset, page } = parsePagination(query, "team_name_en");

  const where: any = {};
  if (query.season) where.season = query.season;
  if (query.unmappedOnly) where.clubId = null;

  const { count, rows } = await SaffTeamMap.findAndCountAll({
    where,
    limit,
    offset,
    order: [["teamNameEn", "ASC"]],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function mapTeamToClub(input: MapTeamInput) {
  // Verify club exists
  const club = await Club.findByPk(input.clubId);
  if (!club) throw new AppError("Club not found", 404);

  const txn = await sequelize.transaction();

  try {
    const [teamMap] = await SaffTeamMap.findOrCreate({
      where: { saffTeamId: input.saffTeamId, season: input.season },
      defaults: {
        saffTeamId: input.saffTeamId,
        season: input.season,
        teamNameEn: club.name,
        teamNameAr: club.nameAr || "",
        clubId: input.clubId,
      },
      transaction: txn,
    });

    await teamMap.update({ clubId: input.clubId }, { transaction: txn });

    if (!club.saffTeamId) {
      await club.update({ saffTeamId: input.saffTeamId }, { transaction: txn });
    }

    // Also update any existing standings/fixtures with this team
    await SaffStanding.update(
      { clubId: input.clubId },
      {
        where: { saffTeamId: input.saffTeamId, season: input.season },
        transaction: txn,
      },
    );

    await SaffFixture.update(
      { homeClubId: input.clubId },
      {
        where: { saffHomeTeamId: input.saffTeamId, season: input.season },
        transaction: txn,
      },
    );

    await SaffFixture.update(
      { awayClubId: input.clubId },
      {
        where: { saffAwayTeamId: input.saffTeamId, season: input.season },
        transaction: txn,
      },
    );

    await txn.commit();
    return teamMap;
  } catch (error) {
    await txn.rollback();
    throw error;
  }
}

// ══════════════════════════════════════════
// IMPORT TO CORE SADARA TABLES
// ══════════════════════════════════════════

export async function importToSadara(input: ImportRequest) {
  const { tournamentIds, season, importTypes } = input;

  const tournaments = await SaffTournament.findAll({
    where: { saffId: { [Op.in]: tournamentIds } },
  });

  const summary = {
    clubs: 0,
    matches: 0,
    playersLinked: 0,
    errors: [] as string[],
  };

  for (const tournament of tournaments) {
    const txn = await sequelize.transaction();

    try {
      // ── Resolve or create Competition ──
      let competition = await Competition.findOne({
        where: { saffId: tournament.saffId },
        transaction: txn,
      });

      if (!competition) {
        [competition] = await Competition.findOrCreate({
          where: { saffId: tournament.saffId },
          defaults: {
            name: tournament.name,
            nameAr: tournament.nameAr,
            country: "Saudi Arabia",
            type: tournament.category === "pro" ? "league" : "cup",
            tier: tournament.tier,
            agencyValue: tournament.agencyValue,
            saffId: tournament.saffId,
            logoUrl: tournament.logoUrl ?? null,
            isActive: true,
          } as any,
          transaction: txn,
        });
      }

      // ── Import clubs ──
      if (importTypes.includes("clubs")) {
        // Scope team maps to THIS tournament via standings + fixtures
        const tournamentTeamIds = new Set<number>();

        const standings = await SaffStanding.findAll({
          where: { tournamentId: tournament.id, season },
          attributes: ["saffTeamId"],
          transaction: txn,
        });
        for (const s of standings) tournamentTeamIds.add(s.saffTeamId);

        const fixtures = await SaffFixture.findAll({
          where: { tournamentId: tournament.id, season },
          attributes: ["saffHomeTeamId", "saffAwayTeamId"],
          transaction: txn,
        });
        for (const f of fixtures) {
          tournamentTeamIds.add(f.saffHomeTeamId);
          tournamentTeamIds.add(f.saffAwayTeamId);
        }

        const teamMaps = await SaffTeamMap.findAll({
          where: {
            season,
            clubId: null,
            ...(tournamentTeamIds.size > 0
              ? { saffTeamId: { [Op.in]: [...tournamentTeamIds] } }
              : {}),
          },
          transaction: txn,
        });

        for (const tm of teamMaps) {
          // Match priority: saffTeamId → nameAr → name. Only create when
          // nothing matches. Matching only on English name (as the old
          // findOrCreate did) produced duplicates whenever SAFF sent a
          // spelling variant ("Al Okhdood" vs. seed "Al Akhdoud") for a
          // club that already existed under its canonical Arabic name.
          let club = await Club.findOne({
            where: { saffTeamId: tm.saffTeamId },
            transaction: txn,
          });
          if (!club && tm.teamNameAr) {
            club = await Club.findOne({
              where: { nameAr: tm.teamNameAr },
              transaction: txn,
            });
          }
          if (!club) {
            club = await Club.findOne({
              where: { name: tm.teamNameEn },
              transaction: txn,
            });
          }

          let created = false;
          if (!club) {
            club = await Club.create(
              {
                name: tm.teamNameEn,
                nameAr: tm.teamNameAr,
                type: "Club" as const,
                country: "Saudi Arabia",
                city: tm.city || undefined,
                league: tournament.name,
                saffTeamId: tm.saffTeamId,
                logoUrl: tm.logoUrl ?? null,
              },
              { transaction: txn },
            );
            created = true;
          }

          if (!created && !club.nameAr && tm.teamNameAr) {
            await club.update({ nameAr: tm.teamNameAr }, { transaction: txn });
          }
          if (!created && !club.isActive) {
            await club.update({ isActive: true }, { transaction: txn });
          }
          if (!created && !club.logoUrl && tm.logoUrl) {
            await club.update({ logoUrl: tm.logoUrl }, { transaction: txn });
          }
          if (!club.saffTeamId) {
            await club.update(
              { saffTeamId: tm.saffTeamId },
              { transaction: txn },
            );
          }

          await tm.update({ clubId: club.id }, { transaction: txn });
          if (created) summary.clubs++;

          // ── Enroll club in competition for this season ──
          // If this is a league, replace any existing league enrollment
          if (competition.type === "league") {
            const existing = await findExistingLeagueEnrollment(
              club.id,
              season,
              competition.format,
              competition.gender,
              competition.ageGroup,
              competition.id,
              txn,
            );
            if (existing) {
              await existing.destroy({ transaction: txn });
              logger.info(
                `[SAFF Import] Replacing league for ${club.name}: ` +
                  `${((existing as any).competition as Competition)?.name} → ${competition.name}`,
              );
            }
          }

          await ClubCompetition.findOrCreate({
            where: { clubId: club.id, competitionId: competition.id, season },
            defaults: {
              clubId: club.id,
              competitionId: competition.id,
              season,
            },
            transaction: txn,
          });
        }
      }

      // ── Import matches (with deduplication + player auto-linking) ──
      if (importTypes.includes("matches")) {
        const fixtures = await SaffFixture.findAll({
          where: { tournamentId: tournament.id, season, matchId: null },
          transaction: txn,
        });

        if (fixtures.length) {
          // ── Batch-fetch all team maps for this tournament's fixtures ──
          const allSaffTeamIds = new Set<number>();
          for (const f of fixtures) {
            allSaffTeamIds.add(f.saffHomeTeamId);
            allSaffTeamIds.add(f.saffAwayTeamId);
          }
          const teamMaps = await SaffTeamMap.findAll({
            where: {
              saffTeamId: { [Op.in]: [...allSaffTeamIds] },
              season,
            },
            transaction: txn,
          });
          const teamMapById = new Map(
            teamMaps.map((tm) => [tm.saffTeamId, tm]),
          );

          // ── Batch-fetch all club IDs that have mappings ──
          const allClubIds = new Set<string>();
          for (const tm of teamMaps) {
            if (tm.clubId) allClubIds.add(tm.clubId);
          }

          // ── Batch-fetch existing matches for dedup ──
          const existingMatches = allClubIds.size
            ? await Match.findAll({
                where: { season, homeClubId: { [Op.in]: [...allClubIds] } },
                attributes: [
                  "id",
                  "homeClubId",
                  "awayClubId",
                  "matchDate",
                  "homeScore",
                  "competitionId",
                ],
                transaction: txn,
              })
            : [];
          const matchLookup = new Map(
            existingMatches.map((m) => [
              `${m.homeClubId}|${m.awayClubId}|${m.matchDate}`,
              m,
            ]),
          );

          // ── Batch-fetch managed players for all involved clubs ──
          const today = new Date().toISOString().split("T")[0];
          const managedPlayers = allClubIds.size
            ? await Player.findAll({
                where: {
                  currentClubId: { [Op.in]: [...allClubIds] },
                  status: "active",
                },
                include: [
                  {
                    model: Contract,
                    as: "contracts",
                    where: {
                      status: "Active",
                      endDate: { [Op.gte]: today },
                    },
                    required: true,
                    attributes: ["id"],
                  },
                ],
                attributes: ["id", "currentClubId"],
                transaction: txn,
              })
            : [];
          const playersByClub = new Map<string, typeof managedPlayers>();
          for (const p of managedPlayers) {
            const clubId = (p as any).currentClubId as string;
            if (!playersByClub.has(clubId)) playersByClub.set(clubId, []);
            playersByClub.get(clubId)!.push(p);
          }

          // ── Track clubs already enrolled in competition ──
          const enrolledClubs = new Set<string>();

          // ── Pre-resolve senior squad per club ──
          // Match insert is gated by the matches_squad_required_when_club
          // CHECK constraint (migration 152). Build a clubId→squadId map
          // from the unique clubIds referenced by these fixtures so we
          // can satisfy the constraint without per-row lookups.
          const fixtureClubIds = new Set<string>();
          for (const f of fixtures) {
            const hm = teamMapById.get(f.saffHomeTeamId);
            const am = teamMapById.get(f.saffAwayTeamId);
            if (hm?.clubId) fixtureClubIds.add(hm.clubId);
            if (am?.clubId) fixtureClubIds.add(am.clubId);
          }
          const clubToSquadId = new Map<string, string>();
          for (const cid of fixtureClubIds) {
            try {
              const [squad] = await findOrCreateSquad(
                cid,
                { ageCategory: "senior", division: "premier" },
                txn,
              );
              clubToSquadId.set(cid, squad.id);
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              logger.warn(
                `[SAFF Import] Could not resolve senior squad for club ${cid}: ${msg}`,
              );
            }
          }

          for (const fixture of fixtures) {
            const homeMap = teamMapById.get(fixture.saffHomeTeamId);
            const awayMap = teamMapById.get(fixture.saffAwayTeamId);

            if (!homeMap?.clubId || !awayMap?.clubId) continue;

            // Check for existing match to prevent duplicates
            const dedupKey = `${homeMap.clubId}|${awayMap.clubId}|${fixture.matchDate}`;
            const existingMatch = matchLookup.get(dedupKey);

            let matchId: string;

            if (existingMatch) {
              matchId = existingMatch.id;
              await fixture.update({ matchId }, { transaction: txn });
              // Update score if SAFF has one and existing match doesn't
              if (
                fixture.homeScore !== null &&
                existingMatch.homeScore === null
              ) {
                await existingMatch.update(
                  {
                    homeScore: fixture.homeScore,
                    awayScore: fixture.awayScore,
                    status: "completed",
                  },
                  { transaction: txn },
                );
              }
              // Link to competition if not already linked
              if (!existingMatch.competitionId && competition) {
                await existingMatch.update(
                  { competitionId: competition.id },
                  { transaction: txn },
                );
              }
            } else {
              // Resolve squad IDs from the pre-built map; if a club
              // doesn't have a resolvable squad, drop both club and
              // squad (CHECK constraint allows orphan rows).
              const homeSquadId = clubToSquadId.get(homeMap.clubId) ?? null;
              const awaySquadId = clubToSquadId.get(awayMap.clubId) ?? null;
              const safeHomeClubId = homeSquadId ? homeMap.clubId : null;
              const safeAwayClubId = awaySquadId ? awayMap.clubId : null;
              const match = await Match.create({
                homeClubId: safeHomeClubId,
                awayClubId: safeAwayClubId,
                homeSquadId,
                awaySquadId,
                competitionId: competition.id,
                competition: tournament.name,
                season,
                matchDate: fixture.matchDate,
                venue: fixture.stadium || undefined,
                status:
                  fixture.status === "completed" ? "completed" : "upcoming",
                homeScore: fixture.homeScore ?? undefined,
                awayScore: fixture.awayScore ?? undefined,
                createdBy: "system",
              } as any);

              matchId = match.id;
              // Add to lookup so subsequent fixtures don't duplicate
              matchLookup.set(dedupKey, match);
              await fixture.update({ matchId }, { transaction: txn });
              summary.matches++;
            }

            // ── Auto-link managed players to this match ──
            const clubIds = [homeMap.clubId, awayMap.clubId];
            const players = [
              ...(playersByClub.get(homeMap.clubId) || []),
              ...(playersByClub.get(awayMap.clubId) || []),
            ];

            for (const player of players) {
              const [, created] = await MatchPlayer.findOrCreate({
                where: { matchId, playerId: player.id },
                defaults: {
                  matchId,
                  playerId: player.id,
                  availability: "not_called",
                },
                transaction: txn,
              });
              if (created) summary.playersLinked++;
            }

            // Enroll both clubs in competition (skip if already enrolled)
            for (const clubId of clubIds) {
              if (enrolledClubs.has(clubId)) continue;

              // If this is a league, replace any existing league enrollment
              if (competition.type === "league") {
                const existing = await findExistingLeagueEnrollment(
                  clubId,
                  season,
                  competition.format,
                  competition.gender,
                  competition.ageGroup,
                  competition.id,
                  txn,
                );
                if (existing) {
                  await existing.destroy({ transaction: txn });
                }
              }

              await ClubCompetition.findOrCreate({
                where: { clubId, competitionId: competition.id, season },
                defaults: { clubId, competitionId: competition.id, season },
                transaction: txn,
              });
              enrolledClubs.add(clubId);
            }
          }
        }
      }

      await txn.commit();
    } catch (error: unknown) {
      await txn.rollback();
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(
        `[SAFF Import] Failed for tournament ${tournament.name}: ${msg}`,
      );
      summary.errors.push(`${tournament.name}: ${msg}`);
      // Continue to next tournament instead of throwing
    }
  }

  return summary;
}

// ══════════════════════════════════════════
// FETCH TEAM LOGOS
// ══════════════════════════════════════════

export async function fetchTeamLogos(season: string, force = false) {
  // Build filter: missing logos, OR logos pointing to the generic SAFF site logo
  const where: any = { season };
  if (!force) {
    where[Op.or] = [
      { logoUrl: null },
      { logoUrl: { [Op.like]: "%/assets/images/logo%" } }, // bad generic SAFF logo
    ];
  }

  const teamMaps = await SaffTeamMap.findAll({ where });

  if (teamMaps.length === 0) return { fetched: 0 };

  const saffTeamIds = teamMaps.map((tm) => tm.saffTeamId);
  const logos = await scrapeTeamLogos(saffTeamIds);

  let updated = 0;
  for (const tm of teamMaps) {
    const logo = logos.get(tm.saffTeamId);
    if (logo) {
      await tm.update({ logoUrl: logo });
      // Also update the linked club's logo if it has no logo or a bad one
      if (tm.clubId) {
        const club = await Club.findByPk(tm.clubId);
        if (
          club &&
          (!club.logoUrl || club.logoUrl.includes("/assets/images/logo"))
        ) {
          await club.update({ logoUrl: logo });
        }
      }
      updated++;
    }
  }

  return { fetched: updated, total: teamMaps.length };
}

// ══════════════════════════════════════════
// BULK FETCH — MEN'S PRO LEAGUES
// ══════════════════════════════════════════

const MEN_SENIOR_DIVISIONS = [
  "premier",
  "1st-division",
  "2nd-division",
  "3rd-division",
] as const;

// In-process cache — refreshed on first call, stable for the process lifetime.
// League IDs only change when a tournament is promoted/relegated, at which
// point the admin updates saff_tournaments and the process restarts.
let _menLeagueIdsCache: number[] | null = null;

/**
 * Return the SAFF IDs of all active men's senior pro leagues, derived from
 * saff_tournaments. Falls back to known 2025-2026 IDs if the DB query fails.
 */
export async function getMenLeagueSaffIds(): Promise<number[]> {
  if (_menLeagueIdsCache !== null) return _menLeagueIdsCache;

  try {
    const rows = await SaffTournament.findAll({
      where: {
        ageCategory: "senior",
        division: MEN_SENIOR_DIVISIONS,
        isActive: true,
      },
      attributes: ["saffId"],
      raw: true,
    });
    const ids = (rows as Array<{ saffId: number }>).map((r) => r.saffId);
    if (ids.length > 0) {
      _menLeagueIdsCache = ids;
      logger.info(
        `[SAFF Service] Men's league IDs loaded from DB: [${ids.join(", ")}]`,
      );
      return ids;
    }
  } catch (err) {
    logger.warn(
      `[SAFF Service] Could not load men's league IDs from DB — using fallback: ${(err as Error).message}`,
    );
  }

  // Fallback: known Saudi Pro League + 1st/2nd/3rd division IDs (2025-2026 season)
  const fallback = [333, 334, 335, 336, 366];
  _menLeagueIdsCache = fallback;
  return fallback;
}

/**
 * One-shot bulk fetch for all men's pro leagues (stage-only).
 *
 * After the wizard redesign this only refreshes staging tables — clubs,
 * matches, and competitions are never mutated here. To commit the
 * fetched data, a human must run the wizard for each tournament.
 */
export async function bulkFetchMenLeagues(season: string) {
  const ids = await getMenLeagueSaffIds();
  const fetchResult = await fetchFromSaff({
    tournamentIds: ids,
    season,
    dataTypes: ["standings", "fixtures", "teams"],
  });

  return {
    season,
    leagues: ids.length,
    fetch: fetchResult,
  };
}

// ══════════════════════════════════════════
// STATISTICS
// ══════════════════════════════════════════

export async function getStats(season?: string) {
  const unmappedWhere: Record<string, unknown> = { clubId: null };
  if (season) unmappedWhere.season = season;

  const [tournaments, standings, fixtures, teamMaps, unmapped] =
    await Promise.all([
      SaffTournament.count({ where: { isActive: true } }),
      SaffStanding.count(),
      SaffFixture.count(),
      SaffTeamMap.count(),
      SaffTeamMap.count({ where: unmappedWhere }),
    ]);

  return {
    tournaments,
    standings,
    fixtures,
    teamMaps,
    unmappedTeams: unmapped,
  };
}

// ══════════════════════════════════════════
// PLAYER-CENTRIC QUERIES
// ══════════════════════════════════════════

/**
 * Get upcoming SAFF fixtures that involve clubs where Sadara-managed players
 * (with active contracts) are currently playing.
 */
export async function getPlayerUpcomingMatches(
  season: string,
  limit: number = 20,
) {
  const today = new Date().toISOString().split("T")[0];

  // Find club IDs where Sadara has managed players
  const managedPlayers = await Player.findAll({
    where: { status: "active" },
    include: [
      {
        model: Contract,
        as: "contracts",
        where: { status: "Active", endDate: { [Op.gte]: today } },
        required: true,
        attributes: ["id"],
      },
    ],
    attributes: [
      "id",
      "firstName",
      "lastName",
      "firstNameAr",
      "lastNameAr",
      "currentClubId",
      "position",
    ],
    raw: false,
  });

  if (!managedPlayers.length) return { fixtures: [], players: [] };

  // Group players by clubId
  const playersByClub = new Map<string, typeof managedPlayers>();
  const clubIds = new Set<string>();

  for (const p of managedPlayers) {
    if (!p.currentClubId) continue;
    clubIds.add(p.currentClubId);
    const existing = playersByClub.get(p.currentClubId) || [];
    existing.push(p);
    playersByClub.set(p.currentClubId, existing);
  }

  if (!clubIds.size) return { fixtures: [], players: [] };

  // Find upcoming fixtures where either club has managed players
  const fixtures = await SaffFixture.findAll({
    where: {
      season,
      status: "upcoming",
      matchDate: { [Op.gte]: today },
      [Op.or]: [
        { homeClubId: { [Op.in]: [...clubIds] } },
        { awayClubId: { [Op.in]: [...clubIds] } },
      ],
    },
    include: [
      {
        model: SaffTournament,
        as: "tournament",
        attributes: ["id", "saffId", "name", "nameAr", "category", "tier"],
      },
    ],
    order: [
      ["matchDate", "ASC"],
      ["matchTime", "ASC"],
    ],
    limit,
  });

  // Enrich each fixture with the managed players involved
  const enriched = fixtures.map((f) => {
    const homePlayers = f.homeClubId
      ? playersByClub.get(f.homeClubId) || []
      : [];
    const awayPlayers = f.awayClubId
      ? playersByClub.get(f.awayClubId) || []
      : [];

    return {
      ...f.toJSON(),
      managedPlayers: {
        home: homePlayers.map((p) => ({
          id: p.id,
          name: `${p.firstName} ${p.lastName}`,
          nameAr:
            p.firstNameAr && p.lastNameAr
              ? `${p.firstNameAr} ${p.lastNameAr}`
              : null,
          position: p.position,
        })),
        away: awayPlayers.map((p) => ({
          id: p.id,
          name: `${p.firstName} ${p.lastName}`,
          nameAr:
            p.firstNameAr && p.lastNameAr
              ? `${p.firstNameAr} ${p.lastNameAr}`
              : null,
          position: p.position,
        })),
      },
    };
  });

  return { fixtures: enriched, totalPlayers: managedPlayers.length };
}

/**
 * For a given player, return their club's standings in all SAFF tournaments
 * for the current season.
 */
export async function getPlayerCompetitionStats(
  playerId: string,
  season: string,
) {
  const player = await Player.findByPk(playerId, {
    attributes: [
      "id",
      "firstName",
      "lastName",
      "firstNameAr",
      "lastNameAr",
      "currentClubId",
    ],
  });
  if (!player) throw new AppError("Player not found", 404);
  if (!player.currentClubId)
    return { player: player.toJSON(), standings: [], matchCount: 0 };

  // Find club's standings across all SAFF tournaments
  const standings = await SaffStanding.findAll({
    where: { clubId: player.currentClubId, season },
    include: [
      {
        model: SaffTournament,
        as: "tournament",
        attributes: [
          "id",
          "saffId",
          "name",
          "nameAr",
          "category",
          "tier",
          "agencyValue",
        ],
      },
    ],
    order: [[{ model: SaffTournament, as: "tournament" }, "tier", "ASC"]],
  });

  // Count matches imported for this club
  const matchCount = await Match.count({
    where: {
      season,
      [Op.or]: [
        { homeClubId: player.currentClubId },
        { awayClubId: player.currentClubId },
      ],
    },
  });

  return {
    player: player.toJSON(),
    standings: standings.map((s) => s.toJSON()),
    matchCount,
  };
}

/**
 * Find upcoming SAFF fixtures where either club name matches a scouting
 * Watchlist prospect's currentClub. Returns fixtures tagged with watchlist entries.
 */
export async function getWatchlistMatches(season: string, limit: number = 20) {
  const today = new Date().toISOString().split("T")[0];

  // Get active watchlist prospects with known clubs
  const prospects = await Watchlist.findAll({
    where: {
      status: { [Op.in]: ["Active", "Shortlisted"] },
      currentClub: { [Op.ne]: null },
    },
    attributes: [
      "id",
      "prospectName",
      "prospectNameAr",
      "currentClub",
      "position",
      "priority",
    ],
  });

  if (!prospects.length) return { fixtures: [], prospects: [] };

  // Map prospect club names to find matching SAFF team maps
  const clubNames = [
    ...new Set(prospects.map((p) => p.currentClub).filter(Boolean)),
  ] as string[];

  const teamMaps = await SaffTeamMap.findAll({
    where: {
      season,
      clubId: { [Op.ne]: null as any },
      [Op.or]: [
        { teamNameEn: { [Op.in]: clubNames } },
        { teamNameAr: { [Op.in]: clubNames } },
      ],
    } as any,
  });

  if (!teamMaps.length)
    return { fixtures: [], prospects: prospects.map((p) => p.toJSON()) };

  const clubIds = new Set(
    teamMaps.map((tm) => tm.clubId).filter(Boolean) as string[],
  );

  // Build a map from clubId → prospects at that club
  const clubToName = new Map<string, string[]>();
  for (const tm of teamMaps) {
    if (tm.clubId) {
      clubToName.set(tm.clubId, [tm.teamNameEn, tm.teamNameAr]);
    }
  }

  const prospectsByClubName = new Map<string, typeof prospects>();
  for (const p of prospects) {
    if (!p.currentClub) continue;
    const existing = prospectsByClubName.get(p.currentClub) || [];
    existing.push(p);
    prospectsByClubName.set(p.currentClub, existing);
  }

  // Find upcoming fixtures involving those clubs
  const fixtures = await SaffFixture.findAll({
    where: {
      season,
      status: "upcoming",
      matchDate: { [Op.gte]: today },
      [Op.or]: [
        { homeClubId: { [Op.in]: [...clubIds] } },
        { awayClubId: { [Op.in]: [...clubIds] } },
      ],
    },
    include: [
      {
        model: SaffTournament,
        as: "tournament",
        attributes: ["id", "saffId", "name", "nameAr", "category", "tier"],
      },
    ],
    order: [["matchDate", "ASC"]],
    limit,
  });

  // Enrich with watchlist prospect info
  const enriched = fixtures.map((f) => {
    const getProspectsForClub = (clubId: string | null) => {
      if (!clubId) return [];
      const names = clubToName.get(clubId) || [];
      const matched: typeof prospects = [];
      for (const name of names) {
        const ps = prospectsByClubName.get(name) || [];
        matched.push(...ps);
      }
      return matched.map((p) => ({
        id: p.id,
        name: p.prospectName,
        nameAr: p.prospectNameAr,
        position: p.position,
        priority: p.priority,
      }));
    };

    return {
      ...f.toJSON(),
      watchlistProspects: {
        home: getProspectsForClub(f.homeClubId),
        away: getProspectsForClub(f.awayClubId),
      },
    };
  });

  return { fixtures: enriched };
}

// ══════════════════════════════════════════
// PROJECT SAFF FIXTURES → MATCHES TABLE
// ══════════════════════════════════════════

/**
 * Bridge: reads already-scraped saff_fixtures for a tournament/season and
 * upserts them into the core `matches` table.
 *
 * Idempotent — keyed on (provider_source='saff', external_match_id).
 * Backfills saff_fixtures.match_id after upsert.
 * Writes a season_syncs audit row.
 */
export async function projectFixturesToMatches(
  tournamentId: string,
  season: string,
): Promise<{ upserted: number; skipped: number; errors: string[] }> {
  const result = { upserted: 0, skipped: 0, errors: [] as string[] };

  // Resolve the Competition row via the SaffTournament.saffId
  const tournament = await SaffTournament.findByPk(tournamentId);
  if (!tournament) {
    throw new AppError(`SAFF tournament ${tournamentId} not found`, 404);
  }

  const competition = await Competition.findOne({
    where: { saffId: tournament.saffId },
  });
  // competition may be null if not yet mapped — matches still persist with null competitionId

  const fixtures = await SaffFixture.findAll({
    where: { tournamentId, season },
  });

  // ── Pre-resolve squad IDs for every referenced club ──
  // The `matches` table has a CHECK constraint (added by migration 152):
  //   `(home_club_id IS NULL OR home_squad_id IS NOT NULL) AND
  //    (away_club_id IS NULL OR away_squad_id IS NOT NULL)`.
  // Inserting a match with home_club_id set but home_squad_id NULL aborts
  // the transaction AND poisons the pooled connection — subsequent
  // queries on that connection get error 25P02 ("transaction is aborted")
  // until the connection is reset, which is what we observed in
  // production logs as the SAFF transaction-abort cascade.
  //
  // Fix: ensure every referenced club has a senior/premier squad (auto-
  // create via findOrCreateSquad if missing) and set the squad_id on
  // each match. This is the same auto-create pattern migration 152 uses,
  // applied at write time so the constraint is always satisfied.
  const clubIds = new Set<string>();
  for (const f of fixtures) {
    if (f.homeClubId) clubIds.add(f.homeClubId);
    if (f.awayClubId) clubIds.add(f.awayClubId);
  }

  const clubToSquadId = new Map<string, string>();
  for (const clubId of clubIds) {
    try {
      const [squad] = await findOrCreateSquad(clubId, {
        ageCategory: "senior",
        division: "premier",
      });
      clubToSquadId.set(clubId, squad.id);
    } catch (err) {
      // If a club has been deleted between the fixture write and now,
      // findOrCreateSquad will throw "Parent club not found". Skip — the
      // matches referencing this club will fall back to NULL home_club_id
      // (see below) so the CHECK constraint still passes.
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(
        `[SAFF Bridge] Could not resolve senior squad for club ${clubId}: ${msg}`,
      );
    }
  }

  for (const fixture of fixtures) {
    try {
      const externalMatchId = `saff:${tournament.saffId}:${fixture.saffHomeTeamId}-${fixture.saffAwayTeamId}:${fixture.matchDate}`;

      const matchDate = new Date(
        `${fixture.matchDate}T${fixture.matchTime ?? "00:00"}:00Z`,
      );

      // Resolve squad IDs from the pre-built map. If the club has no
      // resolvable squad (e.g., dangling FK), null out BOTH the club
      // and squad — the CHECK constraint allows NULL club + NULL squad
      // (treats the row as an orphan, which it effectively is).
      const homeSquadId = fixture.homeClubId
        ? (clubToSquadId.get(fixture.homeClubId) ?? null)
        : null;
      const awaySquadId = fixture.awayClubId
        ? (clubToSquadId.get(fixture.awayClubId) ?? null)
        : null;
      const safeHomeClubId =
        fixture.homeClubId && homeSquadId ? fixture.homeClubId : null;
      const safeAwayClubId =
        fixture.awayClubId && awaySquadId ? fixture.awayClubId : null;

      const matchValues = {
        providerSource: "saff",
        externalMatchId,
        competitionId: competition?.id ?? null,
        competition: competition ? undefined : tournament.name,
        season,
        matchDate,
        homeClubId: safeHomeClubId,
        awayClubId: safeAwayClubId,
        homeSquadId,
        awaySquadId,
        homeTeamName: fixture.homeTeamNameEn || null,
        awayTeamName: fixture.awayTeamNameEn || null,
        homeScore: fixture.homeScore ?? null,
        awayScore: fixture.awayScore ?? null,
        venue: fixture.stadium ?? null,
        status:
          fixture.status === "completed"
            ? ("completed" as const)
            : fixture.status === "cancelled"
              ? ("cancelled" as const)
              : ("upcoming" as const),
        round: fixture.week != null ? `Week ${fixture.week}` : null,
      };

      // Find existing or create
      let match = await Match.findOne({
        where: { providerSource: "saff", externalMatchId },
      });

      if (match) {
        await match.update(matchValues);
      } else {
        match = await Match.create(matchValues);
      }

      // Backfill saff_fixtures.match_id
      if (fixture.matchId !== match.id) {
        await fixture.update({ matchId: match.id });
      }

      result.upserted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`[SAFF Bridge] Fixture ${fixture.id} failed: ${msg}`);
      result.errors.push(msg);
      result.skipped++;
    }
  }

  // Write audit row
  await SeasonSync.upsert({
    source: "saff",
    competition: tournament.name,
    competitionId: competition?.id ?? null,
    season,
    dataType: "fixtures",
    status: result.errors.length === 0 ? "completed" : "failed",
    syncedAt: new Date(),
    recordCount: result.upserted,
    errorMessage: result.errors.length > 0 ? result.errors.join("; ") : null,
  } as any);

  logger.info(
    `[SAFF Bridge] ${tournament.name} ${season}: ${result.upserted} upserted, ${result.skipped} skipped`,
  );

  return result;
}

// ══════════════════════════════════════════
// WIZARD: WRITE STAGING FROM MANUAL UPLOAD
// ══════════════════════════════════════════

/**
 * Step 2 — Upload JSON path. Persists a user-supplied payload to the
 * staging tables exactly the way fetchFromSaff() would. The payload is
 * already Zod-validated by the route handler.
 */
export async function writeStagingFromPayload(
  payload: UploadPayload,
): Promise<{ standings: number; fixtures: number; teams: number }> {
  const tournament = await SaffTournament.findOne({
    where: { saffId: payload.tournamentId },
  });
  if (!tournament) {
    throw new AppError(
      `SAFF tournament with saffId=${payload.tournamentId} not registered`,
      404,
    );
  }

  const summary = { standings: 0, fixtures: 0, teams: 0 };
  const txn = await sequelize.transaction();

  try {
    if (payload.standings.length) {
      await SaffStanding.bulkCreate(
        payload.standings.map((s) => ({
          tournamentId: tournament.id,
          season: payload.season,
          position: s.position,
          saffTeamId: s.saffTeamId,
          teamNameEn: s.teamNameEn,
          teamNameAr: s.teamNameAr || "",
          played: s.played,
          won: s.won,
          drawn: s.drawn,
          lost: s.lost,
          goalsFor: s.goalsFor,
          goalsAgainst: s.goalsAgainst,
          goalDifference: s.goalDifference,
          points: s.points,
        })),
        {
          transaction: txn,
          updateOnDuplicate: [
            "position",
            "teamNameEn",
            "teamNameAr",
            "played",
            "won",
            "drawn",
            "lost",
            "goalsFor",
            "goalsAgainst",
            "goalDifference",
            "points",
            "updatedAt",
          ],
        },
      );
      summary.standings = payload.standings.length;
    }

    if (payload.fixtures.length) {
      await SaffFixture.bulkCreate(
        payload.fixtures.map((f) => ({
          tournamentId: tournament.id,
          season: payload.season,
          matchDate: f.date,
          matchTime: f.time,
          saffHomeTeamId: f.saffHomeTeamId,
          homeTeamNameEn: f.homeTeamNameEn,
          homeTeamNameAr: f.homeTeamNameAr || "",
          saffAwayTeamId: f.saffAwayTeamId,
          awayTeamNameEn: f.awayTeamNameEn,
          awayTeamNameAr: f.awayTeamNameAr || "",
          homeScore: f.homeScore,
          awayScore: f.awayScore,
          stadium: f.stadium,
          city: f.city,
          status:
            f.homeScore !== null
              ? ("completed" as const)
              : ("upcoming" as const),
        })),
        {
          transaction: txn,
          updateOnDuplicate: [
            "matchTime",
            "homeTeamNameEn",
            "homeTeamNameAr",
            "awayTeamNameEn",
            "awayTeamNameAr",
            "homeScore",
            "awayScore",
            "stadium",
            "city",
            "status",
            "updatedAt",
          ],
        },
      );
      summary.fixtures = payload.fixtures.length;
    }

    if (payload.teams.length) {
      const saffTeamIds = payload.teams.map((t) => t.saffTeamId);
      const existingMaps = await SaffTeamMap.findAll({
        where: {
          saffTeamId: { [Op.in]: saffTeamIds },
          season: payload.season,
        },
        transaction: txn,
      });
      const existingById = new Map(existingMaps.map((m) => [m.saffTeamId, m]));

      const toCreate: Array<{
        saffTeamId: number;
        season: string;
        teamNameEn: string;
        teamNameAr: string;
      }> = [];
      for (const team of payload.teams) {
        if (!existingById.has(team.saffTeamId)) {
          toCreate.push({
            saffTeamId: team.saffTeamId,
            season: payload.season,
            teamNameEn: team.teamNameEn,
            teamNameAr: team.teamNameAr || "",
          });
        }
      }
      if (toCreate.length) {
        await SaffTeamMap.bulkCreate(toCreate, { transaction: txn });
      }
      summary.teams = payload.teams.length;
    }

    await tournament.update({ lastSyncedAt: new Date() }, { transaction: txn });

    await txn.commit();
    return summary;
  } catch (error) {
    await txn.rollback();
    throw error;
  }
}

// ══════════════════════════════════════════
// WIZARD: PREVIEW + APPLY ENGINE
// ══════════════════════════════════════════

interface RunImportPlanOptions {
  tournamentId: string; // SaffTournament UUID
  season: string;
  decisions: SessionDecisions;
  commit: boolean;
}

interface RunImportPlanResult {
  preview: PreviewPayload;
  applied: AppliedSummary | null;
}

/**
 * Single source of truth for SAFF wizard preview + apply.
 *
 * - When `commit: false` runs the entire import inside a transaction
 *   that is **always rolled back** at the end. Used by Step 4 — Review.
 * - When `commit: true` persists everything in a single transaction.
 *   Used by Step 5 — Apply.
 *
 * Decisions:
 * - decisions.teamResolutions[] resolves each unmapped SAFF team. Every
 *   team that appears in staging must have a matching resolution; any
 *   missing team becomes a `blocker` in the preview and Apply refuses.
 *
 * The function does not write `appliedAt` on the session; that's the
 * caller's responsibility.
 */
export async function runImportPlan(
  opts: RunImportPlanOptions,
): Promise<RunImportPlanResult> {
  const { tournamentId, season, decisions, commit } = opts;

  const tournament = await SaffTournament.findByPk(tournamentId);
  if (!tournament) throw new AppError("SAFF tournament not found", 404);

  // Phase 3: block unsupported tournament types (women's / futsal / beach).
  if (!tournament.isSupported) {
    throw new AppError(
      "This tournament type is not supported for import (women's / futsal / beach soccer)",
      422,
    );
  }

  // Squad context derived from tournament metadata — same for every team in this import.
  const squadContext: SquadContext = {
    ageCategory: tournament.ageCategory,
    division: tournament.division,
  };

  const teamResolutions = decisions.teamResolutions ?? [];
  const resolutionByTeamId = new Map<number, TeamResolution>();
  for (const r of teamResolutions) {
    resolutionByTeamId.set(r.saffTeamId, r);
  }

  const txn = await sequelize.transaction();

  // Preview accumulator — populated regardless of commit flag
  const preview: PreviewPayload = {
    willCreate: {
      clubs: [],
      matches: [],
      competitions: [],
      clubCompetitions: 0,
      squads: [], // Phase 3
    },
    willUpdate: { clubs: [], matches: [] },
    conflicts: [],
    blockers: [],
    unchanged: { clubs: 0, matches: 0 },
    playerLinks: { totalPlayers: 0, byClub: [] },
  };
  const summary: AppliedSummary = {
    clubsCreated: 0,
    clubsUpdated: 0,
    matchesCreated: 0,
    matchesUpdated: 0,
    competitionsCreated: 0,
    playersLinked: 0,
    skippedTeams: 0,
    squadsCreated: 0, // Phase 3
  };

  try {
    // ── 1. Resolve / create competition ──
    let competition = await Competition.findOne({
      where: { saffId: tournament.saffId },
      transaction: txn,
    });
    let competitionCreated = false;

    if (!competition) {
      competition = await Competition.create(
        {
          name: tournament.name,
          nameAr: tournament.nameAr,
          country: "Saudi Arabia",
          type: tournament.category === "pro" ? "league" : "cup",
          tier: tournament.tier,
          agencyValue: tournament.agencyValue,
          saffId: tournament.saffId,
          isActive: true,
        } as any,
        { transaction: txn },
      );
      competitionCreated = true;
      preview.willCreate.competitions.push({
        saffId: tournament.saffId,
        name: tournament.name,
      });
      summary.competitionsCreated++;
    }

    // ── 2. Gather all teams referenced by this tournament's staging ──
    const standings = await SaffStanding.findAll({
      where: { tournamentId, season },
      transaction: txn,
    });
    const fixtures = await SaffFixture.findAll({
      where: { tournamentId, season },
      transaction: txn,
    });

    const teamSet = new Set<number>();
    for (const s of standings) teamSet.add(s.saffTeamId);
    for (const f of fixtures) {
      teamSet.add(f.saffHomeTeamId);
      teamSet.add(f.saffAwayTeamId);
    }

    const teamMaps = await SaffTeamMap.findAll({
      where: {
        season,
        ...(teamSet.size > 0 ? { saffTeamId: { [Op.in]: [...teamSet] } } : {}),
      },
      transaction: txn,
    });
    const teamMapById = new Map(teamMaps.map((tm) => [tm.saffTeamId, tm]));

    // ── 3. Apply team resolutions, build effective clubId + squadId per saffTeamId ──
    const effectiveClubByTeamId = new Map<number, string>();
    const effectiveSquadByTeamId = new Map<number, string>(); // Phase 3
    const skippedTeams = new Set<number>();

    for (const saffTeamId of teamSet) {
      const tm = teamMapById.get(saffTeamId);
      const teamNameEn = tm?.teamNameEn ?? `Team ${saffTeamId}`;
      const teamNameAr = tm?.teamNameAr ?? "";

      // If team is already mapped to a club, that takes precedence over
      // any decision (mapping is a separate, pre-import action).
      if (tm?.clubId) {
        effectiveClubByTeamId.set(saffTeamId, tm.clubId);
        const [squad, wasCreated] = await findOrCreateSquad(
          tm.clubId,
          squadContext,
          txn,
        );
        effectiveSquadByTeamId.set(saffTeamId, squad.id);
        if (wasCreated) {
          preview.willCreate.squads.push({
            clubId: tm.clubId,
            displayName: squad.displayName,
            ageCategory: squad.ageCategory,
          });
          summary.squadsCreated++;
        }
        if (tm && !tm.squadId) {
          await tm.update({ squadId: squad.id }, { transaction: txn });
        }
        continue;
      }

      const resolution = resolutionByTeamId.get(saffTeamId);
      if (!resolution) {
        preview.blockers.push({
          type: "unmapped-team",
          saffTeamId,
          teamNameEn,
          teamNameAr,
        });
        continue;
      }

      if (resolution.action === "skip") {
        skippedTeams.add(saffTeamId);
        summary.skippedTeams++;
        continue;
      }

      if (resolution.action === "map") {
        const club = await Club.findByPk(resolution.clubId, {
          transaction: txn,
        });
        if (!club) {
          preview.blockers.push({
            type: "unmapped-team",
            saffTeamId,
            teamNameEn: `${teamNameEn} (target club not found)`,
            teamNameAr,
          });
          continue;
        }
        effectiveClubByTeamId.set(saffTeamId, club.id);

        const [squad, wasCreated] = await findOrCreateSquad(
          club.id,
          squadContext,
          txn,
        );
        effectiveSquadByTeamId.set(saffTeamId, squad.id);
        if (wasCreated) {
          preview.willCreate.squads.push({
            clubId: club.id,
            displayName: squad.displayName,
            ageCategory: squad.ageCategory,
          });
          summary.squadsCreated++;
        }

        if (tm) {
          await tm.update(
            { clubId: club.id, squadId: squad.id },
            { transaction: txn },
          );
        }
        if (!club.saffTeamId) {
          await club.update({ saffTeamId }, { transaction: txn });
        }
        continue;
      }

      if (resolution.action === "create") {
        const newClub = await Club.create(
          {
            name: resolution.newClubData.name,
            nameAr: resolution.newClubData.nameAr,
            type: "Club" as const,
            country: "Saudi Arabia",
            city: resolution.newClubData.city,
            league: resolution.newClubData.league ?? tournament.name,
            saffTeamId,
          } as any,
          { transaction: txn },
        );
        effectiveClubByTeamId.set(saffTeamId, newClub.id);
        preview.willCreate.clubs.push({
          saffTeamId,
          name: resolution.newClubData.name,
          nameAr: resolution.newClubData.nameAr,
        });
        summary.clubsCreated++;

        const [squad, wasCreated] = await findOrCreateSquad(
          newClub.id,
          squadContext,
          txn,
        );
        effectiveSquadByTeamId.set(saffTeamId, squad.id);
        if (wasCreated) {
          preview.willCreate.squads.push({
            clubId: newClub.id,
            displayName: squad.displayName,
            ageCategory: squad.ageCategory,
          });
          summary.squadsCreated++;
        }

        if (tm) {
          await tm.update(
            { clubId: newClub.id, squadId: squad.id },
            { transaction: txn },
          );
        } else {
          await SaffTeamMap.create(
            {
              saffTeamId,
              season,
              teamNameEn: resolution.newClubData.name,
              teamNameAr: resolution.newClubData.nameAr,
              clubId: newClub.id,
              squadId: squad.id,
            },
            { transaction: txn },
          );
        }
      }
    }

    // Build reverse-lookup: clubId → squadId (Phase 3, used when creating match_players)
    const squadByClubId = new Map<string, string>();
    for (const [tid, clubId] of effectiveClubByTeamId) {
      const squadId = effectiveSquadByTeamId.get(tid);
      if (squadId) squadByClubId.set(clubId, squadId);
    }

    // ── 4. Enroll clubs in competition for this season ──
    const allEffectiveClubIds = [...new Set(effectiveClubByTeamId.values())];

    for (const clubId of allEffectiveClubIds) {
      if (competition.type === "league") {
        const existing = await findExistingLeagueEnrollment(
          clubId,
          season,
          competition.format,
          competition.gender,
          competition.ageGroup,
          competition.id,
          txn,
        );
        if (existing) {
          await existing.destroy({ transaction: txn });
        }
      }
      const [, created] = await ClubCompetition.findOrCreate({
        where: { clubId, competitionId: competition.id, season },
        defaults: { clubId, competitionId: competition.id, season },
        transaction: txn,
      });
      if (created) preview.willCreate.clubCompetitions++;
    }

    // ── 5. Build match plan from fixtures ──
    if (allEffectiveClubIds.length) {
      const existingMatches = await Match.findAll({
        where: {
          season,
          homeClubId: { [Op.in]: allEffectiveClubIds },
        },
        attributes: [
          "id",
          "homeClubId",
          "awayClubId",
          "matchDate",
          "homeScore",
          "competitionId",
        ],
        transaction: txn,
      });
      const toDateOnly = (d: Date | string): string => {
        if (d instanceof Date) return d.toISOString().split("T")[0];
        return String(d).split("T")[0];
      };
      const matchByDedupKey = new Map(
        existingMatches.map((m) => [
          `${m.homeClubId}|${m.awayClubId}|${toDateOnly(m.matchDate)}`,
          m,
        ]),
      );

      for (const fixture of fixtures) {
        if (
          skippedTeams.has(fixture.saffHomeTeamId) ||
          skippedTeams.has(fixture.saffAwayTeamId)
        ) {
          continue;
        }
        const homeClubId = effectiveClubByTeamId.get(fixture.saffHomeTeamId);
        const awayClubId = effectiveClubByTeamId.get(fixture.saffAwayTeamId);
        if (!homeClubId || !awayClubId) continue;

        const matchDateStr = fixture.matchDate;
        const dedupKey = `${homeClubId}|${awayClubId}|${matchDateStr}`;
        const existing = matchByDedupKey.get(dedupKey);

        if (existing) {
          const updates: string[] = [];
          if (fixture.homeScore !== null && existing.homeScore === null) {
            updates.push("homeScore", "awayScore", "status");
            await existing.update(
              {
                homeScore: fixture.homeScore,
                awayScore: fixture.awayScore,
                status: "completed",
              },
              { transaction: txn },
            );
          }
          if (!existing.competitionId) {
            updates.push("competitionId");
            await existing.update(
              { competitionId: competition.id },
              { transaction: txn },
            );
          }
          if (updates.length) {
            preview.willUpdate.matches.push({
              id: existing.id,
              fields: updates,
            });
            summary.matchesUpdated++;
          } else {
            preview.unchanged.matches++;
          }
          await fixture.update(
            { matchId: existing.id, homeClubId, awayClubId },
            { transaction: txn },
          );
        } else {
          const matchDate = new Date(
            `${matchDateStr}T${fixture.matchTime ?? "00:00"}:00Z`,
          );
          const externalMatchId = `saff:${tournament.saffId}:${fixture.saffHomeTeamId}-${fixture.saffAwayTeamId}:${matchDateStr}`;
          const newMatch = await Match.create(
            {
              homeClubId,
              awayClubId,
              homeSquadId:
                effectiveSquadByTeamId.get(fixture.saffHomeTeamId) ?? null,
              awaySquadId:
                effectiveSquadByTeamId.get(fixture.saffAwayTeamId) ?? null,
              competitionId: competition.id,
              competition: tournament.name,
              season,
              matchDate,
              venue: fixture.stadium ?? null,
              status: fixture.status === "completed" ? "completed" : "upcoming",
              homeScore: fixture.homeScore ?? null,
              awayScore: fixture.awayScore ?? null,
              homeTeamName: fixture.homeTeamNameEn || null,
              awayTeamName: fixture.awayTeamNameEn || null,
              providerSource: "saff",
              externalMatchId,
            } as any,
            { transaction: txn },
          );
          await fixture.update(
            { matchId: newMatch.id, homeClubId, awayClubId },
            { transaction: txn },
          );
          preview.willCreate.matches.push({
            saffHomeTeamId: fixture.saffHomeTeamId,
            saffAwayTeamId: fixture.saffAwayTeamId,
            matchDate: matchDateStr,
          });
          summary.matchesCreated++;
        }
      }
    }

    // ── 6. Compute player linkage (counts always; persist on commit) ──
    const today = new Date().toISOString().split("T")[0];
    if (allEffectiveClubIds.length) {
      const managedPlayers = await Player.findAll({
        where: {
          currentClubId: { [Op.in]: allEffectiveClubIds },
          status: "active",
        },
        include: [
          {
            model: Contract,
            as: "contracts",
            where: {
              status: "Active",
              endDate: { [Op.gte]: today },
            },
            required: true,
            attributes: ["id"],
          },
        ],
        attributes: [
          "id",
          "firstName",
          "lastName",
          "firstNameAr",
          "lastNameAr",
          "currentClubId",
        ],
        transaction: txn,
      });

      const playersByClub = new Map<string, typeof managedPlayers>();
      for (const p of managedPlayers) {
        const clubId = (p as any).currentClubId as string;
        if (!playersByClub.has(clubId)) playersByClub.set(clubId, []);
        playersByClub.get(clubId)!.push(p);
      }

      const clubsForPanel = await Club.findAll({
        where: { id: { [Op.in]: allEffectiveClubIds } },
        attributes: ["id", "name", "nameAr"],
        transaction: txn,
      });
      const clubLookup = new Map(clubsForPanel.map((c) => [c.id, c]));

      for (const [clubId, players] of playersByClub) {
        const club = clubLookup.get(clubId);
        preview.playerLinks.byClub.push({
          clubId,
          name: club?.name ?? "Unknown",
          playerCount: players.length,
          players: players.map((p) => ({
            id: p.id,
            name: `${p.firstName} ${p.lastName}`,
            nameAr:
              p.firstNameAr && p.lastNameAr
                ? `${p.firstNameAr} ${p.lastNameAr}`
                : null,
          })),
        });
        preview.playerLinks.totalPlayers += players.length;
      }

      // Persist match_players for newly imported matches
      if (commit) {
        const involvedFixtures = await SaffFixture.findAll({
          where: {
            tournamentId,
            season,
            matchId: { [Op.ne]: null },
          },
          transaction: txn,
        });
        for (const fixture of involvedFixtures) {
          if (!fixture.matchId || !fixture.homeClubId || !fixture.awayClubId)
            continue;
          if (
            skippedTeams.has(fixture.saffHomeTeamId) ||
            skippedTeams.has(fixture.saffAwayTeamId)
          )
            continue;
          const players = [
            ...(playersByClub.get(fixture.homeClubId) || []),
            ...(playersByClub.get(fixture.awayClubId) || []),
          ];
          for (const player of players) {
            const playerClubId = (player as any).currentClubId as string;
            const [, created] = await MatchPlayer.findOrCreate({
              where: { matchId: fixture.matchId, playerId: player.id },
              defaults: {
                matchId: fixture.matchId,
                playerId: player.id,
                availability: "not_called",
                squadId: squadByClubId.get(playerClubId) ?? null, // Phase 3
              },
              transaction: txn,
            });
            if (created) summary.playersLinked++;
          }
        }
      }
    }

    if (commit) {
      // If there are blockers, refuse to commit — caller should have caught
      // this at the preview step.
      if (preview.blockers.length > 0) {
        await txn.rollback();
        throw new AppError(
          `Cannot apply: ${preview.blockers.length} unmapped teams`,
          422,
        );
      }
      await txn.commit();
      return { preview, applied: summary };
    }

    // Preview path — always roll back so nothing persists
    await txn.rollback();
    return { preview, applied: null };
  } catch (error) {
    try {
      await txn.rollback();
    } catch {
      /* rollback may fail if connection is dead */
    }
    throw error;
  }
}

// ══════════════════════════════════════════
// WIZARD: STAGE-ONLY SYNC (cron entrypoint)
// ══════════════════════════════════════════

/**
 * Refreshes staging tables only — never touches clubs/matches/competitions.
 * Wired into the cron scheduler (see saff.scheduler.ts) so the Browse views
 * stay current. To commit data into Sadara, a human must run the wizard.
 */
export async function runStageOnlySync(
  agencyValues: string[],
  season: string = getCurrentSeason(),
): Promise<{
  tournaments: number;
  standings: number;
  fixtures: number;
  teams: number;
}> {
  const tournamentsResult = await listTournaments({ limit: 50, page: 1 });
  const targetTournaments = tournamentsResult.data.filter(
    (t: any) => agencyValues.includes(t.agencyValue) && t.isActive,
  );
  if (!targetTournaments.length) {
    return { tournaments: 0, standings: 0, fixtures: 0, teams: 0 };
  }
  const result = await fetchFromSaff({
    tournamentIds: targetTournaments.map((t: any) => t.saffId),
    season,
    dataTypes: ["standings", "fixtures", "teams"],
  });
  return {
    tournaments: result.results,
    standings: result.standings,
    fixtures: result.fixtures,
    teams: result.teams,
  };
}
