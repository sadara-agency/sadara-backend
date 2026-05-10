/**
 * Row-Level Security — query-level scoping per role per module.
 *
 * Bypass roles (Admin, Manager, Executive) see everything.
 * Other roles see only rows they're authorized to access,
 * defined by the SCOPE_RULES config below.
 */
import { Op, QueryTypes } from "sequelize";
import { AuthUser } from "@shared/types";
import { sequelize } from "@config/database";
import { verifyUserRole } from "@shared/utils/verifyRole";

// ── Helpers ──

const BYPASS_ROLES = ["Admin", "Manager", "Executive", "SportingDirector"];

/** All roles that share coach-level row access (coach_id FK on players). */
const COACH_ROLES = [
  "Coach",
  "SkillCoach",
  "TacticalCoach",
  "FitnessCoach",
  "NutritionSpecialist",
  "GymCoach",
  "GoalkeeperCoach",
  "MentalCoach",
];

// ── Types ──

type WhereClause = Record<string | symbol, any>;
type ScopeBuilder = (user: AuthUser) => WhereClause | Promise<WhereClause>;

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

/**
 * Coach's players: playerId IN (SELECT player_id FROM player_coach_assignments WHERE coach_user_id = ?)
 * Uses the join table so all 8 specialty roles can be independently assigned to players,
 * replacing the old single-column players.coach_id approach.
 *
 * Resolves the subquery to an ID list using a parameterized query, then returns
 * a plain Op.in clause. Empty list → `IN (NULL)` → no rows (fail-closed).
 */
const coachPlayers: ScopeBuilder = async (u) => {
  const rows = await sequelize.query<{ player_id: string }>(
    `SELECT player_id FROM player_coach_assignments WHERE coach_user_id = :userId`,
    { replacements: { userId: u.id }, type: QueryTypes.SELECT },
  );
  return { playerId: { [Op.in]: rows.map((r) => r.player_id) } };
};

/** Analyst's players: playerId IN (SELECT id FROM players WHERE analyst_id = ?) */
const analystPlayers: ScopeBuilder = async (u) => {
  const rows = await sequelize.query<{ id: string }>(
    `SELECT id FROM players WHERE analyst_id = :userId`,
    { replacements: { userId: u.id }, type: QueryTypes.SELECT },
  );
  return { playerId: { [Op.in]: rows.map((r) => r.id) } };
};

/**
 * Restricted-referral scope: a referral is visible if any of
 *   - isRestricted = false (unrestricted, the default case)
 *   - user id is in the restrictedTo UUID array
 *   - user is the assignee
 *   - user is the creator
 * Expressed as a WHERE clause via the PG array-contains operator.
 */
/** Own referral: creator or primary assignee only. */
const ownReferral: ScopeBuilder = (u) => ({
  [Op.or]: [{ createdBy: u.id }, { assignedTo: u.id }],
});

