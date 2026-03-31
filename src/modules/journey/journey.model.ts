import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

// ── Types ──
export type JourneyStageStatus =
  | "NotStarted"
  | "InProgress"
  | "Completed"
  | "OnHold";

export type JourneyStageHealth = "OnTrack" | "AtRisk" | "Overdue" | "Blocked";

export type JourneyStageType =
  | "PhysicalTraining"
  | "TechnicalTraining"
  | "TacticalTraining"
  | "Assessment"
  | "Recovery"
  | "MentalDevelopment"
  | "General";

interface JourneyAttributes {
  id: string;
  playerId: string;
  stageName: string;
  stageNameAr: string | null;
  stageOrder: number;
  status: JourneyStageStatus;
  health: JourneyStageHealth;
  stageType: JourneyStageType;
  startDate: string | null;
  expectedEndDate: string | null;
  actualEndDate: string | null;
  assignedTo: string | null;
  responsibleParty: string | null;
  responsiblePartyAr: string | null;
  notes: string | null;
  notesAr: string | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface JourneyCreationAttributes extends Optional<
  JourneyAttributes,
  | "id"
  | "stageNameAr"
  | "status"
  | "health"
  | "stageType"
  | "startDate"
  | "expectedEndDate"
  | "actualEndDate"
  | "assignedTo"
  | "responsibleParty"
  | "responsiblePartyAr"
  | "notes"
  | "notesAr"
  | "createdBy"
  | "createdAt"
  | "updatedAt"
> {}

export class Journey
  extends Model<JourneyAttributes, JourneyCreationAttributes>
  implements JourneyAttributes
{
  declare id: string;
  declare playerId: string;
  declare stageName: string;
  declare stageNameAr: string | null;
  declare stageOrder: number;
  declare status: JourneyStageStatus;
  declare health: JourneyStageHealth;
  declare stageType: JourneyStageType;
  declare startDate: string | null;
  declare expectedEndDate: string | null;
  declare actualEndDate: string | null;
  declare assignedTo: string | null;
  declare responsibleParty: string | null;
  declare responsiblePartyAr: string | null;
  declare notes: string | null;
  declare notesAr: string | null;
  declare createdBy: string | null;

  // Virtual — populated by service
  declare ticketStats?: { total: number; completed: number };
}

Journey.init(
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
    stageName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "stage_name",
    },
    stageNameAr: {
      type: DataTypes.STRING(255),
      field: "stage_name_ar",
    },
    stageOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "stage_order",
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: "NotStarted",
    },
    health: {
      type: DataTypes.STRING(50),
      defaultValue: "OnTrack",
    },
    stageType: {
      type: DataTypes.STRING(50),
      defaultValue: "General",
      field: "stage_type",
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
    assignedTo: {
      type: DataTypes.UUID,
      field: "assigned_to",
    },
    responsibleParty: {
      type: DataTypes.STRING(255),
      field: "responsible_party",
    },
    responsiblePartyAr: {
      type: DataTypes.STRING(255),
      field: "responsible_party_ar",
    },
    notes: { type: DataTypes.TEXT },
    notesAr: { type: DataTypes.TEXT, field: "notes_ar" },
    createdBy: { type: DataTypes.UUID, field: "created_by" },
  },
  {
    sequelize,
    tableName: "player_journeys",
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ["player_id"] },
      { fields: ["assigned_to"] },
      { fields: ["status"] },
      { fields: ["player_id", "stage_order"] },
    ],
  },
);
