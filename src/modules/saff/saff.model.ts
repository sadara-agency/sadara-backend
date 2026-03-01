import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

// ══════════════════════════════════════════
// SAFF TOURNAMENT
// ══════════════════════════════════════════

interface SaffTournamentAttributes {
  id: string;
  saffId: number;            // championship.php?id=XXX
  name: string;
  nameAr: string;
  category: string;          // pro | youth | youth-d1 | youth-d2 | grassroots | women | futsal | beach | esports
  tier: number;              // 1-5
  agencyValue: string;       // Critical | High | Medium | Low | Scouting | Niche
  description?: string | null;
  icon?: string | null;
  isActive: boolean;
  lastSyncedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SaffTournamentCreation extends Optional<SaffTournamentAttributes, 'id' | 'isActive' | 'createdAt' | 'updatedAt'> {}

export class SaffTournament extends Model<SaffTournamentAttributes, SaffTournamentCreation> implements SaffTournamentAttributes {
  declare id: string;
  declare saffId: number;
  declare name: string;
  declare nameAr: string;
  declare category: string;
  declare tier: number;
  declare agencyValue: string;
  declare description: string | null;
  declare icon: string | null;
  declare isActive: boolean;
  declare lastSyncedAt: Date | null;
}

SaffTournament.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  saffId: { type: DataTypes.INTEGER, allowNull: false, unique: true, field: 'saff_id' },
  name: { type: DataTypes.STRING, allowNull: false },
  nameAr: { type: DataTypes.STRING, allowNull: false, field: 'name_ar' },
  category: { type: DataTypes.STRING, allowNull: false },
  tier: { type: DataTypes.INTEGER, allowNull: false },
  agencyValue: { type: DataTypes.STRING, allowNull: false, field: 'agency_value' },
  description: { type: DataTypes.TEXT },
  icon: { type: DataTypes.STRING },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  lastSyncedAt: { type: DataTypes.DATE, field: 'last_synced_at' },
}, { sequelize, tableName: 'saff_tournaments', underscored: true, timestamps: true });


// ══════════════════════════════════════════
// SAFF STANDING
// ══════════════════════════════════════════

interface SaffStandingAttributes {
  id: string;
  tournamentId: string;
  season: string;
  position: number;
  saffTeamId: number;
  teamNameEn: string;
  teamNameAr: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  clubId?: string | null;    // Mapped Sadara Club UUID
  createdAt?: Date;
  updatedAt?: Date;
}

interface SaffStandingCreation extends Optional<SaffStandingAttributes, 'id' | 'clubId' | 'createdAt' | 'updatedAt'> {}

export class SaffStanding extends Model<SaffStandingAttributes, SaffStandingCreation> implements SaffStandingAttributes {
  declare id: string;
  declare tournamentId: string;
  declare season: string;
  declare position: number;
  declare saffTeamId: number;
  declare teamNameEn: string;
  declare teamNameAr: string;
  declare played: number;
  declare won: number;
  declare drawn: number;
  declare lost: number;
  declare goalsFor: number;
  declare goalsAgainst: number;
  declare goalDifference: number;
  declare points: number;
  declare clubId: string | null;
}

SaffStanding.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tournamentId: { type: DataTypes.UUID, allowNull: false, field: 'tournament_id', references: { model: 'saff_tournaments', key: 'id' } },
  season: { type: DataTypes.STRING(20), allowNull: false },
  position: { type: DataTypes.INTEGER, allowNull: false },
  saffTeamId: { type: DataTypes.INTEGER, allowNull: false, field: 'saff_team_id' },
  teamNameEn: { type: DataTypes.STRING, allowNull: false, field: 'team_name_en' },
  teamNameAr: { type: DataTypes.STRING, allowNull: false, field: 'team_name_ar' },
  played: { type: DataTypes.INTEGER, defaultValue: 0 },
  won: { type: DataTypes.INTEGER, defaultValue: 0 },
  drawn: { type: DataTypes.INTEGER, defaultValue: 0 },
  lost: { type: DataTypes.INTEGER, defaultValue: 0 },
  goalsFor: { type: DataTypes.INTEGER, defaultValue: 0, field: 'goals_for' },
  goalsAgainst: { type: DataTypes.INTEGER, defaultValue: 0, field: 'goals_against' },
  goalDifference: { type: DataTypes.INTEGER, defaultValue: 0, field: 'goal_difference' },
  points: { type: DataTypes.INTEGER, defaultValue: 0 },
  clubId: { type: DataTypes.UUID, field: 'club_id', references: { model: 'clubs', key: 'id' } },
}, {
  sequelize, tableName: 'saff_standings', underscored: true, timestamps: true,
  indexes: [
    { fields: ['tournament_id', 'season', 'position'], unique: true },
    { fields: ['saff_team_id'] },
    { fields: ['club_id'] },
  ],
});


// ══════════════════════════════════════════
// SAFF FIXTURE
// ══════════════════════════════════════════