/** Own ticket: creator, primary assignee, or in additionalAssignees[]. */
const ownTicket: ScopeBuilder = (u) => ({
  [Op.or]: [
    { createdBy: u.id },
    { assignedTo: u.id },
    { additionalAssignees: { [Op.contains]: [u.id] } },
  ],
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
    SkillCoach: ownAssigned,
    TacticalCoach: ownAssigned,
    FitnessCoach: ownAssigned,
    NutritionSpecialist: ownAssigned,
    GymCoach: ownAssigned,
    GoalkeeperCoach: ownAssigned,
    MentalCoach: ownAssigned,
    Analyst: ownAssigned,
    Finance: ownAssigned,
    Legal: ownAssigned,
    GraphicDesigner: ownAssigned,
  },

  approvals: {
    Player: (u) => ({ requestedBy: u.id }),
    Scout: (u) => ({ requestedBy: u.id }),
    Coach: (u) => ({ requestedBy: u.id }),
    SkillCoach: (u) => ({ requestedBy: u.id }),
    TacticalCoach: (u) => ({ requestedBy: u.id }),
    FitnessCoach: (u) => ({ requestedBy: u.id }),
    NutritionSpecialist: (u) => ({ requestedBy: u.id }),
    GymCoach: (u) => ({ requestedBy: u.id }),
    GoalkeeperCoach: (u) => ({ requestedBy: u.id }),
    MentalCoach: (u) => ({ requestedBy: u.id }),
    Analyst: (u) => ({
      [Op.or]: [{ requestedBy: u.id }, { assignedTo: u.id }],
    }),
    GraphicDesigner: (u) => ({ requestedBy: u.id }),
  },

  documents: {
    Player: ownUploaded,
    Scout: ownUploaded,
    Coach: ownUploaded,
    SkillCoach: ownUploaded,
    TacticalCoach: ownUploaded,
    FitnessCoach: ownUploaded,
    NutritionSpecialist: ownUploaded,
    GymCoach: ownUploaded,
    GoalkeeperCoach: ownUploaded,
    MentalCoach: ownUploaded,
    Analyst: ownUploaded,
    GraphicDesigner: ownUploaded,
  },

  notes: {
    Player: ownCreated,
    Scout: ownCreated,
    Coach: ownCreated,
    SkillCoach: ownCreated,
    TacticalCoach: ownCreated,
    FitnessCoach: ownCreated,
    NutritionSpecialist: ownCreated,
    GymCoach: ownCreated,
    GoalkeeperCoach: ownCreated,
    MentalCoach: ownCreated,
    Analyst: ownCreated,
    GraphicDesigner: ownCreated,
  },

  sessions: {
    Player: ownPlayer,
    Scout: ownCreated,
    Coach: coachPlayers,
    SkillCoach: coachPlayers,
    TacticalCoach: coachPlayers,
    FitnessCoach: coachPlayers,
    NutritionSpecialist: coachPlayers,
    GymCoach: coachPlayers,
    GoalkeeperCoach: coachPlayers,
    MentalCoach: coachPlayers,
    Analyst: analystPlayers,
    Finance: ownCreated,
    Legal: ownCreated,
    GraphicDesigner: ownCreated,
    ContentManager: ownCreated,
    Approver: ownCreated,
    Publisher: ownCreated,
  },

  wellness: {
    Player: ownPlayer,
    Coach: coachPlayers,
    SkillCoach: coachPlayers,
    TacticalCoach: coachPlayers,
    FitnessCoach: coachPlayers,
    NutritionSpecialist: coachPlayers,
    GymCoach: coachPlayers,
    GoalkeeperCoach: coachPlayers,
    MentalCoach: coachPlayers,
    Analyst: analystPlayers,
  },

  referrals: {
    Player: ownReferral,
    Scout: ownReferral,
    Coach: ownReferral,
    SkillCoach: ownReferral,
    TacticalCoach: ownReferral,
    FitnessCoach: ownReferral,
    NutritionSpecialist: ownReferral,
    GymCoach: ownReferral,
    GoalkeeperCoach: ownReferral,
    MentalCoach: ownReferral,
    Analyst: ownReferral,
    Finance: ownReferral,
    Legal: ownReferral,
    GraphicDesigner: ownReferral,
    ContentManager: ownReferral,
    Approver: ownReferral,
    Publisher: ownReferral,
  },

  tickets: {
    Player: ownTicket,
    Scout: ownTicket,
    Coach: ownTicket,
    SkillCoach: ownTicket,
    TacticalCoach: ownTicket,
    FitnessCoach: ownTicket,
    NutritionSpecialist: ownTicket,
    GymCoach: ownTicket,
    GoalkeeperCoach: ownTicket,
    MentalCoach: ownTicket,
    Analyst: ownTicket,
    Finance: ownTicket,
    Legal: ownTicket,
    GraphicDesigner: ownTicket,
    ContentManager: ownTicket,
    Approver: ownTicket,
    Publisher: ownTicket,
  },
};

