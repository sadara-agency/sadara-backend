import { Op, Sequelize } from 'sequelize';
import { Offer } from './offer.model';
import { Player } from '../players/player.model';
import { Club } from '../clubs/club.model';
import { User } from '../Users/user.model';
import { AppError } from '../../middleware/errorHandler';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';

// ── List Offers ──

export async function listOffers(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(queryParams, 'createdAt');

  const where: any = {};

  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.offerType) where.offerType = queryParams.offerType;
  if (queryParams.playerId) where.playerId = queryParams.playerId;
  if (queryParams.fromClubId) where.fromClubId = queryParams.fromClubId;
  if (queryParams.toClubId) where.toClubId = queryParams.toClubId;

  if (search) {
    // Search across related player name and club names via subqueries
    where[Op.or] = [
      { '$player.first_name$': { [Op.iLike]: `%${search}%` } },
      { '$player.last_name$': { [Op.iLike]: `%${search}%` } },
      { '$fromClub.name$': { [Op.iLike]: `%${search}%` } },
      { '$toClub.name$': { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Offer.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    include: [
      { model: Player, as: 'player', attributes: ['id', 'firstName', 'lastName', 'photoUrl', 'position'] },
      { model: Club, as: 'fromClub', attributes: ['id', 'name', 'nameAr', 'logoUrl'] },
      { model: Club, as: 'toClub', attributes: ['id', 'name', 'nameAr', 'logoUrl'] },
      { model: User, as: 'creator', attributes: ['id', 'fullName'] },
    ],
    subQuery: false,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Get Offer by ID ──

export async function getOfferById(id: string) {
  const offer = await Offer.findByPk(id, {
    include: [
      { model: Player, as: 'player', attributes: ['id', 'firstName', 'lastName', 'photoUrl', 'position', 'currentClubId'] },
      { model: Club, as: 'fromClub', attributes: ['id', 'name', 'nameAr', 'logoUrl', 'league'] },
      { model: Club, as: 'toClub', attributes: ['id', 'name', 'nameAr', 'logoUrl', 'league'] },
      { model: User, as: 'creator', attributes: ['id', 'fullName'] },
    ],
  });

  if (!offer) throw new AppError('Offer not found', 404);

  return offer;
}

// ── Get Offers by Player ──

export async function getOffersByPlayer(playerId: string) {
  const offers = await Offer.findAll({
    where: { playerId },
    order: [['createdAt', 'DESC']],
    include: [
      { model: Club, as: 'fromClub', attributes: ['id', 'name', 'logoUrl'] },
      { model: Club, as: 'toClub', attributes: ['id', 'name', 'logoUrl'] },
    ],
  });

  return offers;
}

// ── Create Offer ──

export async function createOffer(input: any, createdBy: string) {
  // Verify player exists
  const player = await Player.findByPk(input.playerId);
  if (!player) throw new AppError('Player not found', 404);

  // Verify clubs exist (if provided)
  if (input.fromClubId) {
    const club = await Club.findByPk(input.fromClubId);
    if (!club) throw new AppError('From-club not found', 404);
  }
  if (input.toClubId) {
    const club = await Club.findByPk(input.toClubId);
    if (!club) throw new AppError('To-club not found', 404);
  }

  return await Offer.create({ ...input, createdBy });
}

// ── Update Offer ──

export async function updateOffer(id: string, input: any) {
  const offer = await Offer.findByPk(id);
  if (!offer) throw new AppError('Offer not found', 404);

  // Prevent updates on closed offers
  if (offer.status === 'Closed') {
    throw new AppError('Cannot update a closed offer', 400);
  }

  return await offer.update(input);
}

// ── Update Offer Status ──

export async function updateOfferStatus(id: string, input: { status: string; counterOffer?: object; notes?: string }) {
  const offer = await Offer.findByPk(id);
  if (!offer) throw new AppError('Offer not found', 404);

  const updateData: any = { status: input.status };

  if (input.counterOffer) updateData.counterOffer = input.counterOffer;
  if (input.notes) updateData.notes = input.notes;

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

export async function deleteOffer(id: string) {
  const offer = await Offer.findByPk(id);
  if (!offer) throw new AppError('Offer not found', 404);

  // Only allow deleting New or Draft offers
  if (offer.status !== 'New') {
    throw new AppError('Only new offers can be deleted', 400);
  }

  await offer.destroy();
  return { id };
}