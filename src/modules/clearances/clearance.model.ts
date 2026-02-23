import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

interface ClearanceAttributes {
    id: string;
    contractId: string;
    playerId: string;
    clearanceNumber: string | null;
    reason: string;
    terminationDate: string;
    outstandingAmount: number;
    outstandingCurrency: string;
    outstandingDetails: string | null;
    hasOutstanding: boolean;
    noClaimsDeclaration: boolean;
    declarationText: string | null;
    status: 'Processing' | 'Completed';
    signedDocumentUrl: string | null;
    signedAt: Date | null;
    signingMethod: 'digital' | 'upload' | null;
    notes: string | null;
    createdBy: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ClearanceCreationAttributes extends Optional<
    ClearanceAttributes,
    'id' | 'clearanceNumber' | 'outstandingAmount' | 'outstandingCurrency' |
    'outstandingDetails' | 'hasOutstanding' | 'noClaimsDeclaration' | 'declarationText' |
    'status' | 'signedDocumentUrl' | 'signedAt' | 'signingMethod' | 'notes' |
    'createdBy' | 'createdAt' | 'updatedAt'
> { }

export class Clearance extends Model<ClearanceAttributes, ClearanceCreationAttributes>
    implements ClearanceAttributes {
    declare id: string;
    declare contractId: string;
    declare playerId: string;
    declare clearanceNumber: string | null;
    declare reason: string;
    declare terminationDate: string;
    declare outstandingAmount: number;
    declare outstandingCurrency: string;
    declare outstandingDetails: string | null;
    declare hasOutstanding: boolean;
    declare noClaimsDeclaration: boolean;
    declare declarationText: string | null;
    declare status: 'Processing' | 'Completed';
    declare signedDocumentUrl: string | null;
    declare signedAt: Date | null;
    declare signingMethod: 'digital' | 'upload' | null;
    declare notes: string | null;
    declare createdBy: string | null;
}

Clearance.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    contractId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'contract_id',
    },
    playerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'player_id',
    },
    clearanceNumber: {
        type: DataTypes.STRING(50),
        unique: true,
        field: 'clearance_number',
    },
    reason: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    terminationDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'termination_date',
    },
    outstandingAmount: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
        field: 'outstanding_amount',
    },
    outstandingCurrency: {
        type: DataTypes.STRING(3),
        defaultValue: 'SAR',
        field: 'outstanding_currency',
    },
    outstandingDetails: {
        type: DataTypes.TEXT,
        field: 'outstanding_details',
    },
    hasOutstanding: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'has_outstanding',
    },
    noClaimsDeclaration: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'no_claims_declaration',
    },
    declarationText: {
        type: DataTypes.TEXT,
        field: 'declaration_text',
    },
    status: {
        type: DataTypes.ENUM('Processing', 'Completed'),
        defaultValue: 'Processing',
    },
    signedDocumentUrl: {
        type: DataTypes.TEXT,
        field: 'signed_document_url',
    },
    signedAt: {
        type: DataTypes.DATE,
        field: 'signed_at',
    },
    signingMethod: {
        type: DataTypes.STRING(20),
        field: 'signing_method',
    },
    notes: {
        type: DataTypes.TEXT,
    },
    createdBy: {
        type: DataTypes.UUID,
        field: 'created_by',
    },
}, {
    sequelize,
    tableName: 'clearances',
    underscored: true,
    timestamps: true,
});