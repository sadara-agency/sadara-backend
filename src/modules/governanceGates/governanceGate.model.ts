import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export type GateType =
  | "cross_border_transfer"
  | "external_share"
  | "restricted_data"
  | "publish";

export type GateStatus = "pending" | "approved" | "rejected" | "bypassed";

export interface GovernanceGateAttributes {
  id: string;
  gateType: GateType;
  entityType: string;
  entityId: string;
  entityTitle: string | null;
  status: GateStatus;
  triggeredBy: string;
  triggeredByRole: string | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  justification: string | null;
  reviewerNotes: string | null;
  metadata: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

interface GovernanceGateCreationAttributes extends Optional<
  GovernanceGateAttributes,
  | "id"
  | "entityTitle"
  | "triggeredByRole"
  | "resolvedBy"
  | "resolvedAt"
  | "justification"
  | "reviewerNotes"
  | "metadata"
  | "createdAt"
  | "updatedAt"
> {}

class GovernanceGate
  extends Model<GovernanceGateAttributes, GovernanceGateCreationAttributes>
  implements GovernanceGateAttributes
{
  public id!: string;
  public gateType!: GateType;
  public entityType!: string;
  public entityId!: string;
  public entityTitle!: string | null;
  public status!: GateStatus;
  public triggeredBy!: string;
  public triggeredByRole!: string | null;
  public resolvedBy!: string | null;
  public resolvedAt!: Date | null;
  public justification!: string | null;
  public reviewerNotes!: string | null;
  public metadata!: Record<string, unknown>;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

GovernanceGate.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    gateType: { type: DataTypes.STRING(30), allowNull: false },
    entityType: { type: DataTypes.STRING(50), allowNull: false },
    entityId: { type: DataTypes.UUID, allowNull: false },
    entityTitle: { type: DataTypes.STRING(255), allowNull: true },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending",
    },
    triggeredBy: { type: DataTypes.UUID, allowNull: false },
    triggeredByRole: { type: DataTypes.STRING(30), allowNull: true },
    resolvedBy: { type: DataTypes.UUID, allowNull: true },
    resolvedAt: { type: DataTypes.DATE, allowNull: true },
    justification: { type: DataTypes.TEXT, allowNull: true },
    reviewerNotes: { type: DataTypes.TEXT, allowNull: true },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
  },
  {
    sequelize,
    tableName: "governance_gates",
    underscored: true,
    timestamps: true,
  },
);

export default GovernanceGate;
