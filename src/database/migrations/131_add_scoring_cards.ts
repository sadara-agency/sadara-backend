import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.createTable("scoring_cards", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    watchlist_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "watchlists", key: "id" },
      onDelete: "CASCADE",
    },
    window_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "transfer_windows", key: "id" },
      onDelete: "CASCADE",
    },
    // Four weighted buckets — each 0–100
    performance_score: { type: DataTypes.INTEGER, allowNull: true },
    contract_fit_score: { type: DataTypes.INTEGER, allowNull: true },
    commercial_score: { type: DataTypes.INTEGER, allowNull: true },
    cultural_fit_score: { type: DataTypes.INTEGER, allowNull: true },
    // Optional fine-grained detail per criterion (e.g. { goals: 8, assists: 7 })
    criteria_scores: { type: DataTypes.JSONB, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    // Server-computed from bucket scores × window weights
    weighted_total: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    is_shortlisted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    scored_by: { type: DataTypes.UUID, allowNull: true },
    scored_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.addConstraint("scoring_cards", {
    fields: ["watchlist_id", "window_id"],
    type: "unique",
    name: "scoring_cards_watchlist_window_unique",
  });

  await queryInterface.addIndex("scoring_cards", ["window_id"]);
  await queryInterface.addIndex("scoring_cards", ["is_shortlisted"]);
  await queryInterface.addIndex("scoring_cards", ["weighted_total"]);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("scoring_cards");
}
