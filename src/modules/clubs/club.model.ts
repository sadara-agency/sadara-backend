// ─────────────────────────────────────────────────────────────
// src/modules/clubs/club.model.ts
// Sequelize model for the clubs table.
//
// FIXED: Changed `public` to `declare` on all properties
// to avoid shadowing Sequelize ORM getters. This is the same
// fix applied to Player and other models.
// ─────────────────────────────────────────────────────────────
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

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
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ClubCreationAttributes extends Optional<
  ClubAttributes,
  'id' | 'type' | 'createdAt' | 'updatedAt'
> {}

export class Club extends Model<ClubAttributes, ClubCreationAttributes> implements ClubAttributes {
  declare id: string;
  declare name: string;
  declare nameAr: string | null;
  declare type: 'Club' | 'Sponsor';
  declare country: string | null;
  declare city: string | null;
  declare league: string | null;
  declare logoUrl: string | null;
  declare website: string | null;
  declare foundedYear: number | null;
  declare stadium: string | null;
  declare stadiumCapacity: number | null;
  declare primaryColor: string | null;
  declare secondaryColor: string | null;
  declare notes: string | null;
  declare isActive: boolean;
}

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
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
}, {
  sequelize,
  tableName: 'clubs',
  underscored: true,
  timestamps: true,
});