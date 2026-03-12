import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export interface MatchAnalysisAttributes {
  id: string;
  matchId: string;
  analystId: string;
  type: "pre-match" | "post-match" | "tactical";
  title: string;
  content: string;
  keyFindings?: Record<string, any>[] | null;
  recommendedActions?: string[] | null;
  rating?: number | null;
  status: "draft" | "published";
  createdAt?: Date;
  updatedAt?: Date;
}

interface MatchAnalysisCreationAttributes extends Optional<
  MatchAnalysisAttributes,
  "id" | "status" | "createdAt" | "updatedAt"
> {}

export class MatchAnalysis
  extends Model<MatchAnalysisAttributes, MatchAnalysisCreationAttributes>
  implements MatchAnalysisAttributes
{
  declare id: string;
  declare matchId: string;
  declare analystId: string;
  declare type: "pre-match" | "post-match" | "tactical";
  declare title: string;
  declare content: string;
  declare keyFindings: Record<string, any>[] | null;
  declare recommendedActions: string[] | null;
  declare rating: number | null;
  declare status: "draft" | "published";
  declare createdAt: Date;
  declare updatedAt: Date;

  // Associations
  declare analyst?: any;
  declare match?: any;
}

MatchAnalysis.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    matchId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "match_id",
    },
    analystId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "analyst_id",
    },
    type: {
      type: DataTypes.ENUM("pre-match", "post-match", "tactical"),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    keyFindings: {
      type: DataTypes.JSONB,
      field: "key_findings",
    },
    recommendedActions: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      field: "recommended_actions",
    },
    rating: {
      type: DataTypes.DECIMAL(3, 1),
    },
    status: {
      type: DataTypes.ENUM("draft", "published"),
      defaultValue: "draft",
    },
  },
  {
    sequelize,
    tableName: "match_analyses",
    underscored: true,
    timestamps: true,
  },
);
