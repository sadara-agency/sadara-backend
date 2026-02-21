"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listGates = listGates;
exports.getGateById = getGateById;
exports.getPlayerGates = getPlayerGates;
exports.createGate = createGate;
exports.advanceGate = advanceGate;
exports.updateGate = updateGate;
exports.deleteGate = deleteGate;
exports.addChecklistItem = addChecklistItem;
exports.toggleChecklistItem = toggleChecklistItem;
exports.deleteChecklistItem = deleteChecklistItem;
const sequelize_1 = require("sequelize");
const gate_model_1 = require("./gate.model");
const player_model_1 = require("../players/player.model");
const user_model_1 = require("../Users/user.model");
const pagination_1 = require("../../shared/utils/pagination");
const errorHandler_1 = require("../../middleware/errorHandler");
const PLAYER_ATTRS = ['id', 'firstName', 'lastName', 'photoUrl', 'position'];
const USER_ATTRS = ['id', 'fullName'];
const CHECKLIST_ORDER = [['sortOrder', 'ASC'], ['createdAt', 'ASC']];
// ── Helpers ──
function gateIncludes() {
    return [
        { model: player_model_1.Player, as: 'player', attributes: [...PLAYER_ATTRS] },
        { model: user_model_1.User, as: 'approver', attributes: [...USER_ATTRS] },
        { model: gate_model_1.GateChecklist, as: 'checklist', order: CHECKLIST_ORDER, separate: true },
    ];
}
function computeProgress(checklist) {
    if (checklist.length === 0)
        return 0;
    const done = checklist.filter((c) => c.isCompleted).length;
    return Math.round((done / checklist.length) * 100);
}
// ── List Gates ──
async function listGates(queryParams) {
    const { limit, offset, page, sort, order, search } = (0, pagination_1.parsePagination)(queryParams, 'gateNumber');
    const where = {};
    if (queryParams.status)
        where.status = queryParams.status;
    if (queryParams.gateNumber)
        where.gateNumber = queryParams.gateNumber;
    if (queryParams.playerId)
        where.playerId = queryParams.playerId;
    if (search) {
        where[sequelize_1.Op.or] = [
            { '$player.first_name$': { [sequelize_1.Op.iLike]: `%${search}%` } },
            { '$player.last_name$': { [sequelize_1.Op.iLike]: `%${search}%` } },
            { notes: { [sequelize_1.Op.iLike]: `%${search}%` } },
        ];
    }
    const { count, rows } = await gate_model_1.Gate.findAndCountAll({
        where,
        limit,
        offset,
        order: [[sort, order]],
        include: gateIncludes(),
        subQuery: false,
    });
    return { data: rows, meta: (0, pagination_1.buildMeta)(count, page, limit) };
}
// ── Get Gate by ID ──
async function getGateById(id) {
    const gate = await gate_model_1.Gate.findByPk(id, { include: gateIncludes() });
    if (!gate)
        throw new errorHandler_1.AppError('Gate not found', 404);
    const checklist = await gate_model_1.GateChecklist.findAll({
        where: { gateId: id },
        order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    });
    return {
        ...gate.get({ plain: true }),
        progress: computeProgress(checklist),
    };
}
// ── Get All Gates for a Player (pipeline view) ──
async function getPlayerGates(playerId) {
    const player = await player_model_1.Player.findByPk(playerId, { attributes: [...PLAYER_ATTRS] });
    if (!player)
        throw new errorHandler_1.AppError('Player not found', 404);
    const gates = await gate_model_1.Gate.findAll({
        where: { playerId },
        order: [['gateNumber', 'ASC']],
        include: [
            { model: user_model_1.User, as: 'approver', attributes: [...USER_ATTRS] },
            { model: gate_model_1.GateChecklist, as: 'checklist', separate: true, order: [['sortOrder', 'ASC']] },
        ],
    });
    const gatesWithProgress = gates.map((g) => {
        const plain = g.get({ plain: true });
        plain.progress = computeProgress(plain.checklist || []);
        return plain;
    });
    // Overall progress: average of all 4 gates (locked = 0%)
    const allGateNums = ['0', '1', '2', '3'];
    const gateMap = new Map(gatesWithProgress.map((g) => [g.gateNumber, g]));
    const overallProgress = Math.round(allGateNums.reduce((sum, num) => {
        const g = gateMap.get(num);
        return sum + (g ? g.progress : 0);
    }, 0) / 4);
    return {
        player: player.get({ plain: true }),
        gates: gatesWithProgress,
        overallProgress,
    };
}
// ── Create Gate ──
async function createGate(input) {
    const player = await player_model_1.Player.findByPk(input.playerId);
    if (!player)
        throw new errorHandler_1.AppError('Player not found', 404);
    // Check duplicate
    const existing = await gate_model_1.Gate.findOne({
        where: { playerId: input.playerId, gateNumber: input.gateNumber },
    });
    if (existing)
        throw new errorHandler_1.AppError(`Gate ${input.gateNumber} already exists for this player`, 409);
    // Gate ordering: can't create gate N if gate N-1 is not Completed (except gate 0)
    const gateNum = parseInt(input.gateNumber, 10);
    if (gateNum > 0) {
        const prevGate = await gate_model_1.Gate.findOne({
            where: { playerId: input.playerId, gateNumber: String(gateNum - 1) },
        });
        if (!prevGate || prevGate.status !== 'Completed') {
            throw new errorHandler_1.AppError(`Gate ${gateNum - 1} must be completed before creating Gate ${gateNum}`, 400);
        }
    }
    return await gate_model_1.Gate.create(input);
}
// ── Advance Gate (start / complete) ──
async function advanceGate(id, action, userId, notes) {
    const gate = await gate_model_1.Gate.findByPk(id, {
        include: [{ model: gate_model_1.GateChecklist, as: 'checklist' }],
    });
    if (!gate)
        throw new errorHandler_1.AppError('Gate not found', 404);
    if (action === 'start') {
        if (gate.status !== 'Pending')
            throw new errorHandler_1.AppError('Gate can only be started from Pending status', 400);
        return await gate.update({
            status: 'InProgress',
            startedAt: new Date(),
            notes: notes || gate.notes,
        });
    }
    if (action === 'complete') {
        if (gate.status !== 'InProgress')
            throw new errorHandler_1.AppError('Gate must be InProgress to complete', 400);
        // Check all mandatory items are completed
        const checklist = gate.checklist || [];
        const mandatoryIncomplete = checklist.filter((c) => c.isMandatory && !c.isCompleted);
        if (mandatoryIncomplete.length > 0) {
            throw new errorHandler_1.AppError(`Cannot complete gate: ${mandatoryIncomplete.length} mandatory checklist item(s) are incomplete`, 400);
        }
        return await gate.update({
            status: 'Completed',
            completedAt: new Date(),
            approvedBy: userId,
            notes: notes || gate.notes,
        });
    }
    throw new errorHandler_1.AppError('Invalid action', 400);
}
// ── Update Gate ──
async function updateGate(id, input) {
    const gate = await gate_model_1.Gate.findByPk(id);
    if (!gate)
        throw new errorHandler_1.AppError('Gate not found', 404);
    if (gate.status === 'Completed') {
        throw new errorHandler_1.AppError('Cannot modify a completed gate', 400);
    }
    // Cast status safely
    if (input.status)
        input.status = input.status;
    return await gate.update(input);
}
// ── Delete Gate ──
async function deleteGate(id) {
    const gate = await gate_model_1.Gate.findByPk(id);
    if (!gate)
        throw new errorHandler_1.AppError('Gate not found', 404);
    if (gate.status === 'Completed') {
        throw new errorHandler_1.AppError('Cannot delete a completed gate', 400);
    }
    await gate.destroy();
    return { id };
}
// ══════════════════════════════════════════
// CHECKLIST OPERATIONS
// ══════════════════════════════════════════
// ── Add Checklist Item ──
async function addChecklistItem(gateId, input) {
    const gate = await gate_model_1.Gate.findByPk(gateId);
    if (!gate)
        throw new errorHandler_1.AppError('Gate not found', 404);
    if (gate.status === 'Completed')
        throw new errorHandler_1.AppError('Cannot modify checklist of a completed gate', 400);
    return await gate_model_1.GateChecklist.create({ ...input, gateId });
}
// ── Toggle Checklist Item ──
async function toggleChecklistItem(itemId, input, userId) {
    const item = await gate_model_1.GateChecklist.findByPk(itemId);
    if (!item)
        throw new errorHandler_1.AppError('Checklist item not found', 404);
    // Verify parent gate is not completed
    const gate = await gate_model_1.Gate.findByPk(item.gateId);
    if (gate?.status === 'Completed')
        throw new errorHandler_1.AppError('Cannot modify checklist of a completed gate', 400);
    const updateData = { isCompleted: input.isCompleted };
    if (input.isCompleted) {
        updateData.completedAt = new Date();
        updateData.completedBy = userId;
    }
    else {
        updateData.completedAt = null;
        updateData.completedBy = null;
    }
    if (input.evidenceUrl !== undefined)
        updateData.evidenceUrl = input.evidenceUrl;
    if (input.notes !== undefined)
        updateData.notes = input.notes;
    return await item.update(updateData);
}
// ── Delete Checklist Item ──
async function deleteChecklistItem(itemId) {
    const item = await gate_model_1.GateChecklist.findByPk(itemId);
    if (!item)
        throw new errorHandler_1.AppError('Checklist item not found', 404);
    const gate = await gate_model_1.Gate.findByPk(item.gateId);
    if (gate?.status === 'Completed')
        throw new errorHandler_1.AppError('Cannot modify checklist of a completed gate', 400);
    await item.destroy();
    return { id: itemId };
}
//# sourceMappingURL=gate.service.js.map