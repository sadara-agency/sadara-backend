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
import { Op, Sequelize, QueryTypes } from "sequelize";
import https from "https";
import http from "http";
import { Club } from "@modules/clubs/club.model";
import { sequelize } from "@config/database";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { camelCaseKeys } from "@shared/utils/caseTransform";
import { findOrThrow } from "@shared/utils/serviceHelpers";
import {
  buildRowScope,
  checkRowAccess,
  mergeScope,
} from "@shared/utils/rowScope";
import type { AuthUser } from "@shared/types";
import {
  CreateClubInput,
  UpdateClubInput,
  CreateContactInput,
  UpdateContactInput,
} from "@modules/clubs/club.validation";

// ── Shared computed attributes ──
// Player count is a simple correlated subquery (one table).
// Contract stats are combined into a single scan of the contracts table
// instead of 3 separate correlated subqueries per row.
const CLUB_AGGREGATES = [
  [
    Sequelize.literal(
      `(SELECT COUNT(*) FROM players p WHERE p.current_club_id = "Club".id)`,
    ),
    "playerCount",
  ],
  [
    Sequelize.literal(
      `(SELECT COUNT(*) FILTER (WHERE ct.status = 'Active') FROM contracts ct WHERE ct.club_id = "Club".id)`,
    ),
    "activeContracts",
  ],
  [
    Sequelize.literal(
      `(SELECT COALESCE(SUM(CASE WHEN ct.base_salary ~ '^[0-9.]+$' THEN ct.base_salary::NUMERIC ELSE 0 END), 0) FROM contracts ct WHERE ct.club_id = "Club".id)`,
    ),
    "totalContractValue",
  ],
  [
    Sequelize.literal(
      `(SELECT COALESCE(SUM(CASE WHEN ct.total_commission ~ '^[0-9.]+$' THEN ct.total_commission::NUMERIC ELSE 0 END), 0) FROM contracts ct WHERE ct.club_id = "Club".id)`,
    ),
    "totalCommission",
  ],
] as [ReturnType<typeof Sequelize.literal>, string][];

// ────────────────────────────────────────────────────────────
// List Clubs (with aggregated financial data)
// ────────────────────────────────────────────────────────────
export async function listClubs(queryParams: any, user?: AuthUser) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "name",
  );

  const scope = user ? await buildRowScope("clubs", user) : null;
  const where: any = { isActive: true };
  if (scope) mergeScope(where, scope);

  if (queryParams.type) where.type = queryParams.type;
  if (queryParams.league) where.league = queryParams.league;
  if (queryParams.competitionId) {
    const seasonClause = queryParams.season
      ? ` AND season = '${queryParams.season.replace(/'/g, "")}'`
      : "";
    where.id = {
      ...(where.id || {}),
      [Op.in]: Sequelize.literal(
        `(SELECT DISTINCT club_id FROM club_competitions WHERE competition_id = '${queryParams.competitionId.replace(/'/g, "")}'${seasonClause})`,
      ),
    };
  }
  if (queryParams.country)
    where.country = { [Op.iLike]: `%${queryParams.country}%` };

  if (search) {
    const pattern = `%${search}%`;
    where[Op.or] = [
      { name: { [Op.iLike]: pattern } },
      { nameAr: { [Op.iLike]: pattern } },
      { city: { [Op.iLike]: pattern } },
    ];
  }

  // Strip the type filter for type-breakdown counts so they always reflect
  // the full scope (e.g. "Club: 80, Sponsor: 6" even when type=Club is active)
  const { type: _filteredType, ...whereWithoutType } = where;

  const [{ count, rows }, clubTypeCount, sponsorTypeCount] = await Promise.all([
    Club.findAndCountAll({
      where,
      attributes: { include: CLUB_AGGREGATES },
      order: [[sort, order]],
      limit,
      offset,
    }),
    Club.count({ where: { ...whereWithoutType, type: "Club" } }),
    Club.count({ where: { ...whereWithoutType, type: "Sponsor" } }),
  ]);

  return {
    data: rows,
    meta: {
      ...buildMeta(count, page, limit),
      clubCount: clubTypeCount,
      sponsorCount: sponsorTypeCount,
    },
  };
}

