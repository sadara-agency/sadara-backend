import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

// ── Types ──
export type EvolutionTier =
  | "StrugglingTalent"
  | "DevelopingPerformer"
  | "MatchReadyPro"
  | "PeakPerformer";

export type EvolutionPhase =
  | "Diagnostic"
  | "Foundation"
  | "Integration"
  | "Mastery";

export type EvolutionCycleStatus = "Active" | "Completed" | "Paused";

export interface TargetKPI {
  metric: string;
  metricAr?: string;
  baseline: string;
  target: string;
  current?: string;
}

interface EvolutionCycleAttributes {
  id: string;
  playerId: string;
  name: string;
  nameAr: string | null;
  blockerSummary: string | null;
  blockerSummaryAr: string | null;
  tier: EvolutionTier;
  currentPhase: EvolutionPhase;
  status: EvolutionCycleStatus;
  startDate: string | null;
  expectedEndDate: string | null;
  actualEndDate: string | null;
  targetKpis: TargetKPI[] | null;
  notes: string | null;
  notesAr: string | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface EvolutionCycleCreationAttributes extends Optional<
  EvolutionCycleAttributes,
  | "id"
  | "nameAr"
  | "blockerSummary"
  | "blockerSummaryAr"
  | "tier"
  | "currentPhase"
  | "status"
  | "startDate"
  | "expectedEndDate"
  | "actualEndDate"
  | "targetKpis"
  | "notes"
  | "notesAr"
  | "createdBy"
  | "createdAt"
  | "updatedAt"
> {}

export class EvolutionCycle
  extends Model<EvolutionCycleAttributes, EvolutionCycleCreationAttributes>
  implements EvolutionCycleAttributes
{
  declare id: string;
  declare playerId: string;
  declare name: string;
  declare nameAr: string | null;
  declare blockerSummary: string | null;
  declare blockerSummaryAr: string | null;
  declare tier: EvolutionTier;
  declare currentPhase: EvolutionPhase;
  declare status: EvolutionCycleStatus;
  declare startDate: string | null;
  declare expectedEndDate: string | null;
  declare actualEndDate: string | null;
  declare targetKpis: TargetKPI[] | null;
  declare notes: string | null;
  declare notesAr: string | null;
  declare createdBy: string | null;

  // Virtual — populated by service
  declare phaseStats?: Record<
    EvolutionPhase,
    { total: number; completed: number }
  >;
}

EvolutionCycle.init(
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
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    nameAr: {
      type: DataTypes.STRING(255),
      field: "name_ar",
    },
    blockerSummary: {
      type: DataTypes.TEXT,
      field: "blocker_summary",
    },
    blockerSummaryAr: {
      type: DataTypes.TEXT,
      field: "blocker_summary_ar",
    },
    tier: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "StrugglingTalent",
    },
    currentPhase: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "Diagnostic",
      field: "current_phase",
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "Active",
    },
    startDate: {
      type: DataTypes.DATEONLY,
      field: "start_date",
    },
    expectedEndDate: {
      type: DataTypes.DATEONLY,
      field: "expected_end_date",
    },
    actualEndDate: {
      type: DataTypes.DATEONLY,
      field: "actual_end_date",
    },
    targetKpis: {
      type: DataTypes.JSONB,
      field: "target_kpis",
    },
    notes: { type: DataTypes.TEXT },
    notesAr: { type: DataTypes.TEXT, field: "notes_ar" },
    createdBy: { type: DataTypes.UUID, field: "created_by" },
  },
  {
    sequelize,
    tableName: "evolution_cycles",
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ["player_id"] },
      { fields: ["status"] },
      { fields: ["player_id", "status"] },
    ],
  },
);
