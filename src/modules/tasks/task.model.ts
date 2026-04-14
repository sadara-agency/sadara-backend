import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";
import { logAudit } from "@shared/utils/audit";
import type { UserRole } from "@shared/types";

// ── Attribute interfaces ──
interface TaskAttributes {
  id: string;
  displayId: string | null;
  title: string;
  titleAr: string | null;
  description: string | null;
  descriptionHtml: string | null;
  type: "Match" | "Contract" | "Health" | "Report" | "Offer" | "General";
  status: "Open" | "InProgress" | "Completed" | "Canceled";
  priority: "low" | "medium" | "high" | "critical";
  assignedTo: string | null;
  assignedBy: string | null;
  playerId: string | null;
  matchId: string | null;
  contractId: string | null;
  dueDate: string | null;
  completedAt: Date | null;
  isAutoCreated: boolean;
  referralId: string | null;
  triggerRuleId: string | null;
  parentTaskId: string | null;
  sortOrder: number;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TaskCreationAttributes extends Optional<
  TaskAttributes,
  | "id"
  | "displayId"
  | "titleAr"
  | "description"
  | "descriptionHtml"
  | "type"
  | "status"
  | "priority"
  | "assignedTo"
  | "assignedBy"
  | "playerId"
  | "matchId"
  | "contractId"
  | "dueDate"
  | "completedAt"
  | "isAutoCreated"
  | "referralId"
  | "triggerRuleId"
  | "parentTaskId"
  | "sortOrder"
  | "notes"
  | "createdAt"
  | "updatedAt"
> {}

export class Task
  extends Model<TaskAttributes, TaskCreationAttributes>
  implements TaskAttributes
{
  declare id: string;
  declare displayId: string | null;
  declare title: string;
  declare titleAr: string | null;
  declare description: string | null;
  declare descriptionHtml: string | null;
  declare type:
    | "Match"
    | "Contract"
    | "Health"
    | "Report"
    | "Offer"
    | "General";
  declare status: "Open" | "InProgress" | "Completed" | "Canceled";
  declare priority: "low" | "medium" | "high" | "critical";
  declare assignedTo: string | null;
  declare assignedBy: string | null;
  declare playerId: string | null;
  declare matchId: string | null;
  declare contractId: string | null;
  declare dueDate: string | null;
  declare completedAt: Date | null;
  declare isAutoCreated: boolean;
  declare referralId: string | null;
  declare triggerRuleId: string | null;
  declare parentTaskId: string | null;
  declare sortOrder: number;
  declare notes: string | null;

  // Associations (populated by include)
  declare subTasks?: Task[];
  declare parentTask?: Task;
}

Task.init(
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
    descriptionHtml: {
      type: DataTypes.TEXT,
      field: "description_html",
    },
    type: {
      type: DataTypes.ENUM(
        "Match",
        "Contract",
        "Health",
        "Report",
        "Offer",
        "General",
      ),
      defaultValue: "General",
    },
    status: {
      type: DataTypes.ENUM("Open", "InProgress", "Completed", "Canceled"),
      defaultValue: "Open",
    },
    priority: {
      type: DataTypes.ENUM("low", "medium", "high", "critical"),
      defaultValue: "medium",
    },
    assignedTo: {
      type: DataTypes.UUID,
      field: "assigned_to",
    },
    assignedBy: {
      type: DataTypes.UUID,
      field: "assigned_by",
    },
    playerId: {
      type: DataTypes.UUID,
      field: "player_id",
    },
    matchId: {
      type: DataTypes.UUID,
      field: "match_id",
    },
    contractId: {
      type: DataTypes.UUID,
      field: "contract_id",
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      field: "due_date",
    },
    completedAt: {
      type: DataTypes.DATE,
      field: "completed_at",
    },
    referralId: {
      type: DataTypes.UUID,
      field: "referral_id",
    },
    isAutoCreated: {
      type: DataTypes.BOOLEAN,
      field: "is_auto_created",
      defaultValue: false,
    },
    triggerRuleId: {
      type: DataTypes.STRING,
      field: "trigger_rule_id",
    },
    parentTaskId: {
      type: DataTypes.UUID,
      field: "parent_task_id",
      references: { model: "tasks", key: "id" },
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      field: "sort_order",
      defaultValue: 0,
    },
    notes: {
      type: DataTypes.TEXT,
    },
  },
  {
    sequelize,
    tableName: "tasks",
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ["player_id"] },
      { fields: ["assigned_to"] },
      { fields: ["status"] },
      { fields: ["match_id"] },
      { fields: ["referral_id"] },
      { fields: ["parent_task_id"] },
    ],
  },
);

// ── Audit hook: log system-created tasks so "System Actions" KPI is accurate ──
Task.afterCreate(async (task) => {
  if (task.isAutoCreated) {
    logAudit(
      "CREATE",
      "tasks",
      task.id,
      {
        userId: null as unknown as string,
        userName: "System",
        userRole: "System" as UserRole,
        ip: undefined,
      },
      `Auto-task: ${task.title}`,
    ).catch(() => {}); // fire-and-forget — don't block task creation
  }
});

// ── Self-referential associations (parent ↔ sub-tasks) ──
Task.hasMany(Task, { as: "subTasks", foreignKey: "parentTaskId" });
Task.belongsTo(Task, { as: "parentTask", foreignKey: "parentTaskId" });
