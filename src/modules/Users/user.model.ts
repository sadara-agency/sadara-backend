import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

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
  notificationPreferences: NotificationPreferences;
  resetToken: string | null;
  resetTokenExpiry: Date | null;
  playerId: string | null;
  inviteToken: string | null;
  inviteTokenExpiry: Date | null;
}

interface UserCreationAttributes extends Optional<UserAttributes,
  'id' | 'isActive' | 'lastLogin' | 'avatarUrl' | 'fullNameAr' | 'notificationPreferences' |
  'resetToken' | 'resetTokenExpiry' | 'playerId' | 'inviteToken' | 'inviteTokenExpiry'
> { }

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string;
  declare email: string;
  declare passwordHash: string;
  declare fullName: string;
  declare fullNameAr: string | null;
  declare role: string;
  declare avatarUrl: string | null;
  declare isActive: boolean;
  declare lastLogin: Date | null;
  declare notificationPreferences: NotificationPreferences;
  declare resetToken: string | null;
  declare resetTokenExpiry: Date | null;
  declare playerId: string | null;
  declare inviteToken: string | null;
  declare inviteTokenExpiry: Date | null;
}

User.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  passwordHash: { type: DataTypes.STRING, field: 'password_hash', allowNull: false },
  fullName: { type: DataTypes.STRING, field: 'full_name', allowNull: false },
  fullNameAr: { type: DataTypes.STRING, field: 'full_name_ar' },
  role: { type: DataTypes.STRING, defaultValue: 'Analyst' },
  avatarUrl: { type: DataTypes.STRING, field: 'avatar_url' },
  isActive: { type: DataTypes.BOOLEAN, field: 'is_active', defaultValue: true },
  lastLogin: { type: DataTypes.DATE, field: 'last_login' },
  notificationPreferences: {
    type: DataTypes.JSONB,
    field: 'notification_preferences',
    allowNull: false,
    defaultValue: DEFAULT_NOTIFICATION_PREFS,
  },
  resetToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: null,
    field: 'reset_token',
  },
  resetTokenExpiry: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
    field: 'reset_token_expiry',
  },
  playerId: {
    type: DataTypes.UUID,
    allowNull: true,
    defaultValue: null,
    field: 'player_id',
  },
  inviteToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: null,
    field: 'invite_token',
  },
  inviteTokenExpiry: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
    field: 'invite_token_expiry',
  },
}, {
  sequelize,
  tableName: 'users',
  underscored: true,
  timestamps: true,
});