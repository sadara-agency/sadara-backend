import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../../config/database";

export type ApprovalStepStatus =
  | "Pending"
  | "Active"
  | "Approved"
  | "Rejected"
  | "Skipped";

interface ApprovalStepAttributes {
  id: string;
  approvalRequestId: string;
  stepNumber: number;
  approverRole: string;
  approverUserId: string | null;
  status: ApprovalStepStatus;
  label: string | null;
  labelAr: string | null;
  comment: string | null;
  dueDate: string | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ApprovalStepCreation
  extends Optional<
    ApprovalStepAttributes,
    | "id"
    | "approverUserId"
    | "status"
    | "label"
    | "labelAr"
    | "comment"
    | "dueDate"
    | "resolvedBy"
    | "resolvedAt"
    | "createdAt"
    | "updatedAt"
  > {}

export class ApprovalStep
  extends Model<ApprovalStepAttributes, ApprovalStepCreation>
  implements ApprovalStepAttributes
{
  declare id: string;
  declare approvalRequestId: string;
  declare stepNumber: number;
  declare approverRole: string;
  declare approverUserId: string | null;
  declare status: ApprovalStepStatus;
  declare label: string | null;
  declare labelAr: string | null;
  declare comment: string | null;
  declare dueDate: string | null;
  declare resolvedBy: string | null;
  declare resolvedAt: Date | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

ApprovalStep.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    approvalRequestId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "approval_request_id",
    },
    stepNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "step_number",
    },
    approverRole: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "approver_role",
    },
    approverUserId: {
      type: DataTypes.UUID,
      field: "approver_user_id",
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "Pending",
    },
    label: {
      type: DataTypes.STRING(200),
    },
    labelAr: {
      type: DataTypes.STRING(200),
      field: "label_ar",
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
  },
  {
    sequelize,
    tableName: "approval_steps",
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ["approval_request_id"] },
      { fields: ["status"] },
    ],
  },
);
