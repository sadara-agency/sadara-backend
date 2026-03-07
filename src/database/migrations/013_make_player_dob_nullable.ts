import { QueryInterface, DataTypes } from "sequelize";

export async function up(queryInterface: QueryInterface) {
  await queryInterface.changeColumn("players", "date_of_birth", {
    type: DataTypes.DATEONLY,
    allowNull: true,
  });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.changeColumn("players", "date_of_birth", {
    type: DataTypes.DATEONLY,
    allowNull: false,
  });
}
