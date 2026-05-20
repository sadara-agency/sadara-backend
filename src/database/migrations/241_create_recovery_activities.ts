import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.createTable("recovery_activities", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    player_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    activity_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    sauna_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    pool_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    walk_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    cold_tub_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    steps: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    recorded_by: {
      type: DataTypes.UUID,
      allowNull: false,
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

  // migration-lint: disable-next-line
  await queryInterface.addIndex(
    "recovery_activities",
    ["player_id", "activity_date"],
    {
      name: "idx_recovery_activities_player_date",
      unique: true,
    },
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("recovery_activities");
}
