"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listContracts = listContracts;
exports.getContractById = getContractById;
exports.createContract = createContract;
exports.updateContract = updateContract;
exports.deleteContract = deleteContract;
const sequelize_1 = require("sequelize");
const contract_model_1 = require("./contract.model");
const player_model_1 = require("../players/player.model");
const club_model_1 = require("../clubs/club.model");
const user_model_1 = require("../Users/user.model");
const database_1 = require("../../config/database");
const errorHandler_1 = require("../../middleware/errorHandler");
const pagination_1 = require("../../shared/utils/pagination");
// ── Shared includes for player + club ──
const CONTRACT_INCLUDES = [
    {
        model: player_model_1.Player,
        as: 'player',
        attributes: ['id', 'firstName', 'lastName', 'firstNameAr', 'lastNameAr', 'photoUrl'],
    },
    {
        model: club_model_1.Club,
        as: 'club',
        attributes: ['id', 'name', 'nameAr', 'logoUrl'],
    },
    {
        model: user_model_1.User,
        as: 'creator',
        attributes: ['id', 'fullName', 'fullNameAr'],
    },
];
// ── Helper: compute days remaining and attach to plain object ──
function enrichContract(contract) {
    const plain = contract.get ? contract.get({ plain: true }) : contract;
    const endDate = new Date(plain.endDate);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    plain.daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return plain;
}
// ────────────────────────────────────────────────────────────
// List Contracts
// ────────────────────────────────────────────────────────────
async function listContracts(queryParams) {
    const { limit, offset, page, sort, order, search } = (0, pagination_1.parsePagination)(queryParams, 'createdAt');
    const where = {};
    if (queryParams.status)
        where.status = queryParams.status;
    if (queryParams.category)
        where.category = queryParams.category;
    if (queryParams.playerId)
        where.playerId = queryParams.playerId;
    if (queryParams.clubId)
        where.clubId = queryParams.clubId;
    if (search) {
        const pattern = `%${search}%`;
        where[sequelize_1.Op.or] = [
            { title: { [sequelize_1.Op.iLike]: pattern } },
            // Safe: Sequelize.where + fn generate parameterized SQL
            (0, sequelize_1.where)((0, sequelize_1.fn)('lower', (0, sequelize_1.col)('player.first_name')), {
                [sequelize_1.Op.like]: pattern.toLowerCase(),
            }),
            (0, sequelize_1.where)((0, sequelize_1.fn)('lower', (0, sequelize_1.col)('player.last_name')), {
                [sequelize_1.Op.like]: pattern.toLowerCase(),
            }),
        ];
    }
    const { count, rows } = await contract_model_1.Contract.findAndCountAll({
        where,
        include: CONTRACT_INCLUDES,
        limit,
        offset,
        order: [[sort, order]],
        distinct: true,
    });
    const data = rows.map(enrichContract);
    return { data, meta: (0, pagination_1.buildMeta)(count, page, limit) };
}
// ────────────────────────────────────────────────────────────
// Get Contract by ID (with milestones)
// ────────────────────────────────────────────────────────────
async function getContractById(id) {
    const contract = await contract_model_1.Contract.findByPk(id, {
        include: CONTRACT_INCLUDES,
    });
    if (!contract)
        throw new errorHandler_1.AppError('Contract not found', 404);
    const enriched = enrichContract(contract);
    // Fetch milestones via parameterized raw SQL
    const milestones = await database_1.sequelize.query(`SELECT ms.*
     FROM milestones ms
     JOIN commission_schedules cs ON ms.commission_schedule_id = cs.id
     WHERE cs.contract_id = $1
     ORDER BY ms.due_date`, { bind: [id], type: sequelize_1.QueryTypes.SELECT });
    return { ...enriched, milestones };
}
// ────────────────────────────────────────────────────────────
// Create Contract
// ────────────────────────────────────────────────────────────
async function createContract(input, createdBy) {
    const totalCommission = input.commissionPct && input.baseSalary
        ? (input.baseSalary * input.commissionPct) / 100
        : 0;
    const contract = await contract_model_1.Contract.create({
        playerId: input.playerId,
        clubId: input.clubId,
        category: input.category,
        title: input.title,
        startDate: input.startDate,
        endDate: input.endDate,
        baseSalary: input.baseSalary,
        salaryCurrency: input.salaryCurrency,
        signingBonus: input.signingBonus,
        releaseClause: input.releaseClause,
        performanceBonus: input.performanceBonus,
        commissionPct: input.commissionPct,
        totalCommission,
        createdBy,
    });
    return getContractById(contract.id);
}
// ────────────────────────────────────────────────────────────
// Update Contract
// ────────────────────────────────────────────────────────────
async function updateContract(id, input) {
    const contract = await contract_model_1.Contract.findByPk(id);
    if (!contract)
        throw new errorHandler_1.AppError('Contract not found', 404);
    const newPct = input.commissionPct ?? contract.commissionPct;
    const newSalary = input.baseSalary ?? contract.baseSalary;
    const updateData = { ...input };
    if (input.commissionPct !== undefined || input.baseSalary !== undefined) {
        updateData.totalCommission =
            newPct && newSalary ? (Number(newSalary) * Number(newPct)) / 100 : contract.totalCommission;
    }
    await contract.update(updateData);
    return getContractById(id);
}
// ────────────────────────────────────────────────────────────
// Delete Contract
// ────────────────────────────────────────────────────────────
async function deleteContract(id) {
    const contract = await contract_model_1.Contract.findByPk(id);
    if (!contract)
        throw new errorHandler_1.AppError('Contract not found', 404);
    await contract.destroy();
    return { id };
}
//# sourceMappingURL=contract.service.js.map