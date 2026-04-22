import { QueryInterface, DataTypes } from "sequelize";

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable("nutrition_prescriptions", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    player_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "players", key: "id" },
      onDelete: "CASCADE",
    },
    training_block_id: {
      type: DataTypes.UUID,
      references: { model: "training_blocks", key: "id" },
      onDelete: "SET NULL",
    },
    version_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    issued_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "RESTRICT",
    },
    triggering_reason: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "manual",
    },
    triggering_scan_id: {
      type: DataTypes.UUID,
      // No FK constraint — body_compositions may be soft-deleted or archived
    },
    target_calories: {
      type: DataTypes.INTEGER,
    },
    target_protein_g: {
      type: DataTypes.DECIMAL(6, 1),
    },
    target_carbs_g: {
      type: DataTypes.DECIMAL(6, 1),
    },
    target_fat_g: {
      type: DataTypes.DECIMAL(6, 1),
    },
    hydration_target_ml: {
      type: DataTypes.INTEGER,
    },
    pre_training_guidance: {
      type: DataTypes.TEXT,
    },
    post_training_guidance: {
      type: DataTypes.TEXT,
    },
    notes: {
      type: DataTypes.TEXT,
    },
    superseded_at: {
      type: DataTypes.DATE,
    },
    superseded_by: {
      type: DataTypes.UUID,
      // Self-referential FK added as constraint after table creation
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  // Self-referential FK: superseded_by → nutrition_prescriptions.id
  await queryInterface.addConstraint("nutrition_prescriptions", {
    fields: ["superseded_by"],
    type: "foreign key",
    name: "nutrition_prescriptions_superseded_by_fkey",
    references: { table: "nutrition_prescriptions", field: "id" },
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  });

  await queryInterface.addIndex("nutrition_prescriptions", ["player_id"], {
    name: "nutrition_prescriptions_player_id_idx",
  });
  await queryInterface.addIndex(
    "nutrition_prescriptions",
    ["player_id", "superseded_at"],
    { name: "nutrition_prescriptions_player_current_idx" },
  );

  await queryInterface.createTable("prescription_meals", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    prescription_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "nutrition_prescriptions", key: "id" },
      onDelete: "CASCADE",
    },
    day_of_week: {
      type: DataTypes.INTEGER,
    },
    meal_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    notes: {
      type: DataTypes.TEXT,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex("prescription_meals", ["prescription_id"], {
    name: "prescription_meals_prescription_id_idx",
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable("prescription_meals");
  await queryInterface.removeConstraint(
    "nutrition_prescriptions",
    "nutrition_prescriptions_superseded_by_fkey",
  );
  await queryInterface.dropTable("nutrition_prescriptions");
}
