import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export type SalaryTier = "low" | "mid" | "high";
export type PlayerType = "Pro" | "Youth" | "Amateur";

export interface SalaryBenchmarkAttributes {
  id: string;
  position: string;
  tier: SalaryTier;
  annualSalarySar: number;
  league: string;
  playerType: PlayerType;
  season: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SalaryBenchmarkCreationAttributes extends Optional<
  SalaryBenchmarkAttributes,
  "id" | "season" | "notes" | "createdBy" | "createdAt" | "updatedAt"
> {}

class SalaryBenchmark
  extends Model<SalaryBenchmarkAttributes, SalaryBenchmarkCreationAttributes>
  implements SalaryBenchmarkAttributes
{
  public id!: string;
  public position!: string;
  public tier!: SalaryTier;
  public annualSalarySar!: number;
  public league!: string;
  public playerType!: PlayerType;
  public season!: string | null;
  public notes!: string | null;
  public createdBy!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SalaryBenchmark.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    position: { type: DataTypes.STRING(20), allowNull: false },
    tier: { type: DataTypes.STRING(10), allowNull: false },
    annualSalarySar: { type: DataTypes.DECIMAL(12, 0), allowNull: false },
    league: { type: DataTypes.STRING(50), allowNull: false },
    playerType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "Pro",
    },
    season: { type: DataTypes.STRING(10), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: true },
  },
  {
    sequelize,
    tableName: "salary_benchmarks",
    underscored: true,
    timestamps: true,
  },
);

export default SalaryBenchmark;
