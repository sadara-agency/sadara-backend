import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export interface PlayerStatEditAttributes {
  id: string;
  playerId: string;
  season: string;
  matchId: string | null;
  analystId: string | null;
  fieldName: string;
  beforeValue: number | null;
  afterValue: number | null;
  delta: number | null;
  justification: string;
  isCorrection: boolean;
  ipAddress: string | null;
  createdAt?: Date;
}

interface PlayerStatEditCreationAttributes extends Optional<
  PlayerStatEditAttributes,
  | "id"
  | "matchId"
  | "analystId"
  | "beforeValue"
  | "afterValue"
  | "delta"
  | "ipAddress"
  | "createdAt"
> {}

// Immutable audit table: rows are append-only. No update/delete paths exist.
export class PlayerStatEdit
  extends Model<PlayerStatEditAttributes, PlayerStatEditCreationAttributes>
  implements PlayerStatEditAttributes
{
  declare id: string;
  declare playerId: string;
  declare season: string;
  declare matchId: string | null;
  declare analystId: string | null;
  declare fieldName: string;
  declare beforeValue: number | null;
  declare afterValue: number | null;
  declare delta: number | null;
  declare justification: string;
  declare isCorrection: boolean;
  declare ipAddress: string | null;
  declare readonly createdAt: Date;
}

PlayerStatEdit.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    season: { type: DataTypes.STRING(10), allowNull: false },
    matchId: { type: DataTypes.UUID, allowNull: true, field: "match_id" },
    analystId: { type: DataTypes.UUID, allowNull: true, field: "analyst_id" },
    fieldName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "field_name",
    },
    beforeValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "before_value",
    },
    afterValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "after_value",
    },
    delta: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    justification: { type: DataTypes.TEXT, allowNull: false },
    isCorrection: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_correction",
    },
    ipAddress: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: "ip_address",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
  },
  {
    sequelize,
    tableName: "player_stat_edits",
    underscored: true,
    timestamps: false, // Immutable — created_at only, managed manually
  },
);

export default PlayerStatEdit;
