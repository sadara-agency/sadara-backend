import { QueryInterface, DataTypes } from "sequelize";

export async function up({ context: qi }: { context: QueryInterface }) {
  await qi.addColumn("media_requests", "media_contact_id", {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "media_contacts", key: "id" },
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  });

  await qi.addIndex("media_requests", ["media_contact_id"]);
}

export async function down({ context: qi }: { context: QueryInterface }) {
  await qi.removeColumn("media_requests", "media_contact_id");
}
