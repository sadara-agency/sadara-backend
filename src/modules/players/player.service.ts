import { Op, Sequelize, QueryTypes } from 'sequelize';
import { Player } from './player.model';
import { Club } from '../clubs/club.model';
import { User } from '../Users/user.model';
import { AppError } from '../../middleware/errorHandler';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';
import { sequelize } from '../../config/database';

// ── List Players (enriched with computed fields) ──
export async function listPlayers(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(queryParams, 'createdAt');

  const where: any = {};

  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.playerType) where.playerType = queryParams.playerType;
  if (queryParams.clubId) where.currentClubId = queryParams.clubId;
  if (queryParams.position) where.position = queryParams.position;
  if (queryParams.nationality) where.nationality = queryParams.nationality;

  if (search) {
    where[Op.or] = [
      { firstName: { [Op.iLike]: `%${search}%` } },
      { lastName: { [Op.iLike]: `%${search}%` } },
      { firstNameAr: { [Op.iLike]: `%${search}%` } },
      { lastNameAr: { [Op.iLike]: `%${search}%` } },
      Sequelize.where(
        Sequelize.fn('concat', Sequelize.col('Player.first_name'), ' ', Sequelize.col('Player.last_name')),
        { [Op.iLike]: `%${search}%` }
      ),
    ];
  }

  const { count, rows } = await Player.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    attributes: {
      include: [
        // ── Full Arabic Name (computed) ──
        [
          Sequelize.literal(`COALESCE(
            NULLIF(CONCAT("Player".first_name_ar, ' ', "Player".last_name_ar), ' '),
            CONCAT("Player".first_name, ' ', "Player".last_name)
          )`),
          'full_name_ar',
        ],
        // ── Full English Name ──
        [
          Sequelize.literal(`CONCAT("Player".first_name, ' ', "Player".last_name)`),
          'full_name',
        ],
        // ── Age (computed from date_of_birth) ──
        [
          Sequelize.literal(`EXTRACT(YEAR FROM age(CURRENT_DATE, "Player".date_of_birth))::int`),
          'computed_age',
        ],
        // ── Contract Status (from most recent active contract) ──
        [
          Sequelize.literal(`(
            SELECT
              CASE
                WHEN c.end_date IS NULL THEN 'Active'
                WHEN c.end_date < CURRENT_DATE THEN 'Expired'
                WHEN c.end_date < CURRENT_DATE + INTERVAL '90 days' THEN 'Expiring Soon'
                ELSE 'Active'
              END
            FROM contracts c
            WHERE c.player_id = "Player".id
            ORDER BY c.end_date DESC NULLS FIRST
            LIMIT 1
          )`),
          'contract_status',
        ],
        // ── Contract End Date ──
        [
          Sequelize.literal(`(
            SELECT c.end_date::text
            FROM contracts c
            WHERE c.player_id = "Player".id
            ORDER BY c.end_date DESC NULLS FIRST
            LIMIT 1
          )`),
          'contract_end',
        ],
        // ── Commission Rate ──
        // ── Commission Rate (from contracts.commission_pct) ──
        [
          Sequelize.literal(`(
    SELECT c.commission_pct
    FROM contracts c
    WHERE c.player_id = "Player".id AND c.commission_pct IS NOT NULL
    ORDER BY c.created_at DESC
    LIMIT 1
  )`),
          'commission_rate',
        ],
        // ── Total Matches Played ──
        [
          Sequelize.literal(`(
            SELECT COUNT(*)::int
            FROM match_players mp
            WHERE mp.player_id = "Player".id
          )`),
          'matches',
        ],
        // ── Total Goals ──
        [
          Sequelize.literal(`(
            SELECT COALESCE(SUM(mp.goals), 0)::int
            FROM match_players mp
            WHERE mp.player_id = "Player".id
          )`),
          'goals',
        ],
        // ── Total Assists ──
        [
          Sequelize.literal(`(
            SELECT COALESCE(SUM(mp.assists), 0)::int
            FROM match_players mp
            WHERE mp.player_id = "Player".id
          )`),
          'assists',
        ],
        // ── Average Rating ──
        [
          Sequelize.literal(`(
            SELECT ROUND(AVG(mp.rating), 1)
            FROM match_players mp
            WHERE mp.player_id = "Player".id AND mp.rating IS NOT NULL
          )`),
          'rating',
        ],
        // ── Minutes Played ──
        [
          Sequelize.literal(`(
            SELECT COALESCE(SUM(mp.minutes_played), 0)::int
            FROM match_players mp
            WHERE mp.player_id = "Player".id
          )`),
          'minutes_played',
        ],
        // ── Latest Performance Score ──
        [
          Sequelize.literal(`(
            SELECT perf.average_rating
            FROM performances perf
            WHERE perf.player_id = "Player".id
            ORDER BY perf.created_at DESC
            LIMIT 1
          )`),
          'performance',
        ],
      ],
    },
    include: [
      { model: Club, as: 'club', attributes: ['id', 'name', 'nameAr', 'logoUrl'] },
      { model: User, as: 'agent', attributes: ['id', 'fullName'] },
    ],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Get Player by ID (With Aggregates) ──
