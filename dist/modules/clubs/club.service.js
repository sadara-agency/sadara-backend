"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listClubs = listClubs;
exports.getClubById = getClubById;
exports.createClub = createClub;
exports.updateClub = updateClub;
exports.deleteClub = deleteClub;
// ─────────────────────────────────────────────────────────────
// src/modules/clubs/club.service.ts (REFACTORED)
//
// WHAT CHANGED:
// - Typed inputs (CreateClubInput, UpdateClubInput) instead of `any`
// - getClubById now fetches contacts, players, and contracts
//   in parallel (kept as raw SQL until those models have
//   proper associations to Club)
// - listClubs includes financial aggregates via subqueries
//   (player_count, active_contracts, total_contract_value,
//   total_commission)
// - Consistent with player/user/task/contract service patterns
// ─────────────────────────────────────────────────────────────
const sequelize_1 = require("sequelize");
const club_model_1 = require("./club.model");
const database_1 = require("../../config/database");
const errorHandler_1 = require("../../middleware/errorHandler");
const pagination_1 = require("../../shared/utils/pagination");
// ── Shared computed attributes (subqueries) ──
// These are appended to every Club query so the frontend
// always gets enriched data without extra round-trips.
const CLUB_AGGREGATES = [
    [
        sequelize_1.Sequelize.literal(`(SELECT COUNT(*) FROM players p WHERE p.current_club_id = "Club".id)`),
        'player_count',
    ],
    [
        sequelize_1.Sequelize.literal(`(SELECT COUNT(*) FROM contracts ct WHERE ct.club_id = "Club".id AND ct.status = 'Active')`),
        'active_contracts',
    ],
    [
        sequelize_1.Sequelize.literal(`(SELECT COALESCE(SUM(ct.base_salary), 0) FROM contracts ct WHERE ct.club_id = "Club".id)`),
        'total_contract_value',
    ],
    [
        sequelize_1.Sequelize.literal(`(SELECT COALESCE(SUM(ct.total_commission), 0) FROM contracts ct WHERE ct.club_id = "Club".id)`),
        'total_commission',
    ],
];
// ────────────────────────────────────────────────────────────
// List Clubs (with aggregated financial data)
// ────────────────────────────────────────────────────────────
async function listClubs(queryParams) {
    const { limit, offset, page, sort, order, search } = (0, pagination_1.parsePagination)(queryParams, 'name');
    const where = { isActive: true };
    if (queryParams.type)
        where.type = queryParams.type;
    if (queryParams.country)
        where.country = { [sequelize_1.Op.iLike]: `%${queryParams.country}%` };
    if (search) {
        const pattern = `%${search}%`;
        where[sequelize_1.Op.or] = [
            { name: { [sequelize_1.Op.iLike]: pattern } },
            { nameAr: { [sequelize_1.Op.iLike]: pattern } },
            { city: { [sequelize_1.Op.iLike]: pattern } },
        ];
    }
    const { count, rows } = await club_model_1.Club.findAndCountAll({
        where,
        attributes: {
            include: CLUB_AGGREGATES,
        },
        order: [[sort, order]],
        limit,
        offset,
    });
    return { data: rows, meta: (0, pagination_1.buildMeta)(count, page, limit) };
}
// ────────────────────────────────────────────────────────────
// Get Club by ID (Full detail with contacts, players, contracts)
// ────────────────────────────────────────────────────────────
async function getClubById(id) {
    const club = await club_model_1.Club.findByPk(id, {
        attributes: {
            include: CLUB_AGGREGATES,
        },
    });
    if (!club)
        throw new errorHandler_1.AppError('Club not found', 404);
    // Fetch related entities in parallel
    // These use raw SQL because Contact/Player/Contract models
    // don't all have direct hasMany associations to Club yet.
    // As you wire up associations, you can replace these with
    // Sequelize includes.
    const [contacts, players, contracts] = await Promise.all([
        database_1.sequelize.query(`SELECT id, name, name_ar, role, email, phone, is_primary
       FROM contacts
       WHERE club_id = :id
       ORDER BY is_primary DESC`, { replacements: { id }, type: sequelize_1.QueryTypes.SELECT }),
        database_1.sequelize.query(`SELECT p.id,
              CONCAT(p.first_name, ' ', p.last_name) AS name,
              CONCAT(p.first_name_ar, ' ', p.last_name_ar) AS name_ar,
              p.position, p.status, p.market_value, p.jersey_number,
              p.photo_url,
              (SELECT ct.end_date
               FROM contracts ct
               WHERE ct.player_id = p.id
                 AND ct.club_id = :id
                 AND ct.status = 'Active'
               ORDER BY ct.end_date DESC
               LIMIT 1) AS contract_end
       FROM players p
       WHERE p.current_club_id = :id
       ORDER BY p.first_name`, { replacements: { id }, type: sequelize_1.QueryTypes.SELECT }),
        database_1.sequelize.query(`SELECT ct.id, ct.title, ct.category, ct.status,
              ct.start_date, ct.end_date,
              ct.base_salary AS total_value,
              ct.commission_pct AS commission_rate,
              COALESCE(ct.total_commission,
                ROUND(ct.base_salary * ct.commission_pct / 100, 2)
              ) AS commission_value,
              CONCAT(p.first_name, ' ', p.last_name) AS player_name
       FROM contracts ct
       LEFT JOIN players p ON p.id = ct.player_id
       WHERE ct.club_id = :id
       ORDER BY ct.end_date DESC`, { replacements: { id }, type: sequelize_1.QueryTypes.SELECT }),
    ]);
    return {
        ...club.get({ plain: true }),
        contacts,
        players,
        contracts,
    };
}
// ────────────────────────────────────────────────────────────
// Create Club
// ────────────────────────────────────────────────────────────
async function createClub(input) {
    return await club_model_1.Club.create(input);
}
// ────────────────────────────────────────────────────────────
// Update Club
// ────────────────────────────────────────────────────────────
async function updateClub(id, input) {
    const club = await club_model_1.Club.findByPk(id);
    if (!club)
        throw new errorHandler_1.AppError('Club not found', 404);
    return await club.update(input);
}
// ────────────────────────────────────────────────────────────
// Delete Club
// ────────────────────────────────────────────────────────────
async function deleteClub(id) {
    const deleted = await club_model_1.Club.destroy({ where: { id } });
    if (!deleted)
        throw new errorHandler_1.AppError('Club not found', 404);
    return { id };
}
//# sourceMappingURL=club.service.js.map