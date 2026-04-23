import { QueryInterface, DataTypes } from "sequelize";

// Phase 5 — Daily Pulse: extends wellness_checkins with training and nutrition
// self-assessment fields, plus a soft FK to the active training block so Phase 6
// block-progress reports can aggregate per-block pulse data.
export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  await queryInterface.addColumn("wellness_checkins", "training_type", {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment:
      "rest | club_session | program_session | mixed — describes the previous day",
  });

  await queryInterface.addColumn("wellness_checkins", "nutrition_rating", {
    type: DataTypes.SMALLINT,
    allowNull: true,
    comment: "1–5 player self-rate of previous-day nutrition adherence",
  });

  await queryInterface.addColumn("wellness_checkins", "training_block_id", {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "training_blocks", key: "id" },
    onDelete: "SET NULL",
    comment: "Active block at the time of submission — used by Phase 6 reports",
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  await queryInterface.removeColumn("wellness_checkins", "training_block_id");
  await queryInterface.removeColumn("wellness_checkins", "nutrition_rating");
  await queryInterface.removeColumn("wellness_checkins", "training_type");
}
