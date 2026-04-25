// ─────────────────────────────────────────────────────────────
// src/modules/saffplus/playerReview.model.ts
//
// Triage queue for unmatched roster entries from the SAFF+ squad
// scraper. Implements the "match-only, no auto-create" rule: when
// the matcher can't confidently link a scraped player to an existing
// Sadara player (similarity < 0.85), the candidate lands here with
// the top-N suggestions for a human to resolve.
// ─────────────────────────────────────────────────────────────
import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export const PLAYER_REVIEW_STATUSES = [
  "pending",
  "linked",
  "rejected",
  "duplicate",
] as const;

export type PlayerReviewStatus = (typeof PLAYER_REVIEW_STATUSES)[number];

export interface PlayerReviewSuggestion {
  playerId: string;
  score: number;
  reason: string; // 'fuzzy_name' | 'dob+name' | 'jersey+club' etc.
}

export interface PlayerMatchReviewAttributes {
  id: string;
  scrapedNameAr: string | null;
  scrapedNameEn: string | null;
  scrapedDob: string | null;
  scrapedNationality: string | null;
  scrapedJerseyNumber: number | null;
  scrapedPosition: string | null;
  squadId: string | null;
  season: string;
  suggestedPlayerIds: PlayerReviewSuggestion[];
  status: PlayerReviewStatus;
  linkedPlayerId: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  externalPlayerId: string | null;
  providerSource: string;
  rawPayload: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PlayerMatchReviewCreationAttributes extends Optional<
  PlayerMatchReviewAttributes,
  | "id"
  | "scrapedNameAr"
  | "scrapedNameEn"
  | "scrapedDob"
  | "scrapedNationality"
  | "scrapedJerseyNumber"
  | "scrapedPosition"
  | "squadId"
  | "suggestedPlayerIds"
  | "status"
  | "linkedPlayerId"
  | "reviewedBy"
  | "reviewedAt"
  | "externalPlayerId"
  | "providerSource"
  | "rawPayload"
  | "createdAt"
  | "updatedAt"
> {}

export class PlayerMatchReview
  extends Model<
    PlayerMatchReviewAttributes,
    PlayerMatchReviewCreationAttributes
  >
  implements PlayerMatchReviewAttributes
{
  declare id: string;
  declare scrapedNameAr: string | null;
  declare scrapedNameEn: string | null;
  declare scrapedDob: string | null;
  declare scrapedNationality: string | null;
  declare scrapedJerseyNumber: number | null;
  declare scrapedPosition: string | null;
  declare squadId: string | null;
  declare season: string;
  declare suggestedPlayerIds: PlayerReviewSuggestion[];
  declare status: PlayerReviewStatus;
  declare linkedPlayerId: string | null;
  declare reviewedBy: string | null;
  declare reviewedAt: Date | null;
  declare externalPlayerId: string | null;
  declare providerSource: string;
  declare rawPayload: Record<string, unknown> | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

PlayerMatchReview.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    scrapedNameAr: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: "scraped_name_ar",
    },
    scrapedNameEn: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: "scraped_name_en",
    },
    scrapedDob: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "scraped_dob",
    },
    scrapedNationality: {
      type: DataTypes.STRING(80),
      allowNull: true,
      field: "scraped_nationality",
    },
    scrapedJerseyNumber: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      field: "scraped_jersey_number",
    },
    scrapedPosition: {
      type: DataTypes.STRING(40),
      allowNull: true,
      field: "scraped_position",
    },
    squadId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "squad_id",
      references: { model: "squads", key: "id" },
      onDelete: "CASCADE",
    },
    season: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    suggestedPlayerIds: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: "suggested_player_ids",
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending",
    },
    linkedPlayerId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "linked_player_id",
      references: { model: "players", key: "id" },
      onDelete: "SET NULL",
    },
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "reviewed_by",
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "reviewed_at",
    },
    externalPlayerId: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: "external_player_id",
    },
    providerSource: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "saffplus",
      field: "provider_source",
    },
    rawPayload: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "raw_payload",
    },
  },
  {
    sequelize,
    tableName: "player_match_review",
    underscored: true,
    timestamps: true,
  },
);

export default PlayerMatchReview;
