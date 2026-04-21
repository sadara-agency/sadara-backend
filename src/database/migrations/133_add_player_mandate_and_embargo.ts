import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // Player mandate fields
  await queryInterface.addColumn("players", "mandate_status", {
    type: DataTypes.STRING(30),
    allowNull: true,
    defaultValue: null,
  });
  await queryInterface.addColumn("players", "mandate_signed_at", {
    type: DataTypes.DATEONLY,
    allowNull: true,
  });
  await queryInterface.addColumn("players", "exclusive_until", {
    type: DataTypes.DATEONLY,
    allowNull: true,
  });

  // Offer media embargo
  await queryInterface.addColumn("offers", "media_embargo_lifted_at", {
    type: DataTypes.DATE,
    allowNull: true,
  });

  // Extend gate_number ENUM to support Gate 4
  await queryInterface.sequelize.query(
    `ALTER TYPE "enum_gates_gate_number" ADD VALUE IF NOT EXISTS '4'`,
  );

  await queryInterface.addIndex("players", ["mandate_status"]);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.removeIndex("players", ["mandate_status"]);
  await queryInterface.removeColumn("offers", "media_embargo_lifted_at");
  await queryInterface.removeColumn("players", "exclusive_until");
  await queryInterface.removeColumn("players", "mandate_signed_at");
  await queryInterface.removeColumn("players", "mandate_status");
  // NOTE: PostgreSQL does not support removing ENUM values — '4' stays in the type
}
