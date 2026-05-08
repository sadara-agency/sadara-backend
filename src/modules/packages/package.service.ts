import { Package } from "./package.model";
import { PackageConfig } from "./packageConfig.model";
import { Player } from "@modules/players/player.model";
import { AppError } from "@middleware/errorHandler";
import { sequelize } from "@config/database";
import { cacheOrFetch, invalidateByPrefix } from "@shared/utils/cache";
import { logger } from "@config/logger";
import { PLAYER_PACKAGES } from "@shared/utils/packageAccess";
import type {
  UpdatePackageConfigDTO,
  UpdatePackageTierDTO,
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

type PackageCode = (typeof PLAYER_PACKAGES)[number];

function emptyGrouped<T>(): Record<PackageCode, T[]> {
  return { "A+": [], A: [], "B+": [], B: [] };
}

interface ModuleAccessRow {
  module: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

/**
 * Get all package configs grouped by package tier.
 */
export async function getPackageConfigs(): Promise<
  Record<string, ModuleAccessRow[]>
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

  const grouped = emptyGrouped<ModuleAccessRow>();

  for (const c of configs) {
    const pkg = (c as { package: string }).package as PackageCode;
    if (grouped[pkg]) {
      grouped[pkg].push({
        module: (c as ModuleAccessRow).module,
        canCreate: (c as ModuleAccessRow).canCreate,
        canRead: (c as ModuleAccessRow).canRead,
        canUpdate: (c as ModuleAccessRow).canUpdate,
        canDelete: (c as ModuleAccessRow).canDelete,
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

    await invalidateByPrefix("package-configs");
    await invalidateByPrefix("pkg:");

    logger.info(`Package config updated for tier ${data.package}`);
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

interface PackagePlayerRow {
  id: string;
  firstName: string;
  lastName: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
  playerPackage: string;
  photoUrl: string | null;
}

/**
 * Get players grouped by package tier.
 */
export async function getPlayersByPackage(): Promise<
  Record<string, PackagePlayerRow[]>
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

  const grouped = emptyGrouped<PackagePlayerRow>();
  for (const p of players) {
    const pkg = (p.playerPackage || "B") as PackageCode;
    if (grouped[pkg]) {
      grouped[pkg].push(p as unknown as PackagePlayerRow);
    }
  }

  return grouped;
}

/**
 * Update a player's package tier. Enforces per-tier max_players caps when set.
 */
export async function updatePlayerPackage(
  playerId: string,
  data: UpdatePlayerPackageDTO,
): Promise<void> {
  const player = await Player.findByPk(playerId);
  if (!player) throw new AppError("Player not found", 404);

  // No change → skip cap check
  if (player.playerPackage !== data.playerPackage) {
    const tier = await Package.findOne({
      where: { code: data.playerPackage },
    });

    if (tier?.maxPlayers != null) {
      const currentCount = await Player.count({
        where: { playerPackage: data.playerPackage },
      });
      if (currentCount >= tier.maxPlayers) {
        throw new AppError(
          `Tier "${data.playerPackage}" cap of ${tier.maxPlayers} player(s) has been reached`,
          422,
        );
      }
    }
  }

  await player.update({ playerPackage: data.playerPackage });
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
 * Get all active package tier definitions ordered by display_order.
 * Cached for 1 hour.
 */
export async function getPackageTiers() {
  return cacheOrFetch(
    "package-tiers:all",
    async () => {
      const tiers = await Package.findAll({
        where: { isActive: true },
        order: [
          ["displayOrder", "ASC"],
          ["code", "ASC"],
        ],
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
  data: UpdatePackageTierDTO,
) {
  const tier = await Package.findOne({ where: { code } });
  if (!tier) throw new AppError(`Package tier "${code}" not found`, 404);
  await tier.update(data);
  await invalidateByPrefix("package-tiers");
  return tier;
}
