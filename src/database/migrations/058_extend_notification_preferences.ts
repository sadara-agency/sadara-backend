import { sequelize } from "@config/database";

/**
 * Migration 058: Extend notification_preferences JSONB default
 *
 * Adds toast and browser notification preference fields to the
 * default JSONB value for the users.notification_preferences column.
 */

const NEW_DEFAULT = `'{"contracts":true,"offers":true,"matches":true,"tasks":true,"email":true,"push":true,"sms":true,"toastEnabled":true,"toastTypes":["injury","contract","payment","match","referral","document","task","calendar","system"],"browserNotifications":false,"soundEnabled":false}'::jsonb`;

const OLD_DEFAULT = `'{"contracts":true,"offers":true,"matches":true,"tasks":true,"email":true,"push":true,"sms":true}'::jsonb`;

export async function up() {
  await sequelize.query(
    `ALTER TABLE users ALTER COLUMN notification_preferences SET DEFAULT ${NEW_DEFAULT}`,
  );
}

export async function down() {
  await sequelize.query(
    `ALTER TABLE users ALTER COLUMN notification_preferences SET DEFAULT ${OLD_DEFAULT}`,
  );
}
