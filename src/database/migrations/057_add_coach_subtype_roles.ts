import { sequelize } from "@config/database";
import { randomUUID } from "crypto";

/**
 * Migration 057: Add Coach Subtype Role Permissions
 *
 * Adds permission rows for four new coach subtypes:
 * - SkillCoach (مدرب مهاري)
 * - TacticalCoach (مدرب تكتيكي)
 * - FitnessCoach (مدرب لياقة)
 * - NutritionSpecialist (اخصائي تغذية)
 *
 * No DDL changes — users.role is VARCHAR, so new role strings work directly.
 */

interface PermRow {
  role: string;
  module: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

function perm(
  role: string,
  module: string,
  flags: { C?: boolean; R?: boolean; U?: boolean; D?: boolean },
): PermRow {
  return {
    role,
    module,
    canCreate: flags.C ?? false,
    canRead: flags.R ?? false,
    canUpdate: flags.U ?? false,
    canDelete: flags.D ?? false,
  };
}

const NEW_ROLES = [
  "SkillCoach",
  "TacticalCoach",
  "FitnessCoach",
  "NutritionSpecialist",
];

export async function up() {
  const [guardRows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions' AND table_schema = 'public'`,
  );
  if ((guardRows as unknown[]).length === 0) return;
  const rows: PermRow[] = [];

  // ── Modules all coach subtypes share (read-only or common) ──
  for (const role of NEW_ROLES) {
    rows.push(perm(role, "dashboard", { R: true }));
    rows.push(perm(role, "players", { R: true }));
    rows.push(perm(role, "tasks", { R: true, C: true, U: true }));
    rows.push(perm(role, "notifications", { R: true, U: true, D: true }));
    rows.push(perm(role, "notes", { R: true, C: true }));
    rows.push(perm(role, "settings", { R: true, U: true }));
    rows.push(perm(role, "competitions", { R: true }));
    rows.push(perm(role, "documents", { R: true }));
    rows.push(perm(role, "reports", { R: true }));
  }

  // ── SkillCoach ──
  rows.push(perm("SkillCoach", "matches", { R: true, C: true, U: true }));
  rows.push(perm("SkillCoach", "injuries", { R: true }));
  rows.push(
    perm("SkillCoach", "training", { R: true, C: true, U: true, D: true }),
  );
  rows.push(perm("SkillCoach", "wellness", { R: true }));
  rows.push(perm("SkillCoach", "clubs", { R: true }));

  // ── TacticalCoach ──
  rows.push(
    perm("TacticalCoach", "matches", { R: true, C: true, U: true, D: true }),
  );
  rows.push(perm("TacticalCoach", "injuries", { R: true }));
  rows.push(
    perm("TacticalCoach", "training", { R: true, C: true, U: true, D: true }),
  );
  rows.push(perm("TacticalCoach", "wellness", { R: true }));
  rows.push(perm("TacticalCoach", "clubs", { R: true }));

  // ── FitnessCoach ──
  rows.push(perm("FitnessCoach", "matches", { R: true }));
  rows.push(perm("FitnessCoach", "injuries", { R: true, C: true, U: true }));
  rows.push(
    perm("FitnessCoach", "training", { R: true, C: true, U: true, D: true }),
  );
  rows.push(perm("FitnessCoach", "wellness", { R: true, C: true, U: true }));

  // ── NutritionSpecialist ──
  rows.push(perm("NutritionSpecialist", "injuries", { R: true }));
  rows.push(perm("NutritionSpecialist", "training", { R: true }));
  rows.push(
    perm("NutritionSpecialist", "wellness", {
      R: true,
      C: true,
      U: true,
      D: true,
    }),
  );

  const values = rows
    .map(
      (r) =>
        `('${randomUUID()}', '${r.role}', '${r.module}', ${r.canCreate}, ${r.canRead}, ${r.canUpdate}, ${r.canDelete}, NOW(), NOW())`,
    )
    .join(",\n       ");

  await sequelize.query(
    `INSERT INTO role_permissions (id, role, module, can_create, can_read, can_update, can_delete, created_at, updated_at)
     VALUES ${values}
     ON CONFLICT (role, module) DO NOTHING`,
  );
}

export async function down() {
  const [guardRows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions' AND table_schema = 'public'`,
  );
  if ((guardRows as unknown[]).length === 0) return;
  await sequelize.query(
    `DELETE FROM role_permissions WHERE role IN ('SkillCoach', 'TacticalCoach', 'FitnessCoach', 'NutritionSpecialist')`,
  );
}
