import { QueryInterface, DataTypes } from "sequelize";

export async function up(qi: QueryInterface) {
  const tableDesc = (await qi.describeTable("users")) as Record<
    string,
    unknown
  >;
  if (!tableDesc.last_activity) {
    await qi.addColumn("users", "last_activity", {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    });
  }
}

export async function down(qi: QueryInterface) {
  await qi.removeColumn("users", "last_activity");
}
