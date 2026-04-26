import { Op, Sequelize, QueryTypes, literal } from "sequelize";
import { Player } from "@modules/players/player.model";
import { Club } from "@modules/clubs/club.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import { generateDisplayId } from "@shared/utils/displayId";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { sequelize } from "@config/database";
import { ExternalProviderMapping } from "@modules/players/externalProvider.model";
import { PlayerClubHistory } from "@modules/players/playerClubHistory.model";
import { Referral } from "@modules/referrals/referral.model";
import { Session } from "@modules/sessions/session.model";
import { Journey } from "@modules/journey/journey.model";
import {
  getPositionGroup,
  createEmptyTechnicalAttributes,
} from "@modules/players/utils/attributeConfig";
import { camelCaseKeys } from "@shared/utils/caseTransform";
import {
  cacheOrFetch,
  buildCacheKey,
  CacheTTL,
  CachePrefix,
} from "@shared/utils/cache";
import { logger } from "@config/logger";
import { AuthUser } from "@shared/types";
import {
  buildRowScope,
  mergeScope,
  checkRowAccess,
} from "@shared/utils/rowScope";
import { PlayerQuery } from "@modules/players/utils/player.validation";

// ── Lightweight computed attributes (same-row, no joins needed) ──
const COMPUTED_ATTRIBUTES: [any, string][] = [
  [
    literal(`COALESCE(
      NULLIF(CONCAT("Player".first_name_ar, ' ', "Player".last_name_ar), ' '),
      CONCAT("Player".first_name, ' ', "Player".last_name)
    )`),
    "fullNameAr",
  ],
  [literal(`CONCAT("Player".first_name, ' ', "Player".last_name)`), "fullName"],
  [
    literal(
      `EXTRACT(YEAR FROM age(CURRENT_DATE, "Player".date_of_birth))::int`,
    ),
    "computedAge",
  ],
];

// DETAIL_COMPUTED_ATTRIBUTES removed — getPlayerById now uses batchLoadPlayerStats()
// which replaces 20+ correlated subqueries with 4 LATERAL joins in a single query.

/**
 * Batch-load stats for a set of player IDs in ONE query using LATERAL joins.
 * Replaces 9 correlated subqueries × N rows with 1 aggregated query.
 */
