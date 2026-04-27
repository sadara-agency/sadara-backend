import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // Skip if the technical_reports table doesn't exist yet (fresh DB — a later migration creates it)
  const [tableRows] = await queryInterface.sequelize.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'technical_reports'
  `);
  if ((tableRows as unknown[]).length === 0) return;

  // Convert status from PostgreSQL ENUM to VARCHAR(30) to support new values
  const [statusRows] = await queryInterface.sequelize.query(`
    SELECT udt_name FROM information_schema.columns
    WHERE table_name = 'technical_reports' AND column_name = 'status'
  `);
  if ((statusRows as { udt_name: string }[])[0]?.udt_name?.startsWith("enum")) {
    await queryInterface.sequelize.query(`
      ALTER TABLE technical_reports
        ALTER COLUMN status TYPE VARCHAR(30)
        USING status::TEXT::VARCHAR(30)
    `);
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "enum_technical_reports_status"`,
    );
  }

  // Add AI / publish columns (idempotent)
  const [colRows] = await queryInterface.sequelize.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'technical_reports'
  `);
  const existing = new Set(
    (colRows as { column_name: string }[]).map((r) => r.column_name),
  );

  if (!existing.has("ai_draft")) {
    await queryInterface.addColumn("technical_reports", "ai_draft", {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  }
  if (!existing.has("ai_model")) {
    await queryInterface.addColumn("technical_reports", "ai_model", {
      type: DataTypes.STRING(100),
      allowNull: true,
    });
  }
  if (!existing.has("prompt_hash")) {
    await queryInterface.addColumn("technical_reports", "prompt_hash", {
      type: DataTypes.STRING(64),
      allowNull: true,
    });
  }
  if (!existing.has("ai_generated_at")) {
    await queryInterface.addColumn("technical_reports", "ai_generated_at", {
      type: DataTypes.DATE,
      allowNull: true,
    });
  }
  if (!existing.has("published_at")) {
    await queryInterface.addColumn("technical_reports", "published_at", {
      type: DataTypes.DATE,
      allowNull: true,
    });
  }
  if (!existing.has("published_by")) {
    await queryInterface.addColumn("technical_reports", "published_by", {
      type: DataTypes.UUID,
      allowNull: true,
    });
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  for (const col of [
    "ai_draft",
    "ai_model",
    "prompt_hash",
    "ai_generated_at",
    "published_at",
    "published_by",
  ]) {
    try {
      await queryInterface.removeColumn("technical_reports", col);
    } catch {
      // column may not exist on fresh DB
    }
  }
}
