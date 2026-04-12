import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.createTable("injury_financials", {
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
    monthly_salary_qar: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },
    daily_salary_cost: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: "Computed: monthly_salary / 30",
    },
    total_salary_cost_qar: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: "daily_salary_cost * days_out",
    },
    missed_matches_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    estimated_match_revenue_qar: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: "Revenue lost from missed matches",
    },
    insurance_covered: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    insurance_amount_qar: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },
    treatment_cost_qar: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },
    total_financial_impact_qar: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: "Computed total net impact",
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "QAR",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    calculated_at: {
      type: DataTypes.DATE,
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

  await queryInterface.addIndex("injury_financials", ["player_id"], {
    name: "injury_financials_player_id_idx",
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("injury_financials");
}
