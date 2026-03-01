// ═══════════════════════════════════════════════════════════════
// src/modules/players/externalProvider.model.ts
// ═══════════════════════════════════════════════════════════════

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

export type ProviderName = 'Wyscout' | 'InStat' | 'StatsBomb' | 'APIFootball' | 'Sportmonks' | 'Other';

interface EPMAttributes {
  id: string;
  playerId: string;
  providerName: ProviderName;
  externalPlayerId: string;
  externalTeamId?: string | null;
  apiBaseUrl?: string | null;
  notes?: string | null;
  isActive: boolean;
  lastSyncedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface EPMCreation extends Optional<EPMAttributes, 'id' | 'isActive' | 'createdAt' | 'updatedAt'> {}

export class ExternalProviderMapping extends Model<EPMAttributes, EPMCreation> implements EPMAttributes {
  declare id: string;
  declare playerId: string;
  declare providerName: ProviderName;
  declare externalPlayerId: string;
  declare externalTeamId: string | null;
  declare apiBaseUrl: string | null;
  declare notes: string | null;
  declare isActive: boolean;
  declare lastSyncedAt: Date | null;
}

ExternalProviderMapping.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  playerId: { type: DataTypes.UUID, allowNull: false, field: 'player_id' },
  providerName: { type: DataTypes.STRING(50), allowNull: false, field: 'provider_name' },
  externalPlayerId: { type: DataTypes.STRING(100), allowNull: false, field: 'external_player_id' },
  externalTeamId: { type: DataTypes.STRING(100), field: 'external_team_id' },
  apiBaseUrl: { type: DataTypes.STRING(500), field: 'api_base_url' },
  notes: { type: DataTypes.TEXT },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  lastSyncedAt: { type: DataTypes.DATE, field: 'last_synced_at' },
}, { sequelize, tableName: 'external_provider_mappings', underscored: true, timestamps: true });