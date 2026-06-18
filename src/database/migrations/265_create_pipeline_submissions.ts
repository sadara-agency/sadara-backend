import { QueryInterface, DataTypes } from "sequelize";
import { indexExists } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.createTable("pipeline_submissions", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    submission_ref: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    partner_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "network_partners", key: "id" },
      onDelete: "RESTRICT",
    },
    player_name_en: { type: DataTypes.STRING(200), allowNull: false },
    player_name_ar: { type: DataTypes.STRING(200), allowNull: true },
    date_of_birth: { type: DataTypes.DATEONLY, allowNull: true },
    nationality: { type: DataTypes.STRING(100), allowNull: true },
    position: { type: DataTypes.STRING(100), allowNull: true },
    current_club: { type: DataTypes.STRING(200), allowNull: true },
    corridor: { type: DataTypes.STRING(100), allowNull: true },
    contract_expiry: { type: DataTypes.DATEONLY, allowNull: true },
    wage_expectation: { type: DataTypes.STRING(100), allowNull: true },
    video_link: { type: DataTypes.TEXT, allowNull: true },
    data_link: { type: DataTypes.TEXT, allowNull: true },
    phase: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "Registered",
    },
    phase_since: { type: DataTypes.DATE, allowNull: true },
    due_date: { type: DataTypes.DATEONLY, allowNull: true },
    hq_owner: { type: DataTypes.STRING(200), allowNull: true },
    next_action: { type: DataTypes.TEXT, allowNull: true },
    conflict_flag: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    conflict_note: { type: DataTypes.TEXT, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  if (
    !(await indexExists(queryInterface, "pipeline_submissions_partner_id_idx"))
  ) {
    await queryInterface.addIndex("pipeline_submissions", {
      fields: ["partner_id"],
      name: "pipeline_submissions_partner_id_idx",
    });
  }

  if (!(await indexExists(queryInterface, "pipeline_submissions_phase_idx"))) {
    await queryInterface.addIndex("pipeline_submissions", {
      fields: ["phase"],
      name: "pipeline_submissions_phase_idx",
    });
  }

  if (!(await indexExists(queryInterface, "pipeline_player_dedup_idx"))) {
    await queryInterface.addIndex("pipeline_submissions", {
      fields: ["player_name_en", "date_of_birth"],
      name: "pipeline_player_dedup_idx",
    });
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("pipeline_submissions");
}
