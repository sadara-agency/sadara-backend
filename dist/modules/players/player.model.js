"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../../config/database");
class Player extends sequelize_1.Model {
    id;
    firstName;
    lastName;
    firstNameAr;
    lastNameAr;
    dateOfBirth;
    nationality;
    secondaryNationality;
    playerType;
    contractType;
    position;
    secondaryPosition;
    preferredFoot;
    heightCm;
    weightKg;
    jerseyNumber;
    currentClubId;
    agentId;
    coachId;
    analystId;
    marketValue;
    marketValueCurrency;
    status;
    speed;
    passing;
    shooting;
    defense;
    fitness;
    tactical;
    email;
    phone;
    guardianName;
    guardianPhone;
    guardianRelation;
    notes;
    photoUrl;
    createdBy;
    get fullName() {
        return `${this.firstName} ${this.lastName}`;
    }
    get fullNameAr() {
        if (!this.firstNameAr || !this.lastNameAr)
            return null;
        return `${this.firstNameAr} ${this.lastNameAr}`;
    }
    get age() {
        const today = new Date();
        const birthDate = new Date(this.dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate()))
            age--;
        return age;
    }
}
exports.Player = Player;
Player.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    firstName: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    lastName: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    firstNameAr: { type: sequelize_1.DataTypes.STRING },
    lastNameAr: { type: sequelize_1.DataTypes.STRING },
    dateOfBirth: { type: sequelize_1.DataTypes.DATEONLY, allowNull: false },
    nationality: { type: sequelize_1.DataTypes.STRING },
    secondaryNationality: { type: sequelize_1.DataTypes.STRING },
    playerType: { type: sequelize_1.DataTypes.ENUM('Pro', 'Youth', 'Amateur'), defaultValue: 'Pro' },
    contractType: { type: sequelize_1.DataTypes.STRING(20), defaultValue: 'Professional', field: 'contract_type' },
    position: { type: sequelize_1.DataTypes.STRING },
    secondaryPosition: { type: sequelize_1.DataTypes.STRING },
    preferredFoot: { type: sequelize_1.DataTypes.ENUM('Left', 'Right', 'Both') },
    heightCm: { type: sequelize_1.DataTypes.FLOAT },
    weightKg: { type: sequelize_1.DataTypes.FLOAT },
    jerseyNumber: { type: sequelize_1.DataTypes.INTEGER },
    currentClubId: { type: sequelize_1.DataTypes.UUID },
    agentId: { type: sequelize_1.DataTypes.UUID, field: 'agent_id' },
    coachId: { type: sequelize_1.DataTypes.UUID, field: 'coach_id' },
    analystId: { type: sequelize_1.DataTypes.UUID, field: 'analyst_id' },
    marketValue: { type: sequelize_1.DataTypes.DECIMAL(15, 2) },
    marketValueCurrency: { type: sequelize_1.DataTypes.ENUM('SAR', 'USD', 'EUR'), defaultValue: 'SAR' },
    status: { type: sequelize_1.DataTypes.ENUM('active', 'injured', 'inactive'), defaultValue: 'active' },
    speed: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    passing: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    shooting: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    defense: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    fitness: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    tactical: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    email: { type: sequelize_1.DataTypes.STRING, validate: { isEmail: true } },
    phone: { type: sequelize_1.DataTypes.STRING },
    guardianName: { type: sequelize_1.DataTypes.STRING, field: 'guardian_name' },
    guardianPhone: { type: sequelize_1.DataTypes.STRING(50), field: 'guardian_phone' },
    guardianRelation: { type: sequelize_1.DataTypes.STRING(50), field: 'guardian_relation' },
    notes: { type: sequelize_1.DataTypes.TEXT },
    photoUrl: { type: sequelize_1.DataTypes.STRING },
    createdBy: { type: sequelize_1.DataTypes.UUID, allowNull: false },
}, {
    sequelize: database_1.sequelize,
    tableName: 'players',
    underscored: true,
    timestamps: true,
});
//# sourceMappingURL=player.model.js.map