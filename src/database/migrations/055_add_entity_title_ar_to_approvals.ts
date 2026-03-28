import { QueryInterface, DataTypes } from "sequelize";

export async function up(queryInterface: QueryInterface) {
  await queryInterface.addColumn("approval_requests", "entity_title_ar", {
    type: DataTypes.STRING(500),
    allowNull: true,
  });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.removeColumn("approval_requests", "entity_title_ar");
}
