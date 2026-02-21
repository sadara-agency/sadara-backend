"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPlayers = listPlayers;
exports.getPlayerById = getPlayerById;
exports.createPlayer = createPlayer;
exports.updatePlayer = updatePlayer;
exports.deletePlayer = deletePlayer;
const sequelize_1 = require("sequelize");
const player_model_1 = require("./player.model");
const club_model_1 = require("../clubs/club.model");
const user_model_1 = require("../Users/user.model");
const errorHandler_1 = require("../../middleware/errorHandler");
const pagination_1 = require("../../shared/utils/pagination");
const database_1 = require("../../config/database");
// ── List Players (enriched with computed fields) ──
async function listPlayers(queryParams) {
    const { limit, offset, page, sort, order, search } = (0, pagination_1.parsePagination)(queryParams, 'createdAt');
    const where = {};
    if (queryParams.status)
        where.status = queryParams.status;
    if (queryParams.playerType)
        where.playerType = queryParams.playerType;
    if (queryParams.clubId)
        where.currentClubId = queryParams.clubId;
    if (queryParams.position)
        where.position = queryParams.position;
    if (queryParams.nationality)
        where.nationality = queryParams.nationality;
    if (search) {
        where[sequelize_1.Op.or] = [
            { firstName: { [sequelize_1.Op.iLike]: `%${search}%` } },
            { lastName: { [sequelize_1.Op.iLike]: `%${search}%` } },
            { firstNameAr: { [sequelize_1.Op.iLike]: `%${search}%` } },
            { lastNameAr: { [sequelize_1.Op.iLike]: `%${search}%` } },
            sequelize_1.Sequelize.where(sequelize_1.Sequelize.fn('concat', sequelize_1.Sequelize.col('Player.first_name'), ' ', sequelize_1.Sequelize.col('Player.last_name')), { [sequelize_1.Op.iLike]: `%${search}%` }),
        ];
    }
    const { count, rows } = await player_model_1.Player.findAndCountAll({
        where,
        limit,
        offset,
        order: [[sort, order]],
        attributes: {
            include: [
                // ── Full Arabic Name (computed) ──
                [
                    sequelize_1.Sequelize.literal(`COALESCE(
            NULLIF(CONCAT("Player".first_name_ar, ' ', "Player".last_name_ar), ' '),
            CONCAT("Player".first_name, ' ', "Player".last_name)
          )`),
                    'full_name_ar',
                ],
                // ── Full English Name ──
                [
                    sequelize_1.Sequelize.literal(`CONCAT("Player".first_name, ' ', "Player".last_name)`),
                    'full_name',
                ],
                // ── Age (computed from date_of_birth) ──
                [
                    sequelize_1.Sequelize.literal(`EXTRACT(YEAR FROM age(CURRENT_DATE, "Player".date_of_birth))::int`),
                    'computed_age',
                ],
                // ── Contract Status (from most recent active contract) ──
                [
                    sequelize_1.Sequelize.literal(`(
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
                    sequelize_1.Sequelize.literal(`(
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
                    sequelize_1.Sequelize.literal(`(
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
                    sequelize_1.Sequelize.literal(`(
            SELECT COUNT(*)::int
            FROM match_players mp
            WHERE mp.player_id = "Player".id
          )`),
                    'matches',
                ],
                // ── Total Goals ──
                [
                    sequelize_1.Sequelize.literal(`(
            SELECT COALESCE(SUM(mp.goals), 0)::int
            FROM match_players mp
            WHERE mp.player_id = "Player".id
          )`),
                    'goals',
                ],
                // ── Total Assists ──
                [
                    sequelize_1.Sequelize.literal(`(
            SELECT COALESCE(SUM(mp.assists), 0)::int
            FROM match_players mp
            WHERE mp.player_id = "Player".id
          )`),
                    'assists',
                ],
                // ── Average Rating ──
                [
                    sequelize_1.Sequelize.literal(`(
            SELECT ROUND(AVG(mp.rating), 1)
            FROM match_players mp
            WHERE mp.player_id = "Player".id AND mp.rating IS NOT NULL
          )`),
                    'rating',
                ],
                // ── Minutes Played ──
                [
                    sequelize_1.Sequelize.literal(`(
            SELECT COALESCE(SUM(mp.minutes_played), 0)::int
            FROM match_players mp
            WHERE mp.player_id = "Player".id
          )`),
                    'minutes_played',
                ],
                // ── Latest Performance Score ──
                [
                    sequelize_1.Sequelize.literal(`(
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
            { model: club_model_1.Club, as: 'club', attributes: ['id', 'name', 'nameAr', 'logoUrl'] },
            { model: user_model_1.User, as: 'agent', attributes: ['id', 'fullName'] },
        ],
    });
    return { data: rows, meta: (0, pagination_1.buildMeta)(count, page, limit) };
}
// ── Get Player by ID (With Aggregates) ──
async function getPlayerById(id) {
    const player = await player_model_1.Player.findByPk(id, {
        attributes: {
            include: [
                [
                    sequelize_1.Sequelize.literal(`COALESCE(
            NULLIF(CONCAT("Player".first_name_ar, ' ', "Player".last_name_ar), ' '),
            CONCAT("Player".first_name, ' ', "Player".last_name)
          )`),
                    'full_name_ar',
                ],
                [
                    sequelize_1.Sequelize.literal(`CONCAT("Player".first_name, ' ', "Player".last_name)`),
                    'full_name',
                ],
                [
                    sequelize_1.Sequelize.literal(`EXTRACT(YEAR FROM age(CURRENT_DATE, "Player".date_of_birth))::int`),
                    'computed_age',
                ],
                [
                    sequelize_1.Sequelize.literal(`(
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
                    sequelize_1.Sequelize.literal(`(SELECT c.end_date::text FROM contracts c WHERE c.player_id = "Player".id ORDER BY c.end_date DESC NULLS FIRST LIMIT 1)`),
                    'contract_end',
                ],
                [
                    sequelize_1.Sequelize.literal(`(SELECT COUNT(*)::int FROM match_players mp WHERE mp.player_id = "Player".id)`),
                    'matches',
                ],
                [
                    sequelize_1.Sequelize.literal(`(SELECT COALESCE(SUM(mp.goals), 0)::int FROM match_players mp WHERE mp.player_id = "Player".id)`),
                    'goals',
                ],
                [
                    sequelize_1.Sequelize.literal(`(SELECT COALESCE(SUM(mp.assists), 0)::int FROM match_players mp WHERE mp.player_id = "Player".id)`),
                    'assists',
                ],
                [
                    sequelize_1.Sequelize.literal(`(SELECT ROUND(AVG(mp.rating), 1) FROM match_players mp WHERE mp.player_id = "Player".id AND mp.rating IS NOT NULL)`),
                    'rating',
                ],
                [
                    sequelize_1.Sequelize.literal(`(SELECT COALESCE(SUM(mp.minutes_played), 0)::int FROM match_players mp WHERE mp.player_id = "Player".id)`),
                    'minutes_played',
                ],
                [
                    sequelize_1.Sequelize.literal(`(SELECT perf.average_rating FROM performances perf  WHERE perf.player_id = "Player".id ORDER BY perf.created_at DESC LIMIT 1)`),
                    'performance',
                ],
            ],
        },
        include: ['club', 'agent'],
    });
    if (!player)
        throw new errorHandler_1.AppError('Player not found', 404);
    // Sidebar counters
    const [activeContracts, activeInjuries, openTasks] = await Promise.all([
        database_1.sequelize.models.Contract?.count({ where: { playerId: id, status: 'Active' } }).catch(() => 0),
        database_1.sequelize.models.Injury?.count({ where: { playerId: id, status: 'UnderTreatment' } }).catch(() => 0),
        database_1.sequelize.models.Task?.count({ where: { playerId: id, status: 'Open' } }).catch(() => 0),
    ]);
    // Performance history (monthly averages)
    const performanceHistory = await database_1.sequelize.query(`
    SELECT
      TO_CHAR(perf.created_at, 'YYYY-MM') as month,
      ROUND(AVG(perf.average_rating), 1) as rating
    FROM performances perf
    WHERE perf.player_id = :id
    GROUP BY TO_CHAR(perf.created_at, 'YYYY-MM')
    ORDER BY month DESC
    LIMIT 12
  `, { replacements: { id }, type: sequelize_1.QueryTypes.SELECT }).catch(() => []);
    return {
        ...player.get({ plain: true }),
        counts: { activeContracts, activeInjuries, openTasks },
        performance_history: performanceHistory,
    };
}
// ── Create/Update/Delete ──
async function createPlayer(input, createdBy) {
    return await player_model_1.Player.create({ ...input, createdBy });
}
async function updatePlayer(id, input) {
    const player = await player_model_1.Player.findByPk(id);
    if (!player)
        throw new errorHandler_1.AppError('Player not found', 404);
    return await player.update(input);
}
async function deletePlayer(id) {
    const deleted = await player_model_1.Player.destroy({ where: { id } });
    if (!deleted)
        throw new errorHandler_1.AppError('Player not found', 404);
    return { id };
}
//# sourceMappingURL=player.service.js.map