// ────────────────────────────────────────────────────────────
// Get Club by ID (Full detail with contacts, players, contracts)
// ────────────────────────────────────────────────────────────
export async function getClubById(id: string, user?: AuthUser) {
  const club = await Club.findByPk(id, {
    attributes: {
      include: CLUB_AGGREGATES,
    },
  });

  if (!club) throw new AppError("Club not found", 404);

  if (user) {
    const allowed = await checkRowAccess("clubs", club, user);
    if (!allowed) throw new AppError("Club not found", 404);
  }

  // Fetch related entities in parallel
  // These use raw SQL because Contact/Player/Contract models
  // don't all have direct hasMany associations to Club yet.
  // As you wire up associations, you can replace these with
  // Sequelize includes.
  const [contacts, players, contracts] = await Promise.all([
    sequelize
      .query(
        `SELECT id, name, name_ar, role, email, phone, is_primary
       FROM contacts
       WHERE club_id = :id
       ORDER BY is_primary DESC`,
        { replacements: { id }, type: QueryTypes.SELECT },
      )
      .catch(() => [] as any[]), // Table may not exist yet

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
                ROUND(ct.base_salary::NUMERIC * ct.commission_pct::NUMERIC / 100, 2)::TEXT
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
    contacts: (contacts as any[]).map((c) => camelCaseKeys(c)),
    players: (players as any[]).map((p) => camelCaseKeys(p)),
    contracts: (contracts as any[]).map((c) => camelCaseKeys(c)),
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
  const club = await findOrThrow(Club, id, "Club");
  return await club.update(input as any);
}

// ────────────────────────────────────────────────────────────
// Delete Club (soft delete + FK cleanup)
// ────────────────────────────────────────────────────────────
export async function deleteClub(id: string) {
  const club = await findOrThrow(Club, id, "Club");

  const txn = await sequelize.transaction();
  try {
    // Soft delete
    await sequelize.query(
      `UPDATE clubs SET is_active = false, updated_at = NOW() WHERE id = :id`,
      { replacements: { id }, transaction: txn },
    );

    // Null out FK references in matches, players, contracts
    await sequelize.query(
      `UPDATE matches SET home_club_id = NULL WHERE home_club_id = :id`,
      { replacements: { id }, transaction: txn },
    );
    await sequelize.query(
      `UPDATE matches SET away_club_id = NULL WHERE away_club_id = :id`,
      { replacements: { id }, transaction: txn },
    );
    await sequelize.query(
      `UPDATE players SET current_club_id = NULL WHERE current_club_id = :id`,
      { replacements: { id }, transaction: txn },
    );
    await sequelize.query(
      `UPDATE contracts SET club_id = NULL WHERE club_id = :id`,
      { replacements: { id }, transaction: txn },
    );

    // Null out SAFF FK references
    await sequelize.query(
      `UPDATE saff_standings SET club_id = NULL WHERE club_id = :id`,
      { replacements: { id }, transaction: txn },
    );
    await sequelize.query(
      `UPDATE saff_fixtures SET home_club_id = NULL WHERE home_club_id = :id`,
      { replacements: { id }, transaction: txn },
    );
    await sequelize.query(
      `UPDATE saff_fixtures SET away_club_id = NULL WHERE away_club_id = :id`,
      { replacements: { id }, transaction: txn },
    );
    await sequelize.query(
      `UPDATE saff_team_maps SET club_id = NULL WHERE club_id = :id`,
      { replacements: { id }, transaction: txn },
    );

    await txn.commit();
    return { id };
  } catch (error) {
    await txn.rollback();
    throw error;
  }
}

// ────────────────────────────────────────────────────────────
// Bulk Delete Clubs (soft delete + FK cleanup)
// ────────────────────────────────────────────────────────────
export async function deleteClubs(ids: string[]) {
  if (!ids.length) return { count: 0 };

  const txn = await sequelize.transaction();
  try {
    // Use raw SQL to guarantee correct column names
    const [, meta] = await sequelize.query(
      `UPDATE clubs SET is_active = false, updated_at = NOW() WHERE id IN (:ids) AND is_active = true`,
      { replacements: { ids }, transaction: txn },
    );
    const affectedCount = (meta as any)?.rowCount ?? 0;

    // Null out FK references in matches, players, contracts
    await sequelize.query(
      `UPDATE matches SET home_club_id = NULL WHERE home_club_id IN (:ids)`,
      { replacements: { ids }, transaction: txn },
    );
    await sequelize.query(
      `UPDATE matches SET away_club_id = NULL WHERE away_club_id IN (:ids)`,
      { replacements: { ids }, transaction: txn },
    );
    await sequelize.query(
      `UPDATE players SET current_club_id = NULL WHERE current_club_id IN (:ids)`,
      { replacements: { ids }, transaction: txn },
    );
    await sequelize.query(
      `UPDATE contracts SET club_id = NULL WHERE club_id IN (:ids)`,
      { replacements: { ids }, transaction: txn },
    );

    // Null out SAFF FK references
    await sequelize.query(
      `UPDATE saff_standings SET club_id = NULL WHERE club_id IN (:ids)`,
      { replacements: { ids }, transaction: txn },
    );
    await sequelize.query(
      `UPDATE saff_fixtures SET home_club_id = NULL WHERE home_club_id IN (:ids)`,
      { replacements: { ids }, transaction: txn },
    );
    await sequelize.query(
      `UPDATE saff_fixtures SET away_club_id = NULL WHERE away_club_id IN (:ids)`,
      { replacements: { ids }, transaction: txn },
    );
    await sequelize.query(
      `UPDATE saff_team_maps SET club_id = NULL WHERE club_id IN (:ids)`,
      { replacements: { ids }, transaction: txn },
    );

    await txn.commit();
    return { count: affectedCount };
  } catch (error) {
    await txn.rollback();
    throw error;
  }
}

// ────────────────────────────────────────────────────────────
// Update Club Logo URL
// ────────────────────────────────────────────────────────────
export async function updateClubLogo(id: string, logoUrl: string) {
  const club = await findOrThrow(Club, id, "Club");
  return await club.update({ logoUrl });
}

// ────────────────────────────────────────────────────────────
// Create Contact (raw SQL — no Sequelize model yet)
// ────────────────────────────────────────────────────────────
export async function createContact(clubId: string, input: CreateContactInput) {
  await findOrThrow(Club, clubId, "Club");

  const results = await sequelize.query(
    `INSERT INTO contacts (id, name, name_ar, role, email, phone, is_primary, club_id, created_at, updated_at)
     VALUES (gen_random_uuid(), :name, :name_ar, :role, :email, :phone, :is_primary, :club_id, NOW(), NOW())
     RETURNING id, name, name_ar, role, email, phone, is_primary`,
    {
      replacements: {
        name: input.name,
        name_ar: input.nameAr || null,
        role: input.role,
        email: input.email || null,
        phone: input.phone || null,
        is_primary: input.isPrimary ?? false,
        club_id: clubId,
      },
      type: QueryTypes.SELECT,
    },
  );
  return camelCaseKeys((results as any[])[0]);
}

// ────────────────────────────────────────────────────────────
// Update Contact (raw SQL)
// ────────────────────────────────────────────────────────────
export async function updateContact(
  contactId: string,
  clubId: string,
  input: UpdateContactInput,
) {
  const fields: string[] = [];
  const replacements: Record<string, any> = { contactId, clubId };

  if (input.name !== undefined) {
    fields.push("name = :name");
    replacements.name = input.name;
  }
  if (input.nameAr !== undefined) {
    fields.push("name_ar = :name_ar");
    replacements.name_ar = input.nameAr;
  }
  if (input.role !== undefined) {
    fields.push("role = :role");
    replacements.role = input.role;
  }
  if (input.email !== undefined) {
    fields.push("email = :email");
    replacements.email = input.email || null;
  }
  if (input.phone !== undefined) {
    fields.push("phone = :phone");
    replacements.phone = input.phone || null;
  }
  if (input.isPrimary !== undefined) {
    fields.push("is_primary = :is_primary");
    replacements.is_primary = input.isPrimary;
  }

  if (fields.length === 0) throw new AppError("No fields to update", 400);
  fields.push("updated_at = NOW()");

  const [, metadata] = await sequelize.query(
    `UPDATE contacts SET ${fields.join(", ")} WHERE id = :contactId AND club_id = :clubId`,
    { replacements },
  );

  if ((metadata as any)?.rowCount === 0)
    throw new AppError("Contact not found", 404);

  const updated = await sequelize.query(
    `SELECT id, name, name_ar, role, email, phone, is_primary FROM contacts WHERE id = :contactId`,
    { replacements: { contactId }, type: QueryTypes.SELECT },
  );
  return camelCaseKeys((updated as any[])[0]);
}

// ────────────────────────────────────────────────────────────
// Delete Contact (raw SQL)
// ────────────────────────────────────────────────────────────
export async function deleteContact(contactId: string, clubId: string) {
  const [, metadata] = await sequelize.query(
    `DELETE FROM contacts WHERE id = :contactId AND club_id = :clubId`,
    { replacements: { contactId, clubId } },
  );
  if ((metadata as any)?.rowCount === 0)
    throw new AppError("Contact not found", 404);
  return { id: contactId };
}

// ────────────────────────────────────────────────────────────
// Logo Audit — check all clubs for missing or broken logos
// ────────────────────────────────────────────────────────────

function headCheck(url: string, timeout = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const mod = url.startsWith("https") ? https : http;
    const req = mod.request(url, { method: "HEAD", timeout }, (res) => {
      resolve(res.statusCode !== undefined && res.statusCode < 400);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

export async function auditLogos() {
  const clubs = await Club.findAll({
    attributes: ["id", "name", "nameAr", "logoUrl"],
    order: [["name", "ASC"]],
  });

  const missing: { id: string; name: string; nameAr: string | null }[] = [];
  const broken: {
    id: string;
    name: string;
    nameAr: string | null;
    logoUrl: string;
  }[] = [];
  const valid: { id: string; name: string; logoUrl: string }[] = [];

  // Check logos in parallel (batch of 10)
  const BATCH = 10;
  for (let i = 0; i < clubs.length; i += BATCH) {
    const batch = clubs.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (club) => {
        if (!club.logoUrl) {
          missing.push({
            id: club.id,
            name: club.name,
            nameAr: club.nameAr,
          });
          return;
        }
        const ok = await headCheck(club.logoUrl);
        if (ok) {
          valid.push({
            id: club.id,
            name: club.name,
            logoUrl: club.logoUrl,
          });
        } else {
          broken.push({
            id: club.id,
            name: club.name,
            nameAr: club.nameAr,
            logoUrl: club.logoUrl,
          });
        }
      }),
    );
  }

  return {
    total: clubs.length,
    valid: valid.length,
    missing: missing.length,
    broken: broken.length,
    missingClubs: missing,
    brokenClubs: broken,
  };
}
