import { sequelize } from "@config/database";

/**
 * Grant clubs:read permission to roles that were missing it.
 *
 * The Finance role needs clubs:read to populate club/entity dropdowns
 * in offers, contracts, and invoice forms. Other coach sub-roles also
 * need it for club references throughout the platform.
 *
 * Fixes: Club dropdown showing "No results" for Finance and coach sub-roles.
 */
export async function up() {
  const roles = [
    "Finance",
    "Legal",
    "FitnessCoach",
    "NutritionSpecialist",
    "GymCoach",
    "GoalkeeperCoach",
    "MentalCoach",
  ];

  for (const role of roles) {
    await sequelize.query(
      `INSERT INTO role_permissions (id, role, module, can_create, can_read, can_update, can_delete, created_at, updated_at)
       VALUES (gen_random_uuid(), :role, 'clubs', false, true, false, false, NOW(), NOW())
       ON CONFLICT (role, module) DO UPDATE SET
         can_read   = true,
         updated_at = NOW()`,
      { replacements: { role } },
    );
  }
}

export async function down() {
  const roles = [
    "Finance",
    "Legal",
    "FitnessCoach",
    "NutritionSpecialist",
    "GymCoach",
    "GoalkeeperCoach",
    "MentalCoach",
  ];

  for (const role of roles) {
    await sequelize.query(
      `UPDATE role_permissions
         SET can_read   = false,
             updated_at = NOW()
       WHERE role = :role AND module = 'clubs'`,
      { replacements: { role } },
    );
  }
}
