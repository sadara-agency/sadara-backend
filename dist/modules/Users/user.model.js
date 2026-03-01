"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../../config/database");
const DEFAULT_NOTIFICATION_PREFS = {
    contracts: true,
    offers: true,
    matches: true,
    tasks: true,
    email: true,
    push: false,
    sms: false,
};
class User extends sequelize_1.Model {
}
exports.User = User;
User.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    email: { type: sequelize_1.DataTypes.STRING, unique: true, allowNull: false },
    passwordHash: { type: sequelize_1.DataTypes.STRING, field: 'password_hash', allowNull: false },
    fullName: { type: sequelize_1.DataTypes.STRING, field: 'full_name', allowNull: false },
    fullNameAr: { type: sequelize_1.DataTypes.STRING, field: 'full_name_ar' },
    role: { type: sequelize_1.DataTypes.STRING, defaultValue: 'Analyst' },
    avatarUrl: { type: sequelize_1.DataTypes.STRING, field: 'avatar_url' },
    isActive: { type: sequelize_1.DataTypes.BOOLEAN, field: 'is_active', defaultValue: true },
    lastLogin: { type: sequelize_1.DataTypes.DATE, field: 'last_login' },
    notificationPreferences: {
        type: sequelize_1.DataTypes.JSONB,
        field: 'notification_preferences',
        allowNull: false,
        defaultValue: DEFAULT_NOTIFICATION_PREFS,
    },
    resetToken: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null,
        field: 'reset_token',
    },
    resetTokenExpiry: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
        field: 'reset_token_expiry',
    },
    playerId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        defaultValue: null,
        field: 'player_id',
    },
    inviteToken: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null,
        field: 'invite_token',
    },
    inviteTokenExpiry: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
        field: 'invite_token_expiry',
    },
}, {
    sequelize: database_1.sequelize,
    tableName: 'users',
    underscored: true,
    timestamps: true,
});
//# sourceMappingURL=user.model.js.map