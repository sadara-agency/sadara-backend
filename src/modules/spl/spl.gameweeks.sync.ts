// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.gameweeks.sync.ts
//
// Syncs Pulselive gameweek metadata into spl_gameweeks table.
// One row per gameweek per season — upserted on (season_id, gameweek_number).
// ─────────────────────────────────────────────────────────────

import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";
import { logger } from "@config/logger";
import { fetchGameweeks } from "@modules/spl/spl.pulselive";
import { DEFAULT_SEASON_ID } from "@modules/spl/spl.pulselive";

// ── Model ──

interface SplGameweekAttributes {
  id: string;
  seasonId: number;
  seasonLabel: string;
  gameweekNumber: number;
  pulseliveId: number;
  startDate: string | null;
  endDate: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SplGameweekCreation extends Optional<
  SplGameweekAttributes,
  "id" | "startDate" | "endDate" | "createdAt" | "updatedAt"
> {}

export class SplGameweek
  extends Model<SplGameweekAttributes, SplGameweekCreation>
  implements SplGameweekAttributes
{
  declare id: string;
  declare seasonId: number;
  declare seasonLabel: string;
  declare gameweekNumber: number;
  declare pulseliveId: number;
  declare startDate: string | null;
  declare endDate: string | null;
}

SplGameweek.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    seasonId: { type: DataTypes.INTEGER, allowNull: false, field: "season_id" },
    seasonLabel: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "season_label",
    },
    gameweekNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "gameweek_number",
    },
    pulseliveId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "pulselive_id",
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "start_date",
    },
    endDate: { type: DataTypes.DATEONLY, allowNull: true, field: "end_date" },
  },
  {
    sequelize,
    tableName: "spl_gameweeks",
    underscored: true,
    timestamps: true,
  },
);

// ── Sync function ──

export async function syncGameweeks(seasonId?: number): Promise<{
  seasonId: number;
  upserted: number;
  errors: number;
}> {
  const compSeasonId = seasonId ?? DEFAULT_SEASON_ID;
  const gameweeks = await fetchGameweeks(compSeasonId);

  if (gameweeks.length === 0) {
    logger.warn(
      `[SPL gameweeks] no gameweeks returned for season=${compSeasonId}`,
    );
    return { seasonId: compSeasonId, upserted: 0, errors: 0 };
  }

  const seasonLabel = gameweeks[0]?.compSeason?.label ?? String(compSeasonId);
  let upserted = 0;
  let errors = 0;

  for (const gw of gameweeks) {
    try {
      const where = { seasonId: compSeasonId, gameweekNumber: gw.gameweek };
      const existing = await SplGameweek.findOne({ where });
      const fields = {
        seasonLabel,
        pulseliveId: gw.id,
        startDate: gw.startDate ?? null,
        endDate: gw.endDate ?? null,
      };
      if (existing) {
        await existing.update(fields);
      } else {
        await SplGameweek.create({ ...where, ...fields });
      }
      upserted++;
    } catch (err) {
      errors++;
      logger.warn(
        `[SPL gameweeks] failed gw=${gw.gameweek}: ${(err as Error).message}`,
      );
    }
  }

  logger.info(
    `[SPL gameweeks] season=${compSeasonId} upserted=${upserted} errors=${errors}`,
  );
  return { seasonId: compSeasonId, upserted, errors };
}

export async function listGameweeks(seasonId?: number): Promise<SplGameweek[]> {
  const where = seasonId ? { seasonId } : { seasonId: DEFAULT_SEASON_ID };
  return SplGameweek.findAll({ where, order: [["gameweekNumber", "ASC"]] });
}
