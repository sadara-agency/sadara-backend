import { QueryInterface, DataTypes } from "sequelize";
import { tableExists } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.createTable("session_logs", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    session_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    player_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    rpe: {
      type: DataTypes.SMALLINT,
      allowNull: true,
    },
    duration_min: {
      type: DataTypes.SMALLINT,
      allowNull: true,
    },
    completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    player_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    logged_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  if (await tableExists(queryInterface, "session_logs")) {
    await queryInterface.addIndex("session_logs", ["player_id"], {
      name: "session_logs_player_id_idx",
    });
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("session_logs");
}
