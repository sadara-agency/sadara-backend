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
import { Op, Sequelize, QueryTypes } from 'sequelize';
import { Club } from './club.model';
import { sequelize } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';
import { CreateClubInput, UpdateClubInput, CreateContactInput, UpdateContactInput } from './club.schema';

// ── Shared computed attributes (subqueries) ──
// These are appended to every Club query so the frontend
// always gets enriched data without extra round-trips.
const CLUB_AGGREGATES = [
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
] as [ReturnType<typeof Sequelize.literal>, string][];

// ────────────────────────────────────────────────────────────
// List Clubs (with aggregated financial data)
// ────────────────────────────────────────────────────────────
export async function listClubs(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(queryParams, 'name');

  const where: any = { isActive: true };

  if (queryParams.type) where.type = queryParams.type;
  if (queryParams.country) where.country = { [Op.iLike]: `%${queryParams.country}%` };

  if (search) {
    const pattern = `%${search}%`;
    where[Op.or] = [
      { name: { [Op.iLike]: pattern } },
      { nameAr: { [Op.iLike]: pattern } },
      { city: { [Op.iLike]: pattern } },
    ];
  }

  const { count, rows } = await Club.findAndCountAll({
    where,
    attributes: {
      include: CLUB_AGGREGATES,
    },
    order: [[sort, order]],
    limit,
    offset,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ────────────────────────────────────────────────────────────
// Get Club by ID (Full detail with contacts, players, contracts)
// ────────────────────────────────────────────────────────────
export async function getClubById(id: string) {
  const club = await Club.findByPk(id, {
    attributes: {
      include: CLUB_AGGREGATES,
    },
  });

  if (!club) throw new AppError('Club not found', 404);

  // Fetch related entities in parallel
  // These use raw SQL because Contact/Player/Contract models
  // don't all have direct hasMany associations to Club yet.
  // As you wire up associations, you can replace these with
  // Sequelize includes.
  const [contacts, players, contracts] = await Promise.all([
    sequelize.query(
      `SELECT id, name, name_ar, role, email, phone, is_primary
       FROM contacts
       WHERE club_id = :id
       ORDER BY is_primary DESC`,
      { replacements: { id }, type: QueryTypes.SELECT },
    ),

    sequelize.query(
      `SELECT p.id,
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
       ORDER BY p.first_name`,
      { replacements: { id }, type: QueryTypes.SELECT },
    ),

    sequelize.query(
      `SELECT ct.id, ct.title, ct.category, ct.status,
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
       ORDER BY ct.end_date DESC`,
      { replacements: { id }, type: QueryTypes.SELECT },
    ),
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
export async function createClub(input: CreateClubInput) {
  return await Club.create(input as any);
}

// ────────────────────────────────────────────────────────────
// Update Club
// ────────────────────────────────────────────────────────────
export async function updateClub(id: string, input: UpdateClubInput) {
  const club = await Club.findByPk(id);
  if (!club) throw new AppError('Club not found', 404);
  return await club.update(input as any);
}

// ────────────────────────────────────────────────────────────
// Delete Club
// ────────────────────────────────────────────────────────────
export async function deleteClub(id: string) {
  const deleted = await Club.destroy({ where: { id } });
  if (!deleted) throw new AppError('Club not found', 404);
  return { id };
}

// ────────────────────────────────────────────────────────────
// Update Club Logo URL
// ────────────────────────────────────────────────────────────
export async function updateClubLogo(id: string, logoUrl: string) {
  const club = await Club.findByPk(id);
  if (!club) throw new AppError('Club not found', 404);
  return await club.update({ logoUrl });
}

// ────────────────────────────────────────────────────────────
// Create Contact (raw SQL — no Sequelize model yet)
// ────────────────────────────────────────────────────────────
export async function createContact(clubId: string, input: CreateContactInput) {
  const club = await Club.findByPk(clubId);
  if (!club) throw new AppError('Club not found', 404);

  const results = await sequelize.query(
    `INSERT INTO contacts (id, name, name_ar, role, email, phone, is_primary, club_id, created_at, updated_at)
     VALUES (gen_random_uuid(), :name, :name_ar, :role, :email, :phone, :is_primary, :club_id, NOW(), NOW())
     RETURNING id, name, name_ar, role, email, phone, is_primary`,
    {
      replacements: {
        name: input.name,
        name_ar: input.name_ar || null,
        role: input.role,
        email: input.email || null,
        phone: input.phone || null,
        is_primary: input.is_primary ?? false,
        club_id: clubId,
      },
      type: QueryTypes.SELECT,
    },
  );
  return (results as any[])[0];
}

// ────────────────────────────────────────────────────────────
// Update Contact (raw SQL)
// ────────────────────────────────────────────────────────────
export async function updateContact(contactId: string, clubId: string, input: UpdateContactInput) {
  const fields: string[] = [];
  const replacements: Record<string, any> = { contactId, clubId };

  if (input.name !== undefined) { fields.push('name = :name'); replacements.name = input.name; }
  if (input.name_ar !== undefined) { fields.push('name_ar = :name_ar'); replacements.name_ar = input.name_ar; }
  if (input.role !== undefined) { fields.push('role = :role'); replacements.role = input.role; }
  if (input.email !== undefined) { fields.push('email = :email'); replacements.email = input.email || null; }
  if (input.phone !== undefined) { fields.push('phone = :phone'); replacements.phone = input.phone || null; }
  if (input.is_primary !== undefined) { fields.push('is_primary = :is_primary'); replacements.is_primary = input.is_primary; }

  if (fields.length === 0) throw new AppError('No fields to update', 400);
  fields.push('updated_at = NOW()');

  const [, metadata] = await sequelize.query(
    `UPDATE contacts SET ${fields.join(', ')} WHERE id = :contactId AND club_id = :clubId`,
    { replacements },
  );

  if ((metadata as any)?.rowCount === 0) throw new AppError('Contact not found', 404);

  const updated = await sequelize.query(
    `SELECT id, name, name_ar, role, email, phone, is_primary FROM contacts WHERE id = :contactId`,
    { replacements: { contactId }, type: QueryTypes.SELECT },
  );
  return (updated as any[])[0];
}

// ────────────────────────────────────────────────────────────
// Delete Contact (raw SQL)
// ────────────────────────────────────────────────────────────
export async function deleteContact(contactId: string, clubId: string) {
  const [, metadata] = await sequelize.query(
    `DELETE FROM contacts WHERE id = :contactId AND club_id = :clubId`,
    { replacements: { contactId, clubId } },
  );
  if ((metadata as any)?.rowCount === 0) throw new AppError('Contact not found', 404);
  return { id: contactId };
}