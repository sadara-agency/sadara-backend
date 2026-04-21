import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export type DealPreference = "Transfer" | "Loan" | "Either";
export type NeedPriority = "High" | "Medium" | "Low";

interface ClubNeedAttributes {
  id: string;
  clubId: string;
  windowId: string;
  position: string;
  positionalGapNotes: string | null;
  dealPreference: DealPreference;
  priority: NeedPriority;
  sadaraOpportunity: string | null;
  matchScore: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ClubNeedCreationAttributes extends Optional<
  ClubNeedAttributes,
  | "id"
  | "positionalGapNotes"
  | "dealPreference"
  | "priority"
  | "sadaraOpportunity"
  | "matchScore"
  | "createdAt"
  | "updatedAt"
> {}

export class ClubNeed
  extends Model<ClubNeedAttributes, ClubNeedCreationAttributes>
  implements ClubNeedAttributes
{
  declare id: string;
  declare clubId: string;
  declare windowId: string;
  declare position: string;
  declare positionalGapNotes: string | null;
  declare dealPreference: DealPreference;
  declare priority: NeedPriority;
  declare sadaraOpportunity: string | null;
  declare matchScore: number | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ClubNeed.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    clubId: { type: DataTypes.UUID, allowNull: false, field: "club_id" },
    windowId: { type: DataTypes.UUID, allowNull: false, field: "window_id" },
    position: { type: DataTypes.STRING(30), allowNull: false },
    positionalGapNotes: { type: DataTypes.TEXT, field: "positional_gap_notes" },
    dealPreference: {
      type: DataTypes.STRING(20),
      field: "deal_preference",
      defaultValue: "Either",
    },
    priority: {
      type: DataTypes.STRING(10),
      defaultValue: "Medium",
    },
    sadaraOpportunity: { type: DataTypes.TEXT, field: "sadara_opportunity" },
    matchScore: { type: DataTypes.INTEGER, field: "match_score" },
  },
  {
    sequelize,
    tableName: "club_needs",
    underscored: true,
    timestamps: true,
  },
);

export default ClubNeed;
