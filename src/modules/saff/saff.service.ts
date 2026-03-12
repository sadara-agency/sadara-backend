import { Op } from "sequelize";
import {
  SaffTournament,
  SaffStanding,
  SaffFixture,
  SaffTeamMap,
} from "@modules/saff/saff.model";
import { Club } from "@modules/clubs/club.model";
import { Match } from "@modules/matches/match.model";
import { sequelize } from "@config/database";
import { AppError } from "@middleware/errorHandler";
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
} from "@modules/saff/saff.schema";

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
      // ── Store standings ──
      if (dataTypes.includes("standings") && result.standings.length) {
        // Delete existing standings for this tournament+season
        await SaffStanding.destroy({
          where: { tournamentId: tournament.id, season },
          transaction: txn,
        });

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
          { transaction: txn },
        );
        summary.standings += result.standings.length;
      }

      // ── Store fixtures ──
      if (dataTypes.includes("fixtures") && result.fixtures.length) {
        await SaffFixture.destroy({
          where: { tournamentId: tournament.id, season },
          transaction: txn,
        });

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
          { transaction: txn },
        );
        summary.fixtures += result.fixtures.length;
      }

      // ── Store team mappings ──
      if (dataTypes.includes("teams") && result.teams.length) {
        for (const team of result.teams) {
          const [teamMap, created] = await SaffTeamMap.findOrCreate({
            where: { saffTeamId: team.saffTeamId, season },
            defaults: {
              saffTeamId: team.saffTeamId,
              season,
              teamNameEn: team.teamNameEn,
              teamNameAr: team.teamNameAr || "",
            },
            transaction: txn,
          });
          // Update Arabic name if it was missing and we now have it
          if (!created && !teamMap.teamNameAr && team.teamNameAr) {
            await teamMap.update(
              { teamNameAr: team.teamNameAr },
              { transaction: txn },
            );
          }
        }
        summary.teams += result.teams.length;
      }

      // Update last synced
      await tournament.update(
        { lastSyncedAt: new Date() },
        { transaction: txn },
      );

      await txn.commit();
    } catch (error) {
      await txn.rollback();
      throw error;
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

  const [teamMap] = await SaffTeamMap.findOrCreate({
    where: { saffTeamId: input.saffTeamId, season: input.season },
    defaults: {
      saffTeamId: input.saffTeamId,
      season: input.season,
      teamNameEn: club.name,
      teamNameAr: club.nameAr || "",
      clubId: input.clubId,
    },
  });

  await teamMap.update({ clubId: input.clubId });

  // Also update any existing standings/fixtures with this team
  await SaffStanding.update(
    { clubId: input.clubId },
    { where: { saffTeamId: input.saffTeamId, season: input.season } },
  );

  await SaffFixture.update(
    { homeClubId: input.clubId },
    { where: { saffHomeTeamId: input.saffTeamId, season: input.season } },
  );

  await SaffFixture.update(
    { awayClubId: input.clubId },
    { where: { saffAwayTeamId: input.saffTeamId, season: input.season } },
  );

  return teamMap;
}

// ══════════════════════════════════════════
// IMPORT TO CORE SADARA TABLES
// ══════════════════════════════════════════

export async function importToSadara(input: ImportRequest) {
  const { tournamentIds, season, importTypes } = input;

  const tournaments = await SaffTournament.findAll({
    where: { saffId: { [Op.in]: tournamentIds } },
  });

  const summary = { clubs: 0, matches: 0, standings: 0 };

  for (const tournament of tournaments) {
    // ── Import clubs ──
    if (importTypes.includes("clubs")) {
      const teamMaps = await SaffTeamMap.findAll({
        where: { season, clubId: null },
      });

      for (const tm of teamMaps) {
        // Also check for soft-deleted clubs and reactivate if found
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
        });

        // Fill Arabic name if club exists but has no Arabic name
        if (!created && !club.nameAr && tm.teamNameAr) {
          await club.update({ nameAr: tm.teamNameAr });
        }

        // Reactivate if club was soft-deleted
        if (!created && !club.isActive) {
          await club.update({ isActive: true });
        }

        await tm.update({ clubId: club.id });
        if (created) summary.clubs++;
      }
    }

    // ── Import matches (with deduplication) ──
    if (importTypes.includes("matches")) {
      const fixtures = await SaffFixture.findAll({
        where: { tournamentId: tournament.id, season, matchId: null },
      });

      for (const fixture of fixtures) {
        // Only import if both teams are mapped
        const homeMap = await SaffTeamMap.findOne({
          where: { saffTeamId: fixture.saffHomeTeamId, season },
        });
        const awayMap = await SaffTeamMap.findOne({
          where: { saffTeamId: fixture.saffAwayTeamId, season },
        });

        if (homeMap?.clubId && awayMap?.clubId) {
          // Check for existing match to prevent duplicates
          const existingMatch = await Match.findOne({
            where: {
              homeClubId: homeMap.clubId,
              awayClubId: awayMap.clubId,
              matchDate: fixture.matchDate,
              season,
            },
          });

          if (existingMatch) {
            // Link fixture to existing match
            await fixture.update({ matchId: existingMatch.id });
            // Update score if SAFF has one and existing match doesn't
            if (
              fixture.homeScore !== null &&
              existingMatch.homeScore === null
            ) {
              await existingMatch.update({
                homeScore: fixture.homeScore,
                awayScore: fixture.awayScore,
                status: "completed",
              });
            }
          } else {
            const match = await Match.create({
              homeClubId: homeMap.clubId,
              awayClubId: awayMap.clubId,
              competition: tournament.name,
              season,
              matchDate: fixture.matchDate,
              venue: fixture.stadium || undefined,
              status: fixture.status === "completed" ? "completed" : "upcoming",
              homeScore: fixture.homeScore ?? undefined,
              awayScore: fixture.awayScore ?? undefined,
              createdBy: "system",
            } as any);

            await fixture.update({ matchId: match.id });
            summary.matches++;
          }
        }
      }
    }
  }

  return summary;
}

// ══════════════════════════════════════════
// FETCH TEAM LOGOS
// ══════════════════════════════════════════

export async function fetchTeamLogos(season: string) {
  // Get all team maps that don't have a logo yet
  const teamMaps = await SaffTeamMap.findAll({
    where: { season, logoUrl: null },
  });

  if (teamMaps.length === 0) return { fetched: 0 };

  const saffTeamIds = teamMaps.map((tm) => tm.saffTeamId);
  const logos = await scrapeTeamLogos(saffTeamIds);

  let updated = 0;
  for (const tm of teamMaps) {
    const logo = logos.get(tm.saffTeamId);
    if (logo) {
      await tm.update({ logoUrl: logo });
      // Also update the linked club's logo if it exists and has no logo
      if (tm.clubId) {
        const club = await Club.findByPk(tm.clubId);
        if (club && !club.logoUrl) {
          await club.update({ logoUrl: logo });
        }
      }
      updated++;
    }
  }

  return { fetched: updated, total: teamMaps.length };
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
