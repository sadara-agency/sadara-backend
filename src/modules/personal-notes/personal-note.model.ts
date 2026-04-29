import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

interface PersonalNoteAttributes {
  id: string;
  userId: string;
  title: string;
  body: string | null;
  bodyHtml: string | null;
  tags: string[] | null;
  isPinned: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PersonalNoteCreationAttributes extends Optional<
  PersonalNoteAttributes,
  "id" | "body" | "bodyHtml" | "tags" | "isPinned" | "createdAt" | "updatedAt"
> {}

export class PersonalNote
  extends Model<PersonalNoteAttributes, PersonalNoteCreationAttributes>
  implements PersonalNoteAttributes
{
  declare id: string;
  declare userId: string;
  declare title: string;
  declare body: string | null;
  declare bodyHtml: string | null;
  declare tags: string[] | null;
  declare isPinned: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

PersonalNote.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "user_id",
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
      defaultValue: "",
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    bodyHtml: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "body_html",
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: [],
    },
    isPinned: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_pinned",
    },
  },
  {
    sequelize,
    tableName: "personal_notes",
    underscored: true,
    timestamps: true,
  },
);

export default PersonalNote;
