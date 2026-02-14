import { Op, Sequelize } from 'sequelize';
import { Player } from './player.model';
import { Club } from '../clubs/club.model';
import { User } from '../Users/user.model';
import { AppError } from '../../middleware/errorHandler';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';

// ── List Players ──
export async function listPlayers(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(queryParams, 'createdAt');

  const where: any = {};
  
  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.playerType) where.playerType = queryParams.playerType;
  if (queryParams.clubId) where.currentClubId = queryParams.clubId;
  
  if (search) {
    where[Op.or] = [
      { firstName: { [Op.iLike]: `%${search}%` } },
      { lastName: { [Op.iLike]: `%${search}%` } },
      Sequelize.where(
        Sequelize.fn('concat', Sequelize.col('first_name'), ' ', Sequelize.col('last_name')),
        { [Op.iLike]: `%${search}%` }
      )
    ];
  }

  const { count, rows } = await Player.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    include: [
      { model: Club, as: 'club', attributes: ['name', 'logoUrl'] },
      { model: User, as: 'agent', attributes: ['fullName'] }
    ]
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Get Player by ID (With Aggregates) ──
export async function getPlayerById(id: string) {
  const player = await Player.findByPk(id, {
    include: ['club', 'agent', 'riskRadar']
  });

  if (!player) throw new AppError('Player not found', 404);

  // Use Promise.all with Model.count() for the sidebar counters
  const [activeContracts, activeInjuries, openTasks] = await Promise.all([
    sequelize.model('Contract').count({ where: { playerId: id, status: 'Active' } }),
    sequelize.model('Injury').count({ where: { playerId: id, status: 'UnderTreatment' } }),
    sequelize.model('Task').count({ where: { playerId: id, status: 'Open' } }),
  ]);

  return {
    ...player.get({ plain: true }),
    counts: { activeContracts, activeInjuries, openTasks }
  };
}

// ── Create/Update/Delete (Simplified) ──
export async function createPlayer(input: any, createdBy: string) {
  return await Player.create({ ...input, createdBy });
}

export async function updatePlayer(id: string, input: any) {
  const player = await Player.findByPk(id);
  if (!player) throw new AppError('Player not found', 404);
  return await player.update(input);
}

export async function deletePlayer(id: string) {
  const deleted = await Player.destroy({ where: { id } });
  if (!deleted) throw new AppError('Player not found', 404);
  return { id };
}