async function batchLoadPlayerStats(
  playerIds: string[],
): Promise<Map<string, Record<string, any>>> {
  if (playerIds.length === 0) return new Map();

  try {
    const rows = await sequelize.query<Record<string, any>>(
      `SELECT
         p.id AS player_id,
         -- Latest contract info (1 lateral instead of 3 subqueries)
         lc.contract_status, lc.contract_end, lc.commission_rate,
         -- Match participation (1 lateral instead of 2 subqueries)
         COALESCE(mp_agg.matches, 0) AS matches,
         COALESCE(mp_agg.minutes_played, 0) AS minutes_played,
         -- Match stats (1 lateral instead of 3 subqueries)
         COALESCE(pms_agg.goals, 0) AS goals,
         COALESCE(pms_agg.assists, 0) AS assists,
         pms_agg.rating,
         COALESCE(pms_agg.tackles, 0) AS tackles,
         COALESCE(pms_agg.interceptions, 0) AS interceptions,
         COALESCE(pms_agg.duels_won, 0) AS duels_won,
         COALESCE(pms_agg.duels_total, 0) AS duels_total,
         COALESCE(pms_agg.dribbles_completed, 0) AS dribbles_completed,
         COALESCE(pms_agg.dribbles_attempted, 0) AS dribbles_attempted,
         COALESCE(pms_agg.key_passes, 0) AS key_passes,
         COALESCE(pms_agg.shots_on_target, 0) AS shots_on_target,
         COALESCE(pms_agg.saves, 0) AS saves,
         COALESCE(pms_agg.clean_sheets, 0) AS clean_sheets,
         COALESCE(pms_agg.goals_conceded, 0) AS goals_conceded,
         COALESCE(pms_agg.penalties_saved, 0) AS penalties_saved,
         -- Latest performance
         perf_latest.performance,
         -- Provider linked?
         COALESCE(epm.has_provider, false) AS has_provider_mapping
       FROM players p
       LEFT JOIN LATERAL (
         SELECT true AS has_provider
         FROM external_provider_mappings epm
         WHERE epm.player_id = p.id AND epm.is_active = true
         LIMIT 1
       ) epm ON true
       LEFT JOIN LATERAL (
         SELECT
           CASE
             WHEN c.end_date IS NULL THEN 'Active'
             WHEN c.end_date < CURRENT_DATE THEN 'Expired'
             WHEN c.end_date < CURRENT_DATE + INTERVAL '90 days' THEN 'Expiring Soon'
             ELSE 'Active'
           END AS contract_status,
           c.end_date::text AS contract_end,
           c.commission_pct AS commission_rate
         FROM contracts c WHERE c.player_id = p.id
         ORDER BY c.end_date DESC NULLS FIRST LIMIT 1
       ) lc ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS matches,
                COALESCE(SUM(mp.minutes_played), 0)::int AS minutes_played
         FROM match_players mp WHERE mp.player_id = p.id
       ) mp_agg ON true
       LEFT JOIN LATERAL (
         SELECT COALESCE(SUM(pms.goals), 0)::int AS goals,
                COALESCE(SUM(pms.assists), 0)::int AS assists,
                ROUND(AVG(pms.rating) FILTER (WHERE pms.rating IS NOT NULL), 1) AS rating,
                COALESCE(SUM(pms.tackles_total), 0)::int AS tackles,
                COALESCE(SUM(pms.interceptions), 0)::int AS interceptions,
                COALESCE(SUM(pms.duels_won), 0)::int AS duels_won,
                COALESCE(SUM(pms.duels_total), 0)::int AS duels_total,
                COALESCE(SUM(pms.dribbles_completed), 0)::int AS dribbles_completed,
                COALESCE(SUM(pms.dribbles_attempted), 0)::int AS dribbles_attempted,
                COALESCE(SUM(pms.key_passes), 0)::int AS key_passes,
                COALESCE(SUM(pms.shots_on_target), 0)::int AS shots_on_target,
                COALESCE(SUM(pms.saves), 0)::int AS saves,
                COALESCE(SUM(pms.clean_sheet::int), 0)::int AS clean_sheets,
                COALESCE(SUM(pms.goals_conceded), 0)::int AS goals_conceded,
                COALESCE(SUM(pms.penalties_saved), 0)::int AS penalties_saved
         FROM player_match_stats pms WHERE pms.player_id = p.id
       ) pms_agg ON true
       LEFT JOIN LATERAL (
         SELECT perf.average_rating AS performance
         FROM performances perf WHERE perf.player_id = p.id
         ORDER BY perf.created_at DESC LIMIT 1
       ) perf_latest ON true
       WHERE p.id IN (:ids)`,
      { replacements: { ids: playerIds }, type: QueryTypes.SELECT },
    );

    const map = new Map<string, Record<string, any>>();
    for (const row of rows) map.set(row.player_id, row);
    return map;
  } catch (err) {
    logger.error("batchLoadPlayerStats failed", {
      playerCount: playerIds.length,
      error: (err as Error).message,
    });
    // Return empty map so the player list still loads (without computed stats)
    return new Map();
  }
}

// ── Player sidebar counts (single query instead of 3 separate COUNT queries) ──
interface PlayerCounts {
  activeContracts: number;
  activeInjuries: number;
  openTasks: number;
}