// ── Public API ──

/**
 * Build a Sequelize WHERE fragment for row-level scoping.
 * Returns `null` for bypass roles or modules with no rules (= see everything).
 *
 * Usage: merge into your existing `where` object before querying.
 */
export async function buildRowScope(
  module: string,
  user?: AuthUser,
): Promise<WhereClause | null> {
  if (!user) return null;
  if (BYPASS_ROLES.includes(user.role)) {
    await verifyUserRole(user.id, user.role);
    return null;
  }

  const moduleRules = SCOPE_RULES[module];
  if (!moduleRules) return null;

  const scopeBuilder = moduleRules[user.role];
  if (!scopeBuilder) return null; // role not in config = full access

  return await scopeBuilder(user);
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
  if (BYPASS_ROLES.includes(user.role)) {
    await verifyUserRole(user.id, user.role);
    return true;
  }

  const moduleRules = SCOPE_RULES[module];
  if (!moduleRules) return true;

  const scopeBuilder = moduleRules[user.role];
  if (!scopeBuilder) return true;

  const role = user.role;

  // ── Simple column checks (in-memory) ──
  switch (module) {
    case "players":
      if (role === "Player") return record.id === user.playerId;
      // All non-bypass staff can only view players they are assigned to
      return isPlayerAssignedToUser(record.id, user.id);

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

    case "sessions":
      if (role === "Player") return record.playerId === user.playerId;
      if (role === "Scout") return record.createdBy === user.id;
      if (COACH_ROLES.includes(role) || role === "Analyst")
        return isPlayerOwnedBy(record.playerId, user);
      return record.createdBy === user.id;

    case "wellness":
      if (role === "Player") return record.playerId === user.playerId;
      if (COACH_ROLES.includes(role) || role === "Analyst")
        return isPlayerOwnedBy(record.playerId, user);
      return true;

    case "referrals":
      if (record.createdBy === user.id) return true;
      if (record.assignedTo === user.id) return true;
      return false;

    case "tickets":
      if (record.createdBy === user.id) return true;
      if (record.assignedTo === user.id) return true;
      if ((record.additionalAssignees || []).includes(user.id)) return true;
      return false;
  }

  return true;
}

/**
 * Check if a player is assigned to the given user.
 * Coach roles: checked via player_coach_assignments join table (multi-specialty).
 * Analyst: checked via players.analyst_id column.
 */
async function isPlayerOwnedBy(
  playerId: string | undefined | null,
  user: AuthUser,
): Promise<boolean> {
  if (!playerId) return false;

  if (COACH_ROLES.includes(user.role)) {
    const [result] = await sequelize.query<{ exists: boolean }>(
      `SELECT EXISTS(
        SELECT 1 FROM player_coach_assignments
        WHERE player_id = :playerId AND coach_user_id = :userId
      ) AS "exists"`,
      { replacements: { playerId, userId: user.id }, type: QueryTypes.SELECT },
    );
    return result?.exists ?? false;
  }

  // Analyst: single-column FK on players table
  const [result] = await sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM players WHERE id = :playerId AND analyst_id = :userId) AS "exists"`,
    { replacements: { playerId, userId: user.id }, type: QueryTypes.SELECT },
  );
  return result?.exists ?? false;
}

/**
 * Check if a player is assigned to any staff user via player_coach_assignments.
 * Used for roles not covered by isPlayerOwnedBy (Scout, Legal, Finance, etc.).
 */
async function isPlayerAssignedToUser(
  playerId: string | undefined | null,
  userId: string,
): Promise<boolean> {
  if (!playerId) return false;
  const [result] = await sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS(
      SELECT 1 FROM player_coach_assignments
      WHERE player_id = :playerId AND coach_user_id = :userId
    ) AS "exists"`,
    { replacements: { playerId, userId }, type: QueryTypes.SELECT },
  );
  return result?.exists ?? false;
}
