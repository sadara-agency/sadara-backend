import { Op, Sequelize, fn, col } from 'sequelize';
import { Player } from './player.model';
import { Club } from '../clubs/club.model';
import { User } from '../Users/user.model';
import { AppError } from '../../middleware/errorHandler';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';
import { sequelize } from '../../config/database';

import { ListPlayersQuery } from './utils/player.types';
import { buildPlayerWhere } from './utils/player.filters';
import { fetchEnrichmentMaps } from './utils/player.enrichment';
import { toPlayerList } from './utils/player.serializer';

// ────────────────────────────────────────────────────
// List Players — enriched with contract/stats/injury data
// ────────────────────────────────────────────────────
export async function listPlayers(queryParams: ListPlayersQuery) {
  const { limit, offset, page, sort, order, search } = parsePagination(queryParams, 'createdAt');

  // 2. Build where clause (extracted to player.filters.ts)
  const where = buildPlayerWhere(queryParams, search);

  // 3. Query players with associations
  const { count, rows } = await Player.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    include: [
      { model: Club, as: 'club', attributes: ['id', 'name', 'nameAr', 'logoUrl', 'league'] },
      { model: User, as: 'agent', attributes: ['id', 'fullName', 'fullNameAr'] },
    ],
  });

  // 4. Early return for empty results
  const playerIds = rows.map((p) => p.id);
  if (playerIds.length === 0) {
    return { data: [], meta: buildMeta(count, page, limit) };
  }

  // 5. Batch-fetch related data (extracted to player.enrichment.ts)
  const maps = await fetchEnrichmentMaps(playerIds);

  // 6. Serialize to DTOs (extracted to player.serializer.ts)
  const plainPlayers = rows.map((p) => p.get({ plain: true }));
  const data = toPlayerList(plainPlayers, maps);

  return { data, meta: buildMeta(count, page, limit) };
}

// ────────────────────────────────────────────────────────────
// Get Player by ID (With Aggregates)
// ────────────────────────────────────────────────────────────
export async function getPlayerById(id: string) {
  const player = await Player.findByPk(id, {
    include: ['club', 'agent', 'riskRadar'],
  });

  if (!player) throw new AppError('Player not found', 404);

  const [activeContracts, activeInjuries, openTasks] = await Promise.all([
    sequelize.models.Contract.count({ where: { playerId: id, status: 'Active' } }),
    sequelize.models.Injury.count({ where: { playerId: id, status: 'UnderTreatment' } }),
    sequelize.models.Task.count({ where: { playerId: id, status: 'Open' } }),
  ]);

  return {
    ...player.get({ plain: true }),
    counts: { activeContracts, activeInjuries, openTasks },
  };
}


// ────────────────────────────────────────────────────
// Create / Update / Delete
// ────────────────────────────────────────────────────
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
