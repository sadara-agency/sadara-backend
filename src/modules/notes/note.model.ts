import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../../config/database";

export type NoteOwnerType =
  | "Player"
  | "Contract"
  | "Match"
  | "Injury"
  | "Club"
  | "Offer";

interface NoteAttributes {
  id: string;
  ownerType: NoteOwnerType;
  ownerId: string;
  content: string;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface NoteCreationAttributes extends Optional<
  NoteAttributes,
  "id" | "createdAt" | "updatedAt"
> {}

export class Note
  extends Model<NoteAttributes, NoteCreationAttributes>
  implements NoteAttributes
{
  declare id: string;
  declare ownerType: NoteOwnerType;
  declare ownerId: string;
  declare content: string;
  declare createdBy: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Note.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ownerType: {
      type: DataTypes.ENUM(
        "Player",
        "Contract",
        "Match",
        "Injury",
        "Club",
        "Offer",
      ),
      allowNull: false,
      field: "owner_type",
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "owner_id",
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "created_by",
    },
  },
  {
    sequelize,
    tableName: "notes",
    underscored: true,
    timestamps: true,
  },
);
