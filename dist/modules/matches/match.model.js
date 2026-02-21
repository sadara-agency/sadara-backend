"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Match = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../../config/database");
// ── Model Class ──
class Match extends sequelize_1.Model {
    // Virtual: formatted score
    get score() {
        if (this.homeScore == null || this.awayScore == null)
            return null;
        return `${this.homeScore} - ${this.awayScore}`;
    }
}
exports.Match = Match;
// ── Initialization ──
Match.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    homeClubId: {
        type: sequelize_1.DataTypes.UUID,
        field: 'home_club_id',
    },
    awayClubId: {
        type: sequelize_1.DataTypes.UUID,
        field: 'away_club_id',
    },
    competition: {
        type: sequelize_1.DataTypes.STRING,
    },
    season: {
        type: sequelize_1.DataTypes.STRING(20),
    },
    matchDate: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: 'match_date',
    },
    venue: {
        type: sequelize_1.DataTypes.STRING,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('upcoming', 'live', 'completed', 'cancelled'),
        defaultValue: 'upcoming',
    },
    homeScore: {
        type: sequelize_1.DataTypes.INTEGER,
        field: 'home_score',
    },
    awayScore: {
        type: sequelize_1.DataTypes.INTEGER,
        field: 'away_score',
    },
    attendance: {
        type: sequelize_1.DataTypes.INTEGER,
    },
    referee: {
        type: sequelize_1.DataTypes.STRING,
    },
    broadcast: {
        type: sequelize_1.DataTypes.STRING,
    },
    notes: {
        type: sequelize_1.DataTypes.TEXT,
    },
}, {
    sequelize: database_1.sequelize,
    tableName: 'matches',
    underscored: true,
    timestamps: true,
});
//# sourceMappingURL=match.model.js.map