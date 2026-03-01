"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchPlayer = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../../config/database");
// ── Model Class ──
class MatchPlayer extends sequelize_1.Model {
}
exports.MatchPlayer = MatchPlayer;
// ── Initialization ──
MatchPlayer.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    matchId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'match_id',
        references: { model: 'matches', key: 'id' },
        onDelete: 'CASCADE',
    },
    playerId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        field: 'player_id',
        references: { model: 'players', key: 'id' },
        onDelete: 'CASCADE',
    },
    availability: {
        type: sequelize_1.DataTypes.ENUM('starter', 'bench', 'injured', 'suspended', 'not_called'),
        defaultValue: 'starter',
        allowNull: false,
    },
    positionInMatch: {
        type: sequelize_1.DataTypes.STRING(50),
        field: 'position_in_match',
    },
    minutesPlayed: {
        type: sequelize_1.DataTypes.INTEGER,
        field: 'minutes_played',
    },
    notes: {
        type: sequelize_1.DataTypes.TEXT,
    },
}, {
    sequelize: database_1.sequelize,
    tableName: 'match_players',
    underscored: true,
    timestamps: true,
    indexes: [
        { unique: true, fields: ['match_id', 'player_id'] }, // one entry per player per match
        { fields: ['player_id'] }, // fast lookups by player
        { fields: ['match_id'] }, // fast lookups by match
    ],
});
//# sourceMappingURL=matchPlayer.model.js.map