async function getPlayerCounts(playerId: string): Promise<PlayerCounts> {
  const [result] = await sequelize.query<PlayerCounts>(
    `SELECT
       COALESCE((SELECT COUNT(*)::int FROM contracts WHERE player_id = :id AND status = 'Active'), 0) AS "activeContracts",
       COALESCE((SELECT COUNT(*)::int FROM injuries WHERE player_id = :id AND status = 'UnderTreatment'), 0) AS "activeInjuries",
       COALESCE((SELECT COUNT(*)::int FROM tasks WHERE player_id = :id AND status = 'Open'), 0) AS "openTasks"`,
    { replacements: { id: playerId }, type: QueryTypes.SELECT },
  );

  return result || { activeContracts: 0, activeInjuries: 0, openTasks: 0 };
}

// ── List Players (enriched with computed fields) ──
// Step 1: Fetch base player data with lightweight attributes (no heavy subqueries)
// Step 2: Batch-load stats for all returned player IDs in a single query
// Step 3: Merge stats into player objects

export async function listPlayers(queryParams: PlayerQuery, user?: AuthUser) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "createdAt",
  );

  const cacheKey = buildCacheKey(CachePrefix.PLAYERS, {
    limit,
    page,
    sort,
    order,
    search: search || undefined,
    status: queryParams.status,
    playerType: queryParams.playerType,
    clubId: queryParams.clubId,
    position: queryParams.position,
    nationality: queryParams.nationality,
    contractType: queryParams.contractType,
    userId: user?.id,
  });

  return cacheOrFetch(
    cacheKey,
    async () => {
      const where: any = {};

      if (queryParams.status) where.status = queryParams.status;
      if (queryParams.playerType) where.playerType = queryParams.playerType;
      if (queryParams.playerPackage)
        where.playerPackage = queryParams.playerPackage;
      if (queryParams.clubId) where.currentClubId = queryParams.clubId;
      if (queryParams.position) where.position = queryParams.position;
      if (queryParams.nationality) where.nationality = queryParams.nationality;
      if (queryParams.contractType)
        where.contractType = queryParams.contractType;

      if (search) {
        where[Op.or] = [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { firstNameAr: { [Op.iLike]: `%${search}%` } },
          { lastNameAr: { [Op.iLike]: `%${search}%` } },
          Sequelize.where(
            Sequelize.fn(
              "concat",
              Sequelize.col("Player.first_name"),
              " ",
              Sequelize.col("Player.last_name"),
            ),
            { [Op.iLike]: `%${search}%` },
          ),
        ];
      }

      // Row-level scoping
      const scope = await buildRowScope("players", user);
      if (scope) mergeScope(where, scope);

      // Step 1: Base query with only lightweight computed attributes (name, age)
      const { count, rows } = await Player.findAndCountAll({
        where,
        limit,
        offset,
        order: [[sort, order]],
        attributes: { include: COMPUTED_ATTRIBUTES },
        include: [
          {
            model: Club,
            as: "club",
            attributes: ["id", "name", "nameAr", "logoUrl"],
          },
          { model: User, as: "agent", attributes: ["id", "fullName"] },
        ],
        distinct: true,
        subQuery: false,
      });

      // Step 2: Batch-load stats for all player IDs in a single query
      const playerIds = rows.map((r) => r.id);
      const statsMap = await batchLoadPlayerStats(playerIds);

      // Step 3: Merge stats (converted to camelCase) into each player's plain object
      const data = rows.map((row) => {
        const plain = row.get({ plain: true });
        const rawStats = statsMap.get(row.id) || {};
        const stats = camelCaseKeys<Record<string, any>>(rawStats);
        return {
          ...plain,
          contractStatus: stats.contractStatus ?? null,
          contractEnd: stats.contractEnd ?? null,
          commissionRate: stats.commissionRate ?? null,
          matches: stats.matches ?? 0,
          minutesPlayed: stats.minutesPlayed ?? 0,
          goals: stats.goals ?? 0,
          assists: stats.assists ?? 0,
          rating: stats.rating ?? null,
          performance: stats.performance ?? null,
          tackles: stats.tackles ?? 0,
          interceptions: stats.interceptions ?? 0,
          duelsWon: stats.duelsWon ?? 0,
          duelsTotal: stats.duelsTotal ?? 0,
          dribblesCompleted: stats.dribblesCompleted ?? 0,
          dribblesAttempted: stats.dribblesAttempted ?? 0,
          keyPasses: stats.keyPasses ?? 0,
          shotsOnTarget: stats.shotsOnTarget ?? 0,
          saves: stats.saves ?? 0,
          cleanSheets: stats.cleanSheets ?? 0,
          goalsConceded: stats.goalsConceded ?? 0,
          penaltiesSaved: stats.penaltiesSaved ?? 0,
          hasProviderMapping: stats.hasProviderMapping ?? false,
        };
      });

      return { data, meta: buildMeta(count, page, limit) };
    },
    CacheTTL.MEDIUM,
  );
}

