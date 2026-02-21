"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLog = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../../config/database");
class AuditLog extends sequelize_1.Model {
}
exports.AuditLog = AuditLog;
AuditLog.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    action: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
        field: 'user_id',
    },
    userName: {
        type: sequelize_1.DataTypes.STRING,
        field: 'user_name',
    },
    userRole: {
        type: sequelize_1.DataTypes.STRING,
        field: 'user_role',
    },
    entity: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
    },
    entityId: {
        type: sequelize_1.DataTypes.UUID,
        field: 'entity_id',
    },
    detail: {
        type: sequelize_1.DataTypes.TEXT,
    },
    changes: {
        type: sequelize_1.DataTypes.JSONB,
    },
    ipAddress: {
        type: sequelize_1.DataTypes.STRING,
        field: 'ip_address',
    },
    userAgent: {
        type: sequelize_1.DataTypes.TEXT,
        field: 'user_agent',
    },
    requestMethod: {
        type: sequelize_1.DataTypes.STRING(10),
        field: 'request_method',
    },
    requestPath: {
        type: sequelize_1.DataTypes.TEXT,
        field: 'request_path',
    },
    loggedAt: {
        type: sequelize_1.DataTypes.DATE,
        field: 'logged_at',
        defaultValue: sequelize_1.DataTypes.NOW,
    },
}, {
    sequelize: database_1.sequelize,
    tableName: 'audit_logs',
    underscored: true,
    timestamps: false, // Immutable — no createdAt/updatedAt
});
//# sourceMappingURL=AuditLog.model.js.map