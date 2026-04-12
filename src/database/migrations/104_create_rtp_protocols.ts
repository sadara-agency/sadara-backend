import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // ── RTP Protocols ──
  await queryInterface.createTable("rtp_protocols", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    injury_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: "injuries", key: "id" },
      onDelete: "CASCADE",
    },
    player_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "players", key: "id" },
      onDelete: "CASCADE",
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    target_return_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    actual_return_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    current_phase: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "rest",
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "active",
    },
    medical_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    medical_notes_ar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.addIndex("rtp_protocols", ["player_id"], {
    name: "rtp_protocols_player_id_idx",
  });
  await queryInterface.addIndex("rtp_protocols", ["status"], {
    name: "rtp_protocols_status_idx",
  });

  // ── RTP Phase Logs ──
  await queryInterface.createTable("rtp_phase_logs", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    protocol_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "rtp_protocols", key: "id" },
      onDelete: "CASCADE",
    },
    phase: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    entered_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    exited_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    cleared_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    pain_level: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    fitness_test_passed: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    medical_clearance: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notes_ar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.addIndex("rtp_phase_logs", ["protocol_id"], {
    name: "rtp_phase_logs_protocol_id_idx",
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("rtp_phase_logs");
  await queryInterface.dropTable("rtp_protocols");
}
