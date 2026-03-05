import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../../config/database";

export type ApprovalStatus = "Pending" | "Approved" | "Rejected";
export type ApprovalEntityType = "contract" | "offer" | "payment" | "gate";

interface ApprovalRequestAttributes {
  id: string;
  entityType: ApprovalEntityType;
  entityId: string;
  entityTitle: string;
  action: string;
  status: ApprovalStatus;
  priority: "low" | "normal" | "high" | "critical";
  requestedBy: string;
  assignedTo: string | null;
  assignedRole: string | null;
  comment: string | null;
  dueDate: string | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  currentStep: number;
  totalSteps: number;
  templateId: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ApprovalRequestCreation
  extends Optional<
    ApprovalRequestAttributes,
    | "id"
    | "status"
    | "priority"
    | "assignedTo"
    | "assignedRole"
    | "comment"
    | "dueDate"
    | "resolvedBy"
    | "resolvedAt"
    | "currentStep"
    | "totalSteps"
    | "templateId"
    | "createdAt"
    | "updatedAt"
  > {}

export class ApprovalRequest
  extends Model<ApprovalRequestAttributes, ApprovalRequestCreation>
  implements ApprovalRequestAttributes
{
  declare id: string;
  declare entityType: ApprovalEntityType;
  declare entityId: string;
  declare entityTitle: string;
  declare action: string;
  declare status: ApprovalStatus;
  declare priority: "low" | "normal" | "high" | "critical";
  declare requestedBy: string;
  declare assignedTo: string | null;
  declare assignedRole: string | null;
  declare comment: string | null;
  declare dueDate: string | null;
  declare resolvedBy: string | null;
  declare resolvedAt: Date | null;
  declare currentStep: number;
  declare totalSteps: number;
  declare templateId: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

ApprovalRequest.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    entityType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "entity_type",
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "entity_id",
    },
    entityTitle: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: "entity_title",
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("Pending", "Approved", "Rejected"),
      defaultValue: "Pending",
    },
    priority: {
      type: DataTypes.STRING(20),
      defaultValue: "normal",
    },
    requestedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "requested_by",
    },
    assignedTo: {
      type: DataTypes.UUID,
      field: "assigned_to",
    },
    assignedRole: {
      type: DataTypes.STRING(50),
      field: "assigned_role",
    },
    comment: {
      type: DataTypes.TEXT,
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      field: "due_date",
    },
    resolvedBy: {
      type: DataTypes.UUID,
      field: "resolved_by",
    },
    resolvedAt: {
      type: DataTypes.DATE,
      field: "resolved_at",
    },
    currentStep: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: "current_step",
    },
    totalSteps: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: "total_steps",
    },
    templateId: {
      type: DataTypes.UUID,
      field: "template_id",
    },
  },
  {
    sequelize,
    tableName: "approval_requests",
    underscored: true,
    timestamps: true,
  },
);
