import { sequelize } from "@config/database";

const MISSING_ROLES = ["Legal", "Finance", "Media", "Executive"];

async function addEnumValue(enumName: string, value: string) {
  const [typeExists] = await sequelize.query(
    `SELECT 1 FROM pg_type WHERE typname = '${enumName}'`,
  );

  if ((typeExists as any[]).length > 0) {
    await sequelize.query(
      `ALTER TYPE "${enumName}" ADD VALUE IF NOT EXISTS '${value}'`,
    );
  }
}

export async function up() {
  for (const role of MISSING_ROLES) {
    await addEnumValue("user_role", role);
    await addEnumValue("enum_users_role", role);
  }
}

export async function down() {
  // PostgreSQL does not support removing enum values — no-op
}
