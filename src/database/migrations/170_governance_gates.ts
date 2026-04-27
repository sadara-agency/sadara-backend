import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // ── Hash chain columns on audit_logs (idempotent) ──
  const [hashColRows] = await queryInterface.sequelize.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'audit_logs' AND column_name = 'hash'`,
  );
  if ((hashColRows as unknown[]).length === 0) {
    await queryInterface.addColumn("audit_logs", "hash", {
      type: DataTypes.STRING(64),
      allowNull: true,
    });
    await queryInterface.addColumn("audit_logs", "prev_hash", {
      type: DataTypes.STRING(64),
      allowNull: true,
    });
    await queryInterface.addIndex("audit_logs", ["hash"], {
      name: "audit_logs_hash_idx",
    });
  }

  // ── governance_gates table (idempotent) ──
  const [tableRows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_name = 'governance_gates'`,
  );
  if ((tableRows as unknown[]).length > 0) return;

  await queryInterface.createTable("governance_gates", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    gate_type: { type: DataTypes.STRING(30), allowNull: false },
    entity_type: { type: DataTypes.STRING(50), allowNull: false },
    entity_id: { type: DataTypes.UUID, allowNull: false },
    entity_title: { type: DataTypes.STRING(255), allowNull: true },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending",
    },
    triggered_by: { type: DataTypes.UUID, allowNull: false },
    triggered_by_role: { type: DataTypes.STRING(30), allowNull: true },
    resolved_by: { type: DataTypes.UUID, allowNull: true },
    resolved_at: { type: DataTypes.DATE, allowNull: true },
    justification: { type: DataTypes.TEXT, allowNull: true },
    reviewer_notes: { type: DataTypes.TEXT, allowNull: true },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.addIndex(
    "governance_gates",
    ["entity_type", "entity_id"],
    { name: "governance_gates_entity_idx" },
  );
  await queryInterface.addIndex("governance_gates", ["status", "gate_type"], {
    name: "governance_gates_status_type_idx",
  });
  await queryInterface.addIndex("governance_gates", ["triggered_by"], {
    name: "governance_gates_triggered_by_idx",
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("governance_gates");
  try {
    await queryInterface.removeIndex("audit_logs", "audit_logs_hash_idx");
    await queryInterface.removeColumn("audit_logs", "hash");
    await queryInterface.removeColumn("audit_logs", "prev_hash");
  } catch {
    // columns may not exist on a fresh DB
  }
}
