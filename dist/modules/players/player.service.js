"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPlayers = listPlayers;
exports.getPlayerById = getPlayerById;
exports.createPlayer = createPlayer;
exports.updatePlayer = updatePlayer;
exports.deletePlayer = deletePlayer;
exports.getPlayerProviders = getPlayerProviders;
exports.upsertPlayerProvider = upsertPlayerProvider;
exports.removePlayerProvider = removePlayerProvider;
const sequelize_1 = require("sequelize");
const player_model_1 = require("./player.model");
const club_model_1 = require("../clubs/club.model");
const user_model_1 = require("../Users/user.model");
const errorHandler_1 = require("../../middleware/errorHandler");
const pagination_1 = require("../../shared/utils/pagination");
const database_1 = require("../../config/database");
const externalProvider_model_1 = require("./externalProvider.model");
// ── Computed attribute fragments (reusable) ──
const COMPUTED_ATTRIBUTES = [
    [
        (0, sequelize_1.literal)(`COALESCE(
      NULLIF(CONCAT("Player".first_name_ar, ' ', "Player".last_name_ar), ' '),
      CONCAT("Player".first_name, ' ', "Player".last_name)
    )`),
        'full_name_ar',
    ],
    [
        (0, sequelize_1.literal)(`CONCAT("Player".first_name, ' ', "Player".last_name)`),
        'full_name',
    ],
    [
        (0, sequelize_1.literal)(`EXTRACT(YEAR FROM age(CURRENT_DATE, "Player".date_of_birth))::int`),
        'computed_age',
    ],
    [
        (0, sequelize_1.literal)(`(
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
        (0, sequelize_1.literal)(`(
      SELECT c.end_date::text FROM contracts c
      WHERE c.player_id = "Player".id
      ORDER BY c.end_date DESC NULLS FIRST LIMIT 1
    )`),
        'contract_end',
    ],
    [
        (0, sequelize_1.literal)(`(
      SELECT c.commission_pct FROM contracts c
      WHERE c.player_id = "Player".id AND c.commission_pct IS NOT NULL
      ORDER BY c.created_at DESC LIMIT 1
    )`),
        'commission_rate',
    ],
    [
        (0, sequelize_1.literal)(`(SELECT COUNT(*)::int FROM match_players mp WHERE mp.player_id = "Player".id)`),
        'matches',
    ],
    [
        (0, sequelize_1.literal)(`(SELECT COALESCE(SUM(pms.goals), 0)::int FROM player_match_stats pms WHERE pms.player_id = "Player".id)`),
        'goals',
    ],
    [
        (0, sequelize_1.literal)(`(SELECT COALESCE(SUM(pms.assists), 0)::int FROM player_match_stats pms WHERE pms.player_id = "Player".id)`),
        'assists',
    ],
    [
        (0, sequelize_1.literal)(`(SELECT ROUND(AVG(pms.rating), 1) FROM player_match_stats pms WHERE pms.player_id = "Player".id AND pms.rating IS NOT NULL)`),
        'rating',
    ],
    [
        (0, sequelize_1.literal)(`(SELECT COALESCE(SUM(mp.minutes_played), 0)::int FROM match_players mp WHERE mp.player_id = "Player".id)`),
        'minutes_played',
    ],
    [
        (0, sequelize_1.literal)(`(SELECT perf.average_rating FROM performances perf WHERE perf.player_id = "Player".id ORDER BY perf.created_at DESC LIMIT 1)`),
        'performance',
    ],
];
async function getPlayerCounts(playerId) {
    const [result] = await database_1.sequelize.query(`SELECT
       COALESCE((SELECT COUNT(*)::int FROM contracts WHERE player_id = :id AND status = 'Active'), 0) AS "activeContracts",
       COALESCE((SELECT COUNT(*)::int FROM injuries WHERE player_id = :id AND status = 'UnderTreatment'), 0) AS "activeInjuries",
       COALESCE((SELECT COUNT(*)::int FROM tasks WHERE player_id = :id AND status = 'Open'), 0) AS "openTasks"`, { replacements: { id: playerId }, type: sequelize_1.QueryTypes.SELECT });
    return result || { activeContracts: 0, activeInjuries: 0, openTasks: 0 };
}
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
        attributes: { include: COMPUTED_ATTRIBUTES },
        include: [
            { model: club_model_1.Club, as: 'club', attributes: ['id', 'name', 'nameAr', 'logoUrl'] },
            { model: user_model_1.User, as: 'agent', attributes: ['id', 'fullName'] },
        ],
    });
    return { data: rows, meta: (0, pagination_1.buildMeta)(count, page, limit) };
}
// ── Get Player by ID (With Aggregates) ──
async function getPlayerById(id) {
    // Run main query + sidebar counts + performance history in parallel
    const [player, counts, performanceHistory] = await Promise.all([
        player_model_1.Player.findByPk(id, {
            attributes: { include: COMPUTED_ATTRIBUTES },
            include: ['club', 'agent'],
        }),
        getPlayerCounts(id),
        database_1.sequelize.query(`SELECT
         TO_CHAR(perf.created_at, 'YYYY-MM') as month,
         ROUND(AVG(perf.average_rating), 1) as rating
       FROM performances perf
       WHERE perf.player_id = :id
       GROUP BY TO_CHAR(perf.created_at, 'YYYY-MM')
       ORDER BY month DESC
       LIMIT 12`, { replacements: { id }, type: sequelize_1.QueryTypes.SELECT }).catch(() => []),
    ]);
    if (!player)
        throw new errorHandler_1.AppError('Player not found', 404);
    return {
        ...player.get({ plain: true }),
        counts,
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
// ═══════════════════════════════════════════════════════════════
// Add to: src/modules/players/player.service.ts (append these functions)
// ═══════════════════════════════════════════════════════════════
async function getPlayerProviders(playerId) {
    return externalProvider_model_1.ExternalProviderMapping.findAll({
        where: { playerId },
        order: [['providerName', 'ASC']],
    });
}
async function upsertPlayerProvider(playerId, input) {
    const [mapping] = await externalProvider_model_1.ExternalProviderMapping.upsert({
        playerId,
        providerName: input.providerName,
        externalPlayerId: input.externalPlayerId,
        externalTeamId: input.externalTeamId || null,
        apiBaseUrl: input.apiBaseUrl || null,
        notes: input.notes || null,
    });
    return mapping;
}
async function removePlayerProvider(playerId, providerName) {
    const mapping = await externalProvider_model_1.ExternalProviderMapping.findOne({
        where: { playerId, providerName },
    });
    if (!mapping)
        throw new Error('Provider mapping not found');
    await mapping.destroy();
    return { playerId, providerName };
}
//# sourceMappingURL=player.service.js.map