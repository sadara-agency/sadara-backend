"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listOffers = listOffers;
exports.getOfferById = getOfferById;
exports.getOffersByPlayer = getOffersByPlayer;
exports.createOffer = createOffer;
exports.updateOffer = updateOffer;
exports.updateOfferStatus = updateOfferStatus;
exports.deleteOffer = deleteOffer;
const sequelize_1 = require("sequelize");
const offer_model_1 = require("./offer.model");
const player_model_1 = require("../players/player.model");
const club_model_1 = require("../clubs/club.model");
const user_model_1 = require("../Users/user.model");
const errorHandler_1 = require("../../middleware/errorHandler");
const pagination_1 = require("../../shared/utils/pagination");
// ── List Offers ──
async function listOffers(queryParams) {
    const { limit, offset, page, sort, order, search } = (0, pagination_1.parsePagination)(queryParams, 'createdAt');
    const where = {};
    if (queryParams.status)
        where.status = queryParams.status;
    if (queryParams.offerType)
        where.offerType = queryParams.offerType;
    if (queryParams.playerId)
        where.playerId = queryParams.playerId;
    if (queryParams.fromClubId)
        where.fromClubId = queryParams.fromClubId;
    if (queryParams.toClubId)
        where.toClubId = queryParams.toClubId;
    if (search) {
        // Search across related player name and club names via subqueries
        where[sequelize_1.Op.or] = [
            { '$player.first_name$': { [sequelize_1.Op.iLike]: `%${search}%` } },
            { '$player.last_name$': { [sequelize_1.Op.iLike]: `%${search}%` } },
            { '$fromClub.name$': { [sequelize_1.Op.iLike]: `%${search}%` } },
            { '$toClub.name$': { [sequelize_1.Op.iLike]: `%${search}%` } },
        ];
    }
    const { count, rows } = await offer_model_1.Offer.findAndCountAll({
        where,
        limit,
        offset,
        order: [[sort, order]],
        include: [
            { model: player_model_1.Player, as: 'player', attributes: ['id', 'firstName', 'lastName', 'photoUrl', 'position'] },
            { model: club_model_1.Club, as: 'fromClub', attributes: ['id', 'name', 'nameAr', 'logoUrl'] },
            { model: club_model_1.Club, as: 'toClub', attributes: ['id', 'name', 'nameAr', 'logoUrl'] },
            { model: user_model_1.User, as: 'creator', attributes: ['id', 'fullName'] },
        ],
        subQuery: false,
    });
    return { data: rows, meta: (0, pagination_1.buildMeta)(count, page, limit) };
}
// ── Get Offer by ID ──
async function getOfferById(id) {
    const offer = await offer_model_1.Offer.findByPk(id, {
        include: [
            { model: player_model_1.Player, as: 'player', attributes: ['id', 'firstName', 'lastName', 'photoUrl', 'position', 'currentClubId'] },
            { model: club_model_1.Club, as: 'fromClub', attributes: ['id', 'name', 'nameAr', 'logoUrl', 'league'] },
            { model: club_model_1.Club, as: 'toClub', attributes: ['id', 'name', 'nameAr', 'logoUrl', 'league'] },
            { model: user_model_1.User, as: 'creator', attributes: ['id', 'fullName'] },
        ],
    });
    if (!offer)
        throw new errorHandler_1.AppError('Offer not found', 404);
    return offer;
}
// ── Get Offers by Player ──
async function getOffersByPlayer(playerId) {
    const offers = await offer_model_1.Offer.findAll({
        where: { playerId },
        order: [['createdAt', 'DESC']],
        include: [
            { model: club_model_1.Club, as: 'fromClub', attributes: ['id', 'name', 'logoUrl'] },
            { model: club_model_1.Club, as: 'toClub', attributes: ['id', 'name', 'logoUrl'] },
        ],
    });
    return offers;
}
// ── Create Offer ──
async function createOffer(input, createdBy) {
    // Verify player exists
    const player = await player_model_1.Player.findByPk(input.playerId);
    if (!player)
        throw new errorHandler_1.AppError('Player not found', 404);
    // Verify clubs exist (if provided)
    if (input.fromClubId) {
        const club = await club_model_1.Club.findByPk(input.fromClubId);
        if (!club)
            throw new errorHandler_1.AppError('From-club not found', 404);
    }
    if (input.toClubId) {
        const club = await club_model_1.Club.findByPk(input.toClubId);
        if (!club)
            throw new errorHandler_1.AppError('To-club not found', 404);
    }
    return await offer_model_1.Offer.create({ ...input, createdBy });
}
// ── Update Offer ──
async function updateOffer(id, input) {
    const offer = await offer_model_1.Offer.findByPk(id);
    if (!offer)
        throw new errorHandler_1.AppError('Offer not found', 404);
    // Prevent updates on closed offers
    if (offer.status === 'Closed') {
        throw new errorHandler_1.AppError('Cannot update a closed offer', 400);
    }
    return await offer.update(input);
}
// ── Update Offer Status ──
async function updateOfferStatus(id, input) {
    const offer = await offer_model_1.Offer.findByPk(id);
    if (!offer)
        throw new errorHandler_1.AppError('Offer not found', 404);
    const updateData = { status: input.status };
    if (input.counterOffer)
        updateData.counterOffer = input.counterOffer;
    if (input.notes)
        updateData.notes = input.notes;
    // Set timestamps based on status transitions
    if (input.status === 'Under Review' || input.status === 'Negotiation') {
        updateData.respondedAt = new Date();
    }
    if (input.status === 'Closed') {
        updateData.closedAt = new Date();
    }
    return await offer.update(updateData);
}
// ── Delete Offer ──
async function deleteOffer(id) {
    const offer = await offer_model_1.Offer.findByPk(id);
    if (!offer)
        throw new errorHandler_1.AppError('Offer not found', 404);
    // Only allow deleting New or Draft offers
    if (offer.status !== 'New') {
        throw new errorHandler_1.AppError('Only new offers can be deleted', 400);
    }
    await offer.destroy();
    return { id };
}
//# sourceMappingURL=offer.service.js.map