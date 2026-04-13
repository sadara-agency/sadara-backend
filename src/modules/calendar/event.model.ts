import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

// ── Event Type Constants ──
export const EVENT_TYPES = [
  "Training",
  "Medical",
  "ContractDeadline",
  "GateTimeline",
  "Meeting",
  "Custom",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const ATTENDEE_TYPES = ["player", "user"] as const;
export type AttendeeType = (typeof ATTENDEE_TYPES)[number];

export const ATTENDEE_STATUSES = ["pending", "accepted", "declined"] as const;
export type AttendeeStatus = (typeof ATTENDEE_STATUSES)[number];

// ── CalendarEvent ──

interface CalendarEventAttributes {
  id: string;
  title: string;
  titleAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  eventType: EventType;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location: string | null;
  locationAr: string | null;
  color: string | null;
  recurrenceRule: string | null;
  recurrenceParentId: string | null;
  recurrenceException: boolean;
  sourceType: string | null;
  sourceId: string | null;
  isAutoCreated: boolean;
  reminderMinutes: number | null;
  timezone: string;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CalendarEventCreationAttributes extends Optional<
  CalendarEventAttributes,
  | "id"
  | "titleAr"
  | "description"
  | "descriptionAr"
  | "eventType"
  | "allDay"
  | "location"
  | "locationAr"
  | "color"
  | "recurrenceRule"
  | "recurrenceParentId"
  | "recurrenceException"
  | "sourceType"
  | "sourceId"
  | "isAutoCreated"
  | "reminderMinutes"
  | "timezone"
  | "createdAt"
  | "updatedAt"
> {}

export class CalendarEvent
  extends Model<CalendarEventAttributes, CalendarEventCreationAttributes>
  implements CalendarEventAttributes
{
  declare id: string;
  declare title: string;
  declare titleAr: string | null;
  declare description: string | null;
  declare descriptionAr: string | null;
  declare eventType: EventType;
  declare startDate: Date;
  declare endDate: Date;
  declare allDay: boolean;
  declare location: string | null;
  declare locationAr: string | null;
  declare color: string | null;
  declare recurrenceRule: string | null;
  declare recurrenceParentId: string | null;
  declare recurrenceException: boolean;
  declare sourceType: string | null;
  declare sourceId: string | null;
  declare isAutoCreated: boolean;
  declare reminderMinutes: number | null;
  declare timezone: string;
  declare createdBy: string;
}

CalendarEvent.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    titleAr: {
      type: DataTypes.STRING(500),
      field: "title_ar",
    },
    description: {
      type: DataTypes.TEXT,
    },
    descriptionAr: {
      type: DataTypes.TEXT,
      field: "description_ar",
    },
    eventType: {
      type: DataTypes.STRING(50),
      field: "event_type",
      defaultValue: "Custom",
    },
    startDate: {
      type: DataTypes.DATE,
      field: "start_date",
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATE,
      field: "end_date",
      allowNull: false,
    },
    allDay: {
      type: DataTypes.BOOLEAN,
      field: "all_day",
      defaultValue: false,
    },
    location: {
      type: DataTypes.STRING(500),
    },
    locationAr: {
      type: DataTypes.STRING(500),
      field: "location_ar",
    },
    color: {
      type: DataTypes.STRING(20),
    },
    recurrenceRule: {
      type: DataTypes.STRING(255),
      field: "recurrence_rule",
    },
    recurrenceParentId: {
      type: DataTypes.UUID,
      field: "recurrence_parent_id",
    },
    recurrenceException: {
      type: DataTypes.BOOLEAN,
      field: "recurrence_exception",
      defaultValue: false,
    },
    sourceType: {
      type: DataTypes.STRING(50),
      field: "source_type",
    },
    sourceId: {
      type: DataTypes.UUID,
      field: "source_id",
    },
    isAutoCreated: {
      type: DataTypes.BOOLEAN,
      field: "is_auto_created",
      defaultValue: false,
    },
    reminderMinutes: {
      type: DataTypes.INTEGER,
      field: "reminder_minutes",
    },
    timezone: {
      type: DataTypes.STRING(64),
      defaultValue: "Asia/Riyadh",
    },
    createdBy: {
      type: DataTypes.UUID,
      field: "created_by",
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "calendar_events",
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ["start_date", "end_date"] },
      { fields: ["event_type"] },
      { fields: ["created_by"] },
      { fields: ["source_type", "source_id"] },
      { fields: ["recurrence_parent_id"] },
    ],
  },
);

// ── EventAttendee ──

interface EventAttendeeAttributes {
  id: string;
  eventId: string;
  attendeeType: AttendeeType;
  attendeeId: string;
  status: AttendeeStatus;
  createdAt?: Date;
}

interface EventAttendeeCreationAttributes extends Optional<
  EventAttendeeAttributes,
  "id" | "status" | "createdAt"
> {}

export class EventAttendee
  extends Model<EventAttendeeAttributes, EventAttendeeCreationAttributes>
  implements EventAttendeeAttributes
{
  declare id: string;
  declare eventId: string;
  declare attendeeType: AttendeeType;
  declare attendeeId: string;
  declare status: AttendeeStatus;
}

EventAttendee.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    eventId: {
      type: DataTypes.UUID,
      field: "event_id",
      allowNull: false,
    },
    attendeeType: {
      type: DataTypes.STRING(20),
      field: "attendee_type",
      allowNull: false,
    },
    attendeeId: {
      type: DataTypes.UUID,
      field: "attendee_id",
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: "pending",
    },
  },
  {
    sequelize,
    tableName: "event_attendees",
    underscored: true,
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ["event_id"] },
      { fields: ["attendee_type", "attendee_id"] },
    ],
  },
);
