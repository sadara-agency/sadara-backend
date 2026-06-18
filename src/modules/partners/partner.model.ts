import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export type PartnerCapacity = "Introducer" | "FIFA Agent";
export type PartnerStatus = "Active" | "Suspended" | "Withdrawn";

interface PartnerAttributes {
  id: string;
  referenceNo: string;
  nameEn: string;
  nameAr?: string | null;
  capacity: PartnerCapacity;
  corridor?: string | null;
  fifaAgentId?: string | null;
  contactEmail: string;
  validFrom?: string | null;
  validThrough?: string | null;
  status: PartnerStatus;
  notes?: string | null;
  userId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PartnerCreationAttributes extends Optional<
  PartnerAttributes,
  | "id"
  | "referenceNo"
  | "nameAr"
  | "corridor"
  | "fifaAgentId"
  | "validFrom"
  | "validThrough"
  | "notes"
  | "userId"
  | "createdAt"
  | "updatedAt"
> {}

class Partner
  extends Model<PartnerAttributes, PartnerCreationAttributes>
  implements PartnerAttributes
{
  public id!: string;
  public referenceNo!: string;
  public nameEn!: string;
  public nameAr!: string | null;
  public capacity!: PartnerCapacity;
  public corridor!: string | null;
  public fifaAgentId!: string | null;
  public contactEmail!: string;
  public validFrom!: string | null;
  public validThrough!: string | null;
  public status!: PartnerStatus;
  public notes!: string | null;
  public userId!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Partner.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    referenceNo: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    nameEn: { type: DataTypes.STRING(200), allowNull: false },
    nameAr: { type: DataTypes.STRING(200), allowNull: true },
    capacity: { type: DataTypes.STRING(50), allowNull: false },
    corridor: { type: DataTypes.STRING(100), allowNull: true },
    fifaAgentId: { type: DataTypes.STRING(100), allowNull: true },
    contactEmail: { type: DataTypes.STRING(255), allowNull: false },
    validFrom: { type: DataTypes.DATEONLY, allowNull: true },
    validThrough: { type: DataTypes.DATEONLY, allowNull: true },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "Active",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    userId: { type: DataTypes.UUID, allowNull: true },
  },
  {
    sequelize,
    tableName: "network_partners",
    underscored: true,
    timestamps: true,
  },
);

export default Partner;
