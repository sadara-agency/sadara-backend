import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.createTable("posture_assessments", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    player_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    scan_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    body_alignment_deg: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    head_tilt_deg: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    shoulder_alignment_deg: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    pelvic_tilt_deg: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    knee_alignment_deg: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    feet_angle_deg: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    overall_grade: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notes_ar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    assessment_tool: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    recorded_by: {
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
  await queryInterface.addIndex(
    "posture_assessments",
    ["player_id", "scan_date"],
    { name: "idx_posture_assessments_player_date" },
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("posture_assessments");
}
