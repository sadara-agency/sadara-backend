"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaffTeamMap = exports.SaffFixture = exports.SaffStanding = exports.SaffTournament = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../../config/database");
class SaffTournament extends sequelize_1.Model {
}
exports.SaffTournament = SaffTournament;
SaffTournament.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    saffId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, unique: true, field: 'saff_id' },
    name: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    nameAr: { type: sequelize_1.DataTypes.STRING, allowNull: false, field: 'name_ar' },
    category: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    tier: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    agencyValue: { type: sequelize_1.DataTypes.STRING, allowNull: false, field: 'agency_value' },
    description: { type: sequelize_1.DataTypes.TEXT },
    icon: { type: sequelize_1.DataTypes.STRING },
    isActive: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
    lastSyncedAt: { type: sequelize_1.DataTypes.DATE, field: 'last_synced_at' },
}, { sequelize: database_1.sequelize, tableName: 'saff_tournaments', underscored: true, timestamps: true });
class SaffStanding extends sequelize_1.Model {
}
exports.SaffStanding = SaffStanding;
SaffStanding.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    tournamentId: { type: sequelize_1.DataTypes.UUID, allowNull: false, field: 'tournament_id', references: { model: 'saff_tournaments', key: 'id' } },
    season: { type: sequelize_1.DataTypes.STRING(20), allowNull: false },
    position: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    saffTeamId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, field: 'saff_team_id' },
    teamNameEn: { type: sequelize_1.DataTypes.STRING, allowNull: false, field: 'team_name_en' },
    teamNameAr: { type: sequelize_1.DataTypes.STRING, allowNull: false, field: 'team_name_ar' },
    played: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    won: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    drawn: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    lost: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    goalsFor: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0, field: 'goals_for' },
    goalsAgainst: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0, field: 'goals_against' },
    goalDifference: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0, field: 'goal_difference' },
    points: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    clubId: { type: sequelize_1.DataTypes.UUID, field: 'club_id', references: { model: 'clubs', key: 'id' } },
}, {
    sequelize: database_1.sequelize, tableName: 'saff_standings', underscored: true, timestamps: true,
    indexes: [
        { fields: ['tournament_id', 'season', 'position'], unique: true },
        { fields: ['saff_team_id'] },
        { fields: ['club_id'] },
    ],
});
class SaffFixture extends sequelize_1.Model {
}
exports.SaffFixture = SaffFixture;
SaffFixture.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    tournamentId: { type: sequelize_1.DataTypes.UUID, allowNull: false, field: 'tournament_id', references: { model: 'saff_tournaments', key: 'id' } },
    season: { type: sequelize_1.DataTypes.STRING(20), allowNull: false },
    week: { type: sequelize_1.DataTypes.INTEGER },
    matchDate: { type: sequelize_1.DataTypes.DATEONLY, allowNull: false, field: 'match_date' },
    matchTime: { type: sequelize_1.DataTypes.STRING(10), field: 'match_time' },
    saffHomeTeamId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, field: 'saff_home_team_id' },
    homeTeamNameEn: { type: sequelize_1.DataTypes.STRING, allowNull: false, field: 'home_team_name_en' },
    homeTeamNameAr: { type: sequelize_1.DataTypes.STRING, allowNull: false, field: 'home_team_name_ar' },
    saffAwayTeamId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, field: 'saff_away_team_id' },
    awayTeamNameEn: { type: sequelize_1.DataTypes.STRING, allowNull: false, field: 'away_team_name_en' },
    awayTeamNameAr: { type: sequelize_1.DataTypes.STRING, allowNull: false, field: 'away_team_name_ar' },
    homeScore: { type: sequelize_1.DataTypes.INTEGER },
    awayScore: { type: sequelize_1.DataTypes.INTEGER },
    stadium: { type: sequelize_1.DataTypes.STRING },
    city: { type: sequelize_1.DataTypes.STRING },
    status: { type: sequelize_1.DataTypes.ENUM('upcoming', 'completed', 'cancelled'), defaultValue: 'upcoming' },
    homeClubId: { type: sequelize_1.DataTypes.UUID, field: 'home_club_id', references: { model: 'clubs', key: 'id' } },
    awayClubId: { type: sequelize_1.DataTypes.UUID, field: 'away_club_id', references: { model: 'clubs', key: 'id' } },
    matchId: { type: sequelize_1.DataTypes.UUID, field: 'match_id', references: { model: 'matches', key: 'id' } },
}, {
    sequelize: database_1.sequelize, tableName: 'saff_fixtures', underscored: true, timestamps: true,
    indexes: [
        { fields: ['tournament_id', 'season', 'match_date'] },
        { fields: ['saff_home_team_id'] },
        { fields: ['saff_away_team_id'] },
        { fields: ['match_id'] },
    ],
});
class SaffTeamMap extends sequelize_1.Model {
}
exports.SaffTeamMap = SaffTeamMap;
SaffTeamMap.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    saffTeamId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, field: 'saff_team_id' },
    season: { type: sequelize_1.DataTypes.STRING(20), allowNull: false },
    teamNameEn: { type: sequelize_1.DataTypes.STRING, allowNull: false, field: 'team_name_en' },
    teamNameAr: { type: sequelize_1.DataTypes.STRING, allowNull: false, field: 'team_name_ar' },
    city: { type: sequelize_1.DataTypes.STRING },
    clubId: { type: sequelize_1.DataTypes.UUID, field: 'club_id', references: { model: 'clubs', key: 'id' } },
}, {
    sequelize: database_1.sequelize, tableName: 'saff_team_maps', underscored: true, timestamps: true,
    indexes: [
        { fields: ['saff_team_id', 'season'], unique: true },
        { fields: ['club_id'] },
    ],
});
//# sourceMappingURL=saff.model.js.map