/**
 * Row-Level Security — query-level scoping per role per module.
 *
 * Bypass roles (Admin, Manager, Executive) see everything.
 * Other roles see only rows they're authorized to access,
 * defined by the SCOPE_RULES config below.
 */
import { Op, literal, QueryTypes } from "sequelize";
import { AuthUser } from "@shared/types";
import { sequelize } from "@config/database";
import { AppError } from "@middleware/errorHandler";

// ── Helpers ──

const BYPASS_ROLES = ["Admin", "Manager", "Executive"];

/** All roles that share coach-level row access (coach_id FK on players). */
const COACH_ROLES = [
  "Coach",
  "SkillCoach",
  "TacticalCoach",
  "FitnessCoach",
  "NutritionSpecialist",
  "GymCoach",
];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validate UUID format to prevent SQL injection in literal() calls */
function safeId(value: string): string {
  if (!UUID_RE.test(value))
    throw new AppError("Invalid UUID in row scope filter", 400);
  return value;
}

// ── Types ──

type WhereClause = Record<string | symbol, any>;
type ScopeBuilder = (user: AuthUser) => WhereClause;

/** "own assigned" — tasks, etc. where assignedTo or assignedBy = user.id */
const ownAssigned: ScopeBuilder = (u) => ({
  [Op.or]: [{ assignedTo: u.id }, { assignedBy: u.id }],
});

/** "own uploads" / "own created" */
const ownUploaded: ScopeBuilder = (u) => ({ uploadedBy: u.id });
const ownCreated: ScopeBuilder = (u) => ({ createdBy: u.id });

/** Player's own records via playerId on user */
const ownPlayer: ScopeBuilder = (u) => ({ playerId: u.playerId });

/** Player's own record (players table, id = user.playerId) */
const ownPlayerSelf: ScopeBuilder = (u) => ({ id: u.playerId });

/** Coach's players: playerId IN (SELECT id FROM players WHERE coach_id = ?) */
const coachPlayers: ScopeBuilder = (u) => ({
  playerId: {
    [Op.in]: literal(
      `(SELECT id FROM players WHERE coach_id = '${safeId(u.id)}')`,
    ),
  },
});

/** Analyst's players: playerId IN (SELECT id FROM players WHERE analyst_id = ?) */
const analystPlayers: ScopeBuilder = (u) => ({
  playerId: {
    [Op.in]: literal(
      `(SELECT id FROM players WHERE analyst_id = '${safeId(u.id)}')`,
    ),
  },
});

// ── Scope Rules Config ──
// Module → Role → scope builder function
// Roles not listed default to "all" (no filtering)
// Roles blocked at module-permission level don't need entries

const SCOPE_RULES: Record<string, Record<string, ScopeBuilder>> = {
  players: {
    Player: ownPlayerSelf,
  },

  contracts: {
    Player: ownPlayer,
    Scout: ownCreated,
    Coach: coachPlayers,
    Analyst: analystPlayers,
  },

  finance: {
    Player: ownPlayer,
  },

  offers: {
    Player: ownPlayer,
    Scout: ownCreated,
    Coach: coachPlayers,
    Analyst: analystPlayers,
  },

  scouting: {
    Scout: (u) => ({ scoutedBy: u.id }),
  },

  injuries: {
    Player: ownPlayer,
    Coach: coachPlayers,
    Analyst: analystPlayers,
  },

  tasks: {
    Player: ownAssigned,
    Scout: ownAssigned,
    Coach: ownAssigned,
    Analyst: ownAssigned,
    Finance: ownAssigned,
    Legal: ownAssigned,
    Media: ownAssigned,
  },

  approvals: {
    Player: (u) => ({ requestedBy: u.id }),
    Scout: (u) => ({ requestedBy: u.id }),
    Coach: (u) => ({ requestedBy: u.id }),
    Analyst: (u) => ({
      [Op.or]: [{ requestedBy: u.id }, { assignedTo: u.id }],
    }),
    Media: (u) => ({ requestedBy: u.id }),
  },

  documents: {
    Player: ownUploaded,
    Scout: ownUploaded,
    Coach: ownUploaded,
    Analyst: ownUploaded,
    Media: ownUploaded,
  },

  notes: {
    Player: ownCreated,
    Scout: ownCreated,
    Coach: ownCreated,
    Analyst: ownCreated,
    Media: ownCreated,
  },
};

