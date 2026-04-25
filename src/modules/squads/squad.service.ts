// ─────────────────────────────────────────────────────────────
// src/modules/squads/squad.service.ts
//
// Read-only API + helpers for the SAFF wizard apply step.
// Phase 2 deliverables:
//   - listSquads / getSquadById        — public read-only API
//   - listByClub                       — convenience for club detail page
//   - findOrCreateSquad                — used by Phase 3 import logic
//   - getByContext                     — strict variant that throws 404
//
// All write paths go through findOrCreateSquad: there is no admin CRUD.
// Display names auto-derive from the parent club + age/division so the
// caller never has to compose them.
// ─────────────────────────────────────────────────────────────
import { Op } from "sequelize";
import type { Transaction } from "sequelize";
import { Squad } from "@modules/squads/squad.model";
import { Club } from "@modules/clubs/club.model";
import { AppError } from "@middleware/errorHandler";
import { buildMeta } from "@shared/utils/pagination";
import type { SquadQuery } from "@modules/squads/squad.validation";

export interface SquadContext {
  // Accepts any SaffAgeCategory (u11–u23 + senior) — stored as VARCHAR so no
  // DB-level restriction beyond what the Zod validation enforces on the API.
  ageCategory: string;
  division: string | null;
}

// ── Display name composition ──

const AGE_LABELS_EN: Record<string, string> = {
  senior: "Senior",
  u23: "U-23",
  u22: "U-22",
  u21: "U-21",
  u20: "U-20",
  u19: "U-19",
  u18: "U-18",
  u17: "U-17",
  u16: "U-16",
  u15: "U-15",
  u14: "U-14",
  u13: "U-13",
  u12: "U-12",
  u11: "U-11",
};

const AGE_LABELS_AR: Record<string, string> = {
  senior: "الفريق الأول",
  u23: "تحت 23",
  u22: "تحت 22",
  u21: "تحت 21",
  u20: "تحت 20",
  u19: "تحت 19",
  u18: "تحت 18",
  u17: "تحت 17",
  u16: "تحت 16",
  u15: "تحت 15",
  u14: "تحت 14",
  u13: "تحت 13",
  u12: "تحت 12",
  u11: "تحت 11",
};

const DIVISION_LABELS_EN: Record<string, string> = {
  premier: "Premier",
  "1st-division": "1st Division",
  "2nd-division": "2nd Division",
  "3rd-division": "3rd Division",
};

const DIVISION_LABELS_AR: Record<string, string> = {
  premier: "الممتاز",
  "1st-division": "الدرجة الأولى",
  "2nd-division": "الدرجة الثانية",
  "3rd-division": "الدرجة الثالثة",
};

function composeDisplayName(
  clubName: string,
  ctx: SquadContext,
  locale: "en" | "ar",
): string {
  const ageLabels = locale === "ar" ? AGE_LABELS_AR : AGE_LABELS_EN;
  const divLabels = locale === "ar" ? DIVISION_LABELS_AR : DIVISION_LABELS_EN;
  const parts = [clubName];
  // For the senior squad of the premier division (the "default" case),
  // suppress the qualifier so the squad name reads identically to the
  // club name. Any other combination gets the qualifier appended.
  const isDefault = ctx.ageCategory === "senior" && ctx.division === "premier";
  if (!isDefault) {
    if (ctx.ageCategory !== "senior") {
      parts.push(ageLabels[ctx.ageCategory] ?? ctx.ageCategory.toUpperCase());
    }
    if (ctx.division) {
      parts.push(divLabels[ctx.division] ?? ctx.division);
    }
  }
  return parts.join(" ");
}

// ── Public read API ──

export async function listSquads(query: SquadQuery) {
  const {
    page,
    limit,
    sort,
    order,
    search,
    clubId,
    ageCategory,
    division,
    isActive,
  } = query;

  const where: Record<string, unknown> = {};
  if (clubId) where.clubId = clubId;
  if (ageCategory) where.ageCategory = ageCategory;
  if (division) where.division = division;
  if (isActive !== undefined) where.isActive = isActive;
  if (search) {
    (where as Record<string | symbol, unknown>)[Op.or] = [
      { displayName: { [Op.iLike]: `%${search}%` } },
      { displayNameAr: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { rows, count } = await Squad.findAndCountAll({
    where,
    order: [[sort, order]],
    limit,
    offset: (page - 1) * limit,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getSquadById(id: string) {
  const squad = await Squad.findByPk(id);
  if (!squad) throw new AppError("Squad not found", 404);
  return squad;
}

export async function listByClub(clubId: string) {
  return Squad.findAll({
    where: { clubId },
    order: [
      ["ageCategory", "ASC"],
      ["division", "ASC"],
    ],
  });
}

// ── Helpers used by Phase 3 import logic ──

/**
 * Returns the squad matching (clubId, ageCategory, division). Throws
 * 404 if it does not exist. Use this when the caller expects the
 * squad to exist already; for the import wizard, prefer findOrCreateSquad.
 */
export async function getByContext(
  clubId: string,
  context: SquadContext,
  txn?: Transaction,
) {
  const squad = await Squad.findOne({
    where: {
      clubId,
      ageCategory: context.ageCategory,
      division: context.division,
    },
    transaction: txn,
  });
  if (!squad) throw new AppError("Squad not found for context", 404);
  return squad;
}

/**
 * Idempotent upsert keyed on (clubId, ageCategory, division).
 * Returns `[squad, wasCreated]` — true when the squad did not exist before
 * this call, false when an existing row was found.
 *
 * Pass the active Sequelize transaction (txn) so that preview dry-runs
 * roll back squad creation along with everything else.
 */
export async function findOrCreateSquad(
  clubId: string,
  context: SquadContext,
  txn?: Transaction,
): Promise<[Squad, boolean]> {
  const existing = await Squad.findOne({
    where: {
      clubId,
      ageCategory: context.ageCategory,
      division: context.division,
    },
    transaction: txn,
  });
  if (existing) return [existing, false];

  const club = await Club.findByPk(clubId, { transaction: txn });
  if (!club) throw new AppError("Parent club not found", 404);

  const displayName = composeDisplayName(club.name, context, "en");
  const displayNameAr = composeDisplayName(
    club.nameAr ?? club.name,
    context,
    "ar",
  );

  const squad = await Squad.create(
    {
      clubId,
      // SquadContext.ageCategory is string; model union is narrower but DB is VARCHAR — cast is safe
      ageCategory: context.ageCategory as any,
      division: context.division,
      displayName,
      displayNameAr,
      isActive: true,
    },
    { transaction: txn },
  );

  return [squad, true];
}
