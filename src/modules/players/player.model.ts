import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

interface PlayerAttributes {
  id: string;
  firstName: string;
  lastName: string;
  firstNameAr?: string | null;
  lastNameAr?: string | null;
  dateOfBirth: string;
  nationality?: string | null;
  secondaryNationality?: string | null;
  playerType: 'Pro' | 'Youth' | 'Amateur';
  contractType: 'Professional' | 'Amateur' | 'Youth';
  position?: string | null;
  secondaryPosition?: string | null;
  preferredFoot?: 'Left' | 'Right' | 'Both' | null;
  heightCm?: number | null;
  weightKg?: number | null;
  jerseyNumber?: number | null;
  currentClubId?: string | null;
  agentId?: string | null;
  coachId?: string | null;
  analystId?: string | null;
  marketValue?: number | null;
  marketValueCurrency: 'SAR' | 'USD' | 'EUR';
  status: 'active' | 'injured' | 'inactive';
  speed?: number | null;
  passing?: number | null;
  shooting?: number | null;
  defense?: number | null;
  fitness?: number | null;
  tactical?: number | null;
  email?: string | null;
  phone?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  guardianRelation?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PlayerCreationAttributes extends Optional<
  PlayerAttributes,
  'id' | 'playerType' | 'contractType' | 'marketValueCurrency' | 'status' | 'createdAt' | 'updatedAt'
> {}

export class Player extends Model<PlayerAttributes, PlayerCreationAttributes> implements PlayerAttributes {
  public id!: string;
  public firstName!: string;
  public lastName!: string;
  public firstNameAr!: string | null;
  public lastNameAr!: string | null;
  public dateOfBirth!: string;
  public nationality!: string | null;
  public secondaryNationality!: string | null;
  public playerType!: 'Pro' | 'Youth' | 'Amateur';
  public contractType!: 'Professional' | 'Amateur' | 'Youth';
  public position!: string | null;
  public secondaryPosition!: string | null;
  public preferredFoot!: 'Left' | 'Right' | 'Both' | null;
  public heightCm!: number | null;
  public weightKg!: number | null;
  public jerseyNumber!: number | null;
  public currentClubId!: string | null;
  public agentId!: string | null;
  public coachId!: string | null;
  public analystId!: string | null;
  public marketValue!: number | null;
  public marketValueCurrency!: 'SAR' | 'USD' | 'EUR';
  public status!: 'active' | 'injured' | 'inactive';
  public speed!: number | null;
  public passing!: number | null;
  public shooting!: number | null;
  public defense!: number | null;
  public fitness!: number | null;
  public tactical!: number | null;
  public email!: string | null;
  public phone!: string | null;
  public guardianName!: string | null;
  public guardianPhone!: string | null;
  public guardianRelation!: string | null;
  public notes!: string | null;
  public photoUrl!: string | null;
  public createdBy!: string;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get fullNameAr(): string | null {
    if (!this.firstNameAr || !this.lastNameAr) return null;
    return `${this.firstNameAr} ${this.lastNameAr}`;
  }

  get age(): number {
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }
}

Player.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  firstName: { type: DataTypes.STRING, allowNull: false },
  lastName: { type: DataTypes.STRING, allowNull: false },
  firstNameAr: { type: DataTypes.STRING },
  lastNameAr: { type: DataTypes.STRING },
  dateOfBirth: { type: DataTypes.DATEONLY, allowNull: false },
  nationality: { type: DataTypes.STRING },
  secondaryNationality: { type: DataTypes.STRING },
  playerType: { type: DataTypes.ENUM('Pro', 'Youth', 'Amateur'), defaultValue: 'Pro' },
  contractType: { type: DataTypes.STRING(20), defaultValue: 'Professional', field: 'contract_type' },
  position: { type: DataTypes.STRING },
  secondaryPosition: { type: DataTypes.STRING },
  preferredFoot: { type: DataTypes.ENUM('Left', 'Right', 'Both') },
  heightCm: { type: DataTypes.FLOAT },
  weightKg: { type: DataTypes.FLOAT },
  jerseyNumber: { type: DataTypes.INTEGER },
  currentClubId: { type: DataTypes.UUID },
  agentId: { type: DataTypes.UUID, field: 'agent_id' },
  coachId: { type: DataTypes.UUID, field: 'coach_id' },
  analystId: { type: DataTypes.UUID, field: 'analyst_id' },
  marketValue: { type: DataTypes.DECIMAL(15, 2) },
  marketValueCurrency: { type: DataTypes.ENUM('SAR', 'USD', 'EUR'), defaultValue: 'SAR' },
  status: { type: DataTypes.ENUM('active', 'injured', 'inactive'), defaultValue: 'active' },
  speed: { type: DataTypes.INTEGER, defaultValue: 0 },
  passing: { type: DataTypes.INTEGER, defaultValue: 0 },
  shooting: { type: DataTypes.INTEGER, defaultValue: 0 },
  defense: { type: DataTypes.INTEGER, defaultValue: 0 },
  fitness: { type: DataTypes.INTEGER, defaultValue: 0 },
  tactical: { type: DataTypes.INTEGER, defaultValue: 0 },
  email: { type: DataTypes.STRING, validate: { isEmail: true } },
  phone: { type: DataTypes.STRING },
  guardianName: { type: DataTypes.STRING, field: 'guardian_name' },
  guardianPhone: { type: DataTypes.STRING(50), field: 'guardian_phone' },
  guardianRelation: { type: DataTypes.STRING(50), field: 'guardian_relation' },
  notes: { type: DataTypes.TEXT },
  photoUrl: { type: DataTypes.STRING },
  createdBy: { type: DataTypes.UUID, allowNull: false },
}, {
  sequelize,
  tableName: 'players',
  underscored: true,
  timestamps: true,
});