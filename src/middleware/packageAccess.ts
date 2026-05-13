/**
 * Player Package Access Middleware
 *
 * Checks if the player associated with the request has a package tier
 * that allows access to the requested module/action.
 *
 * Runs AFTER authorizeModule (role check) and BEFORE the controller.
 */

import { Response, NextFunction } from "express";
import { AuthRequest } from "@shared/types";
import { sendForbidden } from "@shared/utils/apiResponse";
import {
  isModuleAllowed,
  PLAYER_PACKAGES,
  type PlayerPackage,
  type CrudAction,
} from "@shared/utils/packageAccess";
import { Player } from "@modules/players/player.model";
import { cacheOrFetch } from "@shared/utils/cache";
import { logger } from "@config/logger";

/**
 * Look up a player's package tier with Redis caching.
 */
async function getPlayerPackage(
  playerId: string,
): Promise<PlayerPackage | null> {
  return cacheOrFetch(
    `pkg:${playerId}`,
    async () => {
      const player = await Player.findByPk(playerId, {
        attributes: ["id", "playerPackage"],
      });
      const raw = player?.playerPackage;
      if (!raw) return null;
      if ((PLAYER_PACKAGES as readonly string[]).includes(raw)) {
        return raw as PlayerPackage;
      }
      logger.warn("Unknown player_package value", { playerId, raw });
      return null;
    },
    3600, // 1 hour TTL
  );
}

/**
 * Extract playerId from the request (params, body, or authenticated user).
 */
function extractPlayerId(req: AuthRequest): string | undefined {
  return (
    req.params?.playerId ??
    req.body?.playerId ??
    (req as any).user?.playerId ??
    undefined
  );
}

/**
 * Middleware factory: checks player package access for a module/action.
 *
 * Usage in routes:
 *   authorizePlayerPackage("sessions", "create")
 */
export function authorizePlayerPackage(module: string, action: CrudAction) {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    // Scoped bypass: the Player-Care wizard creates tickets/referrals for
    // players regardless of package tier. Only honored for referrals:create
    // to keep the surface minimal.
    if (
      module === "referrals" &&
      action === "create" &&
      req.body?.source === "playercare"
    ) {
      logger.info("Package access bypassed via playercare source", {
        playerId: req.body?.playerId,
        userId: (req as any).user?.id,
      });
      next();
      return;
    }

    const playerId = extractPlayerId(req);

    // No playerId in request — skip check (not player-specific)
    if (!playerId) {
      next();
      return;
    }

    try {
      const pkg = await getPlayerPackage(playerId);

      // Player not found — let the controller handle 404
      if (!pkg) {
        next();
        return;
      }

      if (!isModuleAllowed(pkg, module, action)) {
        logger.info("Package access denied", {
          playerId,
          package: pkg,
          module,
          action,
          userId: (req as any).user?.id,
        });
        sendForbidden(
          res,
          `Player's package (${pkg}) does not include access to '${module}'`,
        );
        return;
      }

      next();
    } catch (err) {
      logger.error("Package access check failed", { error: err, playerId });
      next(err);
    }
  };
}
