import { Op, Sequelize, QueryTypes } from 'sequelize';
import { Club } from './club.model';
import { sequelize } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';

// ── List Clubs ──
export async function listClubs(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(queryParams, 'name');

  const where: any = {};

  if (queryParams.type) where.type = queryParams.type;
  if (queryParams.country) where.country = { [Op.iLike]: `%${queryParams.country}%` };

  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { nameAr: { [Op.iLike]: `%${search}%` } },
      { city: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Club.findAndCountAll({
    where,
    attributes: {
      include: [
        [
          Sequelize.literal(`(SELECT COUNT(*) FROM players p WHERE p.current_club_id = "Club".id)`),
          'player_count',
        ],
        [
          Sequelize.literal(`(SELECT COUNT(*) FROM contracts ct WHERE ct.club_id = "Club".id AND ct.status = 'Active')`),
          'active_contracts',
        ],
      ],
    },
    order: [[sort, order]],
    limit,
    offset,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Get Club by ID ──
export async function getClubById(id: string) {
  const club = await Club.findByPk(id, {
    attributes: {
      include: [
        [
          Sequelize.literal(`(SELECT COUNT(*) FROM players p WHERE p.current_club_id = "Club".id)`),
          'player_count',
        ],
      ],
    },
  });

  if (!club) throw new AppError('Club not found', 404);

  const contacts = await sequelize.query(
    `SELECT * FROM contacts WHERE club_id = :id ORDER BY is_primary DESC`,
    { replacements: { id }, type: QueryTypes.SELECT }
  );

  return { ...club.get({ plain: true }), contacts };
}

// ── Create Club ──
export async function createClub(input: any) {
  return await Club.create(input);
}

// ── Update Club ──
export async function updateClub(id: string, input: any) {
  const club = await Club.findByPk(id);
  if (!club) throw new AppError('Club not found', 404);
  return await club.update(input);
}

// ── Delete Club ──
export async function deleteClub(id: string) {
  const deleted = await Club.destroy({ where: { id } });
  if (!deleted) throw new AppError('Club not found', 404);
  return { id };
}
