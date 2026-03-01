"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedTournaments = seedTournaments;
exports.listTournaments = listTournaments;
exports.fetchFromSaff = fetchFromSaff;
exports.listStandings = listStandings;
exports.listFixtures = listFixtures;
exports.listTeamMaps = listTeamMaps;
exports.mapTeamToClub = mapTeamToClub;
exports.importToSadara = importToSadara;
exports.getStats = getStats;
const sequelize_1 = require("sequelize");
const saff_model_1 = require("./saff.model");
const club_model_1 = require("../clubs/club.model");
const match_model_1 = require("../matches/match.model");
const database_1 = require("../../config/database");
const errorHandler_1 = require("../../middleware/errorHandler");
const pagination_1 = require("../../shared/utils/pagination");
const saff_scraper_1 = require("./saff.scraper");
// ══════════════════════════════════════════
// TOURNAMENT CATALOG
// ══════════════════════════════════════════
// Complete tournament definitions from saff.com.sa/en/championships.php
const TOURNAMENT_SEED = [
    { saffId: 333, name: "Roshn Saudi League", nameAr: "دوري روشن السعودي", category: "pro", tier: 1, agencyValue: "Critical", icon: "🏟️" },
    { saffId: 342, name: "King Cup", nameAr: "كأس الملك", category: "pro", tier: 1, agencyValue: "High", icon: "🏆" },
    { saffId: 329, name: "Saudi Super Cup", nameAr: "كأس السوبر السعودي", category: "pro", tier: 1, agencyValue: "High", icon: "⭐" },
    { saffId: 334, name: "Saudi League 1st Division", nameAr: "دوري الدرجة الأولى", category: "pro", tier: 2, agencyValue: "High", icon: "🏟️" },
    { saffId: 335, name: "Second Division League", nameAr: "دوري الدرجة الثانية", category: "pro", tier: 3, agencyValue: "Medium", icon: "🏟️" },
    { saffId: 336, name: "Saudi League 3rd Division", nameAr: "دوري الدرجة الثالثة", category: "pro", tier: 4, agencyValue: "Medium", icon: "🏟️" },
    { saffId: 366, name: "Saudi League 4th Division", nameAr: "دوري الدرجة الرابعة", category: "pro", tier: 5, agencyValue: "Low", icon: "🏟️" },
    { saffId: 350, name: "Jawwy Elite League U-21", nameAr: "دوري جوي النخبة تحت 21", category: "youth", tier: 1, agencyValue: "Critical", icon: "🌟" },
    { saffId: 351, name: "Saudi U-18 Premier League", nameAr: "الدوري الممتاز تحت 18", category: "youth", tier: 1, agencyValue: "Critical", icon: "🌟" },
    { saffId: 352, name: "Saudi U-17 Premier League", nameAr: "الدوري الممتاز تحت 17", category: "youth", tier: 1, agencyValue: "High", icon: "🌟" },
    { saffId: 353, name: "Saudi U-16 Premier League", nameAr: "الدوري الممتاز تحت 16", category: "youth", tier: 1, agencyValue: "High", icon: "🌟" },
    { saffId: 354, name: "Saudi U-15 Premier League", nameAr: "الدوري الممتاز تحت 15", category: "youth", tier: 1, agencyValue: "Medium", icon: "🌟" },
    { saffId: 371, name: "Saudi U-21 League Div.1", nameAr: "دوري الأولى تحت 21", category: "youth-d1", tier: 2, agencyValue: "Medium", icon: "📋" },
    { saffId: 355, name: "Saudi U-18 League Div.1", nameAr: "دوري الأولى تحت 18", category: "youth-d1", tier: 2, agencyValue: "Medium", icon: "📋" },
    { saffId: 356, name: "Saudi U-17 League Div.1", nameAr: "دوري الأولى تحت 17", category: "youth-d1", tier: 2, agencyValue: "Medium", icon: "📋" },
    { saffId: 357, name: "Saudi U-16 League Div.1", nameAr: "دوري الأولى تحت 16", category: "youth-d1", tier: 2, agencyValue: "Low", icon: "📋" },
    { saffId: 358, name: "Saudi U-15 League Div.1", nameAr: "دوري الأولى تحت 15", category: "youth-d1", tier: 2, agencyValue: "Low", icon: "📋" },
    { saffId: 367, name: "Saudi U-18 League Div.2", nameAr: "دوري الثانية تحت 18", category: "youth-d2", tier: 3, agencyValue: "Low", icon: "🔍" },
    { saffId: 368, name: "Saudi U-17 League Div.2", nameAr: "دوري الثانية تحت 17", category: "youth-d2", tier: 3, agencyValue: "Low", icon: "🔍" },
    { saffId: 369, name: "Saudi U-16 League Div.2", nameAr: "دوري الثانية تحت 16", category: "youth-d2", tier: 3, agencyValue: "Low", icon: "🔍" },
    { saffId: 370, name: "Saudi U-15 League Div.2", nameAr: "دوري الثانية تحت 15", category: "youth-d2", tier: 3, agencyValue: "Low", icon: "🔍" },
    { saffId: 341, name: "Saudi U-14 Regional Tournament", nameAr: "بطولة المناطق تحت 14", category: "grassroots", tier: 4, agencyValue: "Scouting", icon: "🌱" },
    { saffId: 331, name: "Saudi U-13 Regional Tournament", nameAr: "بطولة المناطق تحت 13", category: "grassroots", tier: 4, agencyValue: "Scouting", icon: "🌱" },
    { saffId: 386, name: "League U14", nameAr: "دوري تحت 14", category: "grassroots", tier: 4, agencyValue: "Scouting", icon: "🌱" },
    { saffId: 387, name: "League U13", nameAr: "دوري تحت 13", category: "grassroots", tier: 4, agencyValue: "Scouting", icon: "🌱" },
    { saffId: 388, name: "League U12", nameAr: "دوري تحت 12", category: "grassroots", tier: 5, agencyValue: "Scouting", icon: "🌱" },
    { saffId: 389, name: "League U11", nameAr: "دوري تحت 11", category: "grassroots", tier: 5, agencyValue: "Scouting", icon: "🌱" },
    { saffId: 345, name: "Women's Premier League", nameAr: "الدوري النسائي الممتاز", category: "women", tier: 1, agencyValue: "High", icon: "⚽" },
    { saffId: 361, name: "SAFF Women's Cup", nameAr: "كأس الاتحاد النسائي", category: "women", tier: 1, agencyValue: "High", icon: "🏆" },
    { saffId: 322, name: "Saudi Women's Super Cup", nameAr: "كأس السوبر النسائي", category: "women", tier: 1, agencyValue: "Medium", icon: "⭐" },
    { saffId: 385, name: "Women's Premier Challenge Cup", nameAr: "كأس تحدي الدوري الممتاز", category: "women", tier: 2, agencyValue: "Medium", icon: "🏆" },
    { saffId: 346, name: "Women's 1st Div. League", nameAr: "الدوري النسائي الأولى", category: "women", tier: 2, agencyValue: "Medium", icon: "⚽" },
    { saffId: 372, name: "Women's 2nd Div. League", nameAr: "الدوري النسائي الثانية", category: "women", tier: 3, agencyValue: "Low", icon: "⚽" },
    { saffId: 347, name: "Women's Premier League U-17", nameAr: "الدوري النسائي تحت 17", category: "women", tier: 2, agencyValue: "Medium", icon: "🌟" },
    { saffId: 384, name: "Saudi Girls U-17 1st Div.", nameAr: "دوري الأولى للبنات تحت 17", category: "women", tier: 3, agencyValue: "Low", icon: "🌟" },
    { saffId: 374, name: "SAFF Girl's U-15 Tournament", nameAr: "بطولة الاتحاد للبنات تحت 15", category: "women", tier: 3, agencyValue: "Scouting", icon: "🌱" },
    { saffId: 299, name: "Women's Futsal Tournament", nameAr: "بطولة كرة الصالات النسائية", category: "women", tier: 2, agencyValue: "Low", icon: "🏠" },
    { saffId: 362, name: "Saudi Futsal League", nameAr: "دوري كرة الصالات", category: "futsal", tier: 1, agencyValue: "Medium", icon: "🏠" },
    { saffId: 314, name: "Saudi Futsal League 1st Div.", nameAr: "دوري الصالات الأولى", category: "futsal", tier: 2, agencyValue: "Low", icon: "🏠" },
    { saffId: 396, name: "SAFF Futsal Cup", nameAr: "كأس الاتحاد للصالات", category: "futsal", tier: 1, agencyValue: "Low", icon: "🏆" },
    { saffId: 394, name: "Saudi Super Futsal Cup", nameAr: "كأس السوبر للصالات", category: "futsal", tier: 1, agencyValue: "Low", icon: "⭐" },
    { saffId: 395, name: "Saudi Futsal League U-20", nameAr: "دوري الصالات تحت 20", category: "futsal", tier: 2, agencyValue: "Low", icon: "🌟" },
    { saffId: 380, name: "Saudi Beach Soccer Premier League", nameAr: "دوري كرة الشاطئ الممتاز", category: "beach", tier: 1, agencyValue: "Low", icon: "🏖️" },
    { saffId: 318, name: "Beach Soccer 1st Div. League", nameAr: "دوري كرة الشاطئ الأولى", category: "beach", tier: 2, agencyValue: "Low", icon: "🏖️" },
    { saffId: 174, name: "Kingdom eCup", nameAr: "كأس المملكة الإلكتروني", category: "esports", tier: 1, agencyValue: "Niche", icon: "🎮" },
];
// ── Seed tournaments ──
async function seedTournaments() {
    let count = 0;
    for (const t of TOURNAMENT_SEED) {
        const [, created] = await saff_model_1.SaffTournament.findOrCreate({
            where: { saffId: t.saffId },
            defaults: t,
        });
        if (created)
            count++;
    }
    return count;
}
// ── List tournaments ──
async function listTournaments(query) {
    const { limit, offset, page } = (0, pagination_1.parsePagination)(query, 'tier');
    const where = { isActive: true };
    if (query.category)
        where.category = query.category;
    if (query.tier)
        where.tier = query.tier;
    if (query.agencyValue)
        where.agencyValue = query.agencyValue;
    if (query.search) {
        where[sequelize_1.Op.or] = [
            { name: { [sequelize_1.Op.iLike]: `%${query.search}%` } },
            { nameAr: { [sequelize_1.Op.iLike]: `%${query.search}%` } },
        ];
    }
    const { count, rows } = await saff_model_1.SaffTournament.findAndCountAll({
        where, limit, offset, order: [['tier', 'ASC'], ['category', 'ASC'], ['name', 'ASC']],
    });
    return { data: rows, meta: (0, pagination_1.buildMeta)(count, page, limit) };
}
// ══════════════════════════════════════════
// SCRAPE & STORE
// ══════════════════════════════════════════
async function fetchFromSaff(input) {
    const { tournamentIds, season, dataTypes } = input;
    // Resolve tournament UUIDs
    const tournaments = await saff_model_1.SaffTournament.findAll({
        where: { saffId: { [sequelize_1.Op.in]: tournamentIds } },
    });
    const tournamentMap = new Map(tournaments.map(t => [t.saffId, t]));
    // Run scraper
    const results = await (0, saff_scraper_1.scrapeBatch)(tournamentIds, season);
    // Store results
    const summary = { standings: 0, fixtures: 0, teams: 0 };
    for (const result of results) {
        const tournament = tournamentMap.get(result.tournamentId);
        if (!tournament)
            continue;
        const txn = await database_1.sequelize.transaction();
        try {
            // ── Store standings ──
            if (dataTypes.includes('standings') && result.standings.length) {
                // Delete existing standings for this tournament+season
                await saff_model_1.SaffStanding.destroy({
                    where: { tournamentId: tournament.id, season },
                    transaction: txn,
                });
                await saff_model_1.SaffStanding.bulkCreate(result.standings.map(s => ({
                    tournamentId: tournament.id,
                    season,
                    position: s.position,
                    saffTeamId: s.saffTeamId,
                    teamNameEn: s.teamNameEn,
                    teamNameAr: s.teamNameAr || '',
                    played: s.played,
                    won: s.won,
                    drawn: s.drawn,
                    lost: s.lost,
                    goalsFor: s.goalsFor,
                    goalsAgainst: s.goalsAgainst,
                    goalDifference: s.goalDifference,
                    points: s.points,
                })), { transaction: txn });
                summary.standings += result.standings.length;
            }
            // ── Store fixtures ──
            if (dataTypes.includes('fixtures') && result.fixtures.length) {
                await saff_model_1.SaffFixture.destroy({
                    where: { tournamentId: tournament.id, season },
                    transaction: txn,
                });
                await saff_model_1.SaffFixture.bulkCreate(result.fixtures.map(f => ({
                    tournamentId: tournament.id,
                    season,
                    matchDate: f.date,
                    matchTime: f.time,
                    saffHomeTeamId: f.saffHomeTeamId,
                    homeTeamNameEn: f.homeTeamNameEn,
                    homeTeamNameAr: '',
                    saffAwayTeamId: f.saffAwayTeamId,
                    awayTeamNameEn: f.awayTeamNameEn,
                    awayTeamNameAr: '',
                    homeScore: f.homeScore,
                    awayScore: f.awayScore,
                    stadium: f.stadium,
                    city: f.city,
                    status: f.homeScore !== null ? 'completed' : 'upcoming',
                })), { transaction: txn });
                summary.fixtures += result.fixtures.length;
            }
            // ── Store team mappings ──
            if (dataTypes.includes('teams') && result.teams.length) {
                for (const team of result.teams) {
                    await saff_model_1.SaffTeamMap.findOrCreate({
                        where: { saffTeamId: team.saffTeamId, season },
                        defaults: {
                            saffTeamId: team.saffTeamId,
                            season,
                            teamNameEn: team.teamNameEn,
                            teamNameAr: '',
                        },
                        transaction: txn,
                    });
                }
                summary.teams += result.teams.length;
            }
            // Update last synced
            await tournament.update({ lastSyncedAt: new Date() }, { transaction: txn });
            await txn.commit();
        }
        catch (error) {
            await txn.rollback();
            throw error;
        }
    }
    return { results: results.length, ...summary };
}
// ══════════════════════════════════════════
// STANDINGS
// ══════════════════════════════════════════
async function listStandings(query) {
    const { limit, offset, page } = (0, pagination_1.parsePagination)(query, 'position');
    const where = {};
    if (query.tournamentId)
        where.tournamentId = query.tournamentId;
    if (query.season)
        where.season = query.season;
    if (query.clubId)
        where.clubId = query.clubId;
    // Support filtering by SAFF tournament ID
    const include = [
        { model: saff_model_1.SaffTournament, as: 'tournament', attributes: ['id', 'saffId', 'name', 'nameAr', 'category', 'tier'] },
    ];
    if (query.saffTournamentId) {
        include[0].where = { saffId: query.saffTournamentId };
    }
    const { count, rows } = await saff_model_1.SaffStanding.findAndCountAll({
        where, include, limit, offset,
        order: [['position', 'ASC']],
    });
    return { data: rows, meta: (0, pagination_1.buildMeta)(count, page, limit) };
}
// ══════════════════════════════════════════
// FIXTURES
// ══════════════════════════════════════════
async function listFixtures(query) {
    const { limit, offset, page } = (0, pagination_1.parsePagination)(query, 'match_date');
    const where = {};
    if (query.tournamentId)
        where.tournamentId = query.tournamentId;
    if (query.season)
        where.season = query.season;
    if (query.status)
        where.status = query.status;
    if (query.week)
        where.week = query.week;
    if (query.clubId) {
        where[sequelize_1.Op.or] = [
            { homeClubId: query.clubId },
            { awayClubId: query.clubId },
        ];
    }
    if (query.from || query.to) {
        where.matchDate = {};
        if (query.from)
            where.matchDate[sequelize_1.Op.gte] = query.from;
        if (query.to)
            where.matchDate[sequelize_1.Op.lte] = query.to;
    }
    const include = [
        { model: saff_model_1.SaffTournament, as: 'tournament', attributes: ['id', 'saffId', 'name', 'nameAr', 'category', 'tier'] },
    ];
    if (query.saffTournamentId) {
        include[0].where = { saffId: query.saffTournamentId };
    }
    const { count, rows } = await saff_model_1.SaffFixture.findAndCountAll({
        where, include, limit, offset,
        order: [['matchDate', 'ASC'], ['matchTime', 'ASC']],
    });
    return { data: rows, meta: (0, pagination_1.buildMeta)(count, page, limit) };
}
// ══════════════════════════════════════════
// TEAM MAPPING
// ══════════════════════════════════════════
async function listTeamMaps(query) {
    const { limit, offset, page } = (0, pagination_1.parsePagination)(query, 'team_name_en');
    const where = {};
    if (query.season)
        where.season = query.season;
    if (query.unmappedOnly)
        where.clubId = null;
    const { count, rows } = await saff_model_1.SaffTeamMap.findAndCountAll({
        where, limit, offset, order: [['teamNameEn', 'ASC']],
    });
    return { data: rows, meta: (0, pagination_1.buildMeta)(count, page, limit) };
}
async function mapTeamToClub(input) {
    // Verify club exists
    const club = await club_model_1.Club.findByPk(input.clubId);
    if (!club)
        throw new errorHandler_1.AppError('Club not found', 404);
    const [teamMap] = await saff_model_1.SaffTeamMap.findOrCreate({
        where: { saffTeamId: input.saffTeamId, season: input.season },
        defaults: {
            saffTeamId: input.saffTeamId,
            season: input.season,
            teamNameEn: club.name,
            teamNameAr: club.nameAr || '',
            clubId: input.clubId,
        },
    });
    await teamMap.update({ clubId: input.clubId });
    // Also update any existing standings/fixtures with this team
    await saff_model_1.SaffStanding.update({ clubId: input.clubId }, { where: { saffTeamId: input.saffTeamId, season: input.season } });
    await saff_model_1.SaffFixture.update({ homeClubId: input.clubId }, { where: { saffHomeTeamId: input.saffTeamId, season: input.season } });
    await saff_model_1.SaffFixture.update({ awayClubId: input.clubId }, { where: { saffAwayTeamId: input.saffTeamId, season: input.season } });
    return teamMap;
}
// ══════════════════════════════════════════
// IMPORT TO CORE SADARA TABLES
// ══════════════════════════════════════════
async function importToSadara(input) {
    const { tournamentIds, season, importTypes } = input;
    const tournaments = await saff_model_1.SaffTournament.findAll({
        where: { saffId: { [sequelize_1.Op.in]: tournamentIds } },
    });
    const summary = { clubs: 0, matches: 0, standings: 0 };
    for (const tournament of tournaments) {
        // ── Import clubs ──
        if (importTypes.includes('clubs')) {
            const teamMaps = await saff_model_1.SaffTeamMap.findAll({
                where: { season, clubId: null },
            });
            for (const tm of teamMaps) {
                const [club, created] = await club_model_1.Club.findOrCreate({
                    where: { name: tm.teamNameEn },
                    defaults: {
                        name: tm.teamNameEn,
                        nameAr: tm.teamNameAr,
                        type: 'Club',
                        country: 'Saudi Arabia',
                        city: tm.city || undefined,
                        league: tournament.name,
                    },
                });
                await tm.update({ clubId: club.id });
                if (created)
                    summary.clubs++;
            }
        }
        // ── Import matches ──
        if (importTypes.includes('matches')) {
            const fixtures = await saff_model_1.SaffFixture.findAll({
                where: { tournamentId: tournament.id, season, matchId: null },
            });
            for (const fixture of fixtures) {
                // Only import if both teams are mapped
                const homeMap = await saff_model_1.SaffTeamMap.findOne({ where: { saffTeamId: fixture.saffHomeTeamId, season } });
                const awayMap = await saff_model_1.SaffTeamMap.findOne({ where: { saffTeamId: fixture.saffAwayTeamId, season } });
                if (homeMap?.clubId && awayMap?.clubId) {
                    const match = await match_model_1.Match.create({
                        homeClubId: homeMap.clubId,
                        awayClubId: awayMap.clubId,
                        competition: tournament.name,
                        season,
                        matchDate: fixture.matchDate,
                        venue: fixture.stadium || undefined,
                        status: fixture.status === 'completed' ? 'completed' : 'upcoming',
                        homeScore: fixture.homeScore ?? undefined,
                        awayScore: fixture.awayScore ?? undefined,
                        createdBy: 'system',
                    });
                    await fixture.update({ matchId: match.id });
                    summary.matches++;
                }
            }
        }
    }
    return summary;
}
// ══════════════════════════════════════════
// STATISTICS
// ══════════════════════════════════════════
async function getStats() {
    const [tournaments, standings, fixtures, teamMaps, unmapped] = await Promise.all([
        saff_model_1.SaffTournament.count({ where: { isActive: true } }),
        saff_model_1.SaffStanding.count(),
        saff_model_1.SaffFixture.count(),
        saff_model_1.SaffTeamMap.count(),
        saff_model_1.SaffTeamMap.count({ where: { clubId: null } }),
    ]);
    return { tournaments, standings, fixtures, teamMaps, unmappedTeams: unmapped };
}
//# sourceMappingURL=saff.service.js.map