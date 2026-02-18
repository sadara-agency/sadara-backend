import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

interface AuditLogAttributes {
  id: string;
  action: string;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  entity: string;
  entityId: string | null;
  detail: string | null;
  changes: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestMethod: string | null;
  requestPath: string | null;
  loggedAt?: Date;
}

interface AuditLogCreationAttributes extends Optional<
  AuditLogAttributes,
  'id' | 'userId' | 'userName' | 'userRole' | 'entityId' | 'detail' |
  'changes' | 'ipAddress' | 'userAgent' | 'requestMethod' | 'requestPath' | 'loggedAt'
> {}

export class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
  declare id: string;
  declare action: string;
  declare userId: string | null;
  declare userName: string | null;
  declare userRole: string | null;
  declare entity: string;
  declare entityId: string | null;
  declare detail: string | null;
  declare changes: Record<string, any> | null;
  declare ipAddress: string | null;
  declare userAgent: string | null;
  declare requestMethod: string | null;
  declare requestPath: string | null;
  declare loggedAt: Date;
}

AuditLog.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    field: 'user_id',
  },
  userName: {
    type: DataTypes.STRING,
    field: 'user_name',
  },
  userRole: {
    type: DataTypes.STRING,
    field: 'user_role',
  },
  entity: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  entityId: {
    type: DataTypes.UUID,
    field: 'entity_id',
  },
  detail: {
    type: DataTypes.TEXT,
  },
  changes: {
    type: DataTypes.JSONB,
  },
  ipAddress: {
    type: DataTypes.STRING,
    field: 'ip_address',
  },
  userAgent: {
    type: DataTypes.TEXT,
    field: 'user_agent',
  },
  requestMethod: {
    type: DataTypes.STRING(10),
    field: 'request_method',
  },
  requestPath: {
    type: DataTypes.TEXT,
    field: 'request_path',
  },
  loggedAt: {
    type: DataTypes.DATE,
    field: 'logged_at',
    defaultValue: DataTypes.NOW,
  },
}, {
  sequelize,
  tableName: 'audit_logs',
  underscored: true,
  timestamps: false,     // Immutable — no createdAt/updatedAt
});