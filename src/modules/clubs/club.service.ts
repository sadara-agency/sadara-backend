import { Op, Sequelize, QueryTypes } from 'sequelize';
import { Club } from './club.model';
import { sequelize } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';

// ── List Clubs (with aggregated financial data) ──
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
        // Player count
        [
          Sequelize.literal(`(SELECT COUNT(*) FROM players p WHERE p.current_club_id = "Club".id)`),
          'player_count',
        ],
        // Active contracts count
        [
          Sequelize.literal(`(SELECT COUNT(*) FROM contracts ct WHERE ct.club_id = "Club".id AND ct.status = 'Active')`),
          'active_contracts',
        ],
        // Total contract value (using base_salary)
        [
          Sequelize.literal(`(SELECT COALESCE(SUM(ct.base_salary), 0) FROM contracts ct WHERE ct.club_id = "Club".id)`),
          'total_contract_value',
        ],
        // Total commission (pre-calculated column)
        [
          Sequelize.literal(`(SELECT COALESCE(SUM(ct.total_commission), 0) FROM contracts ct WHERE ct.club_id = "Club".id)`),
          'total_commission',
        ],
      ],
    },
    order: [[sort, order]],
    limit,
    offset,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Get Club by ID (Full detail with players, contracts, contacts) ──
export async function getClubById(id: string) {
  const club = await Club.findByPk(id, {
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
        [
          Sequelize.literal(`(SELECT COALESCE(SUM(ct.base_salary), 0) FROM contracts ct WHERE ct.club_id = "Club".id)`),
          'total_contract_value',
        ],
        [
          Sequelize.literal(`(SELECT COALESCE(SUM(ct.total_commission), 0) FROM contracts ct WHERE ct.club_id = "Club".id)`),
          'total_commission',
        ],
      ],
    },
  });

  if (!club) throw new AppError('Club not found', 404);

  // Fetch related entities in parallel
  const [contacts, players, contracts] = await Promise.all([
    sequelize.query(
      `SELECT id, name, role, email, phone, is_primary 
       FROM contacts WHERE club_id = :id ORDER BY is_primary DESC`,
      { replacements: { id }, type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT p.id, 
              CONCAT(p.first_name, ' ', p.last_name) AS name,
              CONCAT(p.first_name_ar, ' ', p.last_name_ar) AS name_ar,
              p.position, p.status, p.market_value, p.jersey_number,
              p.photo_url,
              (SELECT ct.end_date FROM contracts ct WHERE ct.player_id = p.id AND ct.club_id = :id AND ct.status = 'Active' ORDER BY ct.end_date DESC LIMIT 1) AS contract_end
       FROM players p 
       WHERE p.current_club_id = :id 
       ORDER BY p.first_name`,
      { replacements: { id }, type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT ct.id, ct.base_salary AS total_value, ct.commission_pct AS commission_rate, 
              ct.status, ct.category, ct.start_date, ct.end_date,
              COALESCE(ct.total_commission, ROUND(ct.base_salary * ct.commission_pct / 100, 2)) AS commission_value,
              CONCAT(p.first_name, ' ', p.last_name) AS player_name
       FROM contracts ct
       LEFT JOIN players p ON p.id = ct.player_id
       WHERE ct.club_id = :id
       ORDER BY ct.end_date DESC`,
      { replacements: { id }, type: QueryTypes.SELECT }
    ),
  ]);

  return { 
    ...club.get({ plain: true }), 
    contacts, 
    players, 
    contracts 
  };
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