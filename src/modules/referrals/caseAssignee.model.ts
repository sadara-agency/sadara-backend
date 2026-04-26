import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export type CaseAssigneeRole = "primary" | "support" | "observer";

interface CaseAssigneeAttributes {
  id: string;
  referralId: string;
  userId: string;
  role: CaseAssigneeRole;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CaseAssigneeCreationAttributes extends Optional<
  CaseAssigneeAttributes,
  "id" | "createdAt" | "updatedAt"
> {}

export class CaseAssignee
  extends Model<CaseAssigneeAttributes, CaseAssigneeCreationAttributes>
  implements CaseAssigneeAttributes
{
  declare id: string;
  declare referralId: string;
  declare userId: string;
  declare role: CaseAssigneeRole;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

CaseAssignee.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    referralId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "referral_id",
      references: { model: "referrals", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "user_id",
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    role: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "support",
    },
  },
  {
    sequelize,
    tableName: "case_assignees",
    underscored: true,
    timestamps: true,
  },
);

export default CaseAssignee;
