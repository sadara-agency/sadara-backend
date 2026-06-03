import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.createTable("program_day_completions", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    player_id: { type: DataTypes.UUID, allowNull: false },
    day_session_id: { type: DataTypes.UUID, allowNull: false },
    program_id: { type: DataTypes.UUID, allowNull: false },
    completed_date: { type: DataTypes.DATEONLY, allowNull: false },
    completed_at: { type: DataTypes.DATE, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.addIndex("program_day_completions", {
    fields: ["player_id", "day_session_id", "completed_date"],
    unique: true,
    name: "program_day_completions_player_session_date_uniq",
  });

  await queryInterface.addIndex("program_day_completions", {
    fields: ["player_id", "program_id"],
    name: "program_day_completions_player_program_idx",
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("program_day_completions");
}
