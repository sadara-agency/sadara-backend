// ═══════════════════════════════════════════════════════════════
// src/modules/wellness/trainingBlock.model.ts
// ═══════════════════════════════════════════════════════════════

import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export type BlockStatus = "active" | "paused" | "closed";
export type BlockGoal = "bulk" | "cut" | "maintenance" | "recomp" | "rehab";

interface TrainingBlockAttributes {
  id: string;
  playerId: string;
  status: BlockStatus;
  goal: BlockGoal;
  durationWeeks: number;
  startedAt: string; // DATE as YYYY-MM-DD
  plannedEndAt: string; // DATE as YYYY-MM-DD
  closedAt?: string | null;
  pausedAt?: string | null;
  startScanId?: string | null;
  endScanId?: string | null;
  targetOutcomes?: Record<string, unknown> | null;
  notes?: string | null;
  closedBy?: string | null;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TrainingBlockCreation extends Optional<
  TrainingBlockAttributes,
  "id" | "status" | "createdAt" | "updatedAt"
> {}

export class TrainingBlock
  extends Model<TrainingBlockAttributes, TrainingBlockCreation>
  implements TrainingBlockAttributes
{
  declare id: string;
  declare playerId: string;
  declare status: BlockStatus;
  declare goal: BlockGoal;
  declare durationWeeks: number;
  declare startedAt: string;
  declare plannedEndAt: string;
  declare closedAt: string | null;
  declare pausedAt: string | null;
  declare startScanId: string | null;
  declare endScanId: string | null;
  declare targetOutcomes: Record<string, unknown> | null;
  declare notes: string | null;
  declare closedBy: string | null;
  declare createdBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

TrainingBlock.init(
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
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "active",
      field: "status",
      validate: { isIn: [["active", "paused", "closed"]] },
    },
    goal: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: "goal",
      validate: {
        isIn: [["bulk", "cut", "maintenance", "recomp", "rehab"]],
      },
    },
    durationWeeks: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "duration_weeks",
      validate: { min: 1, max: 16 },
    },
    startedAt: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "started_at",
    },
    plannedEndAt: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "planned_end_at",
    },
    closedAt: {
      type: DataTypes.DATEONLY,
      field: "closed_at",
    },
    pausedAt: {
      type: DataTypes.DATEONLY,
      field: "paused_at",
    },
    startScanId: {
      type: DataTypes.UUID,
      field: "start_scan_id",
    },
    endScanId: {
      type: DataTypes.UUID,
      field: "end_scan_id",
    },
    targetOutcomes: {
      type: DataTypes.JSONB,
      field: "target_outcomes",
    },
    notes: {
      type: DataTypes.TEXT,
      field: "notes",
    },
    closedBy: {
      type: DataTypes.UUID,
      field: "closed_by",
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "created_by",
    },
  },
  {
    sequelize,
    tableName: "training_blocks",
    underscored: true,
    timestamps: true,
  },
);

export default TrainingBlock;
