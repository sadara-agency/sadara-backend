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
import { Op, Sequelize, fn, col } from 'sequelize';
import { ListPlayersQuery } from './player.types';

/**
 * Builds a Sequelize-compatible `where` clause from the
 * validated query params.
 *
 * @param params  - Parsed query params (already validated by Zod in the route)
 * @param search  - The trimmed search string (from parsePagination)
 * @returns       - A Sequelize WhereOptions object
 */
export function buildPlayerWhere(params: ListPlayersQuery, search?: string): any {
  const where: any = {};

  // ── Direct equality filters ──
  if (params.status) where.status = params.status;
  if (params.playerType) where.playerType = params.playerType;
  if (params.clubId) where.currentClubId = params.clubId;
  if (params.position) where.position = params.position;
  if (params.nationality) where.nationality = params.nationality;

  // ── Full-text search (EN + AR, first/last + concat) ──
  if (search) {
    const pattern = `%${search}%`;
    where[Op.or] = [
      { firstName: { [Op.iLike]: pattern } },
      { lastName: { [Op.iLike]: pattern } },
      { firstNameAr: { [Op.iLike]: pattern } },
      { lastNameAr: { [Op.iLike]: pattern } },
      // Full name (English): "Salem Al-Dawsari"
      Sequelize.where(
        fn('concat', col('first_name'), ' ', col('last_name')),
        { [Op.iLike]: pattern },
      ),
      // Full name (Arabic): "سالم الدوسري"
      Sequelize.where(
        fn('concat', col('first_name_ar'), ' ', col('last_name_ar')),
        { [Op.iLike]: pattern },
      ),
    ];
  }

  return where;
}