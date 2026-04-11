import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

// ── Attribute Interfaces ──

export interface MediaRequestAttributes {
  id: string;
  journalistName: string;
  journalistNameAr?: string | null;
  outlet: string;
  outletAr?: string | null;
  journalistEmail?: string | null;
  journalistPhone?: string | null;
  requestType:
    | "interview"
    | "press_conference"
    | "photo_shoot"
    | "statement"
    | "other";
  subject: string;
  subjectAr?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  playerId?: string | null;
  clubId?: string | null;
  matchId?: string | null;
  status: "pending" | "approved" | "scheduled" | "completed" | "declined";
  priority: "low" | "normal" | "high" | "urgent";
  deadline?: Date | null;
  scheduledAt?: Date | null;
  calendarEventId?: string | null;
  declineReason?: string | null;
  notes?: string | null;
  assignedTo?: string | null;
  mediaContactId?: string | null;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MediaRequestCreationAttributes extends Optional<
  MediaRequestAttributes,
  "id" | "status" | "priority" | "requestType" | "createdAt" | "updatedAt"
> {}

// ── Model Class ──

export class MediaRequest
  extends Model<MediaRequestAttributes, MediaRequestCreationAttributes>
  implements MediaRequestAttributes
{
  declare id: string;
  declare journalistName: string;
  declare journalistNameAr: string | null;
  declare outlet: string;
  declare outletAr: string | null;
  declare journalistEmail: string | null;
  declare journalistPhone: string | null;
  declare requestType:
    | "interview"
    | "press_conference"
    | "photo_shoot"
    | "statement"
    | "other";
  declare subject: string;
  declare subjectAr: string | null;
  declare description: string | null;
  declare descriptionAr: string | null;
  declare playerId: string | null;
  declare clubId: string | null;
  declare matchId: string | null;
  declare status:
    | "pending"
    | "approved"
    | "scheduled"
    | "completed"
    | "declined";
  declare priority: "low" | "normal" | "high" | "urgent";
  declare deadline: Date | null;
  declare scheduledAt: Date | null;
  declare calendarEventId: string | null;
  declare declineReason: string | null;
  declare notes: string | null;
  declare assignedTo: string | null;
  declare mediaContactId: string | null;
  declare createdBy: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

// ── Initialization ──

MediaRequest.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    journalistName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "journalist_name",
    },
    journalistNameAr: {
      type: DataTypes.STRING(255),
      field: "journalist_name_ar",
    },
    outlet: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    outletAr: {
      type: DataTypes.STRING(255),
      field: "outlet_ar",
    },
    journalistEmail: {
      type: DataTypes.STRING(255),
      field: "journalist_email",
    },
    journalistPhone: {
      type: DataTypes.STRING(100),
      field: "journalist_phone",
    },
    requestType: {
      type: DataTypes.ENUM(
        "interview",
        "press_conference",
        "photo_shoot",
        "statement",
        "other",
      ),
      allowNull: false,
      defaultValue: "interview",
      field: "request_type",
    },
    subject: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    subjectAr: {
      type: DataTypes.STRING(500),
      field: "subject_ar",
    },
    description: {
      type: DataTypes.TEXT,
    },
    descriptionAr: {
      type: DataTypes.TEXT,
      field: "description_ar",
    },
    playerId: {
      type: DataTypes.UUID,
      field: "player_id",
    },
    clubId: {
      type: DataTypes.UUID,
      field: "club_id",
    },
    matchId: {
      type: DataTypes.UUID,
      field: "match_id",
    },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "approved",
        "scheduled",
        "completed",
        "declined",
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    priority: {
      type: DataTypes.ENUM("low", "normal", "high", "urgent"),
      allowNull: false,
      defaultValue: "normal",
    },
    deadline: {
      type: DataTypes.DATE,
    },
    scheduledAt: {
      type: DataTypes.DATE,
      field: "scheduled_at",
    },
    calendarEventId: {
      type: DataTypes.UUID,
      field: "calendar_event_id",
    },
    declineReason: {
      type: DataTypes.TEXT,
      field: "decline_reason",
    },
    notes: {
      type: DataTypes.TEXT,
    },
    assignedTo: {
      type: DataTypes.UUID,
      field: "assigned_to",
    },
    mediaContactId: {
      type: DataTypes.UUID,
      field: "media_contact_id",
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "created_by",
    },
  },
  {
    sequelize,
    tableName: "media_requests",
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ["status"] },
      { fields: ["player_id"] },
      { fields: ["created_by"] },
      { fields: ["deadline"] },
      { fields: ["assigned_to"] },
    ],
  },
);