// ── Get Player by ID (With Aggregates) ──
// Uses batchLoadPlayerStats (LATERAL joins) instead of 13+ correlated subqueries.
export async function getPlayerById(id: string, user?: AuthUser) {
  // Run lightweight base query + batch stats + sidebar counts + perf history in parallel
  const [player, statsMap, counts, performanceHistory, portalUser] =
    await Promise.all([
      Player.findByPk(id, {
        attributes: { include: COMPUTED_ATTRIBUTES },
        include: ["club", "agent"],
      }),
      batchLoadPlayerStats([id]),
      getPlayerCounts(id),
      sequelize
        .query(
          `SELECT
           TO_CHAR(perf.created_at, 'YYYY-MM') as month,
           ROUND(AVG(perf.average_rating), 1) as rating
         FROM performances perf
         WHERE perf.player_id = :id
         GROUP BY TO_CHAR(perf.created_at, 'YYYY-MM')
         ORDER BY month DESC
         LIMIT 12`,
          { replacements: { id }, type: QueryTypes.SELECT },
        )
        .catch(() => []),
      User.findOne({
        where: { playerId: id },
        attributes: ["isActive", "inviteTokenExpiry"],
      }),
    ]);

  if (!player) throw new AppError("Player not found", 404);

  // Row-level access check
  const hasAccess = await checkRowAccess("players", player, user);
  if (!hasAccess) throw new AppError("Player not found", 404);

  const plain = player.get({ plain: true });
  const rawStats = statsMap.get(id) || {};
  const stats = camelCaseKeys<Record<string, any>>(rawStats);

  // Determine portal account status for this player
  let portalStatus: "active" | "pending" | "expired" | null = null;
  if (portalUser) {
    if (portalUser.isActive) {
      portalStatus = "active";
    } else {
      const tokenExpired =
        !portalUser.inviteTokenExpiry ||
        new Date(portalUser.inviteTokenExpiry).getTime() < Date.now();
      portalStatus = tokenExpired ? "expired" : "pending";
    }
  }

  return {
    ...plain,
    portalStatus,
    contractStatus: stats.contractStatus ?? null,
    contractEnd: stats.contractEnd ?? null,
    commissionRate: stats.commissionRate ?? null,
    matches: stats.matches ?? 0,
    minutesPlayed: stats.minutesPlayed ?? 0,
    goals: stats.goals ?? 0,
    assists: stats.assists ?? 0,
    rating: stats.rating ?? null,
    performance: stats.performance ?? null,
    tackles: stats.tackles ?? 0,
    interceptions: stats.interceptions ?? 0,
    duelsWon: stats.duelsWon ?? 0,
    duelsTotal: stats.duelsTotal ?? 0,
    dribblesCompleted: stats.dribblesCompleted ?? 0,
    dribblesAttempted: stats.dribblesAttempted ?? 0,
    keyPasses: stats.keyPasses ?? 0,
    shotsOnTarget: stats.shotsOnTarget ?? 0,
    saves: stats.saves ?? 0,
    cleanSheets: stats.cleanSheets ?? 0,
    goalsConceded: stats.goalsConceded ?? 0,
    penaltiesSaved: stats.penaltiesSaved ?? 0,
    hasProviderMapping: stats.hasProviderMapping ?? false,
    counts,
    performanceHistory,
  };
}

