import { QueryInterface, DataTypes } from "sequelize";

export async function up({ context: qi }: { context: QueryInterface }) {
  const [rows] = await qi.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'media_requests' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  // Guard: column may already exist from model sync
  const table = (await qi.describeTable("media_requests")) as Record<
    string,
    unknown
  >;
  if (table.media_contact_id) return;

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
  const [rows] = await qi.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'media_requests' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  await qi.removeColumn("media_requests", "media_contact_id");
}
