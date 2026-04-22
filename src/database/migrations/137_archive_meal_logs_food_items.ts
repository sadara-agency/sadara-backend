import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(
    `ALTER TABLE wellness_food_items RENAME TO _archive_food_items_20260422`,
  );
  await sequelize.query(
    `ALTER TABLE wellness_meal_logs RENAME TO _archive_meal_logs_20260422`,
  );
  console.log(
    "Migration 137: wellness_food_items and wellness_meal_logs archived",
  );
}

export async function down() {
  await sequelize.query(
    `ALTER TABLE _archive_meal_logs_20260422 RENAME TO wellness_meal_logs`,
  );
  await sequelize.query(
    `ALTER TABLE _archive_food_items_20260422 RENAME TO wellness_food_items`,
  );
  console.log(
    "Migration 137: archive tables restored to wellness_food_items and wellness_meal_logs",
  );
}
