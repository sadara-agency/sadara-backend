/**
 * Create the audit_logs table via migration.
 *
 * Previously this table was created by Sequelize .sync() at startup,
 * which meant it could be missing on fresh DBs until the app booted.
 * This migration makes it part of the normal migration flow.
 */
import { QueryInterface, DataTypes } from "sequelize";

export async function up({ context: qi }: { context: QueryInterface }) {
  // Guard: table may already exist from previous sync() runs
  const [rows] = await qi.sequelize.query(`
    SELECT to_regclass('public.audit_logs') AS tbl
  `);
  if ((rows as any[])[0]?.tbl) {
    // Table exists — ensure all columns are present (later additions)
    const [cols] = await qi.sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'audit_logs' AND table_schema = 'public'
    `);
    const existing = new Set((cols as any[]).map((c) => c.column_name));

    const additions: Array<{
      col: string;
      type: DataTypes.DataType;
      field?: string;
    }> = [
      { col: "user_name", type: DataTypes.STRING },
      { col: "user_role", type: DataTypes.STRING },
      { col: "ip_address", type: DataTypes.STRING },
      { col: "user_agent", type: DataTypes.TEXT },
      { col: "request_method", type: DataTypes.STRING(10) },
      { col: "request_path", type: DataTypes.TEXT },
    ];

    for (const { col, type } of additions) {
      if (!existing.has(col)) {
        await qi.addColumn("audit_logs", col, { type, allowNull: true });
      }
    }
    return;
  }

  await qi.createTable("audit_logs", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    user_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    user_role: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    entity: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    entity_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    detail: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    changes: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    request_method: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    request_path: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    logged_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Indexes that migration 033 previously guarded with existence checks
  await qi.sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
    ON audit_logs (entity, entity_id)
  `);
  await qi.sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_logged_at
    ON audit_logs (logged_at)
  `);
  await qi.sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
    ON audit_logs (user_id)
  `);
}

export async function down({ context: qi }: { context: QueryInterface }) {
  await qi.dropTable("audit_logs");
}
