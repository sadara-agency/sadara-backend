import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

// 1. Define all possible attributes in the Club model
interface ClubAttributes {
  id: string;
  name: string;
  nameAr?: string | null;
  type: 'Club' | 'Sponsor';
  country?: string | null;
  city?: string | null;
  league?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  foundedYear?: number | null;
  stadium?: string | null;
  stadiumCapacity?: number | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// 2. Define which attributes are optional during Club.create()
interface ClubCreationAttributes extends Optional<
  ClubAttributes, 
  'id' | 'type' | 'createdAt' | 'updatedAt'
> {}

// 3. The Model Class
export class Club extends Model<ClubAttributes, ClubCreationAttributes> implements ClubAttributes {
  public id!: string;
  public name!: string;
  public nameAr!: string | null;
  public type!: 'Club' | 'Sponsor';
  public country!: string | null;
  public city!: string | null;
  public league!: string | null;
  public logoUrl!: string | null;
  public website!: string | null;
  public foundedYear!: number | null;
  public stadium!: string | null;
  public stadiumCapacity!: number | null;
  public primaryColor!: string | null;
  public secondaryColor!: string | null;
  public notes!: string | null;
}

// 4. Initialization
Club.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  nameAr: {
    type: DataTypes.STRING,
    field: 'name_ar',
  },
  type: {
    type: DataTypes.ENUM('Club', 'Sponsor'),
    defaultValue: 'Club',
    allowNull: false,
  },
  country: {
    type: DataTypes.STRING,
  },
  city: {
    type: DataTypes.STRING,
  },
  league: {
    type: DataTypes.STRING,
  },
  logoUrl: {
    type: DataTypes.STRING,
    field: 'logo_url',
    validate: {
      isUrl: true,
    },
  },
  website: {
    type: DataTypes.STRING,
  },
  foundedYear: {
    type: DataTypes.INTEGER,
    field: 'founded_year',
  },
  stadium: {
    type: DataTypes.STRING,
  },
  stadiumCapacity: {
    type: DataTypes.INTEGER,
    field: 'stadium_capacity',
  },
  primaryColor: {
    type: DataTypes.STRING,
    field: 'primary_color',
  },
  secondaryColor: {
    type: DataTypes.STRING,
    field: 'secondary_color',
  },
  notes: {
    type: DataTypes.TEXT,
  },
}, {
  sequelize,
  tableName: 'clubs',
  underscored: true,
  timestamps: true,
});