import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";
import { Session } from "./session.model";

interface SessionLogAttributes {
  id: string;
  sessionId: string;
  playerId: string;
  rpe: number | null;
  durationMin: number | null;
  completed: boolean;
  playerNotes: string | null;
  loggedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SessionLogCreationAttributes extends Optional<
  SessionLogAttributes,
  | "id"
  | "rpe"
  | "durationMin"
  | "completed"
  | "playerNotes"
  | "loggedAt"
  | "createdAt"
  | "updatedAt"
> {}

export class SessionLog
  extends Model<SessionLogAttributes, SessionLogCreationAttributes>
  implements SessionLogAttributes
{
  declare id: string;
  declare sessionId: string;
  declare playerId: string;
  declare rpe: number | null;
  declare durationMin: number | null;
  declare completed: boolean;
  declare playerNotes: string | null;
  declare loggedAt: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

SessionLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: "session_id",
    },
    playerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "player_id",
    },
    rpe: {
      type: DataTypes.SMALLINT,
      allowNull: true,
    },
    durationMin: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      field: "duration_min",
    },
    completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    playerNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "player_notes",
    },
    loggedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "logged_at",
    },
  },
  {
    sequelize,
    tableName: "session_logs",
    underscored: true,
    timestamps: true,
  },
);

// Association: Session 1:1 SessionLog
Session.hasOne(SessionLog, { foreignKey: "session_id", as: "playerLog" });
SessionLog.belongsTo(Session, { foreignKey: "session_id", as: "session" });
