import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

interface UserSessionAttributes {
  id: string;
  userId: string;
  userType: "user" | "player";
  startedAt: Date;
  lastHeartbeatAt: Date;
  endedAt?: Date | null;
  durationSeconds?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  endReason?:
    | "logout"
    | "refresh_revoked"
    | "idle_timeout"
    | "forced"
    | "expired"
    | null;
  refreshTokenFamily?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserSessionCreationAttributes extends Optional<
  UserSessionAttributes,
  | "id"
  | "userType"
  | "endedAt"
  | "durationSeconds"
  | "ipAddress"
  | "userAgent"
  | "endReason"
  | "refreshTokenFamily"
  | "createdAt"
  | "updatedAt"
> {}

class UserSession
  extends Model<UserSessionAttributes, UserSessionCreationAttributes>
  implements UserSessionAttributes
{
  public id!: string;
  public userId!: string;
  public userType!: "user" | "player";
  public startedAt!: Date;
  public lastHeartbeatAt!: Date;
  public endedAt!: Date | null;
  public durationSeconds!: number | null;
  public ipAddress!: string | null;
  public userAgent!: string | null;
  public endReason!:
    | "logout"
    | "refresh_revoked"
    | "idle_timeout"
    | "forced"
    | "expired"
    | null;
  public refreshTokenFamily!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UserSession.init(
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
    userType: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: "user",
      validate: { isIn: [["user", "player"]] },
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    lastHeartbeatAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    endedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    durationSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    endReason: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: [
          ["logout", "refresh_revoked", "idle_timeout", "forced", "expired"],
        ],
      },
    },
    refreshTokenFamily: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "user_sessions",
    underscored: true,
    timestamps: true,
  },
);

export default UserSession;
