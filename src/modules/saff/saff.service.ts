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
import { Watchlist } from "@modules/scouting/scouting.model";
import { sequelize } from "@config/database";
import { AppError } from "@middleware/errorHandler";
import { logger } from "@config/logger";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import {
  scrapeBatch,
  scrapeTeamLogos,
  type ScrapeResult,
} from "@modules/saff/saff.scraper";
import type {
  TournamentQuery,
  FetchRequest,
  StandingQuery,
  FixtureQuery,
  TeamMapQuery,
  MapTeamInput,
  ImportRequest,
} from "@modules/saff/saff.validation";

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════

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
  {
    saffId: 345,
    name: "Women's Premier League",
    nameAr: "الدوري النسائي الممتاز",
    category: "women",
    tier: 1,
    agencyValue: "High",
    icon: "⚽",
  },
  {
    saffId: 361,
    name: "SAFF Women's Cup",
    nameAr: "كأس الاتحاد النسائي",
    category: "women",
    tier: 1,
    agencyValue: "High",
    icon: "🏆",
  },
  {
    saffId: 322,
    name: "Saudi Women's Super Cup",
    nameAr: "كأس السوبر النسائي",
    category: "women",
    tier: 1,
    agencyValue: "Medium",
    icon: "⭐",
  },
  {
    saffId: 385,
    name: "Women's Premier Challenge Cup",
    nameAr: "كأس تحدي الدوري الممتاز",
    category: "women",
    tier: 2,
    agencyValue: "Medium",
    icon: "🏆",
  },
  {
    saffId: 346,
    name: "Women's 1st Div. League",
    nameAr: "الدوري النسائي الأولى",
    category: "women",
    tier: 2,
    agencyValue: "Medium",
    icon: "⚽",
  },
  {
    saffId: 372,
    name: "Women's 2nd Div. League",
    nameAr: "الدوري النسائي الثانية",
    category: "women",
    tier: 3,
    agencyValue: "Low",
    icon: "⚽",
  },
  {
    saffId: 347,
    name: "Women's Premier League U-17",
    nameAr: "الدوري النسائي تحت 17",
    category: "women",
    tier: 2,
    agencyValue: "Medium",
    icon: "🌟",
  },
  {
    saffId: 384,
    name: "Saudi Girls U-17 1st Div.",
    nameAr: "دوري الأولى للبنات تحت 17",
    category: "women",
    tier: 3,
    agencyValue: "Low",
    icon: "🌟",
  },
  {
    saffId: 374,
    name: "SAFF Girl's U-15 Tournament",
    nameAr: "بطولة الاتحاد للبنات تحت 15",
    category: "women",
    tier: 3,
    agencyValue: "Scouting",
    icon: "🌱",
  },
  {
    saffId: 299,
    name: "Women's Futsal Tournament",
    nameAr: "بطولة كرة الصالات النسائية",
    category: "women",
    tier: 2,
    agencyValue: "Low",
    icon: "🏠",
  },
  {
    saffId: 362,
    name: "Saudi Futsal League",
    nameAr: "دوري كرة الصالات",
    category: "futsal",
    tier: 1,
    agencyValue: "Medium",
    icon: "🏠",
  },
  {
    saffId: 314,
    name: "Saudi Futsal League 1st Div.",
    nameAr: "دوري الصالات الأولى",
    category: "futsal",
    tier: 2,
    agencyValue: "Low",
    icon: "🏠",
  },
  {
    saffId: 396,
    name: "SAFF Futsal Cup",
    nameAr: "كأس الاتحاد للصالات",
    category: "futsal",
    tier: 1,
    agencyValue: "Low",
    icon: "🏆",
  },
  {
    saffId: 394,
    name: "Saudi Super Futsal Cup",
    nameAr: "كأس السوبر للصالات",
    category: "futsal",
    tier: 1,
    agencyValue: "Low",
    icon: "⭐",
  },
  {
    saffId: 395,
    name: "Saudi Futsal League U-20",
    nameAr: "دوري الصالات تحت 20",
    category: "futsal",
    tier: 2,
    agencyValue: "Low",
    icon: "🌟",
  },
  {
    saffId: 380,
    name: "Saudi Beach Soccer Premier League",
    nameAr: "دوري كرة الشاطئ الممتاز",
    category: "beach",
    tier: 1,
    agencyValue: "Low",
    icon: "🏖️",
  },
  {
    saffId: 318,
    name: "Beach Soccer 1st Div. League",
    nameAr: "دوري كرة الشاطئ الأولى",
    category: "beach",
    tier: 2,
    agencyValue: "Low",
    icon: "🏖️",
  },
  {
    saffId: 174,
    name: "Kingdom eCup",
    nameAr: "كأس المملكة الإلكتروني",
    category: "esports",
    tier: 1,
    agencyValue: "Niche",
    icon: "🎮",
  },
];

