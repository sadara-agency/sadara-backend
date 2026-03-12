import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../../config/database";

interface PlayerAccountAttributes {
  id: string;
  playerId: string;
  email: string;
  passwordHash: string;
  status: string;
  lastLogin: Date | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

interface PlayerAccountCreationAttributes extends Optional<
  PlayerAccountAttributes,
  "id" | "lastLogin" | "failedLoginAttempts" | "lockedUntil"
> {}

export class PlayerAccount
  extends Model<PlayerAccountAttributes, PlayerAccountCreationAttributes>
  implements PlayerAccountAttributes
{
  declare id: string;
  declare playerId: string;
  declare email: string;
  declare passwordHash: string;
  declare status: string;
  declare lastLogin: Date | null;
  declare failedLoginAttempts: number;
  declare lockedUntil: Date | null;
}

PlayerAccount.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "player_id",
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "password_hash",
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "pending",
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_login",
    },
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "failed_login_attempts",
    },
    lockedUntil: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      field: "locked_until",
    },
  },
  {
    sequelize,
    tableName: "player_accounts",
    underscored: true,
    timestamps: true,
  },
);
