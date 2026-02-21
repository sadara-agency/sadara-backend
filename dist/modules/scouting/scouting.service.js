"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listWatchlist = listWatchlist;
exports.getWatchlistById = getWatchlistById;
exports.createWatchlist = createWatchlist;
exports.updateWatchlist = updateWatchlist;
exports.updateWatchlistStatus = updateWatchlistStatus;
exports.deleteWatchlist = deleteWatchlist;
exports.createScreeningCase = createScreeningCase;
exports.getScreeningCase = getScreeningCase;
exports.updateScreeningCase = updateScreeningCase;
exports.markPackReady = markPackReady;
exports.createDecision = createDecision;
exports.getDecision = getDecision;
exports.getPipelineSummary = getPipelineSummary;
const sequelize_1 = require("sequelize");
const scouting_model_1 = require("./scouting.model");
const user_model_1 = require("../Users/user.model");
const errorHandler_1 = require("../../middleware/errorHandler");
const pagination_1 = require("../../shared/utils/pagination");
const USER_ATTRS = ['id', 'fullName', 'fullNameAr'];
// ══════════════════════════════════════════
// WATCHLIST
// ══════════════════════════════════════════
async function listWatchlist(queryParams) {
    const { limit, offset, page, sort, order, search } = (0, pagination_1.parsePagination)(queryParams, 'createdAt');
    const where = {};
    if (queryParams.status)
        where.status = queryParams.status;
    if (queryParams.priority)
        where.priority = queryParams.priority;
    if (queryParams.position)
        where.position = { [sequelize_1.Op.iLike]: `%${queryParams.position}%` };
    if (queryParams.nationality)
        where.nationality = { [sequelize_1.Op.iLike]: `%${queryParams.nationality}%` };
    if (search) {
        where[sequelize_1.Op.or] = [
            { prospectName: { [sequelize_1.Op.iLike]: `%${search}%` } },
            { prospectNameAr: { [sequelize_1.Op.iLike]: `%${search}%` } },
            { currentClub: { [sequelize_1.Op.iLike]: `%${search}%` } },
            { nationality: { [sequelize_1.Op.iLike]: `%${search}%` } },
            { position: { [sequelize_1.Op.iLike]: `%${search}%` } },
            { source: { [sequelize_1.Op.iLike]: `%${search}%` } },
        ];
    }
    const { count, rows } = await scouting_model_1.Watchlist.findAndCountAll({
        where, limit, offset,
        order: [[sort, order]],
        include: [
            { model: user_model_1.User, as: 'scout', attributes: [...USER_ATTRS] },
            { model: scouting_model_1.ScreeningCase, as: 'screeningCases', attributes: ['id', 'status', 'caseNumber'], required: false },
        ],
        subQuery: false,
    });
    return { data: rows, meta: (0, pagination_1.buildMeta)(count, page, limit) };
}
async function getWatchlistById(id) {
    const item = await scouting_model_1.Watchlist.findByPk(id, {
        include: [
            { model: user_model_1.User, as: 'scout', attributes: [...USER_ATTRS] },
            {
                model: scouting_model_1.ScreeningCase, as: 'screeningCases',
                include: [{ model: scouting_model_1.SelectionDecision, as: 'decisions' }],
            },
        ],
    });
    if (!item)
        throw new errorHandler_1.AppError('Watchlist entry not found', 404);
    return item;
}
async function createWatchlist(input, userId) {
    return await scouting_model_1.Watchlist.create({ ...input, scoutedBy: userId });
}
async function updateWatchlist(id, input) {
    const item = await scouting_model_1.Watchlist.findByPk(id);
    if (!item)
        throw new errorHandler_1.AppError('Watchlist entry not found', 404);
    return await item.update(input);
}
async function updateWatchlistStatus(id, status) {
    const item = await scouting_model_1.Watchlist.findByPk(id);
    if (!item)
        throw new errorHandler_1.AppError('Watchlist entry not found', 404);
    return await item.update({ status: status });
}
async function deleteWatchlist(id) {
    const item = await scouting_model_1.Watchlist.findByPk(id);
    if (!item)
        throw new errorHandler_1.AppError('Watchlist entry not found', 404);
    // Can't delete if has screening cases
    const cases = await scouting_model_1.ScreeningCase.count({ where: { watchlistId: id } });
    if (cases > 0)
        throw new errorHandler_1.AppError('Cannot delete: screening case(s) exist for this prospect', 400);
    await item.destroy();
    return { id };
}
// ══════════════════════════════════════════
// SCREENING CASES
// ══════════════════════════════════════════
async function createScreeningCase(input, userId) {
    const wl = await scouting_model_1.Watchlist.findByPk(input.watchlistId);
    if (!wl)
        throw new errorHandler_1.AppError('Watchlist entry not found', 404);
    if (wl.status === 'Rejected')
        throw new errorHandler_1.AppError('Cannot screen a rejected prospect', 400);
    // Check for existing open case
    const existing = await scouting_model_1.ScreeningCase.findOne({
        where: { watchlistId: input.watchlistId, status: { [sequelize_1.Op.ne]: 'Closed' } },
    });
    if (existing)
        throw new errorHandler_1.AppError('An open screening case already exists for this prospect', 409);
    // Auto-generate case number
    const count = await scouting_model_1.ScreeningCase.count();
    const caseNumber = `SC-${String(count + 1).padStart(5, '0')}`;
    // Move watchlist to Shortlisted
    if (wl.status === 'Active')
        await wl.update({ status: 'Shortlisted' });
    return await scouting_model_1.ScreeningCase.create({
        ...input,
        caseNumber,
        createdBy: userId,
    });
}
async function getScreeningCase(id) {
    const sc = await scouting_model_1.ScreeningCase.findByPk(id, {
        include: [
            { model: scouting_model_1.Watchlist, as: 'watchlist' },
            { model: scouting_model_1.SelectionDecision, as: 'decisions' },
            { model: user_model_1.User, as: 'preparer', attributes: [...USER_ATTRS] },
            { model: user_model_1.User, as: 'creator', attributes: [...USER_ATTRS] },
        ],
    });
    if (!sc)
        throw new errorHandler_1.AppError('Screening case not found', 404);
    return sc;
}
async function updateScreeningCase(id, input) {
    const sc = await scouting_model_1.ScreeningCase.findByPk(id);
    if (!sc)
        throw new errorHandler_1.AppError('Screening case not found', 404);
    if (sc.status === 'Closed')
        throw new errorHandler_1.AppError('Cannot modify a closed screening case', 400);
    return await sc.update(input);
}
async function markPackReady(id, userId) {
    const sc = await scouting_model_1.ScreeningCase.findByPk(id);
    if (!sc)
        throw new errorHandler_1.AppError('Screening case not found', 404);
    if (sc.status === 'Closed')
        throw new errorHandler_1.AppError('Case is closed', 400);
    // Verify prerequisites
    if (sc.identityCheck !== 'Verified')
        throw new errorHandler_1.AppError('Identity check must be verified first', 400);
    if (!sc.medicalClearance)
        throw new errorHandler_1.AppError('Medical clearance is required', 400);
    return await sc.update({
        isPackReady: true,
        packPreparedAt: new Date(),
        packPreparedBy: userId,
        status: 'PackReady',
    });
}
// ══════════════════════════════════════════
// SELECTION DECISIONS (Immutable)
// ══════════════════════════════════════════
async function createDecision(input, userId) {
    const sc = await scouting_model_1.ScreeningCase.findByPk(input.screeningCaseId, {
        include: [{ model: scouting_model_1.Watchlist, as: 'watchlist' }],
    });
    if (!sc)
        throw new errorHandler_1.AppError('Screening case not found', 404);
    if (!sc.isPackReady)
        throw new errorHandler_1.AppError('Pack must be ready before a decision can be made', 400);
    const decision = await scouting_model_1.SelectionDecision.create({
        ...input,
        recordedBy: userId,
    });
    // If Approved, close case; if Rejected, reject the watchlist entry
    if (input.decision === 'Approved') {
        await sc.update({ status: 'Closed' });
    }
    else if (input.decision === 'Rejected') {
        await sc.update({ status: 'Closed' });
        const wl = sc.watchlist;
        if (wl)
            await wl.update({ status: 'Rejected' });
    }
    return decision;
}
async function getDecision(id) {
    const d = await scouting_model_1.SelectionDecision.findByPk(id, {
        include: [
            { model: scouting_model_1.ScreeningCase, as: 'screeningCase', include: [{ model: scouting_model_1.Watchlist, as: 'watchlist' }] },
        ],
    });
    if (!d)
        throw new errorHandler_1.AppError('Decision not found', 404);
    return d;
}
// ── Pipeline Summary (for KPIs) ──
async function getPipelineSummary() {
    const [watchlist, screening, packReady, decisions] = await Promise.all([
        scouting_model_1.Watchlist.count({ where: { status: 'Active' } }),
        scouting_model_1.ScreeningCase.count({ where: { status: 'InProgress' } }),
        scouting_model_1.ScreeningCase.count({ where: { status: 'PackReady' } }),
        scouting_model_1.SelectionDecision.count(),
    ]);
    const shortlisted = await scouting_model_1.Watchlist.count({ where: { status: 'Shortlisted' } });
    const rejected = await scouting_model_1.Watchlist.count({ where: { status: 'Rejected' } });
    const total = await scouting_model_1.Watchlist.count();
    return { total, watchlist, shortlisted, screening, packReady, decisions, rejected };
}
//# sourceMappingURL=scouting.service.js.map