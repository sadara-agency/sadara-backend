"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listInjuries = listInjuries;
exports.getInjuryById = getInjuryById;
exports.getPlayerInjuries = getPlayerInjuries;
exports.createInjury = createInjury;
exports.updateInjury = updateInjury;
exports.addInjuryUpdate = addInjuryUpdate;
exports.deleteInjury = deleteInjury;
exports.getInjuryStats = getInjuryStats;
const sequelize_1 = require("sequelize");
const injury_model_1 = require("./injury.model");
const player_model_1 = require("../players/player.model");
const match_model_1 = require("../matches/match.model");
const errorHandler_1 = require("../../middleware/errorHandler");
const pagination_1 = require("../../shared/utils/pagination");
const notification_service_1 = require("../notifications/notification.service");
const logger_1 = require("../../config/logger");
const PLAYER_ATTRS = ['id', 'firstName', 'lastName', 'firstNameAr', 'lastNameAr', 'position', 'photoUrl'];
// ── List ──
async function listInjuries(queryParams) {
    const { limit, offset, page, sort, order, search } = (0, pagination_1.parsePagination)(queryParams, 'injuryDate');
    const where = {};
    if (queryParams.playerId)
        where.playerId = queryParams.playerId;
    if (queryParams.status)
        where.status = queryParams.status;
    if (queryParams.severity)
        where.severity = queryParams.severity;
    if (queryParams.from || queryParams.to) {
        where.injuryDate = {};
        if (queryParams.from)
            where.injuryDate[sequelize_1.Op.gte] = queryParams.from;
        if (queryParams.to)
            where.injuryDate[sequelize_1.Op.lte] = queryParams.to;
    }
    if (search) {
        where[sequelize_1.Op.or] = [
            { injuryType: { [sequelize_1.Op.iLike]: `%${search}%` } },
            { bodyPart: { [sequelize_1.Op.iLike]: `%${search}%` } },
            { diagnosis: { [sequelize_1.Op.iLike]: `%${search}%` } },
        ];
    }
    const { count, rows } = await injury_model_1.Injury.findAndCountAll({
        where, limit, offset,
        order: [[sort, order]],
        include: [
            { model: player_model_1.Player, as: 'player', attributes: [...PLAYER_ATTRS] },
        ],
        distinct: true,
    });
    return { data: rows, meta: (0, pagination_1.buildMeta)(count, page, limit) };
}
// ── Get by ID ──
async function getInjuryById(id) {
    const injury = await injury_model_1.Injury.findByPk(id, {
        include: [
            { model: player_model_1.Player, as: 'player', attributes: [...PLAYER_ATTRS] },
            { model: match_model_1.Match, as: 'match', attributes: ['id', 'competition', 'matchDate', 'status'], required: false },
            { model: injury_model_1.InjuryUpdate, as: 'updates', separate: true, order: [['updateDate', 'DESC']] },
        ],
    });
    if (!injury)
        throw new errorHandler_1.AppError('Injury not found', 404);
    return injury;
}
// ── Get by Player ──
async function getPlayerInjuries(playerId) {
    return injury_model_1.Injury.findAll({
        where: { playerId },
        order: [['injuryDate', 'DESC']],
        include: [
            { model: injury_model_1.InjuryUpdate, as: 'updates', separate: true, order: [['updateDate', 'DESC']], limit: 3 },
        ],
    });
}
// ── Create ──
async function createInjury(input, createdBy) {
    const player = await player_model_1.Player.findByPk(input.playerId);
    if (!player)
        throw new errorHandler_1.AppError('Player not found', 404);
    if (input.matchId) {
        const match = await match_model_1.Match.findByPk(input.matchId);
        if (!match)
            throw new errorHandler_1.AppError('Match not found', 404);
    }
    const injury = await injury_model_1.Injury.create({ ...input, createdBy });
    // Update player status to injured
    await player.update({ status: 'injured' });
    // ── Push notification (non-blocking — won't crash the endpoint) ──
    const playerName = `${player.firstName} ${player.lastName}`.trim();
    const playerNameAr = player.firstNameAr
        ? `${player.firstNameAr} ${player.lastNameAr || ''}`.trim()
        : playerName;
    (0, notification_service_1.notifyByRole)(['Admin', 'Manager'], {
        type: 'injury',
        title: `New injury logged: ${playerName} — ${input.injuryType}`,
        titleAr: `إصابة جديدة: ${playerNameAr} — ${input.injuryTypeAr || input.injuryType}`,
        body: `${input.severity || 'Moderate'} injury on ${input.injuryDate}. ${input.diagnosis || ''}`.trim(),
        bodyAr: `إصابة ${input.severity || 'Moderate'} بتاريخ ${input.injuryDate}`,
        link: '/dashboard/injuries',
        sourceType: 'injury',
        sourceId: injury.id,
        priority: input.severity === 'Critical' || input.severity === 'Severe' ? 'critical' : 'normal',
    }).catch(err => logger_1.logger.error('Failed to send injury notification', err));
    return getInjuryById(injury.id);
}
// ── Update ──
async function updateInjury(id, input) {
    const injury = await injury_model_1.Injury.findByPk(id);
    if (!injury)
        throw new errorHandler_1.AppError('Injury not found', 404);
    const updated = await injury.update(input);
    // If recovered, update player status back to active
    if (input.status === 'Recovered' && input.actualReturnDate) {
        const activeInjuries = await injury_model_1.Injury.count({
            where: {
                playerId: injury.playerId,
                status: { [sequelize_1.Op.in]: ['UnderTreatment', 'Relapsed'] },
                id: { [sequelize_1.Op.ne]: id },
            },
        });
        if (activeInjuries === 0) {
            await player_model_1.Player.update({ status: 'active' }, { where: { id: injury.playerId } });
        }
    }
    return getInjuryById(updated.id);
}
// ── Add Progress Update ──
async function addInjuryUpdate(injuryId, input, userId) {
    const injury = await injury_model_1.Injury.findByPk(injuryId);
    if (!injury)
        throw new errorHandler_1.AppError('Injury not found', 404);
    const update = await injury_model_1.InjuryUpdate.create({
        injuryId,
        updateDate: new Date().toISOString().split('T')[0],
        status: input.status || null,
        notes: input.notes,
        notesAr: input.notesAr || null,
        updatedBy: userId,
    });
    if (input.status && input.status !== injury.status) {
        await injury.update({ status: input.status });
        if (input.status === 'Recovered') {
            await injury.update({ actualReturnDate: new Date().toISOString().split('T')[0] });
            const activeCount = await injury_model_1.Injury.count({
                where: {
                    playerId: injury.playerId,
                    status: { [sequelize_1.Op.in]: ['UnderTreatment', 'Relapsed'] },
                    id: { [sequelize_1.Op.ne]: injuryId },
                },
            });
            if (activeCount === 0) {
                await player_model_1.Player.update({ status: 'active' }, { where: { id: injury.playerId } });
            }
        }
    }
    return update;
}
// ── Delete ──
async function deleteInjury(id) {
    const injury = await injury_model_1.Injury.findByPk(id);
    if (!injury)
        throw new errorHandler_1.AppError('Injury not found', 404);
    await injury.destroy();
    return { id };
}
// ── Stats ──
async function getInjuryStats() {
    const [total, active, recovered] = await Promise.all([
        injury_model_1.Injury.count(),
        injury_model_1.Injury.count({ where: { status: { [sequelize_1.Op.in]: ['UnderTreatment', 'Relapsed'] } } }),
        injury_model_1.Injury.count({ where: { status: 'Recovered' } }),
    ]);
    return { total, active, recovered, chronic: total - active - recovered };
}
//# sourceMappingURL=injury.service.js.map