import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

// 1. Define all possible attributes in the Player model
interface PlayerAttributes {
  id: string;
  firstName: string;
  lastName: string;
  firstNameAr?: string | null;
  lastNameAr?: string | null;
  dateOfBirth: string;
  nationality?: string | null;
  secondaryNationality?: string | null;
  playerType: 'Pro' | 'Youth';
  position?: string | null;
  secondaryPosition?: string | null;
  preferredFoot?: 'Left' | 'Right' | 'Both' | null;
  heightCm?: number | null;
  weightKg?: number | null;
  jerseyNumber?: number | null;
  currentClubId?: string | null;
  agentId?: string | null; // From your previous logic (u.full_name AS agent_name)
  marketValue?: number | null;
  marketValueCurrency: 'SAR' | 'USD' | 'EUR';
  status: 'active' | 'injured' | 'inactive';
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// 2. Define which attributes are optional during Player.create()
interface PlayerCreationAttributes extends Optional<
  PlayerAttributes, 
  'id' | 'playerType' | 'marketValueCurrency' | 'status' | 'createdAt' | 'updatedAt'
> {}

// 3. The Model Class
export class Player extends Model<PlayerAttributes, PlayerCreationAttributes> implements PlayerAttributes {
  public id!: string;
  public firstName!: string;
  public lastName!: string;
  public firstNameAr!: string | null;
  public lastNameAr!: string | null;
  public dateOfBirth!: string;
  public nationality!: string | null;
  public secondaryNationality!: string | null;
  public playerType!: 'Pro' | 'Youth';
  public position!: string | null;
  public secondaryPosition!: string | null;
  public preferredFoot!: 'Left' | 'Right' | 'Both' | null;
  public heightCm!: number | null;
  public weightKg!: number | null;
  public jerseyNumber!: number | null;
  public currentClubId!: string | null;
  public agentId!: string | null;
  public marketValue!: number | null;
  public marketValueCurrency!: 'SAR' | 'USD' | 'EUR';
  public status!: 'active' | 'injured' | 'inactive';
  public email!: string | null;
  public phone!: string | null;
  public notes!: string | null;
  public photoUrl!: string | null;
  public createdBy!: string;

  // Virtual Getter: Full Name (English)
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  // Virtual Getter: Full Name (Arabic)
  get fullNameAr(): string | null {
    if (!this.firstNameAr || !this.lastNameAr) return null;
    return `${this.firstNameAr} ${this.lastNameAr}`;
  }

  // Virtual Getter: Age Calculation
  get age(): number {
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

// 4. Initialization
Player.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  firstName: { type: DataTypes.STRING, allowNull: false },
  lastName: { type: DataTypes.STRING, allowNull: false },
  firstNameAr: { type: DataTypes.STRING },
  lastNameAr: { type: DataTypes.STRING },
  dateOfBirth: { type: DataTypes.DATEONLY, allowNull: false },
  nationality: { type: DataTypes.STRING },
  secondaryNationality: { type: DataTypes.STRING },
  playerType: { type: DataTypes.ENUM('Pro', 'Youth'), defaultValue: 'Pro' },
  position: { type: DataTypes.STRING },
  secondaryPosition: { type: DataTypes.STRING },
  preferredFoot: { type: DataTypes.ENUM('Left', 'Right', 'Both') },
  heightCm: { type: DataTypes.FLOAT },
  weightKg: { type: DataTypes.FLOAT },
  jerseyNumber: { type: DataTypes.INTEGER },
  currentClubId: { type: DataTypes.UUID },
  agentId: { type: DataTypes.UUID, field: 'agent_id' },
  marketValue: { type: DataTypes.DECIMAL(15, 2) },
  marketValueCurrency: { type: DataTypes.ENUM('SAR', 'USD', 'EUR'), defaultValue: 'SAR' },
  status: { type: DataTypes.ENUM('active', 'injured', 'inactive'), defaultValue: 'active' },
  email: { type: DataTypes.STRING, validate: { isEmail: true } },
  phone: { type: DataTypes.STRING },
  notes: { type: DataTypes.TEXT },
  photoUrl: { type: DataTypes.STRING },
  createdBy: { type: DataTypes.UUID, allowNull: false },
}, {
  sequelize,
  tableName: 'players',
  underscored: true,
  timestamps: true,
});