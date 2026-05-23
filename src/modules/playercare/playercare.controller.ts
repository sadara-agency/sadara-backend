import { Request, Response } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import type { AuthRequest } from "@shared/types";
import { invalidateMultiple } from "@shared/utils/cache";
import * as caseService from "./playercare.service";
import {
  sendSuccess,
  sendPaginated,
  sendCreated,
} from "@shared/utils/apiResponse";
import {
  playerCareQuerySchema,
  playerIdSchema,
  createCaseSchema,
  createMedicalCaseSchema,
  updateCaseSchema,
  updateCaseStatusSchema,
} from "./playercare.validation";

const PLAYERCARE_CACHES = ["playercare"];

export const playerCareController = {
  /** GET /api/v1/playercare — list all cases */
  list: asyncHandler(async (req: AuthRequest, res: Response) => {
    const query = playerCareQuerySchema.parse(req.query);
    const result = await caseService.listCases(query, req.user);
    sendPaginated(res, result.data, result.meta);
  }),

  /** GET /api/v1/playercare/:id — get case detail with injury */
  getById: asyncHandler(async (req: AuthRequest, res: Response) => {
    const caseRecord = await caseService.getCaseById(req.params.id, req.user);
    sendSuccess(res, caseRecord);
  }),

  /** POST /api/v1/playercare — create Performance/Mental case */
  create: asyncHandler(async (req: Request, res: Response) => {
    const input = createCaseSchema.parse(req.body);
    const caseRecord = await caseService.createCase(
      input,
      (req as any).user.id,
    );
    void invalidateMultiple(PLAYERCARE_CACHES);
    sendCreated(res, caseRecord);
  }),

  /** POST /api/v1/playercare/medical — create Medical case (injury + case) */
  createMedical: asyncHandler(async (req: Request, res: Response) => {
    const input = createMedicalCaseSchema.parse(req.body);
    const caseRecord = await caseService.createMedicalCase(
      input,
      (req as any).user.id,
    );
    void invalidateMultiple(PLAYERCARE_CACHES);
    sendCreated(res, caseRecord);
  }),

  /** PATCH /api/v1/playercare/:id — update case */
  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const input = updateCaseSchema.parse(req.body);
    const caseRecord = await caseService.updateCase(
      req.params.id,
      input,
      req.user,
    );
    void invalidateMultiple(PLAYERCARE_CACHES);
    sendSuccess(res, caseRecord);
  }),

  /** PATCH /api/v1/playercare/:id/status — update status with sync */
  updateStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, outcome, notes, closureNotes } =
      updateCaseStatusSchema.parse(req.body);
    const caseRecord = await caseService.updateCaseStatus(
      req.params.id,
      status,
      outcome,
      notes,
      closureNotes,
      req.user,
    );
    void invalidateMultiple(PLAYERCARE_CACHES);
    sendSuccess(res, caseRecord);
  }),

  /** DELETE /api/v1/playercare/:id — delete case */
  delete: asyncHandler(async (req: AuthRequest, res: Response) => {
    await caseService.deleteCase(req.params.id, req.user);
    void invalidateMultiple(PLAYERCARE_CACHES);
    sendSuccess(res, null, "Case deleted");
  }),

  /** GET /api/v1/playercare/player/:playerId/timeline */
  timeline: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { playerId } = playerIdSchema.parse(req.params);
    const timeline = await caseService.getPlayerTimeline(playerId, req.user);
    sendSuccess(res, timeline);
  }),

  /** GET /api/v1/playercare/stats */
  stats: asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await caseService.getCaseStats(req.user);
    sendSuccess(res, stats);
  }),
};
