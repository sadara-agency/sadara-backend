import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.createTable("rehab_protocols", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    player_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    name_ar: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "active",
    },
    injury_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    clearance_required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    clearance_granted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    clearance_granted_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    clearance_granted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    target_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  // migration-lint: disable-next-line
  await queryInterface.addIndex("rehab_protocols", ["player_id", "status"], {
    name: "idx_rehab_protocols_player_status",
  });

  await queryInterface.createTable("rehab_phases", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    protocol_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "rehab_protocols", key: "id" },
      onDelete: "CASCADE",
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    name_ar: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    order_index: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    focus_area: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  // migration-lint: disable-next-line
  await queryInterface.addIndex("rehab_phases", ["protocol_id"], {
    name: "idx_rehab_phases_protocol_id",
  });

  await queryInterface.createTable("rehab_phase_exercises", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    phase_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "rehab_phases", key: "id" },
      onDelete: "CASCADE",
    },
    exercise_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    order_index: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    target_sets: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
    },
    target_reps: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "10",
    },
    target_weight_kg: {
      type: DataTypes.DECIMAL(6, 1),
      allowNull: true,
    },
    rest_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 60,
    },
    load_level: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "bodyweight",
    },
    caution: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    caution_note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  // migration-lint: disable-next-line
  await queryInterface.addIndex("rehab_phase_exercises", ["phase_id"], {
    name: "idx_rehab_phase_exercises_phase_id",
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("rehab_phase_exercises");
  await queryInterface.dropTable("rehab_phases");
  await queryInterface.dropTable("rehab_protocols");
}
