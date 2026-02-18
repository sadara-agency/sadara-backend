import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

// ── Attribute Interfaces ──

export interface MatchAttributes {
  id: string;
  homeClubId?: string | null;
  awayClubId?: string | null;
  competition?: string | null;
  season?: string | null;
  matchDate: Date;
  venue?: string | null;
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  homeScore?: number | null;
  awayScore?: number | null;
  attendance?: number | null;
  referee?: string | null;
  broadcast?: string | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MatchCreationAttributes extends Optional<
  MatchAttributes,
  'id' | 'status' | 'createdAt' | 'updatedAt'
> {}

// ── Model Class ──

export class Match extends Model<MatchAttributes, MatchCreationAttributes> implements MatchAttributes {
  declare id: string;
  declare homeClubId: string | null;
  declare awayClubId: string | null;
  declare competition: string | null;
  declare season: string | null;
  declare matchDate: Date;
  declare venue: string | null;
  declare status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  declare homeScore: number | null;
  declare awayScore: number | null;
  declare attendance: number | null;
  declare referee: string | null;
  declare broadcast: string | null;
  declare notes: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  // Virtual: formatted score
  get score(): string | null {
    if (this.homeScore == null || this.awayScore == null) return null;
    return `${this.homeScore} - ${this.awayScore}`;
  }
}

// ── Initialization ──

Match.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  homeClubId: {
    type: DataTypes.UUID,
    field: 'home_club_id',
  },
  awayClubId: {
    type: DataTypes.UUID,
    field: 'away_club_id',
  },
  competition: {
    type: DataTypes.STRING,
  },
  season: {
    type: DataTypes.STRING(20),
  },
  matchDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'match_date',
  },
  venue: {
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.ENUM('upcoming', 'live', 'completed', 'cancelled'),
    defaultValue: 'upcoming',
  },
  homeScore: {
    type: DataTypes.INTEGER,
    field: 'home_score',
  },
  awayScore: {
    type: DataTypes.INTEGER,
    field: 'away_score',
  },
  attendance: {
    type: DataTypes.INTEGER,
  },
  referee: {
    type: DataTypes.STRING,
  },
  broadcast: {
    type: DataTypes.STRING,
  },
  notes: {
    type: DataTypes.TEXT,
  },
}, {
  sequelize,
  tableName: 'matches',
  underscored: true,
  timestamps: true,
});