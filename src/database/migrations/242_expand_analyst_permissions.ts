import { sequelize } from "@config/database";
import { QueryTypes } from "sequelize";

/**
 * Expand Analyst RBAC:
 *  - Full CRUD on the performance/tactical modules:
 *    matches, sessions, player-stats, training, tactical, video.
 *  - Read-only on wellness + injuries, with field-level hiding of the
 *    sensitive medical / personal columns (diagnosis, treatment, body fat, etc.).
 *
 * tactical & video already grant Analyst full CRUD in the matrix; the upserts
 * below are idempotent, so re-asserting them is harmless and keeps this
 * migration self-documenting.
 *
 * Mirrors the seed-shared.ts RAW_PERMISSIONS edits so fresh-DB and existing
 * DBs converge. Field-hiding rows live only here (not in seedPermissions).
 */

// Modules where Analyst gets full CRUD.
const FULL_CRUD_MODULES = [
  "matches",
  "sessions",
  "player-stats",
  "training",
  "tactical",
  "video",
];

// Modules where Analyst gets read-only.
const READ_ONLY_MODULES = ["wellness", "injuries"];

// Field-hiding: module -> fields hidden from Analyst.
// Kept visible: injuries.isSurgeryRequired / surgeryDate (availability signals),
// wellness target* macros (performance nutrition). See plan for rationale.
const HIDDEN_FIELDS: Record<string, string[]> = {
  injuries: [
    "diagnosis",
    "treatment",
    "treatmentPlan",
    "surgeon",
    "surgeonName",
    "facility",
    "medicalProvider",
    "cause",
  ],
  wellness: ["bodyFatPct", "notes"],
};

async function tableExists(table: string): Promise<boolean> {
  const rows = await sequelize.query(
    `SELECT 1 FROM information_schema.tables
       WHERE table_name = :table AND table_schema = 'public'`,
    { type: QueryTypes.SELECT, replacements: { table } },
  );
  return rows.length > 0;
}

export async function up() {
  if (await tableExists("role_permissions")) {
    for (const module of FULL_CRUD_MODULES) {
      await sequelize.query(
        `INSERT INTO role_permissions
           (id, role, module, can_create, can_read, can_update, can_delete, created_at, updated_at)
         VALUES (gen_random_uuid(), 'Analyst', :module, true, true, true, true, NOW(), NOW())
         ON CONFLICT (role, module) DO UPDATE SET
           can_create = true,
           can_read   = true,
           can_update = true,
           can_delete = true,
           updated_at = NOW()`,
        { replacements: { module } },
      );
    }

    for (const module of READ_ONLY_MODULES) {
      await sequelize.query(
        `INSERT INTO role_permissions
           (id, role, module, can_create, can_read, can_update, can_delete, created_at, updated_at)
         VALUES (gen_random_uuid(), 'Analyst', :module, false, true, false, false, NOW(), NOW())
         ON CONFLICT (role, module) DO UPDATE SET
           can_read   = true,
           updated_at = NOW()`,
        { replacements: { module } },
      );
    }
  }

  if (await tableExists("role_field_permissions")) {
    for (const [module, fields] of Object.entries(HIDDEN_FIELDS)) {
      for (const field of fields) {
        await sequelize.query(
          `INSERT INTO role_field_permissions
             (id, role, module, field, hidden, created_at, updated_at)
           VALUES (gen_random_uuid(), 'Analyst', :module, :field, true, NOW(), NOW())
           ON CONFLICT (role, module, field) DO UPDATE SET
             hidden     = true,
             updated_at = NOW()`,
          { replacements: { module, field } },
        );
      }
    }
  }
}

export async function down() {
  if (await tableExists("role_field_permissions")) {
    for (const [module, fields] of Object.entries(HIDDEN_FIELDS)) {
      for (const field of fields) {
        await sequelize.query(
          `DELETE FROM role_field_permissions
             WHERE role = 'Analyst' AND module = :module AND field = :field`,
          { replacements: { module, field } },
        );
      }
    }
  }

  if (await tableExists("role_permissions")) {
    // Analyst had no prior wellness/injuries grant -> remove the rows entirely.
    for (const module of READ_ONLY_MODULES) {
      await sequelize.query(
        `DELETE FROM role_permissions WHERE role = 'Analyst' AND module = :module`,
        { replacements: { module } },
      );
    }

    // Revert each CRUD module to its exact pre-242 flags.
    // matches: was { read, update }
    await sequelize.query(
      `UPDATE role_permissions
         SET can_create = false, can_delete = false, updated_at = NOW()
       WHERE role = 'Analyst' AND module = 'matches'`,
    );
    // sessions: was { create, read, update }
    await sequelize.query(
      `UPDATE role_permissions
         SET can_delete = false, updated_at = NOW()
       WHERE role = 'Analyst' AND module = 'sessions'`,
    );
    // player-stats: was { read, update }
    await sequelize.query(
      `UPDATE role_permissions
         SET can_create = false, can_delete = false, updated_at = NOW()
       WHERE role = 'Analyst' AND module = 'player-stats'`,
    );
    // training: was { read }
    await sequelize.query(
      `UPDATE role_permissions
         SET can_create = false, can_update = false, can_delete = false, updated_at = NOW()
       WHERE role = 'Analyst' AND module = 'training'`,
    );
    // tactical & video were already full CRUD pre-242 -> leave as-is.
  }
}
