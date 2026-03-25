import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

// ── Attribute Interfaces ──

export interface MediaContactAttributes {
  id: string;
  name: string;
  nameAr?: string | null;
  outlet: string;
  outletAr?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  notes?: string | null;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MediaContactCreationAttributes extends Optional<
  MediaContactAttributes,
  "id" | "createdAt" | "updatedAt"
> {}

// ── Model Class ──

export class MediaContact
  extends Model<MediaContactAttributes, MediaContactCreationAttributes>
  implements MediaContactAttributes
{
  declare id: string;
  declare name: string;
  declare nameAr: string | null;
  declare outlet: string;
  declare outletAr: string | null;
  declare email: string | null;
  declare phone: string | null;
  declare role: string | null;
  declare notes: string | null;
  declare createdBy: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

// ── Initialization ──

MediaContact.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    nameAr: {
      type: DataTypes.STRING(255),
      field: "name_ar",
    },
    outlet: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    outletAr: {
      type: DataTypes.STRING(255),
      field: "outlet_ar",
    },
    email: {
      type: DataTypes.STRING(255),
    },
    phone: {
      type: DataTypes.STRING(100),
    },
    role: {
      type: DataTypes.STRING(100),
    },
    notes: {
      type: DataTypes.TEXT,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "created_by",
    },
  },
  {
    sequelize,
    tableName: "media_contacts",
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ["outlet"] }, { fields: ["email"] }],
  },
);
