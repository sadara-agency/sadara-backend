/**
 * Shared Sequelize attribute sets and include definitions.
 * Import these instead of redeclaring per module.
 */

// ── Attribute arrays (reusable in includes or raw queries) ──

export const USER_ATTRS = ["id", "fullName", "fullNameAr", "email"] as const;

export const USER_ATTRS_BRIEF = ["id", "fullName"] as const;

export const USER_ATTRS_WITH_ROLE = ["id", "fullName", "role"] as const;

export const PLAYER_ATTRS = [
  "id",
  "firstName",
  "lastName",
  "firstNameAr",
  "lastNameAr",
  "position",
  "photoUrl",
] as const;

export const CLUB_ATTRS = ["id", "name", "nameAr", "logoUrl"] as const;