interface SaffFixtureAttributes {
  id: string;
  tournamentId: string;
  season: string;
  week?: number | null;
  matchDate: string;
  matchTime?: string | null;
  saffHomeTeamId: number;
  homeTeamNameEn: string;
  homeTeamNameAr: string;
  saffAwayTeamId: number;
  awayTeamNameEn: string;
  awayTeamNameAr: string;
  homeScore?: number | null;
  awayScore?: number | null;
  stadium?: string | null;
  city?: string | null;
  status: 'upcoming' | 'completed' | 'cancelled';
  homeClubId?: string | null;   // Mapped Sadara Club UUID
  awayClubId?: string | null;
  matchId?: string | null;       // Mapped Sadara Match UUID
  createdAt?: Date;
  updatedAt?: Date;
}

interface SaffFixtureCreation extends Optional<SaffFixtureAttributes, 'id' | 'status' | 'homeClubId' | 'awayClubId' | 'matchId' | 'createdAt' | 'updatedAt'> {}

export class SaffFixture extends Model<SaffFixtureAttributes, SaffFixtureCreation> implements SaffFixtureAttributes {
  declare id: string;
  declare tournamentId: string;
  declare season: string;
  declare week: number | null;
  declare matchDate: string;
  declare matchTime: string | null;
  declare saffHomeTeamId: number;
  declare homeTeamNameEn: string;
  declare homeTeamNameAr: string;
  declare saffAwayTeamId: number;
  declare awayTeamNameEn: string;
  declare awayTeamNameAr: string;
  declare homeScore: number | null;
  declare awayScore: number | null;
  declare stadium: string | null;
  declare city: string | null;
  declare status: 'upcoming' | 'completed' | 'cancelled';
  declare homeClubId: string | null;
  declare awayClubId: string | null;
  declare matchId: string | null;
}

SaffFixture.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tournamentId: { type: DataTypes.UUID, allowNull: false, field: 'tournament_id', references: { model: 'saff_tournaments', key: 'id' } },
  season: { type: DataTypes.STRING(20), allowNull: false },
  week: { type: DataTypes.INTEGER },
  matchDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'match_date' },
  matchTime: { type: DataTypes.STRING(10), field: 'match_time' },
  saffHomeTeamId: { type: DataTypes.INTEGER, allowNull: false, field: 'saff_home_team_id' },
  homeTeamNameEn: { type: DataTypes.STRING, allowNull: false, field: 'home_team_name_en' },
  homeTeamNameAr: { type: DataTypes.STRING, allowNull: false, field: 'home_team_name_ar' },
  saffAwayTeamId: { type: DataTypes.INTEGER, allowNull: false, field: 'saff_away_team_id' },
  awayTeamNameEn: { type: DataTypes.STRING, allowNull: false, field: 'away_team_name_en' },
  awayTeamNameAr: { type: DataTypes.STRING, allowNull: false, field: 'away_team_name_ar' },
  homeScore: { type: DataTypes.INTEGER },
  awayScore: { type: DataTypes.INTEGER },
  stadium: { type: DataTypes.STRING },
  city: { type: DataTypes.STRING },
  status: { type: DataTypes.ENUM('upcoming', 'completed', 'cancelled'), defaultValue: 'upcoming' },
  homeClubId: { type: DataTypes.UUID, field: 'home_club_id', references: { model: 'clubs', key: 'id' } },
  awayClubId: { type: DataTypes.UUID, field: 'away_club_id', references: { model: 'clubs', key: 'id' } },
  matchId: { type: DataTypes.UUID, field: 'match_id', references: { model: 'matches', key: 'id' } },
}, {
  sequelize, tableName: 'saff_fixtures', underscored: true, timestamps: true,
  indexes: [
    { fields: ['tournament_id', 'season', 'match_date'] },
    { fields: ['saff_home_team_id'] },
    { fields: ['saff_away_team_id'] },
    { fields: ['match_id'] },
  ],
});


// ══════════════════════════════════════════
// SAFF TEAM MAPPING
// ══════════════════════════════════════════

interface SaffTeamMapAttributes {
  id: string;
  saffTeamId: number;
  season: string;
  teamNameEn: string;
  teamNameAr: string;
  city?: string | null;
  clubId?: string | null;     // Mapped Sadara Club UUID
  createdAt?: Date;
  updatedAt?: Date;
}

interface SaffTeamMapCreation extends Optional<SaffTeamMapAttributes, 'id' | 'clubId' | 'createdAt' | 'updatedAt'> {}

export class SaffTeamMap extends Model<SaffTeamMapAttributes, SaffTeamMapCreation> implements SaffTeamMapAttributes {
  declare id: string;
  declare saffTeamId: number;
  declare season: string;
  declare teamNameEn: string;
  declare teamNameAr: string;
  declare city: string | null;
  declare clubId: string | null;
}

SaffTeamMap.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  saffTeamId: { type: DataTypes.INTEGER, allowNull: false, field: 'saff_team_id' },
  season: { type: DataTypes.STRING(20), allowNull: false },
  teamNameEn: { type: DataTypes.STRING, allowNull: false, field: 'team_name_en' },
  teamNameAr: { type: DataTypes.STRING, allowNull: false, field: 'team_name_ar' },
  city: { type: DataTypes.STRING },
  clubId: { type: DataTypes.UUID, field: 'club_id', references: { model: 'clubs', key: 'id' } },
}, {
  sequelize, tableName: 'saff_team_maps', underscored: true, timestamps: true,
  indexes: [
    { fields: ['saff_team_id', 'season'], unique: true },
    { fields: ['club_id'] },
  ],
});
