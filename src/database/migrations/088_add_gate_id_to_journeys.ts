import { QueryInterface, DataTypes } from "sequelize";

export async function up(queryInterface: QueryInterface) {
  await queryInterface.addColumn("player_journeys", "gate_id", {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "gates", key: "id" },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  });

  await queryInterface.addIndex("player_journeys", ["gate_id"], {
    name: "player_journeys_gate_id_idx",
  });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.removeIndex(
    "player_journeys",
    "player_journeys_gate_id_idx",
  );
  await queryInterface.removeColumn("player_journeys", "gate_id");
}
