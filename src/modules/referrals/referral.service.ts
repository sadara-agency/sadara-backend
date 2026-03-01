import { Op } from 'sequelize';
import { Referral, type ReferralAttributes } from './referral.model';
import { Player } from '../players/player.model';
import { User } from '../Users/user.model';
import { AppError } from '../../middleware/errorHandler';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';
import { notifyByRole, notifyUser } from '../notifications/notification.service';
import { logger } from '../../config/logger';

const PLAYER_ATTRS = ['id', 'firstName', 'lastName', 'firstNameAr', 'lastNameAr', 'photoUrl', 'position'] as const;
const USER_ATTRS = ['id', 'fullName', 'fullNameAr'] as const;

function referralIncludes() {
  return [
    { model: Player, as: 'player', attributes: [...PLAYER_ATTRS] },
    { model: User, as: 'assignee', attributes: [...USER_ATTRS] },
    { model: User, as: 'creator', attributes: [...USER_ATTRS] },
  ];
}

async function refetchWithIncludes(id: string) {
  return Referral.findByPk(id, { include: referralIncludes() });
}

// ── Access Control ──

function applyAccessFilter(where: any, userId: string, userRole: string) {
  if (userRole === 'Admin') return;

  const accessConditions = [
    { isRestricted: false },
    { restrictedTo: { [Op.contains]: [userId] } },
    { assignedTo: userId },
    { createdBy: userId },
  ];

  if (where[Op.or]) {
    const searchConditions = where[Op.or];
    delete where[Op.or];
    where[Op.and] = [
      { [Op.or]: searchConditions },
      { [Op.or]: accessConditions },
    ];
  } else {
    where[Op.or] = accessConditions;
  }
}

// ── List ──

export async function listReferrals(queryParams: any, userId: string, userRole: string) {
  const { limit, offset, page, sort, order, search } = parsePagination(queryParams, 'createdAt');
  const where: any = {};

  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.referralType) where.referralType = queryParams.referralType;
  if (queryParams.priority) where.priority = queryParams.priority;
  if (queryParams.playerId) where.playerId = queryParams.playerId;
  if (queryParams.assignedTo) where.assignedTo = queryParams.assignedTo;

  if (search) {
    where[Op.or] = [
      { triggerDesc: { [Op.iLike]: `%${search}%` } },
      { notes: { [Op.iLike]: `%${search}%` } },
      { outcome: { [Op.iLike]: `%${search}%` } },
      { '$player.first_name$': { [Op.iLike]: `%${search}%` } },
      { '$player.last_name$': { [Op.iLike]: `%${search}%` } },
    ];
  }

  applyAccessFilter(where, userId, userRole);

  const { count, rows } = await Referral.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    include: referralIncludes(),
    subQuery: false,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Get by ID ──

export async function getReferralById(id: string, userId: string, userRole: string) {
  const referral = await Referral.findByPk(id, { include: referralIncludes() });
  if (!referral) throw new AppError('Referral not found', 404);

  if (referral.isRestricted && userRole !== 'Admin') {
    const allowed = referral.restrictedTo || [];
    if (!allowed.includes(userId) && referral.assignedTo !== userId && referral.createdBy !== userId) {
      throw new AppError('Access denied: this referral is restricted', 403);
    }
  }

  return referral;
}

// ── Create ──

