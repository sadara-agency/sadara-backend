"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMatches = listMatches;
exports.getMatchById = getMatchById;
exports.getUpcomingMatches = getUpcomingMatches;
exports.createMatch = createMatch;
exports.updateMatch = updateMatch;
exports.updateScore = updateScore;
exports.updateMatchStatus = updateMatchStatus;
exports.deleteMatch = deleteMatch;
const sequelize_1 = require("sequelize");
const match_model_1 = require("./match.model");
const club_model_1 = require("../clubs/club.model");
const errorHandler_1 = require("../../middleware/errorHandler");
const pagination_1 = require("../../shared/utils/pagination");
const database_1 = require("../../config/database");
const CLUB_ATTRS = ['id', 'name', 'nameAr', 'logoUrl'];
// ── List Matches ──
async function listMatches(queryParams) {
    const { limit, offset, page, sort, order, search } = (0, pagination_1.parsePagination)(queryParams, 'matchDate');
    const where = {};
    if (queryParams.status)
        where.status = queryParams.status;
    if (queryParams.competition)
        where.competition = { [sequelize_1.Op.iLike]: `%${queryParams.competition}%` };
    if (queryParams.season)
        where.season = queryParams.season;
    // Filter by club (either home or away)
    if (queryParams.clubId) {
        where[sequelize_1.Op.or] = [
            { homeClubId: queryParams.clubId },
            { awayClubId: queryParams.clubId },
        ];
    }
    // Date range
    if (queryParams.from || queryParams.to) {
        where.matchDate = {};
        if (queryParams.from)
            where.matchDate[sequelize_1.Op.gte] = new Date(queryParams.from);
        if (queryParams.to)
            where.matchDate[sequelize_1.Op.lte] = new Date(queryParams.to);
    }
    if (search) {
        const like = { [sequelize_1.Op.iLike]: `%${search}%` };
        where[sequelize_1.Op.or] = [
            ...(where[sequelize_1.Op.or] || []),
            { competition: like },
            { venue: like },
            { '$homeClub.name$': like },
            { '$awayClub.name$': like },
        ];
    }
    const { count, rows } = await match_model_1.Match.findAndCountAll({
        where,
        limit,
        offset,
        order: [[sort, order]],
        include: [
            { model: club_model_1.Club, as: 'homeClub', attributes: [...CLUB_ATTRS] },
            { model: club_model_1.Club, as: 'awayClub', attributes: [...CLUB_ATTRS] },
        ],
        subQuery: false,
    });
    return { data: rows, meta: (0, pagination_1.buildMeta)(count, page, limit) };
}
// ── Get Match by ID ──
async function getMatchById(id) {
    const match = await match_model_1.Match.findByPk(id, {
        include: [
            { model: club_model_1.Club, as: 'homeClub', attributes: [...CLUB_ATTRS] },
            { model: club_model_1.Club, as: 'awayClub', attributes: [...CLUB_ATTRS] },
        ],
    });
    if (!match)
        throw new errorHandler_1.AppError('Match not found', 404);
    // Fetch related counts in parallel
    const [playerCount, taskCount] = await Promise.all([
        database_1.sequelize.models.MatchPlayer?.count({ where: { matchId: id } }).catch(() => 0) ?? 0,
        database_1.sequelize.models.Task?.count({ where: { matchId: id } }).catch(() => 0) ?? 0,
    ]);
    return {
        ...match.get({ plain: true }),
        counts: { players: playerCount, tasks: taskCount },
    };
}
// ── Get Upcoming Matches (dashboard widget) ──
async function getUpcomingMatches(days = 7, limit = 10) {
    const now = new Date();
    const until = new Date(now.getTime() + days * 86_400_000);
    return await match_model_1.Match.findAll({
        where: {
            status: 'upcoming',
            matchDate: { [sequelize_1.Op.between]: [now, until] },
        },
        order: [['matchDate', 'ASC']],
        limit,
        include: [
            { model: club_model_1.Club, as: 'homeClub', attributes: [...CLUB_ATTRS] },
            { model: club_model_1.Club, as: 'awayClub', attributes: [...CLUB_ATTRS] },
        ],
    });
}
// ── Create Match ──
async function createMatch(input) {
    // Verify clubs exist if provided
    if (input.homeClubId) {
        const club = await club_model_1.Club.findByPk(input.homeClubId);
        if (!club)
            throw new errorHandler_1.AppError('Home club not found', 404);
    }
    if (input.awayClubId) {
        const club = await club_model_1.Club.findByPk(input.awayClubId);
        if (!club)
            throw new errorHandler_1.AppError('Away club not found', 404);
    }
    return await match_model_1.Match.create(input);
}
// ── Update Match ──
async function updateMatch(id, input) {
    const match = await match_model_1.Match.findByPk(id);
    if (!match)
        throw new errorHandler_1.AppError('Match not found', 404);
    return await match.update(input);
}
// ── Update Score ──
async function updateScore(id, input) {
    const match = await match_model_1.Match.findByPk(id);
    if (!match)
        throw new errorHandler_1.AppError('Match not found', 404);
    if (match.status === 'cancelled') {
        throw new errorHandler_1.AppError('Cannot update score for a cancelled match', 400);
    }
    const updateData = {
        homeScore: input.homeScore,
        awayScore: input.awayScore,
    };
    // Auto-transition to live/completed if provided
    if (input.status)
        updateData.status = input.status;
    return await match.update(updateData);
}
// ── Update Status ──
async function updateMatchStatus(id, status) {
    const match = await match_model_1.Match.findByPk(id);
    if (!match)
        throw new errorHandler_1.AppError('Match not found', 404);
    return await match.update({ status: status });
}
// ── Delete Match ──
async function deleteMatch(id) {
    const match = await match_model_1.Match.findByPk(id);
    if (!match)
        throw new errorHandler_1.AppError('Match not found', 404);
    if (match.status === 'completed') {
        throw new errorHandler_1.AppError('Cannot delete a completed match', 400);
    }
    await match.destroy();
    return { id };
}
//# sourceMappingURL=match.service.js.map