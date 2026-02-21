"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listReferrals = listReferrals;
exports.getReferralById = getReferralById;
exports.createReferral = createReferral;
exports.updateReferral = updateReferral;
exports.updateReferralStatus = updateReferralStatus;
exports.deleteReferral = deleteReferral;
const sequelize_1 = require("sequelize");
const referral_model_1 = require("./referral.model");
const player_model_1 = require("../players/player.model");
const user_model_1 = require("../Users/user.model");
const errorHandler_1 = require("../../middleware/errorHandler");
const pagination_1 = require("../../shared/utils/pagination");
const PLAYER_ATTRS = ['id', 'firstName', 'lastName', 'firstNameAr', 'lastNameAr', 'photoUrl', 'position'];
const USER_ATTRS = ['id', 'fullName', 'fullNameAr'];
function referralIncludes() {
    return [
        { model: player_model_1.Player, as: 'player', attributes: [...PLAYER_ATTRS] },
        { model: user_model_1.User, as: 'assignee', attributes: [...USER_ATTRS] },
        { model: user_model_1.User, as: 'creator', attributes: [...USER_ATTRS] },
    ];
}
// ── Access Control: Mental referrals are restricted ──
function applyAccessFilter(where, userId, userRole) {
    // Admin can see everything
    if (userRole === 'Admin')
        return;
    // Non-admins cannot see restricted referrals unless they're in restrictedTo
    where[sequelize_1.Op.or] = [
        ...(where[sequelize_1.Op.or] || []),
        { isRestricted: false },
        { restrictedTo: { [sequelize_1.Op.contains]: [userId] } },
        { assignedTo: userId },
        { createdBy: userId },
    ];
}
// ── List Referrals ──
async function listReferrals(queryParams, userId, userRole) {
    const { limit, offset, page, sort, order, search } = (0, pagination_1.parsePagination)(queryParams, 'createdAt');
    const where = {};
    if (queryParams.status)
        where.status = queryParams.status;
    if (queryParams.referralType)
        where.referralType = queryParams.referralType;
    if (queryParams.priority)
        where.priority = queryParams.priority;
    if (queryParams.playerId)
        where.playerId = queryParams.playerId;
    if (queryParams.assignedTo)
        where.assignedTo = queryParams.assignedTo;
    if (search) {
        where[sequelize_1.Op.or] = [
            { triggerDesc: { [sequelize_1.Op.iLike]: `%${search}%` } },
            { notes: { [sequelize_1.Op.iLike]: `%${search}%` } },
            { outcome: { [sequelize_1.Op.iLike]: `%${search}%` } },
            { '$player.first_name$': { [sequelize_1.Op.iLike]: `%${search}%` } },
            { '$player.last_name$': { [sequelize_1.Op.iLike]: `%${search}%` } },
        ];
    }
    applyAccessFilter(where, userId, userRole);
    const { count, rows } = await referral_model_1.Referral.findAndCountAll({
        where,
        limit,
        offset,
        order: [[sort, order]],
        include: referralIncludes(),
        subQuery: false,
    });
    return { data: rows, meta: (0, pagination_1.buildMeta)(count, page, limit) };
}
// ── Get Referral by ID ──
async function getReferralById(id, userId, userRole) {
    const referral = await referral_model_1.Referral.findByPk(id, { include: referralIncludes() });
    if (!referral)
        throw new errorHandler_1.AppError('Referral not found', 404);
    // Access check for restricted referrals
    if (referral.isRestricted && userRole !== 'Admin') {
        const allowed = referral.restrictedTo || [];
        if (!allowed.includes(userId) && referral.assignedTo !== userId && referral.createdBy !== userId) {
            throw new errorHandler_1.AppError('Access denied: this referral is restricted', 403);
        }
    }
    return referral;
}
// ── Create Referral ──
async function createReferral(input, userId) {
    const player = await player_model_1.Player.findByPk(input.playerId);
    if (!player)
        throw new errorHandler_1.AppError('Player not found', 404);
    if (input.assignedTo) {
        const user = await user_model_1.User.findByPk(input.assignedTo);
        if (!user)
            throw new errorHandler_1.AppError('Assigned user not found', 404);
    }
    // Mental referrals are automatically restricted
    if (input.referralType === 'Mental') {
        input.isRestricted = true;
    }
    const referral = await referral_model_1.Referral.create({
        ...input,
        createdBy: userId,
        assignedAt: input.assignedTo ? new Date() : null,
    });
    return await referral_model_1.Referral.findByPk(referral.id, { include: referralIncludes() });
}
// ── Update Referral ──
async function updateReferral(id, input, userId, userRole) {
    const referral = await getReferralById(id, userId, userRole);
    if (referral.status === 'Resolved') {
        throw new errorHandler_1.AppError('Cannot modify a resolved referral', 400);
    }
    // Track assignment change
    if (input.assignedTo && input.assignedTo !== referral.assignedTo) {
        input.assignedAt = new Date();
    }
    return await referral.update(input);
}
// ── Update Status ──
async function updateReferralStatus(id, input, userId, userRole) {
    const referral = await getReferralById(id, userId, userRole);
    const updateData = {
        status: input.status,
    };
    if (input.outcome)
        updateData.outcome = input.outcome;
    if (input.notes)
        updateData.notes = input.notes;
    if (input.status === 'Resolved') {
        updateData.resolvedAt = new Date();
    }
    return await referral.update(updateData);
}
// ── Delete Referral ──
async function deleteReferral(id, userId, userRole) {
    const referral = await getReferralById(id, userId, userRole);
    if (referral.status === 'Resolved') {
        throw new errorHandler_1.AppError('Cannot delete a resolved referral', 400);
    }
    await referral.destroy();
    return { id };
}
//# sourceMappingURL=referral.service.js.map