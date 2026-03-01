import { Op } from 'sequelize';
import { Injury, InjuryUpdate } from './injury.model';
import { Player } from '../players/player.model';
import { Match } from '../matches/match.model';
import { AppError } from '../../middleware/errorHandler';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';
import { notifyByRole } from '../notifications/notification.service';
import { logger } from '../../config/logger';
import type { CreateInjuryInput, UpdateInjuryInput, AddInjuryUpdateInput } from './injury.schema';

const PLAYER_ATTRS = ['id', 'firstName', 'lastName', 'firstNameAr', 'lastNameAr', 'position', 'photoUrl'] as const;

// ── List ──

export async function listInjuries(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(queryParams, 'injuryDate');
  const where: any = {};

  if (queryParams.playerId) where.playerId = queryParams.playerId;
  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.severity) where.severity = queryParams.severity;

  if (queryParams.from || queryParams.to) {
    where.injuryDate = {};
    if (queryParams.from) where.injuryDate[Op.gte] = queryParams.from;
    if (queryParams.to) where.injuryDate[Op.lte] = queryParams.to;
  }

  if (search) {
    where[Op.or] = [
      { injuryType: { [Op.iLike]: `%${search}%` } },
      { bodyPart: { [Op.iLike]: `%${search}%` } },
      { diagnosis: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Injury.findAndCountAll({
    where, limit, offset,
    order: [[sort, order]],
    include: [
      { model: Player, as: 'player', attributes: [...PLAYER_ATTRS] },
    ],
    distinct: true,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Get by ID ──

export async function getInjuryById(id: string) {
  const injury = await Injury.findByPk(id, {
    include: [
      { model: Player, as: 'player', attributes: [...PLAYER_ATTRS] },
      { model: Match, as: 'match', attributes: ['id', 'competition', 'matchDate', 'status'], required: false },
      { model: InjuryUpdate, as: 'updates', separate: true, order: [['updateDate', 'DESC']] },
    ],
  });
  if (!injury) throw new AppError('Injury not found', 404);
  return injury;
}

// ── Get by Player ──

export async function getPlayerInjuries(playerId: string) {
  return Injury.findAll({
    where: { playerId },
    order: [['injuryDate', 'DESC']],
    include: [
      { model: InjuryUpdate, as: 'updates', separate: true, order: [['updateDate', 'DESC']], limit: 3 },
    ],
  });
}

// ── Create ──

export async function createInjury(input: CreateInjuryInput, createdBy: string) {
  const player = await Player.findByPk(input.playerId);
  if (!player) throw new AppError('Player not found', 404);

  if (input.matchId) {
    const match = await Match.findByPk(input.matchId);
    if (!match) throw new AppError('Match not found', 404);
  }

  const injury = await Injury.create({ ...input, createdBy } as any);

  // Update player status to injured
  await player.update({ status: 'injured' });

  // ── Push notification (non-blocking — won't crash the endpoint) ──
  const playerName = `${player.firstName} ${player.lastName}`.trim();
  const playerNameAr = (player as any).firstNameAr
    ? `${(player as any).firstNameAr} ${(player as any).lastNameAr || ''}`.trim()
    : playerName;

  notifyByRole(['Admin', 'Manager'], {
    type: 'injury',
    title: `New injury logged: ${playerName} — ${input.injuryType}`,
    titleAr: `إصابة جديدة: ${playerNameAr} — ${input.injuryTypeAr || input.injuryType}`,
    body: `${input.severity || 'Moderate'} injury on ${input.injuryDate}. ${input.diagnosis || ''}`.trim(),
    bodyAr: `إصابة ${input.severity || 'Moderate'} بتاريخ ${input.injuryDate}`,
    link: '/dashboard/injuries',
    sourceType: 'injury',
    sourceId: injury.id,
    priority: input.severity === 'Critical' || input.severity === 'Severe' ? 'critical' : 'normal',
  }).catch(err => logger.error('Failed to send injury notification', err));

  return getInjuryById(injury.id);
}

// ── Update ──

export async function updateInjury(id: string, input: UpdateInjuryInput) {
  const injury = await Injury.findByPk(id);
  if (!injury) throw new AppError('Injury not found', 404);

  const updated = await injury.update(input as any);

  // If recovered, update player status back to active
  if (input.status === 'Recovered' && input.actualReturnDate) {
    const activeInjuries = await Injury.count({
      where: {
        playerId: injury.playerId,
        status: { [Op.in]: ['UnderTreatment', 'Relapsed'] },
        id: { [Op.ne]: id },
      },
    });
    if (activeInjuries === 0) {
      await Player.update({ status: 'active' }, { where: { id: injury.playerId } });
    }
  }

  return getInjuryById(updated.id);
}

// ── Add Progress Update ──

export async function addInjuryUpdate(injuryId: string, input: AddInjuryUpdateInput, userId: string) {
  const injury = await Injury.findByPk(injuryId);
  if (!injury) throw new AppError('Injury not found', 404);

  const update = await InjuryUpdate.create({
    injuryId,
    updateDate: new Date().toISOString().split('T')[0],
    status: input.status || null,
    notes: input.notes,
    notesAr: input.notesAr || null,
    updatedBy: userId,
  } as any);

  if (input.status && input.status !== injury.status) {
    await injury.update({ status: input.status });

    if (input.status === 'Recovered') {
      await injury.update({ actualReturnDate: new Date().toISOString().split('T')[0] });
      const activeCount = await Injury.count({
        where: {
          playerId: injury.playerId,
          status: { [Op.in]: ['UnderTreatment', 'Relapsed'] },
          id: { [Op.ne]: injuryId },
        },
      });
      if (activeCount === 0) {
        await Player.update({ status: 'active' }, { where: { id: injury.playerId } });
      }
    }
  }

  return update;
}

// ── Delete ──

export async function deleteInjury(id: string) {
  const injury = await Injury.findByPk(id);
  if (!injury) throw new AppError('Injury not found', 404);
  await injury.destroy();
  return { id };
}

// ── Stats ──

export async function getInjuryStats() {
  const [total, active, recovered] = await Promise.all([
    Injury.count(),
    Injury.count({ where: { status: { [Op.in]: ['UnderTreatment', 'Relapsed'] } } }),
    Injury.count({ where: { status: 'Recovered' } }),
  ]);
  return { total, active, recovered, chronic: total - active - recovered };
}