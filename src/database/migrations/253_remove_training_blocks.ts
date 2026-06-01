import { QueryInterface } from "sequelize";
import { removeColumnIfPresent, addColumnIfMissing } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await removeColumnIfPresent(
    queryInterface,
    "development_programs",
    "training_block_id",
  );
  await removeColumnIfPresent(
    queryInterface,
    "development_programs",
    "start_week",
  );
  await removeColumnIfPresent(
    queryInterface,
    "nutrition_prescriptions",
    "training_block_id",
  );
  await removeColumnIfPresent(
    queryInterface,
    "wellness_checkins",
    "training_block_id",
  );

  const tableExists = await queryInterface
    .describeTable("training_blocks")
    .then(() => true)
    .catch(() => false);
  if (tableExists) {
    await queryInterface.dropTable("training_blocks");
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const { DataTypes } = await import("sequelize");

  await queryInterface.createTable("training_blocks", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    player_id: { type: DataTypes.UUID, allowNull: false },
    goal: { type: DataTypes.STRING(50), allowNull: false },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "active",
    },
    started_at: { type: DataTypes.DATEONLY, allowNull: false },
    ended_at: { type: DataTypes.DATEONLY, allowNull: true },
    duration_weeks: { type: DataTypes.INTEGER, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await addColumnIfMissing(
    queryInterface,
    "development_programs",
    "training_block_id",
    { type: DataTypes.UUID, allowNull: true, defaultValue: null },
  );
  await addColumnIfMissing(
    queryInterface,
    "development_programs",
    "start_week",
    { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
  );
  await addColumnIfMissing(
    queryInterface,
    "nutrition_prescriptions",
    "training_block_id",
    { type: DataTypes.UUID, allowNull: true, defaultValue: null },
  );
  await addColumnIfMissing(
    queryInterface,
    "wellness_checkins",
    "training_block_id",
    { type: DataTypes.UUID, allowNull: true, defaultValue: null },
  );
}
