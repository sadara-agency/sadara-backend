import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";
import { AppError } from "@middleware/errorHandler";
import { encryptFields, decryptFields } from "@shared/utils/encryption";
import {
  TechnicalAttributesJson,
  getPositionGroup,
  createEmptyTechnicalAttributes,
  validateTechnicalAttributes,
} from "@modules/players/utils/attributeConfig";

interface PlayerAttributes {
  id: string;
  firstName: string;
  lastName: string;
  firstNameAr?: string | null;
  lastNameAr?: string | null;
  dateOfBirth: string | null;
  nationality?: string | null;
  secondaryNationality?: string | null;
  playerType: "Pro" | "Youth" | "Amateur";
  playerPackage: string;
  contractType: "Professional" | "Amateur" | "Youth";
  position?: string | null;
  secondaryPosition?: string | null;
  preferredFoot?: "Left" | "Right" | "Both" | null;
  heightCm?: number | null;
  weightKg?: number | null;
  jerseyNumber?: number | null;
  currentClubId?: string | null;
  agentId?: string | null;
  coachId?: string | null;
  analystId?: string | null;
  marketValue?: number | null;
  marketValueCurrency: "SAR" | "USD" | "EUR";
  status: "active" | "injured" | "inactive";
  pace?: number | null;
  stamina?: number | null;
  strength?: number | null;
  agility?: number | null;
  jumping?: number | null;
  technicalAttributes?: TechnicalAttributesJson | null;
  nationalId?: string | null;
  email?: string | null;
  phone?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  guardianRelation?: string | null;
  overallGrade?: string | null;
  mandateStatus?: "Signed" | "In Negotiation" | "Prospect" | null;
  mandateSignedAt?: string | null;
  exclusiveUntil?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
  displayId?: string | null;
  externalIds?: Record<string, string>;
  externalRef?: string | null;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PlayerCreationAttributes extends Optional<
  PlayerAttributes,
  | "id"
  | "dateOfBirth"
  | "playerType"
  | "playerPackage"
  | "contractType"
  | "marketValueCurrency"
  | "status"
  | "displayId"
  | "externalIds"
  | "externalRef"
  | "mandateStatus"
  | "mandateSignedAt"
  | "exclusiveUntil"
  | "createdAt"
  | "updatedAt"
> {}

export class Player
  extends Model<PlayerAttributes, PlayerCreationAttributes>
  implements PlayerAttributes
{
  declare id: string;
  declare firstName: string;
  declare lastName: string;
  declare firstNameAr: string | null;
  declare lastNameAr: string | null;
  declare dateOfBirth: string | null;
  declare nationality: string | null;
  declare secondaryNationality: string | null;
  declare playerType: "Pro" | "Youth" | "Amateur";
  declare playerPackage: string;
  declare contractType: "Professional" | "Amateur" | "Youth";
  declare position: string | null;
  declare secondaryPosition: string | null;
  declare preferredFoot: "Left" | "Right" | "Both" | null;
  declare heightCm: number | null;
  declare weightKg: number | null;
  declare jerseyNumber: number | null;
  declare currentClubId: string | null;
  declare agentId: string | null;
  declare coachId: string | null;
  declare analystId: string | null;
  declare marketValue: number | null;
  declare marketValueCurrency: "SAR" | "USD" | "EUR";
  declare status: "active" | "injured" | "inactive";
  declare pace: number | null;
  declare stamina: number | null;
  declare strength: number | null;
  declare agility: number | null;
  declare jumping: number | null;
  declare technicalAttributes: TechnicalAttributesJson | null;
  declare nationalId: string | null;
  declare email: string | null;
  declare phone: string | null;
  declare guardianName: string | null;
  declare guardianPhone: string | null;
  declare guardianRelation: string | null;
  declare overallGrade: string | null;
  declare mandateStatus: "Signed" | "In Negotiation" | "Prospect" | null;
  declare mandateSignedAt: string | null;
  declare exclusiveUntil: string | null;
  declare notes: string | null;
  declare photoUrl: string | null;
  declare displayId: string | null;
  declare externalIds: Record<string, string>;
  declare externalRef: string | null;
  declare createdBy: string;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get fullNameAr(): string | null {
    if (!this.firstNameAr || !this.lastNameAr) return null;
    return `${this.firstNameAr} ${this.lastNameAr}`;
  }

  get age(): number | null {
    if (!this.dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }
}

Player.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    firstName: { type: DataTypes.STRING, allowNull: false },
    lastName: { type: DataTypes.STRING, allowNull: false },
    firstNameAr: { type: DataTypes.STRING },
    lastNameAr: { type: DataTypes.STRING },
    dateOfBirth: { type: DataTypes.DATEONLY, allowNull: true },
    nationality: { type: DataTypes.STRING },
    secondaryNationality: { type: DataTypes.STRING },
    playerType: {
      type: DataTypes.ENUM("Pro", "Youth", "Amateur"),
      defaultValue: "Pro",
    },
    playerPackage: {
      type: DataTypes.STRING(10),
      defaultValue: "A",
      field: "player_package",
    },
    contractType: {
      type: DataTypes.STRING(20),
      defaultValue: "Professional",
      field: "contract_type",
    },
    position: { type: DataTypes.STRING },
    secondaryPosition: { type: DataTypes.STRING },
    preferredFoot: { type: DataTypes.ENUM("Left", "Right", "Both") },
    heightCm: { type: DataTypes.FLOAT },
    weightKg: { type: DataTypes.FLOAT },
    jerseyNumber: { type: DataTypes.INTEGER },
    currentClubId: { type: DataTypes.UUID },
    agentId: { type: DataTypes.UUID, field: "agent_id" },
    coachId: { type: DataTypes.UUID, field: "coach_id" },
    analystId: { type: DataTypes.UUID, field: "analyst_id" },
    marketValue: {
      type: DataTypes.DECIMAL(15, 2),
      validate: { min: 0, max: 9_999_999_999_999 },
    },
    marketValueCurrency: {
      type: DataTypes.ENUM("SAR", "USD", "EUR"),
      defaultValue: "SAR",
    },
    status: {
      type: DataTypes.ENUM("active", "injured", "inactive"),
      defaultValue: "active",
    },
    pace: { type: DataTypes.INTEGER, defaultValue: 0 },
    stamina: { type: DataTypes.INTEGER, defaultValue: 0 },
    strength: { type: DataTypes.INTEGER, defaultValue: 0 },
    agility: { type: DataTypes.INTEGER, defaultValue: 0 },
    jumping: { type: DataTypes.INTEGER, defaultValue: 0 },
    technicalAttributes: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "technical_attributes",
    },
    nationalId: { type: DataTypes.STRING, field: "national_id" },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { isEmail: true },
      set(val: unknown) {
        // Coerce empty strings to null so isEmail validator is skipped
        const v = typeof val === "string" ? val.trim() : val;
        (this as any).setDataValue("email", v || null);
      },
    },
    phone: { type: DataTypes.STRING },
    guardianName: { type: DataTypes.STRING, field: "guardian_name" },
    guardianPhone: { type: DataTypes.STRING(255), field: "guardian_phone" },
    guardianRelation: {
      type: DataTypes.STRING(100),
      field: "guardian_relation",
    },
    overallGrade: {
      type: DataTypes.STRING(10),
      field: "overall_grade",
    },
    mandateStatus: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: "mandate_status",
    },
    mandateSignedAt: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "mandate_signed_at",
    },
    exclusiveUntil: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "exclusive_until",
    },
    notes: { type: DataTypes.TEXT },
    photoUrl: { type: DataTypes.STRING },
    displayId: { type: DataTypes.STRING(20), unique: true },
    externalIds: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      field: "external_ids",
    },
    createdBy: { type: DataTypes.UUID, allowNull: false },
    externalRef: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "external_ref",
    },
  },
  {
    sequelize,
    tableName: "players",
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ["current_club_id"] },
      { fields: ["agent_id"] },
      { fields: ["status"] },
    ],
  },
);

// ── Encryption at rest for PII fields ──
const ENCRYPTED_PLAYER_FIELDS = ["phone", "email", "guardianPhone"];
Player.addHook("beforeSave", encryptFields(ENCRYPTED_PLAYER_FIELDS));
Player.addHook("afterFind", decryptFields(ENCRYPTED_PLAYER_FIELDS));

// ── Auto-initialize / validate technical attributes ──
Player.addHook("beforeValidate", (instance: Player) => {
  const ta = instance.technicalAttributes;
  if (ta && !validateTechnicalAttributes(ta)) {
    throw new AppError(
      `Invalid technical_attributes shape for group "${(ta as any)?.group}"`,
      400,
    );
  }
  // Auto-init when position is set but technical_attributes is missing
  if (instance.position && !ta) {
    const group = getPositionGroup(instance.position);
    if (group) {
      instance.technicalAttributes = createEmptyTechnicalAttributes(group);
    }
  }
});
