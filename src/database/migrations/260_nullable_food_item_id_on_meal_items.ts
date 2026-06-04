import { QueryInterface } from "sequelize";
import { tableExists } from "../migrationHelpers";

// Manual meal items (added by the coach without picking from the food library)
// use foodItemId = NULL. This migration drops the NOT-NULL constraint and the FK
// so those rows can be persisted. The service already handles null lookups.
export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  if (!(await tableExists(queryInterface, "prescription_meal_items"))) return;

  // Drop FK first (cannot ALTER NOT NULL while FK exists on some PG versions)
  await queryInterface.sequelize.query(`
    ALTER TABLE prescription_meal_items
      DROP CONSTRAINT IF EXISTS fk_prescription_meal_items_food
  `);

  await queryInterface.sequelize.query(`
    ALTER TABLE prescription_meal_items
      ALTER COLUMN food_item_id DROP NOT NULL
  `);

  // Re-add FK allowing NULL (ON DELETE SET NULL keeps rows when a library food is deleted)
  await queryInterface.sequelize.query(`
    ALTER TABLE prescription_meal_items
      ADD CONSTRAINT fk_prescription_meal_items_food
      FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE SET NULL
  `);

  // Add name column so manual items can store their display name
  await queryInterface.sequelize.query(`
    ALTER TABLE prescription_meal_items
      ADD COLUMN IF NOT EXISTS name VARCHAR(255)
  `);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  if (!(await tableExists(queryInterface, "prescription_meal_items"))) return;

  await queryInterface.sequelize.query(`
    ALTER TABLE prescription_meal_items DROP COLUMN IF EXISTS name
  `);

  await queryInterface.sequelize.query(`
    ALTER TABLE prescription_meal_items
      DROP CONSTRAINT IF EXISTS fk_prescription_meal_items_food
  `);

  // Delete manual items (null foodItemId) before restoring NOT NULL
  await queryInterface.sequelize.query(`
    DELETE FROM prescription_meal_items WHERE food_item_id IS NULL
  `);

  await queryInterface.sequelize.query(`
    ALTER TABLE prescription_meal_items
      ALTER COLUMN food_item_id SET NOT NULL
  `);

  await queryInterface.sequelize.query(`
    ALTER TABLE prescription_meal_items
      ADD CONSTRAINT fk_prescription_meal_items_food
      FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE RESTRICT
  `);
}
