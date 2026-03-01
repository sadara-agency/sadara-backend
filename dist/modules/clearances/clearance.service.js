"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listClearances = listClearances;
exports.getClearanceById = getClearanceById;
exports.createClearance = createClearance;
exports.updateClearance = updateClearance;
exports.completeClearance = completeClearance;
exports.deleteClearance = deleteClearance;
exports.getClearancesByContract = getClearancesByContract;
const clearance_model_1 = require("./clearance.model");
const contract_model_1 = require("../contracts/contract.model");
const player_model_1 = require("../players/player.model");
const user_model_1 = require("../Users/user.model");
const errorHandler_1 = require("../../middleware/errorHandler");
// ── Associations ──
const INCLUDE_RELATIONS = [
    {
        model: contract_model_1.Contract,
        as: 'contract',
        attributes: ['id', 'title', 'startDate', 'endDate', 'status', 'commissionPct'],
        include: [
            { model: player_model_1.Player, as: 'player', attributes: ['id', 'firstName', 'lastName', 'firstNameAr', 'lastNameAr', 'photoUrl'] },
        ],
    },
    { model: player_model_1.Player, as: 'player', attributes: ['id', 'firstName', 'lastName', 'firstNameAr', 'lastNameAr', 'photoUrl'] },
    { model: user_model_1.User, as: 'creator', attributes: ['id', 'fullName', 'fullNameAr'] },
];
// ── List clearances ──
async function listClearances(query) {
    const { page = 1, limit = 20, status, contractId, playerId } = query;
    const where = {};
    if (status)
        where.status = status;
    if (contractId)
        where.contractId = contractId;
    if (playerId)
        where.playerId = playerId;
    const { rows, count } = await clearance_model_1.Clearance.findAndCountAll({
        where,
        include: INCLUDE_RELATIONS,
        order: [['createdAt', 'DESC']],
        limit,
        offset: (page - 1) * limit,
    });
    return {
        clearances: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit),
    };
}
// ── Get single clearance ──
async function getClearanceById(id) {
    return clearance_model_1.Clearance.findByPk(id, { include: INCLUDE_RELATIONS });
}
// ── Create clearance ──
async function createClearance(data, userId) {
    // Validate contract exists and is active
    const contract = await contract_model_1.Contract.findByPk(data.contractId);
    if (!contract)
        throw new errorHandler_1.AppError('Contract not found', 404);
    // Check contract is in a terminable state
    const terminableStatuses = ['Active', 'Expiring Soon', 'Review', 'Signing'];
    if (!terminableStatuses.includes(contract.status)) {
        throw new errorHandler_1.AppError(`Cannot create clearance for contract with status "${contract.status}"`, 400);
    }
    // Check no existing active clearance for this contract
    const existing = await clearance_model_1.Clearance.findOne({
        where: { contractId: data.contractId, status: 'Processing' },
    });
    if (existing) {
        throw new errorHandler_1.AppError('An active clearance already exists for this contract', 400);
    }
    const clearance = await clearance_model_1.Clearance.create({
        ...data,
        playerId: contract.playerId,
        createdBy: userId,
    });
    return getClearanceById(clearance.id);
}
// ── Update clearance ──
async function updateClearance(id, data) {
    const clearance = await clearance_model_1.Clearance.findByPk(id);
    if (!clearance)
        throw new errorHandler_1.AppError('Clearance not found', 404);
    if (clearance.status === 'Completed') {
        throw new errorHandler_1.AppError('Cannot update a completed clearance', 400);
    }
    await clearance.update(data);
    return getClearanceById(id);
}
// ── Complete clearance (sign + terminate contract) ──
async function completeClearance(id, data) {
    const clearance = await clearance_model_1.Clearance.findByPk(id);
    if (!clearance)
        throw new errorHandler_1.AppError('Clearance not found', 404);
    if (clearance.status === 'Completed') {
        throw new errorHandler_1.AppError('Clearance is already completed', 400);
    }
    // Must have no-claims declaration
    if (!clearance.noClaimsDeclaration) {
        throw new errorHandler_1.AppError('No-claims declaration must be accepted before completing', 400);
    }
    const updateData = {
        status: 'Completed',
        signedAt: new Date(),
    };
    if (data.action === 'sign_digital') {
        updateData.signedDocumentUrl = data.signatureData;
        updateData.signingMethod = 'digital';
    }
    else if (data.action === 'sign_upload') {
        updateData.signedDocumentUrl = data.signedDocumentUrl;
        updateData.signingMethod = 'upload';
    }
    await clearance.update(updateData);
    // ── Auto-terminate the parent contract ──
    await contract_model_1.Contract.update({
        status: 'Terminated',
        terminatedByClearanceId: clearance.id,
    }, { where: { id: clearance.contractId } });
    return getClearanceById(id);
}
// ── Delete clearance (only if Processing) ──
async function deleteClearance(id) {
    const clearance = await clearance_model_1.Clearance.findByPk(id);
    if (!clearance)
        throw new errorHandler_1.AppError('Clearance not found', 404);
    if (clearance.status === 'Completed') {
        throw new errorHandler_1.AppError('Cannot delete a completed clearance', 400);
    }
    await clearance.destroy();
}
// ── Get clearances for a contract ──
async function getClearancesByContract(contractId) {
    return clearance_model_1.Clearance.findAll({
        where: { contractId },
        include: INCLUDE_RELATIONS,
        order: [['createdAt', 'DESC']],
    });
}
//# sourceMappingURL=clearance.service.js.map