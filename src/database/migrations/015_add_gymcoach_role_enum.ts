import { sequelize } from "../../config/database";

export async function up() {
  // Add 'GymCoach' to the user_role enum type if it exists
  const [typeExists] = await sequelize.query(
    `SELECT 1 FROM pg_type WHERE typname = 'user_role'`,
  );

  if ((typeExists as any[]).length > 0) {
    const [valueExists] = await sequelize.query(
      `SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
       WHERE t.typname = 'user_role' AND e.enumlabel = 'GymCoach'`,
    );

    if (!(valueExists as any[]).length) {
      await sequelize.query(
        `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'GymCoach'`,
      );
    }
  }

  // Also check for Sequelize-generated enum name (enum_users_role)
  const [seqTypeExists] = await sequelize.query(
    `SELECT 1 FROM pg_type WHERE typname = 'enum_users_role'`,
  );

  if ((seqTypeExists as any[]).length > 0) {
    const [valueExists] = await sequelize.query(
      `SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
       WHERE t.typname = 'enum_users_role' AND e.enumlabel = 'GymCoach'`,
    );

    if (!(valueExists as any[]).length) {
      await sequelize.query(
        `ALTER TYPE enum_users_role ADD VALUE IF NOT EXISTS 'GymCoach'`,
      );
    }
  }
}

export async function down() {
  // PostgreSQL does not support removing enum values — no-op
}
