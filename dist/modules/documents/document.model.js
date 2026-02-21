"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Document = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../../config/database");
class Document extends sequelize_1.Model {
}
exports.Document = Document;
Document.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    playerId: { type: sequelize_1.DataTypes.UUID, field: 'player_id' },
    contractId: { type: sequelize_1.DataTypes.UUID, field: 'contract_id' },
    name: { type: sequelize_1.DataTypes.STRING(500), allowNull: false },
    type: { type: sequelize_1.DataTypes.ENUM('Contract', 'Passport', 'Medical', 'ID', 'Agreement', 'Other'), defaultValue: 'Other' },
    status: { type: sequelize_1.DataTypes.ENUM('Active', 'Valid', 'Pending', 'Expired'), defaultValue: 'Active' },
    fileUrl: { type: sequelize_1.DataTypes.TEXT, allowNull: false, field: 'file_url' },
    fileSize: { type: sequelize_1.DataTypes.BIGINT, field: 'file_size' },
    mimeType: { type: sequelize_1.DataTypes.STRING(100), field: 'mime_type' },
    issueDate: { type: sequelize_1.DataTypes.DATEONLY, field: 'issue_date' },
    expiryDate: { type: sequelize_1.DataTypes.DATEONLY, field: 'expiry_date' },
    uploadedBy: { type: sequelize_1.DataTypes.UUID, field: 'uploaded_by' },
    tags: { type: sequelize_1.DataTypes.ARRAY(sequelize_1.DataTypes.TEXT), defaultValue: [] },
    notes: { type: sequelize_1.DataTypes.TEXT },
}, { sequelize: database_1.sequelize, tableName: 'documents', underscored: true, timestamps: true });
//# sourceMappingURL=document.model.js.map