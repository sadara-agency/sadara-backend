import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export type DocumentType =
  | "Contract"
  | "Passport"
  | "Medical"
  | "ID"
  | "Agreement"
  | "Other";
export type DocumentStatus = "Active" | "Valid" | "Pending" | "Expired";
export type DocumentEntityType =
  | "Player"
  | "Contract"
  | "Match"
  | "Injury"
  | "Club"
  | "Offer";

export interface DocumentAttributes {
  id: string;
  entityType?: DocumentEntityType | null;
  entityId?: string | null;
  entityLabel?: string | null;
  name: string;
  type: DocumentType;
  status: DocumentStatus;
  fileUrl: string;
  fileSize?: number | null;
  mimeType?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  uploadedBy?: string | null;
  tags?: string[] | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DocumentCreation extends Optional<
  DocumentAttributes,
  "id" | "status" | "createdAt" | "updatedAt"
> {}

export class Document
  extends Model<DocumentAttributes, DocumentCreation>
  implements DocumentAttributes
{
  declare id: string;
  declare entityType: DocumentEntityType | null;
  declare entityId: string | null;
  declare entityLabel: string | null;
  declare name: string;
  declare type: DocumentType;
  declare status: DocumentStatus;
  declare fileUrl: string;
  declare fileSize: number | null;
  declare mimeType: string | null;
  declare issueDate: string | null;
  declare expiryDate: string | null;
  declare uploadedBy: string | null;
  declare tags: string[] | null;
  declare notes: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Document.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    entityType: {
      type: DataTypes.STRING(50),
      field: "entity_type",
    },
    entityId: { type: DataTypes.UUID, field: "entity_id" },
    entityLabel: { type: DataTypes.STRING(500), field: "entity_label" },
    name: { type: DataTypes.STRING(500), allowNull: false },
    type: {
      type: DataTypes.STRING(50),
      defaultValue: "Other",
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: "Active",
    },
    fileUrl: { type: DataTypes.TEXT, allowNull: false, field: "file_url" },
    fileSize: { type: DataTypes.BIGINT, field: "file_size" },
    mimeType: { type: DataTypes.STRING(100), field: "mime_type" },
    issueDate: { type: DataTypes.DATEONLY, field: "issue_date" },
    expiryDate: { type: DataTypes.DATEONLY, field: "expiry_date" },
    uploadedBy: { type: DataTypes.UUID, field: "uploaded_by" },
    tags: { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
    notes: { type: DataTypes.TEXT },
  },
  { sequelize, tableName: "documents", underscored: true, timestamps: true },
);
