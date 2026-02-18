import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

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
}

// Some attributes are optional on creation (ID is usually auto-generated)
interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'isActive' | 'lastLogin' | 'avatarUrl' | 'fullNameAr'> {}

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
}, {
  sequelize,
  tableName: 'users',
  underscored: true,
  timestamps: true, 
});