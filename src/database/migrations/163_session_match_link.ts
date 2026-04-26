import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.addColumn("sessions", "match_id", {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "matches", key: "id" },
    onDelete: "SET NULL",
  });

  await queryInterface.addColumn("sessions", "rating", {
    type: DataTypes.SMALLINT,
    allowNull: true,
  });

  await queryInterface.addColumn("sessions", "video_timestamps", {
    type: DataTypes.JSONB,
    allowNull: true,
  });

  await queryInterface.addIndex("sessions", ["match_id"], {
    name: "sessions_match_id_idx",
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.removeIndex("sessions", "sessions_match_id_idx");
  await queryInterface.removeColumn("sessions", "video_timestamps");
  await queryInterface.removeColumn("sessions", "rating");
  await queryInterface.removeColumn("sessions", "match_id");
}
