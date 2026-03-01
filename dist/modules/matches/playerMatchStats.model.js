"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerMatchStats = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../../config/database");
// ── Model Class ──
class PlayerMatchStats extends sequelize_1.Model {
}
exports.PlayerMatchStats = PlayerMatchStats;
// ── Initialization ──
PlayerMatchStats.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    playerId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'player_id',
        references: { model: 'players', key: 'id' },
        onDelete: 'CASCADE',
    },
    matchId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'match_id',
        references: { model: 'matches', key: 'id' },
        onDelete: 'CASCADE',
    },
    minutesPlayed: { type: sequelize_1.DataTypes.INTEGER, field: 'minutes_played' },
    goals: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    assists: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    shotsTotal: { type: sequelize_1.DataTypes.INTEGER, field: 'shots_total' },
    shotsOnTarget: { type: sequelize_1.DataTypes.INTEGER, field: 'shots_on_target' },
    passesTotal: { type: sequelize_1.DataTypes.INTEGER, field: 'passes_total' },
    passesCompleted: { type: sequelize_1.DataTypes.INTEGER, field: 'passes_completed' },
    tacklesTotal: { type: sequelize_1.DataTypes.INTEGER, field: 'tackles_total' },
    interceptions: { type: sequelize_1.DataTypes.INTEGER },
    duelsWon: { type: sequelize_1.DataTypes.INTEGER, field: 'duels_won' },
    duelsTotal: { type: sequelize_1.DataTypes.INTEGER, field: 'duels_total' },
    dribblesCompleted: { type: sequelize_1.DataTypes.INTEGER, field: 'dribbles_completed' },
    dribblesAttempted: { type: sequelize_1.DataTypes.INTEGER, field: 'dribbles_attempted' },
    foulsCommitted: { type: sequelize_1.DataTypes.INTEGER, field: 'fouls_committed' },
    foulsDrawn: { type: sequelize_1.DataTypes.INTEGER, field: 'fouls_drawn' },
    yellowCards: { type: sequelize_1.DataTypes.INTEGER, field: 'yellow_cards', defaultValue: 0 },
    redCards: { type: sequelize_1.DataTypes.INTEGER, field: 'red_cards', defaultValue: 0 },
    rating: { type: sequelize_1.DataTypes.DECIMAL(3, 1) },
    positionInMatch: { type: sequelize_1.DataTypes.STRING(50), field: 'position_in_match' },
}, {
    sequelize: database_1.sequelize,
    tableName: 'player_match_stats',
    underscored: true,
    timestamps: true,
    indexes: [
        { unique: true, fields: ['player_id', 'match_id'] }, // one stat row per player per match
        { fields: ['player_id'] },
        { fields: ['match_id'] },
    ],
});
//# sourceMappingURL=playerMatchStats.model.js.map