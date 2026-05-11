import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.createTable("program_exercise_logs", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    program_exercise_id: {
      // No FK constraint — program_exercises table may not exist on a fresh DB run
      // (it is created by a later migration). Integrity enforced at app layer.
      type: DataTypes.UUID,
      allowNull: false,
    },
    program_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "development_programs", key: "id" },
      onDelete: "CASCADE",
    },
    player_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "players", key: "id" },
      onDelete: "CASCADE",
    },
    set_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    actual_reps: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    actual_weight_kg: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
    },
    rpe: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: true,
    },
    logged_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
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
    "program_exercise_logs",
    ["program_exercise_id", "player_id"],
    {
      name: "idx_prog_ex_logs_exercise_player",
    },
  );

  // migration-lint: disable-next-line
  await queryInterface.addIndex(
    "program_exercise_logs",
    ["program_id", "player_id"],
    {
      name: "idx_prog_ex_logs_program_player",
    },
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("program_exercise_logs");
}
