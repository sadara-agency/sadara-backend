import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export interface TransferWindowWeights {
  performance: number;
  contractFit: number;
  commercial: number;
  culturalFit: number;
}

export interface TransferWindowTierTargets {
  A: number;
  B: number;
  C: number;
}

export type TransferWindowStatus = "Upcoming" | "Active" | "Closed";

interface TransferWindowAttributes {
  id: string;
  season: string;
  startDate: string;
  endDate: string;
  saffWindowStart: string | null;
  saffWindowEnd: string | null;
  shortlistThreshold: number;
  weights: TransferWindowWeights;
  tierTargets: TransferWindowTierTargets;
  status: TransferWindowStatus;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TransferWindowCreationAttributes extends Optional<
  TransferWindowAttributes,
  | "id"
  | "shortlistThreshold"
  | "weights"
  | "tierTargets"
  | "status"
  | "notes"
  | "saffWindowStart"
  | "saffWindowEnd"
  | "createdAt"
  | "updatedAt"
> {}

export class TransferWindow
  extends Model<TransferWindowAttributes, TransferWindowCreationAttributes>
  implements TransferWindowAttributes
{
  declare id: string;
  declare season: string;
  declare startDate: string;
  declare endDate: string;
  declare saffWindowStart: string | null;
  declare saffWindowEnd: string | null;
  declare shortlistThreshold: number;
  declare weights: TransferWindowWeights;
  declare tierTargets: TransferWindowTierTargets;
  declare status: TransferWindowStatus;
  declare notes: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

TransferWindow.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    season: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "start_date",
    },
    endDate: { type: DataTypes.DATEONLY, allowNull: false, field: "end_date" },
    saffWindowStart: { type: DataTypes.DATEONLY, field: "saff_window_start" },
    saffWindowEnd: { type: DataTypes.DATEONLY, field: "saff_window_end" },
    shortlistThreshold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
      field: "shortlist_threshold",
    },
    weights: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        performance: 40,
        contractFit: 25,
        commercial: 20,
        culturalFit: 15,
      },
    },
    tierTargets: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: { A: 3, B: 7, C: 5 },
      field: "tier_targets",
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "Upcoming",
    },
    notes: { type: DataTypes.TEXT },
  },
  {
    sequelize,
    tableName: "transfer_windows",
    underscored: true,
    timestamps: true,
  },
);

export default TransferWindow;
