import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database';

export class AuditLog extends Model {}

AuditLog.init({
  action: { type: DataTypes.STRING, allowNull: false },
  userId: { type: DataTypes.STRING, field: 'user_id' },
  userName: { type: DataTypes.STRING, field: 'user_name' },
  userRole: { type: DataTypes.STRING, field: 'user_role' },
  entity: { type: DataTypes.STRING, allowNull: false },
  entityId: { type: DataTypes.STRING, field: 'entity_id' },
  detail: { type: DataTypes.TEXT },
  changes: { type: DataTypes.JSONB },  
  ipAddress: { type: DataTypes.STRING, field: 'ip_address' },
}, {
  sequelize,
  modelName: 'AuditLog',
  tableName: 'audit_logs',
  underscored: true,
});