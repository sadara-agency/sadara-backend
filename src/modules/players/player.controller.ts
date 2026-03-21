import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";
import { createCrudController } from "@shared/utils/crudController";
import { AppError } from "@middleware/errorHandler";
import * as playerService from "@modules/players/player.service";

const PLAYER_CACHE = [
  CachePrefix.PLAYERS,
  CachePrefix.PLAYER,
  CachePrefix.DASHBOARD,
];

const crud = createCrudController({
  service: {
    list: (query) => playerService.listPlayers(query),
    getById: (id) => playerService.getPlayerById(id),
    create: (body, userId) => playerService.createPlayer(body, userId),
    update: (id, body) => playerService.updatePlayer(id, body),
    delete: (id) => playerService.deletePlayer(id),
  },
  entity: "players",
  cachePrefixes: PLAYER_CACHE,
  deleteCachePrefixes: [...PLAYER_CACHE, CachePrefix.CONTRACTS],
  label: (p) => `${p.firstName} ${p.lastName}`,
});

export const { list, getById, create, update, remove } = crud;

// ── Custom handlers ──

export async function uploadPhoto(req: AuthRequest, res: Response) {
  if (!req.file) throw new AppError("No file uploaded", 400);

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const photoUrl = `${baseUrl}/uploads/photos/${req.file.filename}`;

  const player = await playerService.updatePlayer(req.params.id, { photoUrl });
  await logAudit(
    "UPDATE",
    "players",
    player.id,
    buildAuditContext(req.user!, req.ip),
    "Updated player photo",
  );
  await invalidateMultiple(PLAYER_CACHE);
  sendSuccess(res, { photoUrl }, "Photo uploaded");
}

export async function checkDuplicate(req: AuthRequest, res: Response) {
  const duplicates = await playerService.checkDuplicate(req.query as any);
  sendSuccess(res, { duplicates, hasDuplicates: duplicates.length > 0 });
}

export async function getClubHistory(req: AuthRequest, res: Response) {
  const history = await playerService.getClubHistory(req.params.id);
  sendSuccess(res, history);
}

export async function getProviders(req: AuthRequest, res: Response) {
  const providers = await playerService.getPlayerProviders(req.params.id);
  sendSuccess(res, providers);
}

export async function upsertProvider(req: AuthRequest, res: Response) {
  const mapping = await playerService.upsertPlayerProvider(
    req.params.id,
    req.body,
  );
  sendSuccess(res, mapping, "Provider mapping saved");
}

export async function removeProvider(req: AuthRequest, res: Response) {
  const result = await playerService.removePlayerProvider(
    req.params.id,
    req.params.provider,
  );
  sendSuccess(res, result, "Provider mapping removed");
}

export async function refreshStats(req: AuthRequest, res: Response) {
  const { provider, dateFrom, dateTo } = req.body;
  if (!provider) {
    throw new AppError("provider is required in request body", 400);
  }
  const { syncPlayerMatches } =
    await import("../integrations/matchAnalysis.service");
  const providers = await playerService.getPlayerProviders(req.params.id);
  const mapping = providers.find((p: any) => p.providerName === provider);
  if (!mapping) {
    throw new AppError(`No ${provider} mapping found for this player`, 400);
  }
  const result = await syncPlayerMatches(
    provider,
    req.params.id,
    mapping.externalPlayerId,
    dateFrom,
    dateTo,
  );
  await logAudit(
    "UPDATE",
    "players",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Synced stats from ${provider}: ${result.imported} new, ${result.updated} updated matches`,
  );
  await invalidateMultiple([...PLAYER_CACHE, CachePrefix.MATCHES]);
  sendSuccess(res, result);
}
