"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDocuments = listDocuments;
exports.getDocumentById = getDocumentById;
exports.createDocument = createDocument;
exports.updateDocument = updateDocument;
exports.deleteDocument = deleteDocument;
const sequelize_1 = require("sequelize");
const document_model_1 = require("./document.model");
const player_model_1 = require("../players/player.model");
const user_model_1 = require("../Users/user.model");
const errorHandler_1 = require("../../middleware/errorHandler");
const pagination_1 = require("../../shared/utils/pagination");
const PLAYER_ATTRS = ['id', 'firstName', 'lastName', 'firstNameAr', 'lastNameAr', 'photoUrl'];
const USER_ATTRS = ['id', 'fullName'];
function docIncludes() {
    return [
        { model: player_model_1.Player, as: 'player', attributes: [...PLAYER_ATTRS] },
        { model: user_model_1.User, as: 'uploader', attributes: [...USER_ATTRS] },
    ];
}
/** Re-fetch with full includes. */
async function refetchWithIncludes(id) {
    return document_model_1.Document.findByPk(id, { include: docIncludes() });
}
// ── List ──
async function listDocuments(queryParams) {
    const { limit, offset, page, sort, order, search } = (0, pagination_1.parsePagination)(queryParams, 'createdAt');
    const where = {};
    if (queryParams.type)
        where.type = queryParams.type;
    if (queryParams.status)
        where.status = queryParams.status;
    if (queryParams.playerId)
        where.playerId = queryParams.playerId;
    if (search) {
        where[sequelize_1.Op.or] = [
            { name: { [sequelize_1.Op.iLike]: `%${search}%` } },
            { notes: { [sequelize_1.Op.iLike]: `%${search}%` } },
            { '$player.first_name$': { [sequelize_1.Op.iLike]: `%${search}%` } },
            { '$player.last_name$': { [sequelize_1.Op.iLike]: `%${search}%` } },
        ];
    }
    const { count, rows } = await document_model_1.Document.findAndCountAll({
        where, limit, offset,
        order: [[sort, order]],
        include: docIncludes(),
        subQuery: false,
    });
    return { data: rows, meta: (0, pagination_1.buildMeta)(count, page, limit) };
}
// ── Get by ID ──
async function getDocumentById(id) {
    const doc = await document_model_1.Document.findByPk(id, { include: docIncludes() });
    if (!doc)
        throw new errorHandler_1.AppError('Document not found', 404);
    return doc;
}
// ── Create (with real file data) ──
async function createDocument(input, userId) {
    if (input.playerId) {
        const player = await player_model_1.Player.findByPk(input.playerId);
        if (!player)
            throw new errorHandler_1.AppError('Player not found', 404);
    }
    const doc = await document_model_1.Document.create({ ...input, uploadedBy: userId });
    return refetchWithIncludes(doc.id);
}
// ── Update ──
async function updateDocument(id, input) {
    const doc = await document_model_1.Document.findByPk(id);
    if (!doc)
        throw new errorHandler_1.AppError('Document not found', 404);
    await doc.update(input);
    return refetchWithIncludes(id);
}
// ── Delete ──
async function deleteDocument(id) {
    const doc = await document_model_1.Document.findByPk(id);
    if (!doc)
        throw new errorHandler_1.AppError('Document not found', 404);
    await doc.destroy();
    return { id };
}
//# sourceMappingURL=document.service.js.map