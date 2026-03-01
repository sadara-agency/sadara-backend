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
exports.getCalendar = getCalendar;
exports.getMatchPlayers = getMatchPlayers;
exports.assignPlayers = assignPlayers;
exports.updateMatchPlayer = updateMatchPlayer;
exports.removePlayerFromMatch = removePlayerFromMatch;
exports.getMatchStats = getMatchStats;
exports.upsertStats = upsertStats;
exports.updatePlayerStats = updatePlayerStats;
exports.deletePlayerStats = deletePlayerStats;
exports.getPlayerMatches = getPlayerMatches;
exports.getPlayerAggregateStats = getPlayerAggregateStats;
const sequelize_1 = require("sequelize");
const match_model_1 = require("./match.model");
const matchPlayer_model_1 = require("./matchPlayer.model");
const playerMatchStats_model_1 = require("./playerMatchStats.model");
const club_model_1 = require("../clubs/club.model");
const player_model_1 = require("../players/player.model");
const task_model_1 = require("../tasks/task.model");
const errorHandler_1 = require("../../middleware/errorHandler");
const pagination_1 = require("../../shared/utils/pagination");
const CLUB_ATTRS = ['id', 'name', 'nameAr', 'logoUrl'];
const PLAYER_ATTRS = ['id', 'firstName', 'lastName', 'firstNameAr', 'lastNameAr', 'position', 'photoUrl'];
// ═══════════════════════════════════════════════════════════════
//  MATCH CRUD
// ═══════════════════════════════════════════════════════════════
async function listMatches(queryParams) {
    const { limit, offset, page, sort, order, search } = (0, pagination_1.parsePagination)(queryParams, 'matchDate');
    const where = {};
    if (queryParams.status)
        where.status = queryParams.status;
    if (queryParams.competition)
        where.competition = { [sequelize_1.Op.iLike]: `%${queryParams.competition}%` };
    if (queryParams.season)
        where.season = queryParams.season;
    if (queryParams.clubId) {
        where[sequelize_1.Op.or] = [
            { homeClubId: queryParams.clubId },
            { awayClubId: queryParams.clubId },
        ];
    }
    if (queryParams.from || queryParams.to) {
        where.matchDate = {};
        if (queryParams.from)
            where.matchDate[sequelize_1.Op.gte] = new Date(queryParams.from);
        if (queryParams.to)
            where.matchDate[sequelize_1.Op.lte] = new Date(queryParams.to);
    }
    const includeConfig = [
        { model: club_model_1.Club, as: 'homeClub', attributes: [...CLUB_ATTRS] },
        { model: club_model_1.Club, as: 'awayClub', attributes: [...CLUB_ATTRS] },
    ];
    if (queryParams.playerId) {
        includeConfig.push({
            model: matchPlayer_model_1.MatchPlayer, as: 'matchPlayers',
            where: { playerId: queryParams.playerId },
            attributes: [], required: true,
        });
    }
    if (search) {
        const like = { [sequelize_1.Op.iLike]: `%${search}%` };
        const existing = where[sequelize_1.Op.or] || [];
        where[sequelize_1.Op.or] = [...existing, { competition: like }, { venue: like }];
    }
    const { count, rows } = await match_model_1.Match.findAndCountAll({
        where, limit, offset,
        order: [[sort, order]],
        include: includeConfig,
        subQuery: false, distinct: true,
    });
    return { data: rows, meta: (0, pagination_1.buildMeta)(count, page, limit) };
}
async function getMatchById(id) {
    const match = await match_model_1.Match.findByPk(id, {
        include: [
            { model: club_model_1.Club, as: 'homeClub', attributes: [...CLUB_ATTRS] },
            { model: club_model_1.Club, as: 'awayClub', attributes: [...CLUB_ATTRS] },
            {
                model: matchPlayer_model_1.MatchPlayer, as: 'matchPlayers',
                include: [{ model: player_model_1.Player, as: 'player', attributes: [...PLAYER_ATTRS] }],
            },
            {
                model: playerMatchStats_model_1.PlayerMatchStats, as: 'stats',
                include: [{ model: player_model_1.Player, as: 'player', attributes: [...PLAYER_ATTRS] }],
            },
        ],
    });
    if (!match)
        throw new errorHandler_1.AppError('Match not found', 404);
    const taskCount = await task_model_1.Task.count({ where: { matchId: id } }).catch(() => 0);
    return {
        ...match.get({ plain: true }),
        counts: { players: match.matchPlayers?.length ?? 0, tasks: taskCount },
    };
}
async function getUpcomingMatches(days = 7, limit = 10) {
    const now = new Date();
    const until = new Date(now.getTime() + days * 86_400_000);
    return match_model_1.Match.findAll({
        where: { status: 'upcoming', matchDate: { [sequelize_1.Op.between]: [now, until] } },
        order: [['matchDate', 'ASC']], limit,
        include: [
            { model: club_model_1.Club, as: 'homeClub', attributes: [...CLUB_ATTRS] },
            { model: club_model_1.Club, as: 'awayClub', attributes: [...CLUB_ATTRS] },
            {
                model: matchPlayer_model_1.MatchPlayer, as: 'matchPlayers',
                attributes: ['playerId', 'availability'],
                include: [{ model: player_model_1.Player, as: 'player', attributes: ['id', 'firstName', 'lastName', 'firstNameAr', 'lastNameAr'] }],
            },
        ],
    });
}
async function createMatch(input) {
    if (input.homeClubId) {
        if (!(await club_model_1.Club.findByPk(input.homeClubId)))
            throw new errorHandler_1.AppError('Home club not found', 404);
    }
    if (input.awayClubId) {
        if (!(await club_model_1.Club.findByPk(input.awayClubId)))
            throw new errorHandler_1.AppError('Away club not found', 404);
    }
    return match_model_1.Match.create(input);
}
async function updateMatch(id, input) {
    const match = await match_model_1.Match.findByPk(id);
    if (!match)
        throw new errorHandler_1.AppError('Match not found', 404);
    return match.update(input);
}
async function updateScore(id, input) {
    const match = await match_model_1.Match.findByPk(id);
    if (!match)
        throw new errorHandler_1.AppError('Match not found', 404);
    if (match.status === 'cancelled')
        throw new errorHandler_1.AppError('Cannot update score for a cancelled match', 400);
    const data = { homeScore: input.homeScore, awayScore: input.awayScore };
    if (input.status)
        data.status = input.status;
    return match.update(data);
}
async function updateMatchStatus(id, status) {
    const match = await match_model_1.Match.findByPk(id);
    if (!match)
        throw new errorHandler_1.AppError('Match not found', 404);
    return match.update({ status: status });
}
async function deleteMatch(id) {
    const match = await match_model_1.Match.findByPk(id);
    if (!match)
        throw new errorHandler_1.AppError('Match not found', 404);
    if (match.status === 'completed')
        throw new errorHandler_1.AppError('Cannot delete a completed match', 400);
    await match.destroy();
    return { id };
}
// ═══════════════════════════════════════════════════════════════
//  CALENDAR (weekly/monthly view)
// ═══════════════════════════════════════════════════════════════
async function getCalendar(params) {
    const where = {
        matchDate: { [sequelize_1.Op.gte]: new Date(params.from), [sequelize_1.Op.lte]: new Date(params.to) },
    };
    if (params.competition)
        where.competition = { [sequelize_1.Op.iLike]: `%${params.competition}%` };
    if (params.clubId) {
        where[sequelize_1.Op.or] = [{ homeClubId: params.clubId }, { awayClubId: params.clubId }];
    }
    const includeConfig = [
        { model: club_model_1.Club, as: 'homeClub', attributes: [...CLUB_ATTRS] },
        { model: club_model_1.Club, as: 'awayClub', attributes: [...CLUB_ATTRS] },
        {
            model: matchPlayer_model_1.MatchPlayer, as: 'matchPlayers',
            attributes: ['playerId', 'availability'],
            include: [{ model: player_model_1.Player, as: 'player', attributes: ['id', 'firstName', 'lastName', 'firstNameAr', 'lastNameAr', 'photoUrl'] }],
            ...(params.playerId ? { where: { playerId: params.playerId }, required: true } : {}),
        },
    ];
    return match_model_1.Match.findAll({ where, order: [['matchDate', 'ASC']], include: includeConfig });
}
// ═══════════════════════════════════════════════════════════════
//  MATCH PLAYERS (assign / update / remove)
// ═══════════════════════════════════════════════════════════════
async function getMatchPlayers(matchId) {
    const match = await match_model_1.Match.findByPk(matchId);
    if (!match)
        throw new errorHandler_1.AppError('Match not found', 404);
    return matchPlayer_model_1.MatchPlayer.findAll({
        where: { matchId },
        include: [{ model: player_model_1.Player, as: 'player', attributes: [...PLAYER_ATTRS] }],
        order: [['availability', 'ASC']],
    });
}
async function assignPlayers(matchId, players) {
    const match = await match_model_1.Match.findByPk(matchId);
    if (!match)
        throw new errorHandler_1.AppError('Match not found', 404);
    const playerIds = players.map(p => p.playerId);
    const existing = await player_model_1.Player.findAll({ where: { id: { [sequelize_1.Op.in]: playerIds } }, attributes: ['id'] });
    if (existing.length !== playerIds.length) {
        const found = new Set(existing.map(p => p.id));
        throw new errorHandler_1.AppError(`Players not found: ${playerIds.filter(id => !found.has(id)).join(', ')}`, 404);
    }
    const records = players.map(p => ({
        matchId,
        playerId: p.playerId,
        availability: p.availability || 'starter',
        positionInMatch: p.positionInMatch || null,
        minutesPlayed: p.minutesPlayed ?? null,
        notes: p.notes || null,
    }));
    await matchPlayer_model_1.MatchPlayer.bulkCreate(records, {
        updateOnDuplicate: ['availability', 'positionInMatch', 'minutesPlayed', 'notes', 'updatedAt'],
    });
    return getMatchPlayers(matchId);
}
async function updateMatchPlayer(matchId, playerId, input) {
    const mp = await matchPlayer_model_1.MatchPlayer.findOne({ where: { matchId, playerId } });
    if (!mp)
        throw new errorHandler_1.AppError('Player not assigned to this match', 404);
    return mp.update(input);
}
async function removePlayerFromMatch(matchId, playerId) {
    const mp = await matchPlayer_model_1.MatchPlayer.findOne({ where: { matchId, playerId } });
    if (!mp)
        throw new errorHandler_1.AppError('Player not assigned to this match', 404);
    await mp.destroy();
    return { matchId, playerId };
}
// ═══════════════════════════════════════════════════════════════
//  PLAYER MATCH STATS
// ═══════════════════════════════════════════════════════════════
async function getMatchStats(matchId) {
    const match = await match_model_1.Match.findByPk(matchId);
    if (!match)
        throw new errorHandler_1.AppError('Match not found', 404);
    return playerMatchStats_model_1.PlayerMatchStats.findAll({
        where: { matchId },
        include: [{ model: player_model_1.Player, as: 'player', attributes: [...PLAYER_ATTRS] }],
    });
}
async function upsertStats(matchId, stats) {
    const match = await match_model_1.Match.findByPk(matchId);
    if (!match)
        throw new errorHandler_1.AppError('Match not found', 404);
    const records = stats.map(s => ({ matchId, ...s }));
    await playerMatchStats_model_1.PlayerMatchStats.bulkCreate(records, {
        updateOnDuplicate: [
            'minutesPlayed', 'goals', 'assists', 'shotsTotal', 'shotsOnTarget',
            'passesTotal', 'passesCompleted', 'tacklesTotal', 'interceptions',
            'duelsWon', 'duelsTotal', 'dribblesCompleted', 'dribblesAttempted',
            'foulsCommitted', 'foulsDrawn', 'yellowCards', 'redCards',
            'rating', 'positionInMatch', 'updatedAt',
        ],
    });
    return getMatchStats(matchId);
}
async function updatePlayerStats(matchId, playerId, input) {
    const stats = await playerMatchStats_model_1.PlayerMatchStats.findOne({ where: { matchId, playerId } });
    if (!stats)
        throw new errorHandler_1.AppError('Stats not found for this player in this match', 404);
    return stats.update(input);
}
async function deletePlayerStats(matchId, playerId) {
    const stats = await playerMatchStats_model_1.PlayerMatchStats.findOne({ where: { matchId, playerId } });
    if (!stats)
        throw new errorHandler_1.AppError('Stats not found', 404);
    await stats.destroy();
    return { matchId, playerId };
}
// ═══════════════════════════════════════════════════════════════
//  PLAYER-CENTRIC QUERIES (player profile → matches tab)
// ═══════════════════════════════════════════════════════════════
async function getPlayerMatches(playerId, queryParams) {
    const { limit, offset, page } = (0, pagination_1.parsePagination)(queryParams, 'matchDate');
    const where = {};
    if (queryParams.status)
        where.status = queryParams.status;
    if (queryParams.competition)
        where.competition = { [sequelize_1.Op.iLike]: `%${queryParams.competition}%` };
    if (queryParams.from || queryParams.to) {
        where.matchDate = {};
        if (queryParams.from)
            where.matchDate[sequelize_1.Op.gte] = new Date(queryParams.from);
        if (queryParams.to)
            where.matchDate[sequelize_1.Op.lte] = new Date(queryParams.to);
    }
    const { count, rows } = await match_model_1.Match.findAndCountAll({
        where, limit, offset,
        order: [['matchDate', 'DESC']],
        include: [
            { model: club_model_1.Club, as: 'homeClub', attributes: [...CLUB_ATTRS] },
            { model: club_model_1.Club, as: 'awayClub', attributes: [...CLUB_ATTRS] },
            { model: matchPlayer_model_1.MatchPlayer, as: 'matchPlayers', where: { playerId }, required: true, attributes: ['availability', 'positionInMatch', 'minutesPlayed'] },
            { model: playerMatchStats_model_1.PlayerMatchStats, as: 'stats', where: { playerId }, required: false },
        ],
        subQuery: false, distinct: true,
    });
    return { data: rows, meta: (0, pagination_1.buildMeta)(count, page, limit) };
}
async function getPlayerAggregateStats(playerId, params) {
    const matchWhere = {};
    if (params?.from || params?.to) {
        matchWhere.matchDate = {};
        if (params?.from)
            matchWhere.matchDate[sequelize_1.Op.gte] = new Date(params.from);
        if (params?.to)
            matchWhere.matchDate[sequelize_1.Op.lte] = new Date(params.to);
    }
    if (params?.competition)
        matchWhere.competition = { [sequelize_1.Op.iLike]: `%${params.competition}%` };
    const result = await playerMatchStats_model_1.PlayerMatchStats.findAll({
        where: { playerId },
        attributes: [
            [sequelize_1.Sequelize.fn('COUNT', sequelize_1.Sequelize.col('PlayerMatchStats.id')), 'matchesPlayed'],
            [sequelize_1.Sequelize.fn('SUM', sequelize_1.Sequelize.col('goals')), 'totalGoals'],
            [sequelize_1.Sequelize.fn('SUM', sequelize_1.Sequelize.col('assists')), 'totalAssists'],
            [sequelize_1.Sequelize.fn('SUM', sequelize_1.Sequelize.col('minutes_played')), 'totalMinutes'],
            [sequelize_1.Sequelize.fn('SUM', sequelize_1.Sequelize.col('yellow_cards')), 'totalYellowCards'],
            [sequelize_1.Sequelize.fn('SUM', sequelize_1.Sequelize.col('red_cards')), 'totalRedCards'],
            [sequelize_1.Sequelize.fn('AVG', sequelize_1.Sequelize.col('rating')), 'averageRating'],
            [sequelize_1.Sequelize.fn('SUM', sequelize_1.Sequelize.col('shots_total')), 'totalShots'],
            [sequelize_1.Sequelize.fn('SUM', sequelize_1.Sequelize.col('shots_on_target')), 'totalShotsOnTarget'],
            [sequelize_1.Sequelize.fn('SUM', sequelize_1.Sequelize.col('passes_total')), 'totalPasses'],
            [sequelize_1.Sequelize.fn('SUM', sequelize_1.Sequelize.col('passes_completed')), 'totalPassesCompleted'],
        ],
        include: Object.keys(matchWhere).length > 0
            ? [{ model: match_model_1.Match, as: 'match', where: matchWhere, attributes: [] }]
            : [],
        raw: true,
    });
    return result[0] ?? {};
}
//# sourceMappingURL=match.service.js.map