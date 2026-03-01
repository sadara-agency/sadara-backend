import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

// ── Attribute Interfaces ──

export interface MatchPlayerAttributes {
  id: string;
  matchId: string;
  playerId: string;
  availability: 'starter' | 'bench' | 'injured' | 'suspended' | 'not_called';
  positionInMatch?: string | null;
  minutesPlayed?: number | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MatchPlayerCreationAttributes extends Optional<
  MatchPlayerAttributes,
  'id' | 'availability' | 'createdAt' | 'updatedAt'
> {}

// ── Model Class ──

export class MatchPlayer extends Model<MatchPlayerAttributes, MatchPlayerCreationAttributes>
  implements MatchPlayerAttributes {
  declare id: string;
  declare matchId: string;
  declare playerId: string;
  declare availability: 'starter' | 'bench' | 'injured' | 'suspended' | 'not_called';
  declare positionInMatch: string | null;
  declare minutesPlayed: number | null;
  declare notes: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

// ── Initialization ──

MatchPlayer.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  matchId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'match_id',
    references: { model: 'matches', key: 'id' },
    onDelete: 'CASCADE',
  },
  playerId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'player_id',
    references: { model: 'players', key: 'id' },
    onDelete: 'CASCADE',
  },
  availability: {
    type: DataTypes.ENUM('starter', 'bench', 'injured', 'suspended', 'not_called'),
    defaultValue: 'starter',
    allowNull: false,
  },
  positionInMatch: {
    type: DataTypes.STRING(50),
    field: 'position_in_match',
  },
  minutesPlayed: {
    type: DataTypes.INTEGER,
    field: 'minutes_played',
  },
  notes: {
    type: DataTypes.TEXT,
  },
}, {
  sequelize,
  tableName: 'match_players',
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['match_id', 'player_id'] },   // one entry per player per match
    { fields: ['player_id'] },                               // fast lookups by player
    { fields: ['match_id'] },                                // fast lookups by match
  ],
});