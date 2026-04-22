// ═══════════════════════════════════════════════════════════════
// src/modules/wellness/developmentSession.model.ts
// ═══════════════════════════════════════════════════════════════

import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";
import { DevelopmentProgram } from "./developmentProgram.model";

export type SessionType =
  | "club_training"
  | "development_gym"
  | "development_field"
  | "rehab"
  | "recovery";

export type SessionStatus = "pending" | "completed" | "partial" | "skipped";

interface DevelopmentSessionAttributes {
  id: string;
  playerId: string;
  programId?: string | null;
  scheduledDate: string; // DATE as YYYY-MM-DD
  sessionType: SessionType;
  status: SessionStatus;
  overallRpe?: number | null;
  actualDurationMinutes?: number | null;
  sessionNote?: string | null;
  notes?: string | null;
  completedAt?: Date | null;
  prescribedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DevelopmentSessionCreation extends Optional<
  DevelopmentSessionAttributes,
  "id" | "status" | "createdAt" | "updatedAt"
> {}

export class DevelopmentSession
  extends Model<DevelopmentSessionAttributes, DevelopmentSessionCreation>
  implements DevelopmentSessionAttributes
{
  declare id: string;
  declare playerId: string;
  declare programId: string | null;
  declare scheduledDate: string;
  declare sessionType: SessionType;
  declare status: SessionStatus;
  declare overallRpe: number | null;
  declare actualDurationMinutes: number | null;
  declare sessionNote: string | null;
  declare notes: string | null;
  declare completedAt: Date | null;
  declare prescribedBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

DevelopmentSession.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "player_id",
    },
    programId: {
      type: DataTypes.UUID,
      field: "program_id",
    },
    scheduledDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "scheduled_date",
    },
    sessionType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "development_gym",
      field: "session_type",
      validate: {
        isIn: [
          [
            "club_training",
            "development_gym",
            "development_field",
            "rehab",
            "recovery",
          ],
        ],
      },
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending",
      validate: { isIn: [["pending", "completed", "partial", "skipped"]] },
    },
    overallRpe: {
      type: DataTypes.DECIMAL(3, 1),
      field: "overall_rpe",
    },
    actualDurationMinutes: {
      type: DataTypes.INTEGER,
      field: "actual_duration_minutes",
    },
    sessionNote: {
      type: DataTypes.TEXT,
      field: "session_note",
    },
    notes: {
      type: DataTypes.TEXT,
    },
    completedAt: {
      type: DataTypes.DATE,
      field: "completed_at",
    },
    prescribedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "prescribed_by",
    },
  },
  {
    sequelize,
    tableName: "development_sessions",
    underscored: true,
    timestamps: true,
  },
);

// ── Associations ──

DevelopmentSession.belongsTo(DevelopmentProgram, {
  foreignKey: "programId",
  as: "program",
});
