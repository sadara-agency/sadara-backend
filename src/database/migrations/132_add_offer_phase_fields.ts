import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.addColumn("offers", "phase", {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: null,
  });
  await queryInterface.addColumn("offers", "window_id", {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "transfer_windows", key: "id" },
    onDelete: "SET NULL",
  });
  await queryInterface.addColumn("offers", "saff_reg_date", {
    type: DataTypes.DATEONLY,
    allowNull: true,
  });
  await queryInterface.addColumn("offers", "itc_filed_date", {
    type: DataTypes.DATEONLY,
    allowNull: true,
  });
  await queryInterface.addColumn("offers", "medical_date", {
    type: DataTypes.DATEONLY,
    allowNull: true,
  });
  await queryInterface.addColumn("offers", "hot_signed_date", {
    type: DataTypes.DATEONLY,
    allowNull: true,
  });
  await queryInterface.addColumn("offers", "blocker_notes", {
    type: DataTypes.TEXT,
    allowNull: true,
  });
  await queryInterface.addIndex("offers", ["phase"]);
  await queryInterface.addIndex("offers", ["window_id"]);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.removeIndex("offers", ["window_id"]);
  await queryInterface.removeIndex("offers", ["phase"]);
  await queryInterface.removeColumn("offers", "blocker_notes");
  await queryInterface.removeColumn("offers", "hot_signed_date");
  await queryInterface.removeColumn("offers", "medical_date");
  await queryInterface.removeColumn("offers", "itc_filed_date");
  await queryInterface.removeColumn("offers", "saff_reg_date");
  await queryInterface.removeColumn("offers", "window_id");
  await queryInterface.removeColumn("offers", "phase");
}