export async function getPlayerById(id: string) {
  const player = await Player.findByPk(id, {
    attributes: {
      include: [
        [
          Sequelize.literal(`COALESCE(
            NULLIF(CONCAT("Player".first_name_ar, ' ', "Player".last_name_ar), ' '),
            CONCAT("Player".first_name, ' ', "Player".last_name)
          )`),
          'full_name_ar',
        ],
        [
          Sequelize.literal(`CONCAT("Player".first_name, ' ', "Player".last_name)`),
          'full_name',
        ],
        [
          Sequelize.literal(`EXTRACT(YEAR FROM age(CURRENT_DATE, "Player".date_of_birth))::int`),
          'computed_age',
        ],
        [
          Sequelize.literal(`(
            SELECT CASE
              WHEN c.end_date IS NULL THEN 'Active'
              WHEN c.end_date < CURRENT_DATE THEN 'Expired'
              WHEN c.end_date < CURRENT_DATE + INTERVAL '90 days' THEN 'Expiring Soon'
              ELSE 'Active'
            END
            FROM contracts c WHERE c.player_id = "Player".id
            ORDER BY c.end_date DESC NULLS FIRST LIMIT 1
          )`),
          'contract_status',
        ],
        [
          Sequelize.literal(`(SELECT c.end_date::text FROM contracts c WHERE c.player_id = "Player".id ORDER BY c.end_date DESC NULLS FIRST LIMIT 1)`),
          'contract_end',
        ],
        [
          Sequelize.literal(`(SELECT COUNT(*)::int FROM match_players mp WHERE mp.player_id = "Player".id)`),
          'matches',
        ],
        [
          Sequelize.literal(`(SELECT COALESCE(SUM(mp.goals), 0)::int FROM match_players mp WHERE mp.player_id = "Player".id)`),
          'goals',
        ],
        [
          Sequelize.literal(`(SELECT COALESCE(SUM(mp.assists), 0)::int FROM match_players mp WHERE mp.player_id = "Player".id)`),
          'assists',
        ],
        [
          Sequelize.literal(`(SELECT ROUND(AVG(mp.rating), 1) FROM match_players mp WHERE mp.player_id = "Player".id AND mp.rating IS NOT NULL)`),
          'rating',
        ],
        [
          Sequelize.literal(`(SELECT COALESCE(SUM(mp.minutes_played), 0)::int FROM match_players mp WHERE mp.player_id = "Player".id)`),
          'minutes_played',
        ],
        [
          Sequelize.literal(`(SELECT perf.average_rating FROM performances perf  WHERE perf.player_id = "Player".id ORDER BY perf.created_at DESC LIMIT 1)`),
          'performance',
        ],
      ],
    },
    include: ['club', 'agent'],
  });

  if (!player) throw new AppError('Player not found', 404);

  // Sidebar counters
  const [activeContracts, activeInjuries, openTasks] = await Promise.all([
    sequelize.models.Contract?.count({ where: { playerId: id, status: 'Active' } }).catch(() => 0),
    sequelize.models.Injury?.count({ where: { playerId: id, status: 'UnderTreatment' } }).catch(() => 0),
    sequelize.models.Task?.count({ where: { playerId: id, status: 'Open' } }).catch(() => 0),
  ]);

  // Performance history (monthly averages)
  const performanceHistory = await sequelize.query(`
    SELECT
      TO_CHAR(perf.created_at, 'YYYY-MM') as month,
      ROUND(AVG(perf.average_rating), 1) as rating
    FROM performances perf
    WHERE perf.player_id = :id
    GROUP BY TO_CHAR(perf.created_at, 'YYYY-MM')
    ORDER BY month DESC
    LIMIT 12
  `, { replacements: { id }, type: QueryTypes.SELECT }).catch(() => []);

  return {
    ...player.get({ plain: true }),
    counts: { activeContracts, activeInjuries, openTasks },
    performance_history: performanceHistory,
  };
}

// ── Create/Update/Delete ──
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