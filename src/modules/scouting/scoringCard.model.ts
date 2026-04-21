import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export interface ScoringCardAttributes {
  id: string;
  watchlistId: string;
  windowId: string;
  performanceScore: number | null;
  contractFitScore: number | null;
  commercialScore: number | null;
  culturalFitScore: number | null;
  criteriaScores: Record<string, number> | null;
  notes: string | null;
  weightedTotal: number | null;
  isShortlisted: boolean;
  scoredBy: string | null;
  scoredAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ScoringCardCreationAttributes extends Optional<
  ScoringCardAttributes,
  | "id"
  | "performanceScore"
  | "contractFitScore"
  | "commercialScore"
  | "culturalFitScore"
  | "criteriaScores"
  | "notes"
  | "weightedTotal"
  | "isShortlisted"
  | "scoredBy"
  | "scoredAt"
  | "createdAt"
  | "updatedAt"
> {}

export class ScoringCard
  extends Model<ScoringCardAttributes, ScoringCardCreationAttributes>
  implements ScoringCardAttributes
{
  declare id: string;
  declare watchlistId: string;
  declare windowId: string;
  declare performanceScore: number | null;
  declare contractFitScore: number | null;
  declare commercialScore: number | null;
  declare culturalFitScore: number | null;
  declare criteriaScores: Record<string, number> | null;
  declare notes: string | null;
  declare weightedTotal: number | null;
  declare isShortlisted: boolean;
  declare scoredBy: string | null;
  declare scoredAt: Date | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

ScoringCard.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    watchlistId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "watchlist_id",
    },
    windowId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "window_id",
    },
    performanceScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "performance_score",
    },
    contractFitScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "contract_fit_score",
    },
    commercialScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "commercial_score",
    },
    culturalFitScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "cultural_fit_score",
    },
    criteriaScores: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "criteria_scores",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    weightedTotal: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: "weighted_total",
    },
    isShortlisted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_shortlisted",
    },
    scoredBy: { type: DataTypes.UUID, allowNull: true, field: "scored_by" },
    scoredAt: { type: DataTypes.DATE, allowNull: true, field: "scored_at" },
  },
  {
    sequelize,
    tableName: "scoring_cards",
    underscored: true,
    timestamps: true,
  },
);