// ── Create/Update/Delete ──
export async function createPlayer(input: any, createdBy: string) {
  // Auto-initialize technical attributes when position is provided
  if (input.position && !input.technicalAttributes) {
    const group = getPositionGroup(input.position);
    if (group) {
      input.technicalAttributes = createEmptyTechnicalAttributes(group);
    }
  }
  const displayId = await generateDisplayId("players");
  return await Player.create({ ...input, createdBy, displayId });
}

export async function updatePlayer(id: string, input: any) {
  const player = await Player.findByPk(id);
  if (!player) throw new AppError("Player not found", 404);

  // Sanitize email — empty string → null
  if ("email" in input) {
    input.email = input.email?.trim() || null;
  }

  // Handle position change → reset/initialize technical attributes
  if ("position" in input) {
    const newPosition = input.position;
    const oldGroup = getPositionGroup(player.position);
    const newGroup = getPositionGroup(newPosition);

    if (!newPosition) {
      // Position cleared → null out technical attributes
      input.technicalAttributes = null;
    } else if (newGroup && newGroup !== oldGroup) {
      // Different position group → reset technical attributes to zeros
      input.technicalAttributes = createEmptyTechnicalAttributes(newGroup);
    } else if (newGroup && !player.technicalAttributes) {
      // Same group but no existing technical data → initialize
      input.technicalAttributes = createEmptyTechnicalAttributes(newGroup);
    }
    // Same group with existing data → keep current values (no change needed)
  }

  // Auto-track club history when currentClubId changes
  if (
    input.currentClubId &&
    input.currentClubId !== player.currentClubId &&
    player.currentClubId
  ) {
    try {
      // Close the previous club entry
      const today = new Date().toISOString().split("T")[0];
      await PlayerClubHistory.update(
        { endDate: today },
        {
          where: { playerId: id, clubId: player.currentClubId, endDate: null },
        },
      );
      // Open a new club entry
      await PlayerClubHistory.create({
        playerId: id,
        clubId: input.currentClubId,
        startDate: today,
        position: input.position || player.position,
        jerseyNumber: input.jerseyNumber || player.jerseyNumber,
      });
    } catch (err: any) {
      logger.error("Club history update failed", {
        playerId: id,
        error: err.message,
      });
    }
  }

  try {
    return await player.update(input, { fields: Object.keys(input) as any });
  } catch (err: any) {
    // Handle Sequelize validation errors — return field-level detail
    if (err.name === "SequelizeValidationError") {
      const fieldErrors = (err.errors || []).map((e: any) => ({
        field: e.path || e.type || "unknown",
        message: e.message,
      }));
      throw AppError.validation(
        fieldErrors.length > 0
          ? fieldErrors
          : [{ field: "unknown", message: err.message }],
      );
    }
    if (err.name === "SequelizeUniqueConstraintError") {
      const fieldErrors = (err.errors || []).map((e: any) => ({
        field: e.path || "unknown",
        message: e.message,
      }));
      throw AppError.validation(
        fieldErrors.length > 0
          ? fieldErrors
          : [{ field: "unknown", message: err.message }],
      );
    }
    // Handle known DB errors with friendly messages instead of 500
    if (err.name === "SequelizeDatabaseError") {
      const msg = err.message || "";
      if (msg.includes("numeric field overflow")) {
        throw new AppError(
          "A numeric value exceeds the allowed range. Please check market value and other numbers.",
          422,
        );
      }
      if (msg.includes("value too long")) {
        throw new AppError(
          "A text value is too long. Please shorten the input.",
          422,
        );
      }
    }
    throw err;
  }
}

export async function deletePlayer(id: string) {
  const [deps] = await sequelize.query<{ active_contracts: number }>(
    `SELECT COUNT(*)::int AS active_contracts FROM contracts WHERE player_id = :id AND status = 'Active'`,
    { replacements: { id }, type: QueryTypes.SELECT },
  );

  if (deps && deps.active_contracts > 0) {
    throw new AppError(
      "Cannot delete player with active contracts. Terminate or transfer contracts first.",
      400,
    );
  }

  const deleted = await Player.destroy({ where: { id } });
  if (!deleted) throw new AppError("Player not found", 404);
  return { id };
}

