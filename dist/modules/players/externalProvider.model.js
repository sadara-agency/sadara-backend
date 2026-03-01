"use strict";
// ═══════════════════════════════════════════════════════════════
// src/modules/players/externalProvider.model.ts
// ═══════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalProviderMapping = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../../config/database");
class ExternalProviderMapping extends sequelize_1.Model {
}
exports.ExternalProviderMapping = ExternalProviderMapping;
ExternalProviderMapping.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    playerId: { type: sequelize_1.DataTypes.UUID, allowNull: false, field: 'player_id' },
    providerName: { type: sequelize_1.DataTypes.STRING(50), allowNull: false, field: 'provider_name' },
    externalPlayerId: { type: sequelize_1.DataTypes.STRING(100), allowNull: false, field: 'external_player_id' },
    externalTeamId: { type: sequelize_1.DataTypes.STRING(100), field: 'external_team_id' },
    apiBaseUrl: { type: sequelize_1.DataTypes.STRING(500), field: 'api_base_url' },
    notes: { type: sequelize_1.DataTypes.TEXT },
    isActive: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
    lastSyncedAt: { type: sequelize_1.DataTypes.DATE, field: 'last_synced_at' },
}, { sequelize: database_1.sequelize, tableName: 'external_provider_mappings', underscored: true, timestamps: true });
//# sourceMappingURL=externalProvider.model.js.map