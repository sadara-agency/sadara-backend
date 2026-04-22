import { QueryInterface } from "sequelize";

/**
 * Archives the wellness_meal_logs and wellness_food_items tables by renaming
 * them. Data is preserved in the archive tables. The nutrition prescription
 * module (migration 136) replaces this functionality.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.renameTable(
    "wellness_food_items",
    "_archive_food_items_20260422",
  );
  await queryInterface.renameTable(
    "wellness_meal_logs",
    "_archive_meal_logs_20260422",
  );
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.renameTable(
    "_archive_meal_logs_20260422",
    "wellness_meal_logs",
  );
  await queryInterface.renameTable(
    "_archive_food_items_20260422",
    "wellness_food_items",
  );
}
