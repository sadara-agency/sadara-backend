import { z } from "zod";
import type { AuthUser } from "@shared/types";
import { AppError } from "@middleware/errorHandler";
import { env } from "@config/env";
import {
  hasPermission,
  getHiddenFields,
} from "@modules/permissions/permission.service";
import { getPlayerById, listPlayers } from "@modules/players/player.service";
import { playerQuerySchema } from "@modules/players/utils/player.validation";
import { getAllPlayerSeasonStats } from "@modules/playerStats/playerStats.service";
import {
  listScoutReports,
  getScoutReport,
} from "@modules/scouting/scoutReport.service";
import { stripHidden } from "./fieldStrip";
import type { Tool } from "./types";

/**
 * Shared RBAC gate. Throws AppError(403) when the requesting user lacks read
 * access to `module`; the registry turns that into a tool_result error the
 * model explains to the user (never an HTTP 403 leaking the route).
 */
async function requireRead(user: AuthUser, module: string): Promise<void> {
  const allowed = await hasPermission(user.role, module, "read", user.id);
  if (!allowed) {
    throw new AppError(
      `You do not have permission to read ${module}.`,
      403,
      true,
      "FORBIDDEN",
    );
  }
}

/** Apply the same field-level stripping the API uses for this user + module. */
async function stripForUser<T>(
  data: T,
  user: AuthUser,
  module: string,
): Promise<T> {
  const hidden = await getHiddenFields(user.role, module, user.id);
  return stripHidden(data, hidden);
}

// ── get_player_by_id ──

const getPlayerByIdSchema = z.object({
  id: z.string().min(1),
});

const getPlayerByIdTool: Tool<z.infer<typeof getPlayerByIdSchema>> = {
  name: "get_player_by_id",
  description:
    "Fetch a single player's full profile by their id or display id (e.g. 'P-26-0036'). Returns null/404 if not found or not visible to you.",
  inputSchema: getPlayerByIdSchema,
  jsonSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Player UUID or display id." },
    },
    required: ["id"],
    additionalProperties: false,
  },
  async handler(args, user) {
    await requireRead(user, "players");
    const player = await getPlayerById(args.id, user);
    return stripForUser(player, user, "players");
  },
};

// ── search_players ──

const searchPlayersSchema = z.object({
  search: z.string().min(1),
  // Capped at the player query schema's own max (500).
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

const searchPlayersTool: Tool<z.infer<typeof searchPlayersSchema>> = {
  name: "search_players",
  description:
    "Search players by name (Arabic or English), display id, or id prefix. Returns a paginated list scoped to what you can see.",
  inputSchema: searchPlayersSchema,
  jsonSchema: {
    type: "object",
    properties: {
      search: { type: "string", description: "Name or id fragment to match." },
      limit: { type: "integer", description: "Max results (default 20)." },
    },
    required: ["search"],
    additionalProperties: false,
  },
  async handler(args, user) {
    await requireRead(user, "players");
    // Parse through the real query schema so defaults (sort/order/page) match
    // the normal API path exactly.
    const query = playerQuerySchema.parse({
      search: args.search,
      limit: args.limit ?? env.pagination.defaultLimit,
    });
    const result = await listPlayers(query, user);
    return stripForUser(result, user, "players");
  },
};

// ── get_player_stats ──

const getPlayerStatsSchema = z.object({
  playerId: z.string().uuid(),
});

const getPlayerStatsTool: Tool<z.infer<typeof getPlayerStatsSchema>> = {
  name: "get_player_stats",
  description:
    "Get all season statistics rows for a player (most recent season first).",
  inputSchema: getPlayerStatsSchema,
  jsonSchema: {
    type: "object",
    properties: {
      playerId: { type: "string", description: "Player UUID." },
    },
    required: ["playerId"],
    additionalProperties: false,
  },
  async handler(args, user) {
    await requireRead(user, "player-stats");
    const stats = await getAllPlayerSeasonStats(args.playerId);
    return stripForUser(stats, user, "player-stats");
  },
};

// ── get_scouting_reports ──

const getScoutingReportsSchema = z.object({
  recommendation: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(env.pagination.maxLimit).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const getScoutingReportsTool: Tool<z.infer<typeof getScoutingReportsSchema>> = {
  name: "get_scouting_reports",
  description:
    "List scouting reports, optionally filtered by recommendation, ranked by overall score.",
  inputSchema: getScoutingReportsSchema,
  jsonSchema: {
    type: "object",
    properties: {
      recommendation: {
        type: "string",
        description: "Optional recommendation filter.",
      },
      limit: { type: "integer", description: "Max results (default 50)." },
      offset: { type: "integer", description: "Pagination offset." },
    },
    additionalProperties: false,
  },
  async handler(args, user) {
    await requireRead(user, "scouting");
    const result = await listScoutReports(args);
    return stripForUser(result, user, "scouting");
  },
};

// ── get_scouting_report ──

const getScoutingReportSchema = z.object({
  watchlistId: z.string().uuid(),
});

const getScoutingReportTool: Tool<z.infer<typeof getScoutingReportSchema>> = {
  name: "get_scouting_report",
  description:
    "Get the scouting report for a single watchlist prospect by watchlist id.",
  inputSchema: getScoutingReportSchema,
  jsonSchema: {
    type: "object",
    properties: {
      watchlistId: { type: "string", description: "Watchlist entry UUID." },
    },
    required: ["watchlistId"],
    additionalProperties: false,
  },
  async handler(args, user) {
    await requireRead(user, "scouting");
    const report = await getScoutReport(args.watchlistId);
    return stripForUser(report, user, "scouting");
  },
};

export const readTools: Tool[] = [
  getPlayerByIdTool as Tool,
  searchPlayersTool as Tool,
  getPlayerStatsTool as Tool,
  getScoutingReportsTool as Tool,
  getScoutingReportTool as Tool,
];
