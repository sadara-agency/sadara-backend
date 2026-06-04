import { QueryInterface } from "sequelize";
import { tableExists } from "../migrationHelpers";

// Manual food items created by staff have no USDA FDC ID.
// Make fdc_id nullable so manual entries don't need a fake value.
export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  if (!(await tableExists(queryInterface, "food_items"))) return;

  await queryInterface.sequelize.query(`
    ALTER TABLE food_items ALTER COLUMN fdc_id DROP NOT NULL
  `);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  if (!(await tableExists(queryInterface, "food_items"))) return;

  // Fill NULL fdc_ids with a placeholder before restoring NOT NULL
  await queryInterface.sequelize.query(`
    UPDATE food_items SET fdc_id = 0 WHERE fdc_id IS NULL
  `);

  await queryInterface.sequelize.query(`
    ALTER TABLE food_items ALTER COLUMN fdc_id SET NOT NULL
  `);
}
