import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

interface NotificationPreferences {
  contracts: boolean;
  offers: boolean;
  matches: boolean;
  tasks: boolean;
  email: boolean;
  push: boolean;
  sms: boolean;
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  contracts: true,
  offers: true,
  matches: true,
  tasks: true,
  email: true,
  push: false,
  sms: false,
};

interface UserAttributes {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  fullNameAr: string | null;
  role: string;
  avatarUrl: string | null;
  isActive: boolean;
  lastLogin: Date | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  notificationPreferences: NotificationPreferences;
  resetToken: string | null;
  resetTokenExpiry: Date | null;
  playerId: string | null;
  inviteToken: string | null;
  inviteTokenExpiry: Date | null;
  lastActivity: Date | null;
  emailVerifiedAt: Date | null;
  emailVerificationToken: string | null;
  emailVerificationTokenExpiry: Date | null;
}

interface UserCreationAttributes extends Optional<
  UserAttributes,
  | "id"
  | "isActive"
  | "lastLogin"
  | "failedLoginAttempts"
  | "lockedUntil"
  | "avatarUrl"
  | "fullNameAr"
  | "notificationPreferences"
  | "resetToken"
  | "resetTokenExpiry"
  | "playerId"
  | "inviteToken"
  | "inviteTokenExpiry"
  | "lastActivity"
  | "emailVerifiedAt"
  | "emailVerificationToken"
  | "emailVerificationTokenExpiry"
> {}

/** Fields stripped from every serialized User — never sent to the client. */
const SENSITIVE_FIELDS = [
  "passwordHash",
  "failedLoginAttempts",
  "lockedUntil",
  "resetToken",
  "resetTokenExpiry",
  "inviteToken",
  "inviteTokenExpiry",
  "emailVerificationToken",
  "emailVerificationTokenExpiry",
] as const;

type SensitiveField = (typeof SENSITIVE_FIELDS)[number];

/** The safe shape of a User as it leaves the API — no secrets, no internal state. */
export type SafeUser = Omit<
  UserAttributes & { createdAt: Date; updatedAt: Date },
  SensitiveField
>;

export class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  declare id: string;
  declare email: string;
  declare passwordHash: string;
  declare fullName: string;
  declare fullNameAr: string | null;
  declare role: string;
  declare avatarUrl: string | null;
  declare isActive: boolean;
  declare lastLogin: Date | null;
  declare failedLoginAttempts: number;
  declare lockedUntil: Date | null;
  declare notificationPreferences: NotificationPreferences;
  declare resetToken: string | null;
  declare resetTokenExpiry: Date | null;
  declare playerId: string | null;
  declare inviteToken: string | null;
  declare inviteTokenExpiry: Date | null;
  declare lastActivity: Date | null;
  declare emailVerifiedAt: Date | null;
  declare emailVerificationToken: string | null;
  declare emailVerificationTokenExpiry: Date | null;

  /**
   * Strip all sensitive / internal fields before the model is serialized.
   * Called automatically by JSON.stringify (via res.json) and explicitly
   * via user.toJSON(). This is the single place where the allow-list is
   * enforced — no service function needs its own destructure.
   */
  toJSON(): SafeUser {
    const raw = super.toJSON() as UserAttributes & {
      createdAt: Date;
      updatedAt: Date;
    };
    for (const field of SENSITIVE_FIELDS) {
      delete (raw as unknown as Record<string, unknown>)[field];
    }
    return raw as SafeUser;
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    passwordHash: {
      type: DataTypes.STRING,
      field: "password_hash",
      allowNull: false,
    },
    fullName: { type: DataTypes.STRING, field: "full_name", allowNull: false },
    fullNameAr: { type: DataTypes.STRING, field: "full_name_ar" },
    role: { type: DataTypes.STRING, defaultValue: "Analyst" },
    avatarUrl: { type: DataTypes.STRING, field: "avatar_url" },
    isActive: {
      type: DataTypes.BOOLEAN,
      field: "is_active",
      defaultValue: true,
    },
    lastLogin: { type: DataTypes.DATE, field: "last_login" },
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      field: "failed_login_attempts",
      defaultValue: 0,
    },
    lockedUntil: {
      type: DataTypes.DATE,
      field: "locked_until",
      allowNull: true,
      defaultValue: null,
    },
    notificationPreferences: {
      type: DataTypes.JSONB,
      field: "notification_preferences",
      allowNull: false,
      defaultValue: DEFAULT_NOTIFICATION_PREFS,
    },
    resetToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
      field: "reset_token",
    },
    resetTokenExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      field: "reset_token_expiry",
    },
    playerId: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      field: "player_id",
    },
    inviteToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
      field: "invite_token",
    },
    inviteTokenExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      field: "invite_token_expiry",
    },
    lastActivity: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      field: "last_activity",
    },
    emailVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      field: "email_verified_at",
    },
    emailVerificationToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
      field: "email_verification_token",
    },
    emailVerificationTokenExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      field: "email_verification_token_expiry",
    },
  },
  {
    sequelize,
    tableName: "users",
    underscored: true,
    timestamps: true,
  },
);
