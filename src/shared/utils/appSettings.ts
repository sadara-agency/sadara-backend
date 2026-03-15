import { QueryTypes } from "sequelize";
import { sequelize } from "@config/database";

export async function getAppSetting(key: string): Promise<any> {
  const [row] = (await sequelize.query(
    `SELECT value FROM app_settings WHERE key = $1 LIMIT 1`,
    { bind: [key], type: QueryTypes.SELECT },
  )) as any[];
  return row?.value ?? null;
}

export async function setAppSetting(key: string, value: any): Promise<void> {
  await sequelize.query(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`,
    { bind: [key, JSON.stringify(value)] },
  );
}
