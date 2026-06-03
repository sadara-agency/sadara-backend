import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export type ProfileChangeStatus = "Pending" | "Approved" | "Rejected";
export interface FieldChange {
  from: unknown;
  to: unknown;
}
export type ProfileChanges = Record<string, FieldChange>;

interface Attrs {
  id: string;
  playerId: string;
  requestedBy: string;
  changes: ProfileChanges;
  status: ProfileChangeStatus;
  approvalRequestId: string | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  reviewerComment: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}
interface Creation extends Optional<
  Attrs,
  | "id"
  | "status"
  | "approvalRequestId"
  | "resolvedBy"
  | "resolvedAt"
  | "reviewerComment"
  | "createdAt"
  | "updatedAt"
> {}

export class ProfileChangeRequest
  extends Model<Attrs, Creation>
  implements Attrs
{
  declare id: string;
  declare playerId: string;
  declare requestedBy: string;
  declare changes: ProfileChanges;
  declare status: ProfileChangeStatus;
  declare approvalRequestId: string | null;
  declare resolvedBy: string | null;
  declare resolvedAt: Date | null;
  declare reviewerComment: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ProfileChangeRequest.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    requestedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "requested_by",
    },
    changes: { type: DataTypes.JSONB, allowNull: false },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "Pending",
    },
    approvalRequestId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "approval_request_id",
    },
    resolvedBy: { type: DataTypes.UUID, allowNull: true, field: "resolved_by" },
    resolvedAt: { type: DataTypes.DATE, allowNull: true, field: "resolved_at" },
    reviewerComment: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "reviewer_comment",
    },
  },
  {
    sequelize,
    tableName: "profile_change_requests",
    underscored: true,
    timestamps: true,
  },
);

export default ProfileChangeRequest;
