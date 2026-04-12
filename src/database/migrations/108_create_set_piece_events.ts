import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.createTable("set_piece_events", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    match_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "matches", key: "id" },
      onDelete: "CASCADE",
    },
    type: {
      type: DataTypes.STRING(30),
      allowNull: false,
      comment: "corner | free_kick | penalty | throw_in",
    },
    side: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: "attacking | defending",
    },
    minute: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    taker_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "players", key: "id" },
      onDelete: "SET NULL",
    },
    outcome: {
      type: DataTypes.STRING(30),
      allowNull: true,
      comment:
        "goal | shot_on_target | shot_off_target | cleared | penalty_won | penalty_missed | other",
    },
    delivery_type: {
      type: DataTypes.STRING(30),
      allowNull: true,
      comment: "inswinger | outswinger | short | direct | driven",
    },
    target_zone: {
      type: DataTypes.STRING(30),
      allowNull: true,
      comment: "near_post | far_post | center | edge_of_box | penalty_spot",
    },
    scorer_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "players", key: "id" },
      onDelete: "SET NULL",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.addIndex("set_piece_events", ["match_id"], {
    name: "set_piece_events_match_id_idx",
  });
  await queryInterface.addIndex("set_piece_events", ["taker_id"], {
    name: "set_piece_events_taker_id_idx",
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("set_piece_events");
}