export async function createReferral(input: any, userId: string) {
  const player = await Player.findByPk(input.playerId);
  if (!player) throw new AppError('Player not found', 404);

  if (input.assignedTo) {
    const user = await User.findByPk(input.assignedTo);
    if (!user) throw new AppError('Assigned user not found', 404);
  }

  // Mental referrals are automatically restricted
  if (input.referralType === 'Mental') {
    input.isRestricted = true;
  }

  const referral = await Referral.create({
    ...input,
    createdBy: userId,
    assignedAt: input.assignedTo ? new Date() : null,
  });

  // ── Push notification (non-blocking) ──
  const playerName = `${player.firstName} ${player.lastName}`.trim();
  const playerNameAr = (player as any).firstNameAr
    ? `${(player as any).firstNameAr} ${(player as any).lastNameAr || ''}`.trim()
    : playerName;

  const typeLabel = input.referralType || 'General';

  // Notify managers
  notifyByRole(['Admin', 'Manager'], {
    type: 'referral',
    title: `New ${typeLabel} referral: ${playerName}`,
    titleAr: `إحالة ${typeLabel} جديدة: ${playerNameAr}`,
    body: input.triggerDesc || `${typeLabel} referral created for ${playerName}`,
    link: `/dashboard/referrals/${referral.id}`,
    sourceType: 'referral',
    sourceId: referral.id,
    priority: input.priority === 'Critical' ? 'critical' : input.priority === 'High' ? 'high' : 'normal',
  }).catch(err => logger.error('Failed to send referral notification', err));

  // Notify assignee directly
  if (input.assignedTo) {
    notifyUser(input.assignedTo, {
      type: 'referral',
      title: `Referral assigned to you: ${playerName}`,
      titleAr: `إحالة مسندة إليك: ${playerNameAr}`,
      body: input.triggerDesc || `${typeLabel} referral for ${playerName}`,
      link: `/dashboard/referrals/${referral.id}`,
      sourceType: 'referral',
      sourceId: referral.id,
      priority: input.priority === 'Critical' ? 'critical' : 'normal',
    }).catch(err => logger.error('Failed to send assignee notification', err));
  }

  return refetchWithIncludes(referral.id);
}

// ── Update ──

export async function updateReferral(id: string, input: any, userId: string, userRole: string) {
  const referral = await getReferralById(id, userId, userRole);

  if (referral.status === 'Resolved') {
    throw new AppError('Cannot modify a resolved referral', 400);
  }

  // Track assignment change
  if (input.assignedTo && input.assignedTo !== referral.assignedTo) {
    input.assignedAt = new Date();

    // Notify new assignee
    const player = referral.get('player') as any;
    const playerName = player ? `${player.firstName} ${player.lastName}`.trim() : '';

    notifyUser(input.assignedTo, {
      type: 'referral',
      title: `Referral reassigned to you: ${playerName}`,
      titleAr: `إحالة أعيد إسنادها إليك: ${playerName}`,
      link: `/dashboard/referrals/${id}`,
      sourceType: 'referral',
      sourceId: id,
      priority: 'normal',
    }).catch(err => logger.error('Failed to send reassignment notification', err));
  }

  await referral.update(input);
  return refetchWithIncludes(id);
}

// ── Update Status ──

export async function updateReferralStatus(id: string, input: any, userId: string, userRole: string) {
  const referral = await getReferralById(id, userId, userRole);

  const updateData: Partial<ReferralAttributes> = {
    status: input.status as ReferralAttributes['status'],
  };

  if (input.outcome) updateData.outcome = input.outcome;
  if (input.notes) updateData.notes = input.notes;

  if (input.status === 'Resolved') {
    updateData.resolvedAt = new Date();
  }

  // Notify on escalation
  if (input.status === 'Escalated') {
    const player = referral.get('player') as any;
    const playerName = player ? `${player.firstName} ${player.lastName}`.trim() : '';

    notifyByRole(['Admin'], {
      type: 'referral',
      title: `Referral ESCALATED: ${playerName}`,
      titleAr: `إحالة مصعّدة: ${playerName}`,
      body: input.notes || `Referral ${id} escalated`,
      link: `/dashboard/referrals/${id}`,
      sourceType: 'referral',
      sourceId: id,
      priority: 'critical',
    }).catch(err => logger.error('Failed to send escalation notification', err));
  }

  await referral.update(updateData);
  return refetchWithIncludes(id);
}

// ── Delete ──

export async function deleteReferral(id: string, userId: string, userRole: string) {
  const referral = await getReferralById(id, userId, userRole);

  if (referral.status === 'Resolved') {
    throw new AppError('Cannot delete a resolved referral', 400);
  }

  await referral.destroy();
  return { id };
}