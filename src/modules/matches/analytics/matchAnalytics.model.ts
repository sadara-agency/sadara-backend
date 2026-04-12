import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";
import { User } from "@modules/users/user.model";

interface PositionalBenchmarkAttributes {
  id: string;
  position: string;
  league: string;
  season: string;
  stat: string;
  avgValue: number | null;
  p75Value: number | null;
  p90Value: number | null;
  sampleSize: number | null;
  source: string;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PositionalBenchmarkCreationAttributes extends Optional<
  PositionalBenchmarkAttributes,
  | "id"
  | "avgValue"
  | "p75Value"
  | "p90Value"
  | "sampleSize"
  | "source"
  | "createdBy"
  | "createdAt"
  | "updatedAt"
> {}

export class PositionalBenchmark
  extends Model<
    PositionalBenchmarkAttributes,
    PositionalBenchmarkCreationAttributes
  >
  implements PositionalBenchmarkAttributes
{
  declare id: string;
  declare position: string;
  declare league: string;
  declare season: string;
  declare stat: string;
  declare avgValue: number | null;
  declare p75Value: number | null;
  declare p90Value: number | null;
  declare sampleSize: number | null;
  declare source: string;
  declare createdBy: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

PositionalBenchmark.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    position: { type: DataTypes.STRING(50), allowNull: false },
    league: { type: DataTypes.STRING(50), allowNull: false },
    season: { type: DataTypes.STRING(20), allowNull: false },
    stat: { type: DataTypes.STRING(50), allowNull: false },
    avgValue: { type: DataTypes.DECIMAL(10, 4), field: "avg_value" },
    p75Value: { type: DataTypes.DECIMAL(10, 4), field: "p75_value" },
    p90Value: { type: DataTypes.DECIMAL(10, 4), field: "p90_value" },
    sampleSize: { type: DataTypes.INTEGER, field: "sample_size" },
    source: { type: DataTypes.STRING(20), defaultValue: "internal" },
    createdBy: { type: DataTypes.UUID, field: "created_by" },
  },
  {
    sequelize,
    tableName: "positional_benchmarks",
    underscored: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ["position", "league", "season", "stat"] },
    ],
  },
);

PositionalBenchmark.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