// ═══════════════════════════════════════════════════════════════
// Add to: src/modules/players/player.service.ts (append these functions)
// ═══════════════════════════════════════════════════════════════

export async function getPlayerProviders(playerId: string) {
  try {
    return await ExternalProviderMapping.findAll({
      where: { playerId },
      order: [["providerName", "ASC"]],
    });
  } catch (err: any) {
    logger.error("getPlayerProviders failed", {
      playerId,
      error: err.message,
    });
    if (err.message?.includes("does not exist")) {
      return []; // Table not yet created — return empty gracefully
    }
    throw err;
  }
}

export async function upsertPlayerProvider(
  playerId: string,
  input: {
    providerName: string;
    externalPlayerId: string;
    externalTeamId?: string;
    apiBaseUrl?: string;
    notes?: string;
  },
) {
  try {
    const [mapping] = await ExternalProviderMapping.upsert({
      playerId,
      providerName: input.providerName as any,
      externalPlayerId: input.externalPlayerId,
      externalTeamId: input.externalTeamId || null,
      apiBaseUrl: input.apiBaseUrl || null,
      notes: input.notes || null,
    } as any);
    return mapping;
  } catch (err: any) {
    logger.error("upsertPlayerProvider failed", {
      playerId,
      provider: input.providerName,
      error: err.message,
      stack: err.stack,
    });
    if (
      err.name === "SequelizeDatabaseError" &&
      err.message?.includes("does not exist")
    ) {
      throw new AppError(
        "Provider mappings feature is not available. Database migration required.",
        503,
      );
    }
    throw new AppError("Failed to save provider mapping", 500);
  }
}

// ── Duplicate Player Check ──
export async function checkDuplicate(params: {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  dob?: string; // alias — frontend sends "dob"
  nationality?: string;
  excludeId?: string; // exclude a player by ID (for edit mode)
}) {
  const searchConditions: string[] = [];
  const filterConditions: string[] = [];
  const replacements: Record<string, string> = {};
  const dobValue = params.dateOfBirth || params.dob;

  if (params.firstName && params.lastName) {
    searchConditions.push(
      `(LOWER(first_name) = LOWER(:firstName) AND LOWER(last_name) = LOWER(:lastName))`,
    );
    replacements.firstName = params.firstName;
    replacements.lastName = params.lastName;
  }
  if (dobValue) {
    searchConditions.push(`date_of_birth = :dob`);
    replacements.dob = dobValue;
  }
  if (params.nationality) {
    searchConditions.push(`LOWER(nationality) = LOWER(:nationality)`);
    replacements.nationality = params.nationality;
  }
  if (params.excludeId) {
    filterConditions.push(`id != :excludeId`);
    replacements.excludeId = params.excludeId;
  }

  // Need at least name + DOB to check (excludeId doesn't count as a search criterion)
  if (searchConditions.length < 2) return [];

  const conditions = [...searchConditions, ...filterConditions];

  const rows = await sequelize.query<Record<string, any>>(
    `SELECT id, first_name, last_name, first_name_ar, last_name_ar, date_of_birth, nationality
     FROM players
     WHERE ${conditions.join(" AND ")}
     LIMIT 5`,
    { replacements, type: QueryTypes.SELECT },
  );

  return rows.map((r) => camelCaseKeys(r));
}

// ── Player Club History ──
export async function getClubHistory(playerId: string) {
  const rows = await sequelize.query<any>(
    `SELECT h.*, c.name AS club_name, c.name_ar AS club_name_ar, c.logo_url AS club_logo
     FROM player_club_history h
     LEFT JOIN clubs c ON h.club_id = c.id
     WHERE h.player_id = :playerId
     ORDER BY h.start_date DESC`,
    { replacements: { playerId }, type: QueryTypes.SELECT },
  );
  return rows.map((r: any) => camelCaseKeys(r));
}

