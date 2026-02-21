"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPlayerWhere = buildPlayerWhere;
// ─────────────────────────────────────────────────────────────
// Builds the Sequelize `where` clause for player queries.
//
// Why extracted?
// - The old listPlayers had 15+ lines of `if (param) where.x = param`
//   plus a complex search block with Arabic full-name concat.
// - Now the service calls `buildPlayerWhere(queryParams, search)`
//   and gets back a ready where object.
// - If you add new filters (e.g. ageRange, preferredFoot), you
//   add them here without touching the main service flow.
// ─────────────────────────────────────────────────────────────
const sequelize_1 = require("sequelize");
/**
 * Builds a Sequelize-compatible `where` clause from the
 * validated query params.
 *
 * @param params  - Parsed query params (already validated by Zod in the route)
 * @param search  - The trimmed search string (from parsePagination)
 * @returns       - A Sequelize WhereOptions object
 */
function buildPlayerWhere(params, search) {
    const where = {};
    // ── Direct equality filters ──
    if (params.status)
        where.status = params.status;
    if (params.playerType)
        where.playerType = params.playerType;
    if (params.clubId)
        where.currentClubId = params.clubId;
    if (params.position)
        where.position = params.position;
    if (params.nationality)
        where.nationality = params.nationality;
    // ── Full-text search (EN + AR, first/last + concat) ──
    if (search) {
        const pattern = `%${search}%`;
        where[sequelize_1.Op.or] = [
            { firstName: { [sequelize_1.Op.iLike]: pattern } },
            { lastName: { [sequelize_1.Op.iLike]: pattern } },
            { firstNameAr: { [sequelize_1.Op.iLike]: pattern } },
            { lastNameAr: { [sequelize_1.Op.iLike]: pattern } },
            // Full name (English): "Salem Al-Dawsari"
            sequelize_1.Sequelize.where((0, sequelize_1.fn)('concat', (0, sequelize_1.col)('first_name'), ' ', (0, sequelize_1.col)('last_name')), { [sequelize_1.Op.iLike]: pattern }),
            // Full name (Arabic): "سالم الدوسري"
            sequelize_1.Sequelize.where((0, sequelize_1.fn)('concat', (0, sequelize_1.col)('first_name_ar'), ' ', (0, sequelize_1.col)('last_name_ar')), { [sequelize_1.Op.iLike]: pattern }),
        ];
    }
    return where;
}
//# sourceMappingURL=player.filters.js.map