// ── Public API ──

/**
 * Build a Sequelize WHERE fragment for row-level scoping.
 * Returns `null` for bypass roles or modules with no rules (= see everything).
 *
 * Usage: merge into your existing `where` object before querying.
 */
export function buildRowScope(
  module: string,
  user?: AuthUser,
): WhereClause | null {
  if (!user) return null;
  if (BYPASS_ROLES.includes(user.role)) return null;

  const moduleRules = SCOPE_RULES[module];
  if (!moduleRules) return null;

  const scopeBuilder = moduleRules[user.role];
  if (!scopeBuilder) return null; // role not in config = full access

  return scopeBuilder(user);
}

/**
 * Merge a row-scope WHERE fragment into an existing `where` object.
 * Handles Op.or conflicts and key collisions by wrapping in Op.and.
 */
export function mergeScope(where: WhereClause, scope: WhereClause): void {
  for (const key of Reflect.ownKeys(scope)) {
    if (key === Op.or) {
      // Scope has Op.or — push it as an Op.and clause
      if (where[Op.or]) {
        // Both have Op.or — wrap both in Op.and
        const existingOr = where[Op.or];
        delete where[Op.or];
        where[Op.and] = [
          ...(Array.isArray(where[Op.and]) ? where[Op.and] : []),
          { [Op.or]: existingOr },
          { [Op.or]: scope[Op.or] },
        ];
      } else {
        where[Op.and] = [
          ...(Array.isArray(where[Op.and]) ? where[Op.and] : []),
          { [Op.or]: scope[Op.or] },
        ];
      }
    } else if (key in where || (typeof key === "string" && key in where)) {
      // Key collision — combine via Op.and
      where[Op.and] = [
        ...(Array.isArray(where[Op.and]) ? where[Op.and] : []),
        { [key]: where[key as string] },
        { [key]: scope[key as string] },
      ];
      delete where[key as string];
    } else {
      (where as any)[key] = (scope as any)[key];
    }
  }
}

/**
 * Check whether a user can access a specific record (for getById).
 * Returns `true` if access is allowed, `false` if denied.
 * Denied records should return 404 (not 403) to prevent info leakage.
 */
export async function checkRowAccess(
  module: string,
  record: any,
  user?: AuthUser,
): Promise<boolean> {
  if (!user) return true;
  if (BYPASS_ROLES.includes(user.role)) return true;

  const moduleRules = SCOPE_RULES[module];
  if (!moduleRules) return true;

  const scopeBuilder = moduleRules[user.role];
  if (!scopeBuilder) return true;

  const role = user.role;

  // ── Simple column checks (in-memory) ──
  switch (module) {
    case "players":
      if (role === "Player") return record.id === user.playerId;
      return true;

    case "contracts":
    case "offers":
      if (role === "Player") return record.playerId === user.playerId;
      if (role === "Scout") return record.createdBy === user.id;
      if (COACH_ROLES.includes(role) || role === "Analyst")
        return isPlayerOwnedBy(record.playerId, user);
      return true;

    case "finance":
      if (role === "Player") return record.playerId === user.playerId;
      return true;

    case "scouting":
      if (role === "Scout") return record.scoutedBy === user.id;
      return true;

    case "injuries":
      if (role === "Player") return record.playerId === user.playerId;
      if (COACH_ROLES.includes(role) || role === "Analyst")
        return isPlayerOwnedBy(record.playerId, user);
      return true;

    case "tasks":
      return record.assignedTo === user.id || record.assignedBy === user.id;

    case "approvals":
      if (role === "Analyst")
        return record.requestedBy === user.id || record.assignedTo === user.id;
      return record.requestedBy === user.id;

    case "documents":
      return record.uploadedBy === user.id;

    case "notes":
      return record.createdBy === user.id;
  }

  return true;
}

/**
 * Check if a player belongs to the given coach/analyst via DB query.
 */
async function isPlayerOwnedBy(
  playerId: string | undefined | null,
  user: AuthUser,
): Promise<boolean> {
  if (!playerId) return false;

  const column = COACH_ROLES.includes(user.role) ? "coach_id" : "analyst_id";
  const [result] = await sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM players WHERE id = :playerId AND ${column} = :userId) AS "exists"`,
    {
      replacements: { playerId, userId: user.id },
      type: QueryTypes.SELECT,
    },
  );

  return result?.exists ?? false;
}
