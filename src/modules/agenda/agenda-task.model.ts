import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export type TaskStatus =
  | "Open"
  | "InProgress"
  | "Done"
  | "Skipped"
  | "Abandoned";
export type TaskPriority = "low" | "medium" | "high" | "critical";
export type RolloverPolicy = "auto" | "ask" | "none";

interface AgendaTaskAttributes {
  id: string;
  userId: string;
  goalId: string | null;
  title: string;
  titleAr: string | null;
  notes: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  dueTime: string | null;
  durationMinutes: number | null;
  timezone: string;
  rolloverPolicy: RolloverPolicy;
  rolloverCount: number;
  needsRolloverDecision: boolean;
  completedAt: Date | null;
  abandonedAt: Date | null;
  calendarEventId: string | null;
  sortOrder: number;
  tags: string[] | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AgendaTaskCreationAttributes extends Optional<
  AgendaTaskAttributes,
  | "id"
  | "goalId"
  | "titleAr"
  | "notes"
  | "status"
  | "priority"
  | "dueTime"
  | "durationMinutes"
  | "timezone"
  | "rolloverPolicy"
  | "rolloverCount"
  | "needsRolloverDecision"
  | "completedAt"
  | "abandonedAt"
  | "calendarEventId"
  | "sortOrder"
  | "tags"
  | "createdAt"
  | "updatedAt"
> {}

class AgendaTask
  extends Model<AgendaTaskAttributes, AgendaTaskCreationAttributes>
  implements AgendaTaskAttributes
{
  public id!: string;
  public userId!: string;
  public goalId!: string | null;
  public title!: string;
  public titleAr!: string | null;
  public notes!: string | null;
  public status!: TaskStatus;
  public priority!: TaskPriority;
  public dueDate!: string;
  public dueTime!: string | null;
  public durationMinutes!: number | null;
  public timezone!: string;
  public rolloverPolicy!: RolloverPolicy;
  public rolloverCount!: number;
  public needsRolloverDecision!: boolean;
  public completedAt!: Date | null;
  public abandonedAt!: Date | null;
  public calendarEventId!: string | null;
  public sortOrder!: number;
  public tags!: string[] | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AgendaTask.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    goalId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    titleAr: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "Open",
    },
    priority: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "medium",
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    dueTime: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    durationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    timezone: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: "Asia/Riyadh",
    },
    rolloverPolicy: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "ask",
    },
    rolloverCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    needsRolloverDecision: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    abandonedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    calendarEventId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: [],
    },
  },
  {
    sequelize,
    tableName: "agenda_tasks",
    underscored: true,
    timestamps: true,
  },
);

export default AgendaTask;