export async function removePlayerProvider(
  playerId: string,
  providerName: string,
) {
  const mapping = await ExternalProviderMapping.findOne({
    where: { playerId, providerName },
  });
  if (!mapping) throw new AppError("Provider mapping not found", 404);
  await mapping.destroy();
  return { playerId, providerName };
}

/**
 * Validate an external provider mapping by calling the provider API.
 * Currently supports Sportmonks (player lookup by ID).
 */
export async function validateProviderMapping(
  playerId: string,
  body: { providerName: string; externalPlayerId: string },
) {
  const { providerName, externalPlayerId } = body;
  if (!providerName || !externalPlayerId) {
    throw new AppError("providerName and externalPlayerId are required", 400);
  }

  if (providerName === "Sportmonks") {
    try {
      const { testConnection } =
        await import("@modules/sportmonks/sportmonks.provider");
      const connected = await testConnection();
      if (!connected) {
        return {
          valid: false,
          providerName,
          externalPlayerId,
          error: "Sportmonks API is not configured or unreachable",
        };
      }

      // Sportmonks v3: GET /football/players/{id}
      const axios = (await import("axios")).default;
      const { env } = await import("@config/env");
      const res = await axios.get(
        `https://api.sportmonks.com/v3/football/players/${encodeURIComponent(externalPlayerId)}`,
        {
          params: { api_token: env.sportmonks.apiToken },
          timeout: 10_000,
        },
      );

      const smPlayer = res.data?.data;
      if (!smPlayer) {
        return {
          valid: false,
          providerName,
          externalPlayerId,
          error: "Player not found",
        };
      }

      return {
        valid: true,
        providerName,
        externalPlayerId,
        externalName:
          smPlayer.display_name ||
          smPlayer.common_name ||
          smPlayer.name ||
          null,
        externalNationality: smPlayer.nationality || null,
        externalPosition: smPlayer.position_id || null,
      };
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 404) {
        return {
          valid: false,
          providerName,
          externalPlayerId,
          error: "Player not found in Sportmonks",
        };
      }
      return {
        valid: false,
        providerName,
        externalPlayerId,
        error: `Sportmonks API error: ${err.message}`,
      };
    }
  }

  // For unsupported providers, return unknown status
  return {
    valid: null,
    providerName,
    externalPlayerId,
    error: `Validation not available for ${providerName}. Supported: Sportmonks.`,
  };
}

export async function getPlayerOverview(id: string) {
  const player = await Player.findByPk(id, {
    attributes: [
      "id",
      "firstName",
      "lastName",
      "firstNameAr",
      "lastNameAr",
      "position",
      "photoUrl",
      "playerPackage",
      "mandateStatus",
    ],
    include: [
      { model: Club, as: "club", attributes: ["id", "name", "logoUrl"] },
    ],
  });
  if (!player) throw new AppError("Player not found", 404);

  const [openCases, recentSessions, journeyCount] = await Promise.all([
    Referral.findAll({
      where: {
        playerId: id,
        status: { [Op.in]: ["Open", "InProgress", "Waiting"] },
      },
      attributes: [
        "id",
        "displayId",
        "referralType",
        "status",
        "priority",
        "triggerDesc",
        "dueDate",
        "createdAt",
      ],
      order: [["createdAt", "DESC"]],
      limit: 10,
    }),
    Session.findAll({
      where: { playerId: id },
      attributes: [
        "id",
        "title",
        "titleAr",
        "sessionType",
        "completionStatus",
        "sessionDate",
      ],
      order: [["sessionDate", "DESC"]],
      limit: 5,
    }),
    Journey.count({ where: { playerId: id } }),
  ]);

  return {
    player,
    openCases,
    recentSessions,
    journeyCount,
    openCaseCount: openCases.length,
  };
}