// ── Seed tournaments ──

export async function seedTournaments(): Promise<number> {
  let count = 0;
  for (const t of TOURNAMENT_SEED) {
    const [, created] = await SaffTournament.findOrCreate({
      where: { saffId: t.saffId },
      defaults: t as any,
    });
    if (created) count++;
  }
  return count;
}

// ── List tournaments ──

export async function listTournaments(query: TournamentQuery) {
  const { limit, offset, page } = parsePagination(query, "tier");
  const where: any = { isActive: true };

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

  // Run scraper
  const results = await scrapeBatch(tournamentIds, season);

  // Store results
  const summary = { standings: 0, fixtures: 0, teams: 0 };

  for (const result of results) {
    const tournament = tournamentMap.get(result.tournamentId);
    if (!tournament) continue;

    const txn = await sequelize.transaction();

    try {
      // ── Store standings (UPSERT — preserves clubId mappings) ──
      if (dataTypes.includes("standings") && result.standings.length) {
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
      }

      // ── Store fixtures (UPSERT — preserves homeClubId, awayClubId, matchId mappings) ──
      if (dataTypes.includes("fixtures") && result.fixtures.length) {
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
            status: f.homeScore !== null ? "completed" : "upcoming",
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
      }

      // ── Store team mappings (batched) ──
      if (dataTypes.includes("teams") && result.teams.length) {
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
      }

      // Update last synced
      await tournament.update(
        { lastSyncedAt: new Date() },
        { transaction: txn },
      );

      await txn.commit();
    } catch (error: any) {
      try {
        await txn.rollback();
      } catch {
        /* rollback may fail if connection is dead */
      }
      logger.error(
        `[SAFF Service] fetchFromSaff failed for tournament ${result.tournamentId}: ${error.message}`,
      );
      // Continue to next tournament instead of aborting entire batch
    }
  }

  return { results: results.length, ...summary };
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
            isActive: true,
          } as any,
          transaction: txn,
        });
      }

      // ── Import clubs ──
      if (importTypes.includes("clubs")) {
        const teamMaps = await SaffTeamMap.findAll({
          where: { season, clubId: null },
          transaction: txn,
        });

        for (const tm of teamMaps) {
          const [club, created] = await Club.findOrCreate({
            where: { name: tm.teamNameEn },
            defaults: {
              name: tm.teamNameEn,
              nameAr: tm.teamNameAr,
              type: "Club" as const,
              country: "Saudi Arabia",
              city: tm.city || undefined,
              league: tournament.name,
            },
            transaction: txn,
          });

          if (!created && !club.nameAr && tm.teamNameAr) {
            await club.update({ nameAr: tm.teamNameAr }, { transaction: txn });
          }
          if (!created && !club.isActive) {
            await club.update({ isActive: true }, { transaction: txn });
          }

          await tm.update({ clubId: club.id }, { transaction: txn });
          if (created) summary.clubs++;

          // ── Enroll club in competition for this season ──
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
              const match = await Match.create({
                homeClubId: homeMap.clubId,
                awayClubId: awayMap.clubId,
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
// BULK FETCH — 5 MEN'S PRO LEAGUES
// ══════════════════════════════════════════

/** SAFF IDs for the 5 men's pro leagues (tier 1-5). */
const MEN_LEAGUE_SAFF_IDS = [333, 334, 335, 336, 366];

/**
 * One-shot bulk fetch + import for all 5 men's pro leagues.
 * Calls fetchFromSaff() then importToSadara() for the given season.
 */
export async function bulkFetchMenLeagues(season: string) {
  const fetchResult = await fetchFromSaff({
    tournamentIds: MEN_LEAGUE_SAFF_IDS,
    season,
    dataTypes: ["standings", "fixtures", "teams"],
  });

  const importResult = await importToSadara({
    tournamentIds: MEN_LEAGUE_SAFF_IDS,
    season,
    importTypes: ["clubs", "matches", "standings"],
  });

  // Fetch logos after import
  const logoResult = await fetchTeamLogos(season);

  return {
    season,
    leagues: MEN_LEAGUE_SAFF_IDS.length,
    fetch: fetchResult,
    import: importResult,
    logos: logoResult,
  };
}

// ══════════════════════════════════════════
// STATISTICS
// ══════════════════════════════════════════

export async function getStats() {
  const [tournaments, standings, fixtures, teamMaps, unmapped] =
    await Promise.all([
      SaffTournament.count({ where: { isActive: true } }),
      SaffStanding.count(),
      SaffFixture.count(),
      SaffTeamMap.count(),
      SaffTeamMap.count({ where: { clubId: null } }),
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
