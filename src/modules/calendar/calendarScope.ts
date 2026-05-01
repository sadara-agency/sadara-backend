import { PlayerCoachAssignment } from "@modules/player-coach-assignments/playerCoachAssignment.model";
import { cacheGet, cacheSet, CacheTTL, CachePrefix } from "@shared/utils/cache";
import { logger } from "@config/logger";
import type { UserRole } from "@shared/types";

export const PRIVILEGED_ROLES: UserRole[] = [
  "Admin",
  "Manager",
  "Executive",
  "SportingDirector",
];

export interface CalendarScope {
  userId: string;
  roles: UserRole[];
  /** True for Admin/Manager/Executive/SportingDirector — skips all visibility filters. */
  isPrivileged: boolean;
  /** Player IDs this user is assigned to coach/manage (empty for non-staff roles). */
  assignedPlayerIds: string[];
  /** Player UUID for Player-role users linked to a player profile. */
  linkedPlayerId: string | null;
}

function scopeCacheKey(userId: string): string {
  return `${CachePrefix.CALENDAR_SCOPE}:${userId}`;
}

/**
 * Build the visibility scope for calendar aggregation.
 * Cached in Redis for 5 minutes; invalidated when player-coach-assignments change.
 */
export async function buildCalendarScope(
  userId: string,
  roles: UserRole[],
  linkedPlayerId?: string | null,
): Promise<CalendarScope> {
  const cacheKey = scopeCacheKey(userId);
  const cached = await cacheGet<CalendarScope>(cacheKey);
  if (cached) return cached;

  const isPrivileged = roles.some((r) => PRIVILEGED_ROLES.includes(r));

  let assignedPlayerIds: string[] = [];

  if (!isPrivileged && !roles.includes("Player")) {
    try {
      const assignments = await PlayerCoachAssignment.findAll({
        where: {
          coachUserId: userId,
          status: ["Assigned", "Acknowledged", "InProgress"],
        },
        attributes: ["playerId"],
      });
      assignedPlayerIds = assignments.map((a) => a.playerId);
    } catch (err) {
      logger.warn("buildCalendarScope: failed to load assigned players", {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const scope: CalendarScope = {
    userId,
    roles,
    isPrivileged,
    assignedPlayerIds,
    linkedPlayerId: linkedPlayerId ?? null,
  };

  cacheSet(cacheKey, scope, CacheTTL.SHORT).catch(() => void 0);

  return scope;
}

/**
 * Evict the calendar scope cache for a user.
 * Call this when player-coach-assignments are created/updated/deleted.
 */
export async function evictCalendarScope(userId: string): Promise<void> {
  const { cacheDel } = await import("@shared/utils/cache");
  await cacheDel(scopeCacheKey(userId));
}
