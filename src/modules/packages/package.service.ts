import { Package } from "./package.model";
import { PackageConfig } from "./packageConfig.model";
import { Player } from "@modules/players/player.model";
import { AppError } from "@middleware/errorHandler";
import { sequelize } from "@config/database";
import {
  cacheOrFetch,
  invalidateByPrefix,
  CachePrefix,
} from "@shared/utils/cache";
import { logger } from "@config/logger";
import type {
  UpdatePackageConfigDTO,
  UpdatePlayerPackageDTO,
} from "./package.validation";

// All modules known to the package system
const ALL_MODULES = [
  "dashboard",
  "players",
  "clubs",
  "matches",
  "contracts",
  "offers",
  "gates",
  "approvals",
  "scouting",
  "referrals",
  "injuries",
  "training",
  "finance",
  "reports",
  "tasks",
  "journey",
  "tickets",
  "sessions",
  "notifications",
  "documents",
  "notes",
  "wellness",
  "media_requests",
  "media_contacts",
  "press_releases",
  "media_kits",
  "social_media",
  "calendar",
  "messaging",
  "esignatures",
  "audit",
  "settings",
  "users",
  "competitions",
  "sportmonks",
  "saff-data",
  "spl-sync",
  "market-intel",
];

/**
 * Get all package configs grouped by package tier.
 */
export async function getPackageConfigs(): Promise<
  Record<
    string,
    Array<{
      module: string;
      canCreate: boolean;
      canRead: boolean;
      canUpdate: boolean;
      canDelete: boolean;
    }>
  >
> {
  const configs = await cacheOrFetch(
    "package-configs:all",
    async () => {
      const rows = await PackageConfig.findAll({
        order: [
          ["package", "ASC"],
          ["module", "ASC"],
        ],
      });
      return rows.map((r) => r.toJSON());
    },
    3600,
  );

  const grouped: Record<
    string,
    Array<{
      module: string;
      canCreate: boolean;
      canRead: boolean;
      canUpdate: boolean;
      canDelete: boolean;
    }>
  > = {
    A: [],
    B: [],
    C: [],
  };

  for (const c of configs) {
    const pkg = (c as any).package;
    if (grouped[pkg]) {
      grouped[pkg].push({
        module: (c as any).module,
        canCreate: (c as any).canCreate,
        canRead: (c as any).canRead,
        canUpdate: (c as any).canUpdate,
        canDelete: (c as any).canDelete,
      });
    }
  }

  return grouped;
}

/**
 * Bulk update package config for a specific tier.
 */
export async function updatePackageConfig(
  data: UpdatePackageConfigDTO,
): Promise<void> {
  const tx = await sequelize.transaction();
  try {
    for (const mod of data.modules) {
      await PackageConfig.upsert(
        {
          package: data.package,
          module: mod.module,
          canCreate: mod.canCreate,
          canRead: mod.canRead,
          canUpdate: mod.canUpdate,
          canDelete: mod.canDelete,
        },
        { transaction: tx },
      );
    }
    await tx.commit();

    // Invalidate caches
    await invalidateByPrefix("package-configs");
    // Also invalidate per-player package caches
    await invalidateByPrefix("pkg:");

    logger.info(`Package config updated for tier ${data.package}`);
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

/**
 * Get players grouped by package tier.
 */
export async function getPlayersByPackage(): Promise<
  Record<
    string,
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      firstNameAr: string | null;
      lastNameAr: string | null;
      playerPackage: string;
      photoUrl: string | null;
    }>
  >
> {
  const players = await Player.findAll({
    attributes: [
      "id",
      "firstName",
      "lastName",
      "firstNameAr",
      "lastNameAr",
      "playerPackage",
      "photoUrl",
    ],
    order: [["firstName", "ASC"]],
  });

  const grouped: Record<string, typeof players> = { A: [], B: [], C: [] };
  for (const p of players) {
    const pkg = p.playerPackage || "C";
    if (!grouped[pkg]) grouped[pkg] = [];
    grouped[pkg].push(p);
  }

  return grouped as any;
}

/**
 * Update a player's package tier.
 */
export async function updatePlayerPackage(
  playerId: string,
  data: UpdatePlayerPackageDTO,
): Promise<void> {
  const player = await Player.findByPk(playerId);
  if (!player) throw new AppError("Player not found", 404);

  await player.update({ playerPackage: data.playerPackage });

  // Invalidate the player's cached package
  await invalidateByPrefix(`pkg:${playerId}`);

  logger.info(`Player ${playerId} package updated to ${data.playerPackage}`);
}

/**
 * Get list of all available modules.
 */
export function getAvailableModules(): string[] {
  return [...ALL_MODULES];
}

/**
 * Get all package tier definitions (A, B, C) with names and descriptions.
 * Results are cached for 1 hour.
 */
export async function getPackageTiers() {
  return cacheOrFetch(
    "package-tiers:all",
    async () => {
      const tiers = await Package.findAll({
        where: { isActive: true },
        order: [["code", "ASC"]],
      });
      return tiers.map((t) => t.toJSON());
    },
    3600,
  );
}

/**
 * Update a package tier's metadata.
 */
export async function updatePackageTier(
  code: string,
  data: { name?: string; nameAr?: string; description?: string },
) {
  const tier = await Package.findOne({ where: { code } });
  if (!tier) throw new Error(`Package tier "${code}" not found`);
  await tier.update(data);
  await invalidateByPrefix("package-tiers");
  return tier;
}
