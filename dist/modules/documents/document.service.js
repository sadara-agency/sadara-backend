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
        where, limit, offset, order: [[sort, order]], subQuery: false,
        include: [
            { model: player_model_1.Player, as: 'player', attributes: [...PLAYER_ATTRS] },
            { model: user_model_1.User, as: 'uploader', attributes: [...USER_ATTRS] },
        ],
    });
    return { data: rows, meta: (0, pagination_1.buildMeta)(count, page, limit) };
}
async function getDocumentById(id) {
    const doc = await document_model_1.Document.findByPk(id, {
        include: [
            { model: player_model_1.Player, as: 'player', attributes: [...PLAYER_ATTRS] },
            { model: user_model_1.User, as: 'uploader', attributes: [...USER_ATTRS] },
        ],
    });
    if (!doc)
        throw new errorHandler_1.AppError('Document not found', 404);
    return doc;
}
async function createDocument(input, userId) {
    if (input.playerId) {
        const player = await player_model_1.Player.findByPk(input.playerId);
        if (!player)
            throw new errorHandler_1.AppError('Player not found', 404);
    }
    return await document_model_1.Document.create({ ...input, uploadedBy: userId });
}
async function updateDocument(id, input) {
    const doc = await document_model_1.Document.findByPk(id);
    if (!doc)
        throw new errorHandler_1.AppError('Document not found', 404);
    return await doc.update(input);
}
async function deleteDocument(id) {
    const doc = await document_model_1.Document.findByPk(id);
    if (!doc)
        throw new errorHandler_1.AppError('Document not found', 404);
    await doc.destroy();
    return { id };
}
//# sourceMappingURL=document.service.js.map