import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

export type DocumentType = 'Contract' | 'Passport' | 'Medical' | 'ID' | 'Agreement' | 'Other';
export type DocumentStatus = 'Active' | 'Valid' | 'Pending' | 'Expired';

export interface DocumentAttributes {
    id: string; playerId?: string | null; contractId?: string | null;
    name: string; type: DocumentType; status: DocumentStatus;
    fileUrl: string; fileSize?: number | null; mimeType?: string | null;
    issueDate?: string | null; expiryDate?: string | null;
    uploadedBy?: string | null; tags?: string[] | null; notes?: string | null;
    createdAt?: Date; updatedAt?: Date;
}

interface DocumentCreation extends Optional<DocumentAttributes, 'id' | 'status' | 'createdAt' | 'updatedAt'> { }

export class Document extends Model<DocumentAttributes, DocumentCreation> implements DocumentAttributes {
    declare id: string; declare playerId: string | null; declare contractId: string | null;
    declare name: string; declare type: DocumentType; declare status: DocumentStatus;
    declare fileUrl: string; declare fileSize: number | null; declare mimeType: string | null;
    declare issueDate: string | null; declare expiryDate: string | null;
    declare uploadedBy: string | null; declare tags: string[] | null; declare notes: string | null;
    declare createdAt: Date; declare updatedAt: Date;
}

Document.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    playerId: { type: DataTypes.UUID, field: 'player_id' },
    contractId: { type: DataTypes.UUID, field: 'contract_id' },
    name: { type: DataTypes.STRING(500), allowNull: false },
    type: { type: DataTypes.ENUM('Contract', 'Passport', 'Medical', 'ID', 'Agreement', 'Other'), defaultValue: 'Other' },
    status: { type: DataTypes.ENUM('Active', 'Valid', 'Pending', 'Expired'), defaultValue: 'Active' },
    fileUrl: { type: DataTypes.TEXT, allowNull: false, field: 'file_url' },
    fileSize: { type: DataTypes.BIGINT, field: 'file_size' },
    mimeType: { type: DataTypes.STRING(100), field: 'mime_type' },
    issueDate: { type: DataTypes.DATEONLY, field: 'issue_date' },
    expiryDate: { type: DataTypes.DATEONLY, field: 'expiry_date' },
    uploadedBy: { type: DataTypes.UUID, field: 'uploaded_by' },
    tags: { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
    notes: { type: DataTypes.TEXT },
}, { sequelize, tableName: 'documents', underscored: true, timestamps: true });