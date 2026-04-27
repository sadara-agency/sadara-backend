import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

// ── Types ──
export type TicketStatus =
  | "Open"
  | "InProgress"
  | "WaitingOnPlayer"
  | "Completed"
  | "Cancelled";

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type TicketType =
  | "Physical"
  | "Technical"
  | "Tactical"
  | "Medical"
  | "Mental"
  | "Administrative"
  | "General"
  | "SportsDecision";

interface TicketAttributes {
  id: string;
  displayId: string | null;
  playerId: string | null;
  journeyStageId: string | null;
  title: string;
  titleAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  ticketType: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo: string | null;
  additionalAssignees: string[] | null;
  receivingParty: string | null;
  receivingPartyAr: string | null;
  dueDate: string | null;
  closureDate: string | null;
  completedAt: Date | null;
  notes: string | null;
  notesAr: string | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TicketCreationAttributes extends Optional<
  TicketAttributes,
  | "id"
  | "displayId"
  | "playerId"
  | "journeyStageId"
  | "titleAr"
  | "description"
  | "descriptionAr"
  | "ticketType"
  | "priority"
  | "status"
  | "assignedTo"
  | "additionalAssignees"
  | "receivingParty"
  | "receivingPartyAr"
  | "dueDate"
  | "closureDate"
  | "completedAt"
  | "notes"
  | "notesAr"
  | "createdBy"
  | "createdAt"
  | "updatedAt"
> {}

export class Ticket
  extends Model<TicketAttributes, TicketCreationAttributes>
  implements TicketAttributes
{
  declare id: string;
  declare displayId: string | null;
  declare playerId: string | null;
  declare journeyStageId: string | null;
  declare title: string;
  declare titleAr: string | null;
  declare description: string | null;
  declare descriptionAr: string | null;
  declare ticketType: TicketType;
  declare priority: TicketPriority;
  declare status: TicketStatus;
  declare assignedTo: string | null;
  declare additionalAssignees: string[] | null;
  declare receivingParty: string | null;
  declare receivingPartyAr: string | null;
  declare dueDate: string | null;
  declare closureDate: string | null;
  declare completedAt: Date | null;
  declare notes: string | null;
  declare notesAr: string | null;
  declare createdBy: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Ticket.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    displayId: {
      type: DataTypes.STRING(20),
      unique: true,
      field: "display_id",
    },
    playerId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "player_id",
    },
    journeyStageId: {
      type: DataTypes.UUID,
      field: "journey_stage_id",
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    titleAr: {
      type: DataTypes.STRING(500),
      field: "title_ar",
    },
    description: { type: DataTypes.TEXT },
    descriptionAr: { type: DataTypes.TEXT, field: "description_ar" },
    ticketType: {
      type: DataTypes.STRING(50),
      defaultValue: "General",
      field: "ticket_type",
    },
    priority: {
      type: DataTypes.STRING(50),
      defaultValue: "medium",
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: "Open",
    },
    assignedTo: {
      type: DataTypes.UUID,
      field: "assigned_to",
    },
    additionalAssignees: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      allowNull: true,
      defaultValue: null,
      field: "additional_assignees",
    },
    receivingParty: {
      type: DataTypes.STRING(255),
      field: "receiving_party",
    },
    receivingPartyAr: {
      type: DataTypes.STRING(255),
      field: "receiving_party_ar",
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      field: "due_date",
    },
    closureDate: {
      type: DataTypes.DATEONLY,
      field: "closure_date",
    },
    completedAt: {
      type: DataTypes.DATE,
      field: "completed_at",
    },
    notes: { type: DataTypes.TEXT },
    notesAr: { type: DataTypes.TEXT, field: "notes_ar" },
    createdBy: { type: DataTypes.UUID, field: "created_by" },
  },
  {
    sequelize,
    tableName: "tickets",
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ["player_id"] },
      { fields: ["journey_stage_id"] },
      { fields: ["assigned_to"] },
      { fields: ["status"] },
      { fields: ["priority"] },
      { fields: ["player_id", "status"] },
    ],
  },
);
