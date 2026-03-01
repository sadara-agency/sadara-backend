import { Op, Sequelize } from 'sequelize';
import { Offer } from './offer.model';
import { Player } from '../players/player.model';
import { Club } from '../clubs/club.model';
import { User } from '../Users/user.model';
import { AppError } from '../../middleware/errorHandler';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';
import { Contract } from '../contracts/contract.model';


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

// ── Convert Offer to Contract ──
export async function convertOfferToContract(offerId: string, createdBy: string) {
  const offer = await Offer.findByPk(offerId, {
    include: [
      { model: Player, as: 'player', attributes: ['id', 'firstName', 'lastName', 'currentClubId'] },
    ],
  });

  if (!offer) throw new AppError('Offer not found', 404);
  if (offer.status !== 'Closed') {
    throw new AppError('Only closed offers can be converted to contracts', 400);
  }

  // Check if already converted
  const plain = offer.get({ plain: true }) as any;
  if (plain.convertedContractId) {
    throw new AppError('This offer has already been converted to a contract', 400);
  }

  // Build contract dates
  const today = new Date();
  const endDate = new Date(today);
  endDate.setFullYear(endDate.getFullYear() + (offer.contractYears || 1));

  const contract = await Contract.create({
    playerId: offer.playerId,
    clubId: offer.toClubId || offer.fromClubId,
    contractType: 'Professional',
    status: 'Active',
    startDate: today.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    baseSalary: offer.salaryOffered || 0,
    salaryCurrency: offer.feeCurrency || 'SAR',
    signingBonus: offer.transferFee || 0,
    commissionPct: offer.agentFee ? Number(offer.agentFee) : 10,
    notes: `Auto-created from offer #${offerId}`,
    createdBy,
  } as any);

  // Link offer to contract
  await offer.update({
    convertedContractId: contract.id,
    convertedAt: new Date(),
  } as any);

  return { offer: await Offer.findByPk(offerId), contract };
}

