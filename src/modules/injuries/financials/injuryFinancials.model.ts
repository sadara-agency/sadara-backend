import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";
import { Injury } from "@modules/injuries/injury.model";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";

interface InjuryFinancialsAttributes {
  id: string;
  injuryId: string;
  playerId: string;
  monthlySalaryQar: number | null;
  dailySalaryCost: number | null;
  totalSalaryCostQar: number | null;
  missedMatchesCount: number;
  estimatedMatchRevenueQar: number | null;
  insuranceCovered: boolean;
  insuranceAmountQar: number | null;
  treatmentCostQar: number | null;
  totalFinancialImpactQar: number | null;
  currency: string;
  notes: string | null;
  calculatedAt: Date | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface InjuryFinancialsCreationAttributes extends Optional<
  InjuryFinancialsAttributes,
  | "id"
  | "monthlySalaryQar"
  | "dailySalaryCost"
  | "totalSalaryCostQar"
  | "missedMatchesCount"
  | "estimatedMatchRevenueQar"
  | "insuranceCovered"
  | "insuranceAmountQar"
  | "treatmentCostQar"
  | "totalFinancialImpactQar"
  | "currency"
  | "notes"
  | "calculatedAt"
  | "createdBy"
  | "createdAt"
  | "updatedAt"
> {}

export class InjuryFinancials
  extends Model<InjuryFinancialsAttributes, InjuryFinancialsCreationAttributes>
  implements InjuryFinancialsAttributes
{
  declare id: string;
  declare injuryId: string;
  declare playerId: string;
  declare monthlySalaryQar: number | null;
  declare dailySalaryCost: number | null;
  declare totalSalaryCostQar: number | null;
  declare missedMatchesCount: number;
  declare estimatedMatchRevenueQar: number | null;
  declare insuranceCovered: boolean;
  declare insuranceAmountQar: number | null;
  declare treatmentCostQar: number | null;
  declare totalFinancialImpactQar: number | null;
  declare currency: string;
  declare notes: string | null;
  declare calculatedAt: Date | null;
  declare createdBy: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare injury?: Injury;
  declare player?: Player;
  declare creator?: User;
}

InjuryFinancials.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    injuryId: { type: DataTypes.UUID, allowNull: false, field: "injury_id" },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    monthlySalaryQar: {
      type: DataTypes.DECIMAL(15, 2),
      field: "monthly_salary_qar",
    },
    dailySalaryCost: {
      type: DataTypes.DECIMAL(15, 2),
      field: "daily_salary_cost",
    },
    totalSalaryCostQar: {
      type: DataTypes.DECIMAL(15, 2),
      field: "total_salary_cost_qar",
    },
    missedMatchesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "missed_matches_count",
    },
    estimatedMatchRevenueQar: {
      type: DataTypes.DECIMAL(15, 2),
      field: "estimated_match_revenue_qar",
    },
    insuranceCovered: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "insurance_covered",
    },
    insuranceAmountQar: {
      type: DataTypes.DECIMAL(15, 2),
      field: "insurance_amount_qar",
    },
    treatmentCostQar: {
      type: DataTypes.DECIMAL(15, 2),
      field: "treatment_cost_qar",
    },
    totalFinancialImpactQar: {
      type: DataTypes.DECIMAL(15, 2),
      field: "total_financial_impact_qar",
    },
    currency: { type: DataTypes.STRING(10), defaultValue: "QAR" },
    notes: { type: DataTypes.TEXT },
    calculatedAt: { type: DataTypes.DATE, field: "calculated_at" },
    createdBy: { type: DataTypes.UUID, field: "created_by" },
  },
  {
    sequelize,
    tableName: "injury_financials",
    underscored: true,
    timestamps: true,
  },
);

// ── Associations (inline) ──

InjuryFinancials.belongsTo(Injury, { foreignKey: "injuryId", as: "injury" });
Injury.hasOne(InjuryFinancials, { foreignKey: "injuryId", as: "financials" });

InjuryFinancials.belongsTo(Player, { foreignKey: "playerId", as: "player" });
Player.hasMany(InjuryFinancials, {
  foreignKey: "playerId",
  as: "injuryFinancials",
});

InjuryFinancials.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
