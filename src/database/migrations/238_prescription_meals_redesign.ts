import { QueryInterface, DataTypes, QueryTypes } from "sequelize";
import {
  addColumnIfMissing,
  removeColumnIfPresent,
  tableExists,
} from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  // 1. Add custom_name to prescription_meals
  await addColumnIfMissing(
    queryInterface,
    "prescription_meals",
    "custom_name",
    {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  );

  // 2. Make meal_type nullable (was NOT NULL)
  if (await tableExists(queryInterface, "prescription_meals")) {
    await queryInterface.sequelize.query(
      `ALTER TABLE prescription_meals ALTER COLUMN meal_type DROP NOT NULL`,
    );
  }

  // 3. Create prescription_meal_items
  if (!(await tableExists(queryInterface, "prescription_meal_items"))) {
    await queryInterface.createTable("prescription_meal_items", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      meal_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "prescription_meals", key: "id" },
        onDelete: "CASCADE",
      },
      food_item_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "food_items", key: "id" },
        onDelete: "RESTRICT",
      },
      servings: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 1.0,
      },
      calories: {
        type: DataTypes.DECIMAL(7, 2),
        allowNull: true,
      },
      protein_g: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
      },
      carbs_g: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
      },
      fat_g: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  // Drop prescription_meal_items first (FK dependency)
  if (await tableExists(queryInterface, "prescription_meal_items")) {
    await queryInterface.dropTable("prescription_meal_items");
  }

  // Restore NOT NULL on meal_type
  if (await tableExists(queryInterface, "prescription_meals")) {
    // Set a default for any rows that might have null meal_type before restoring constraint
    await queryInterface.sequelize.query(
      `UPDATE prescription_meals SET meal_type = 'breakfast' WHERE meal_type IS NULL`,
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE prescription_meals ALTER COLUMN meal_type SET NOT NULL`,
    );
  }

  await removeColumnIfPresent(
    queryInterface,
    "prescription_meals",
    "custom_name",
  );
}
