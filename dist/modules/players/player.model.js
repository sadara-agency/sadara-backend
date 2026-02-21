"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../../config/database");
// 3. The Model Class
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
    position;
    secondaryPosition;
    preferredFoot;
    heightCm;
    weightKg;
    jerseyNumber;
    currentClubId;
    agentId;
    marketValue;
    marketValueCurrency;
    status;
    email;
    phone;
    notes;
    photoUrl;
    createdBy;
    // Virtual Getter: Full Name (English)
    get fullName() {
        return `${this.firstName} ${this.lastName}`;
    }
    // Virtual Getter: Full Name (Arabic)
    get fullNameAr() {
        if (!this.firstNameAr || !this.lastNameAr)
            return null;
        return `${this.firstNameAr} ${this.lastNameAr}`;
    }
    // Virtual Getter: Age Calculation
    get age() {
        const today = new Date();
        const birthDate = new Date(this.dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }
}
exports.Player = Player;
// 4. Initialization
Player.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    firstName: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    lastName: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    firstNameAr: { type: sequelize_1.DataTypes.STRING },
    lastNameAr: { type: sequelize_1.DataTypes.STRING },
    dateOfBirth: { type: sequelize_1.DataTypes.DATEONLY, allowNull: false },
    nationality: { type: sequelize_1.DataTypes.STRING },
    secondaryNationality: { type: sequelize_1.DataTypes.STRING },
    playerType: { type: sequelize_1.DataTypes.ENUM('Pro', 'Youth'), defaultValue: 'Pro' },
    position: { type: sequelize_1.DataTypes.STRING },
    secondaryPosition: { type: sequelize_1.DataTypes.STRING },
    preferredFoot: { type: sequelize_1.DataTypes.ENUM('Left', 'Right', 'Both') },
    heightCm: { type: sequelize_1.DataTypes.FLOAT },
    weightKg: { type: sequelize_1.DataTypes.FLOAT },
    jerseyNumber: { type: sequelize_1.DataTypes.INTEGER },
    currentClubId: { type: sequelize_1.DataTypes.UUID },
    agentId: { type: sequelize_1.DataTypes.UUID, field: 'agent_id' },
    marketValue: { type: sequelize_1.DataTypes.DECIMAL(15, 2) },
    marketValueCurrency: { type: sequelize_1.DataTypes.ENUM('SAR', 'USD', 'EUR'), defaultValue: 'SAR' },
    status: { type: sequelize_1.DataTypes.ENUM('active', 'injured', 'inactive'), defaultValue: 'active' },
    email: { type: sequelize_1.DataTypes.STRING, validate: { isEmail: true } },
    phone: { type: sequelize_1.DataTypes.STRING },
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