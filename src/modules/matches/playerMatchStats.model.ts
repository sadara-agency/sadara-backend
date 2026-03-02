import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

// ── Attribute Interfaces ──

export interface PlayerMatchStatsAttributes {
  id: string;
  playerId: string;
  matchId: string;
  minutesPlayed?: number | null;
  goals?: number | null;
  assists?: number | null;
  shotsTotal?: number | null;
  shotsOnTarget?: number | null;
  passesTotal?: number | null;
  passesCompleted?: number | null;
  tacklesTotal?: number | null;
  interceptions?: number | null;
  duelsWon?: number | null;
  duelsTotal?: number | null;
  dribblesCompleted?: number | null;
  dribblesAttempted?: number | null;
  foulsCommitted?: number | null;
  foulsDrawn?: number | null;
  yellowCards?: number | null;
  redCards?: number | null;
  rating?: number | null;
  positionInMatch?: string | null;
  keyPasses?: number | null;
  saves?: number | null;
  cleanSheet?: boolean | null;
  goalsConceded?: number | null;
  penaltiesSaved?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PlayerMatchStatsCreationAttributes extends Optional<
  PlayerMatchStatsAttributes,
  'id' | 'createdAt' | 'updatedAt'
> {}

// ── Model Class ──

export class PlayerMatchStats extends Model<PlayerMatchStatsAttributes, PlayerMatchStatsCreationAttributes>
  implements PlayerMatchStatsAttributes {
  declare id: string;
  declare playerId: string;
  declare matchId: string;
  declare minutesPlayed: number | null;
  declare goals: number | null;
  declare assists: number | null;
  declare shotsTotal: number | null;
  declare shotsOnTarget: number | null;
  declare passesTotal: number | null;
  declare passesCompleted: number | null;
  declare tacklesTotal: number | null;
  declare interceptions: number | null;
  declare duelsWon: number | null;
  declare duelsTotal: number | null;
  declare dribblesCompleted: number | null;
  declare dribblesAttempted: number | null;
  declare foulsCommitted: number | null;
  declare foulsDrawn: number | null;
  declare yellowCards: number | null;
  declare redCards: number | null;
  declare rating: number | null;
  declare positionInMatch: string | null;
  declare keyPasses: number | null;
  declare saves: number | null;
  declare cleanSheet: boolean | null;
  declare goalsConceded: number | null;
  declare penaltiesSaved: number | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

// ── Initialization ──

PlayerMatchStats.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  playerId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'player_id',
    references: { model: 'players', key: 'id' },
    onDelete: 'CASCADE',
  },
  matchId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'match_id',
    references: { model: 'matches', key: 'id' },
    onDelete: 'CASCADE',
  },
  minutesPlayed: { type: DataTypes.INTEGER, field: 'minutes_played' },
  goals: { type: DataTypes.INTEGER, defaultValue: 0 },
  assists: { type: DataTypes.INTEGER, defaultValue: 0 },
  shotsTotal: { type: DataTypes.INTEGER, field: 'shots_total' },
  shotsOnTarget: { type: DataTypes.INTEGER, field: 'shots_on_target' },
  passesTotal: { type: DataTypes.INTEGER, field: 'passes_total' },
  passesCompleted: { type: DataTypes.INTEGER, field: 'passes_completed' },
  tacklesTotal: { type: DataTypes.INTEGER, field: 'tackles_total' },
  interceptions: { type: DataTypes.INTEGER },
  duelsWon: { type: DataTypes.INTEGER, field: 'duels_won' },
  duelsTotal: { type: DataTypes.INTEGER, field: 'duels_total' },
  dribblesCompleted: { type: DataTypes.INTEGER, field: 'dribbles_completed' },
  dribblesAttempted: { type: DataTypes.INTEGER, field: 'dribbles_attempted' },
  foulsCommitted: { type: DataTypes.INTEGER, field: 'fouls_committed' },
  foulsDrawn: { type: DataTypes.INTEGER, field: 'fouls_drawn' },
  yellowCards: { type: DataTypes.INTEGER, field: 'yellow_cards', defaultValue: 0 },
  redCards: { type: DataTypes.INTEGER, field: 'red_cards', defaultValue: 0 },
  rating: { type: DataTypes.DECIMAL(3, 1) },
  positionInMatch: { type: DataTypes.STRING(50), field: 'position_in_match' },
  keyPasses: { type: DataTypes.INTEGER, field: 'key_passes' },
  saves: { type: DataTypes.INTEGER },
  cleanSheet: { type: DataTypes.BOOLEAN, field: 'clean_sheet' },
  goalsConceded: { type: DataTypes.INTEGER, field: 'goals_conceded' },
  penaltiesSaved: { type: DataTypes.INTEGER, field: 'penalties_saved' },
}, {
  sequelize,
  tableName: 'player_match_stats',
  underscored: true,
  timestamps: true,
  indexes: [
    { unique: true, fields: ['player_id', 'match_id'] },  // one stat row per player per match
    { fields: ['player_id'] },
    { fields: ['match_id'] },
  ],
});