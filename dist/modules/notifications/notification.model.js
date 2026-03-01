"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../../config/database");
class Notification extends sequelize_1.Model {
}
exports.Notification = Notification;
Notification.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    userId: { type: sequelize_1.DataTypes.UUID, allowNull: false, field: 'user_id' },
    type: { type: sequelize_1.DataTypes.STRING(50), allowNull: false, defaultValue: 'info' },
    title: { type: sequelize_1.DataTypes.STRING(500), allowNull: false },
    titleAr: { type: sequelize_1.DataTypes.STRING(500), field: 'title_ar' },
    body: { type: sequelize_1.DataTypes.TEXT },
    bodyAr: { type: sequelize_1.DataTypes.TEXT, field: 'body_ar' },
    link: { type: sequelize_1.DataTypes.STRING(500) },
    sourceType: { type: sequelize_1.DataTypes.STRING(50), field: 'source_type' },
    sourceId: { type: sequelize_1.DataTypes.UUID, field: 'source_id' },
    isRead: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false, field: 'is_read' },
    isDismissed: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false, field: 'is_dismissed' },
    priority: { type: sequelize_1.DataTypes.STRING(20), defaultValue: 'normal' },
}, {
    sequelize: database_1.sequelize,
    tableName: 'notifications',
    underscored: true,
    timestamps: true,
    updatedAt: false, // no updated_at column
});
//# sourceMappingURL=notification.model.js.map