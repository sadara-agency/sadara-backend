"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Club = void 0;
// ─────────────────────────────────────────────────────────────
// src/modules/clubs/club.model.ts
// Sequelize model for the clubs table.
//
// FIXED: Changed `public` to `declare` on all properties
// to avoid shadowing Sequelize ORM getters. This is the same
// fix applied to Player and other models.
// ─────────────────────────────────────────────────────────────
const sequelize_1 = require("sequelize");
const database_1 = require("../../config/database");
class Club extends sequelize_1.Model {
}
exports.Club = Club;
Club.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    nameAr: {
        type: sequelize_1.DataTypes.STRING,
        field: 'name_ar',
    },
    type: {
        type: sequelize_1.DataTypes.ENUM('Club', 'Sponsor'),
        defaultValue: 'Club',
        allowNull: false,
    },
    country: {
        type: sequelize_1.DataTypes.STRING,
    },
    city: {
        type: sequelize_1.DataTypes.STRING,
    },
    league: {
        type: sequelize_1.DataTypes.STRING,
    },
    logoUrl: {
        type: sequelize_1.DataTypes.STRING,
        field: 'logo_url',
    },
    website: {
        type: sequelize_1.DataTypes.STRING,
    },
    foundedYear: {
        type: sequelize_1.DataTypes.INTEGER,
        field: 'founded_year',
    },
    stadium: {
        type: sequelize_1.DataTypes.STRING,
    },
    stadiumCapacity: {
        type: sequelize_1.DataTypes.INTEGER,
        field: 'stadium_capacity',
    },
    primaryColor: {
        type: sequelize_1.DataTypes.STRING,
        field: 'primary_color',
    },
    secondaryColor: {
        type: sequelize_1.DataTypes.STRING,
        field: 'secondary_color',
    },
    notes: {
        type: sequelize_1.DataTypes.TEXT,
    },
    isActive: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active',
    },
}, {
    sequelize: database_1.sequelize,
    tableName: 'clubs',
    underscored: true,
    timestamps: true,
});
//# sourceMappingURL=club.model.js.map