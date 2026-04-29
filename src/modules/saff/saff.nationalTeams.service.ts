// ─────────────────────────────────────────────────────────────
// src/modules/saff/saff.nationalTeams.service.ts
//
// Scrapes SAFF national team list + rosters and persists them.
// Men's competitions only — women's entries are excluded.
// ─────────────────────────────────────────────────────────────

import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";
import { logger } from "@config/logger";
import {
  scrapeNationalTeamList,
  scrapeNationalTeamRoster,
  type ScrapedNationalRosterPlayer,
} from "@modules/saff/saff.scraper";

// ── Model ──

interface SaffNationalTeamAttributes {
  id: string;
  saffId: number;
  nameEn: string;
  nameAr: string;
  ageGroup: string;
  gender: string;
  logoUrl: string | null;
  squad: ScrapedNationalRosterPlayer[];
  lastSyncedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SaffNationalTeamCreation extends Optional<
  SaffNationalTeamAttributes,
  | "id"
  | "nameAr"
  | "logoUrl"
  | "squad"
  | "lastSyncedAt"
  | "createdAt"
  | "updatedAt"
> {}

export class SaffNationalTeam
  extends Model<SaffNationalTeamAttributes, SaffNationalTeamCreation>
  implements SaffNationalTeamAttributes
{
  declare id: string;
  declare saffId: number;
  declare nameEn: string;
  declare nameAr: string;
  declare ageGroup: string;
  declare gender: string;
  declare logoUrl: string | null;
  declare squad: ScrapedNationalRosterPlayer[];
  declare lastSyncedAt: Date | null;
}

SaffNationalTeam.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    saffId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      field: "saff_id",
    },
    nameEn: { type: DataTypes.STRING(200), allowNull: false, field: "name_en" },
    nameAr: {
      type: DataTypes.STRING(200),
      allowNull: false,
      defaultValue: "",
      field: "name_ar",
    },
    ageGroup: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "senior",
      field: "age_group",
    },
    gender: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "men",
      field: "gender",
    },
    logoUrl: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      field: "logo_url",
    },
    squad: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: "squad",
    },
    lastSyncedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_synced_at",
    },
  },
  {
    sequelize,
    tableName: "saff_national_teams",
    underscored: true,
    timestamps: true,
  },
);

// ── Sync ──

export interface NationalTeamsSyncResult {
  teams: number;
  rostersSync: number;
  errors: number;
}

/**
 * Sync all men's national teams from SAFF.com.sa.
 * 1. Scrapes the national teams index to discover all team IDs.
 * 2. For each men's team, scrapes the squad roster.
 * 3. Upserts into saff_national_teams on saff_id.
 * Women's teams are skipped per business requirements.
 */
export async function syncNationalTeams(
  opts: { includeRosters?: boolean } = {},
): Promise<NationalTeamsSyncResult> {
  const { includeRosters = true } = opts;
  const teamList = await scrapeNationalTeamList();

  // Filter to men's only
  const menTeams = teamList.filter((t) => t.gender === "men");
  logger.info(
    `[SAFF national] Found ${teamList.length} teams (${menTeams.length} men's) — syncing men's only`,
  );

  let teams = 0;
  let rostersSync = 0;
  let errors = 0;

  for (const team of menTeams) {
    try {
      let squad: ScrapedNationalRosterPlayer[] = [];
      if (includeRosters) {
        squad = await scrapeNationalTeamRoster(team.saffId);
        rostersSync++;
      }

      const existing = await SaffNationalTeam.findOne({
        where: { saffId: team.saffId },
      });

      const fields = {
        nameEn: team.nameEn,
        nameAr: team.nameAr,
        ageGroup: team.ageGroup,
        gender: team.gender,
        logoUrl: team.logoUrl,
        squad,
        lastSyncedAt: new Date(),
      };

      if (existing) {
        await existing.update(fields);
      } else {
        await SaffNationalTeam.create({ saffId: team.saffId, ...fields });
      }

      teams++;
      logger.info(
        `[SAFF national] ${team.nameEn} (id=${team.saffId}): ${squad.length} players`,
      );
    } catch (err) {
      errors++;
      logger.warn(
        `[SAFF national] Failed team ${team.saffId} (${team.nameEn}): ${(err as Error).message}`,
      );
    }
  }

  logger.info(
    `[SAFF national] Sync complete: teams=${teams} rosters=${rostersSync} errors=${errors}`,
  );
  return { teams, rostersSync, errors };
}

export async function listNationalTeams(): Promise<SaffNationalTeam[]> {
  return SaffNationalTeam.findAll({
    order: [
      ["gender", "ASC"],
      ["ageGroup", "ASC"],
    ],
  });
}
