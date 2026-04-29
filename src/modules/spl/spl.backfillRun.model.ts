// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.backfillRun.model.ts
//
// Tracks long-running historical backfills so a crash/restart can
// skip already-completed seasons. Created in migration 186.
// ─────────────────────────────────────────────────────────────

import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export type BackfillRunStatus = "pending" | "running" | "completed" | "failed";

export interface SplBackfillRunAttributes {
  id: string;
  seasonId: number;
  scope: Record<string, unknown>;
  status: BackfillRunStatus;
  startedAt: Date;
  finishedAt: Date | null;
  summary: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SplBackfillRunCreation extends Optional<
  SplBackfillRunAttributes,
  "id" | "finishedAt" | "createdAt" | "updatedAt"
> {}

export class SplBackfillRun
  extends Model<SplBackfillRunAttributes, SplBackfillRunCreation>
  implements SplBackfillRunAttributes
{
  declare id: string;
  declare seasonId: number;
  declare scope: Record<string, unknown>;
  declare status: BackfillRunStatus;
  declare startedAt: Date;
  declare finishedAt: Date | null;
  declare summary: Record<string, unknown>;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

SplBackfillRun.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    seasonId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "season_id",
    },
    scope: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending",
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "started_at",
    },
    finishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "finished_at",
    },
    summary: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    sequelize,
    tableName: "spl_backfill_runs",
    underscored: true,
    timestamps: true,
  },
);

export default SplBackfillRun;
