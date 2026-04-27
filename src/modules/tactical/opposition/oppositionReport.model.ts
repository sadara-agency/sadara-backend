import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export type OppositionReportStatus = "draft" | "published";
export type PressingIntensity = "low" | "medium" | "high";
export type DefensiveShape =
  | "low_block"
  | "mid_block"
  | "high_press"
  | "compact_mid";

export interface KeyThreat {
  playerName: string;
  role: string;
  notes: string;
}

export interface SetPieceTendencies {
  corners?: string;
  freeKicks?: string;
  penalties?: string;
  throwIns?: string;
}

interface OppositionReportAttributes {
  id: string;
  opponentName: string;
  opponentNameAr: string | null;
  matchId: string | null;
  matchDate: string | null;
  formation: string | null;
  pressingIntensity: PressingIntensity | null;
  defensiveShape: DefensiveShape | null;
  keyThreats: KeyThreat[] | null;
  setPieceTendencies: SetPieceTendencies | null;
  analystNotes: string | null;
  analystNotesAr: string | null;
  status: OppositionReportStatus;
  analystId: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface OppositionReportCreationAttributes extends Optional<
  OppositionReportAttributes,
  | "id"
  | "opponentNameAr"
  | "matchId"
  | "matchDate"
  | "formation"
  | "pressingIntensity"
  | "defensiveShape"
  | "keyThreats"
  | "setPieceTendencies"
  | "analystNotes"
  | "analystNotesAr"
  | "status"
  | "analystId"
  | "createdAt"
  | "updatedAt"
> {}

export class OppositionReport
  extends Model<OppositionReportAttributes, OppositionReportCreationAttributes>
  implements OppositionReportAttributes
{
  declare id: string;
  declare opponentName: string;
  declare opponentNameAr: string | null;
  declare matchId: string | null;
  declare matchDate: string | null;
  declare formation: string | null;
  declare pressingIntensity: PressingIntensity | null;
  declare defensiveShape: DefensiveShape | null;
  declare keyThreats: KeyThreat[] | null;
  declare setPieceTendencies: SetPieceTendencies | null;
  declare analystNotes: string | null;
  declare analystNotesAr: string | null;
  declare status: OppositionReportStatus;
  declare analystId: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

OppositionReport.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    opponentName: {
      type: DataTypes.STRING(120),
      allowNull: false,
      field: "opponent_name",
    },
    opponentNameAr: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: "opponent_name_ar",
    },
    matchId: { type: DataTypes.UUID, allowNull: true, field: "match_id" },
    matchDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "match_date",
    },
    formation: { type: DataTypes.STRING(20), allowNull: true },
    pressingIntensity: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "pressing_intensity",
    },
    defensiveShape: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: "defensive_shape",
    },
    keyThreats: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "key_threats",
    },
    setPieceTendencies: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "set_piece_tendencies",
    },
    analystNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "analyst_notes",
    },
    analystNotesAr: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "analyst_notes_ar",
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "draft",
    },
    analystId: { type: DataTypes.UUID, allowNull: true, field: "analyst_id" },
  },
  {
    sequelize,
    tableName: "opposition_reports",
    underscored: true,
    timestamps: true,
  },
);
