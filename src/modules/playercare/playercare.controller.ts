import { Request, Response } from "express";
import { asyncHandler } from "@middleware/errorHandler";
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

export const playerCareController = {
  /** GET /api/v1/playercare — list all cases */
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = playerCareQuerySchema.parse(req.query);
    const result = await caseService.listCases(query);
    sendPaginated(res, result.data, result.meta);
  }),

  /** GET /api/v1/playercare/:id — get case detail with injury */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const caseRecord = await caseService.getCaseById(req.params.id);
    sendSuccess(res, caseRecord);
  }),

  /** POST /api/v1/playercare — create Performance/Mental case */
  create: asyncHandler(async (req: Request, res: Response) => {
    const input = createCaseSchema.parse(req.body);
    const caseRecord = await caseService.createCase(
      input,
      (req as any).user.id,
    );
    sendCreated(res, caseRecord);
  }),

  /** POST /api/v1/playercare/medical — create Medical case (injury + case) */
  createMedical: asyncHandler(async (req: Request, res: Response) => {
    const input = createMedicalCaseSchema.parse(req.body);
    const caseRecord = await caseService.createMedicalCase(
      input,
      (req as any).user.id,
    );
    sendCreated(res, caseRecord);
  }),

  /** PATCH /api/v1/playercare/:id — update case */
  update: asyncHandler(async (req: Request, res: Response) => {
    const input = updateCaseSchema.parse(req.body);
    const caseRecord = await caseService.updateCase(req.params.id, input);
    sendSuccess(res, caseRecord);
  }),

  /** PATCH /api/v1/playercare/:id/status — update status with sync */
  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const { status, outcome, notes, closureNotes } =
      updateCaseStatusSchema.parse(req.body);
    const caseRecord = await caseService.updateCaseStatus(
      req.params.id,
      status,
      outcome,
      notes,
      closureNotes,
    );
    sendSuccess(res, caseRecord);
  }),

  /** DELETE /api/v1/playercare/:id — delete case */
  delete: asyncHandler(async (req: Request, res: Response) => {
    await caseService.deleteCase(req.params.id);
    sendSuccess(res, null, "Case deleted");
  }),

  /** GET /api/v1/playercare/player/:playerId/timeline */
  timeline: asyncHandler(async (req: Request, res: Response) => {
    const { playerId } = playerIdSchema.parse(req.params);
    const timeline = await caseService.getPlayerTimeline(playerId);
    sendSuccess(res, timeline);
  }),

  /** GET /api/v1/playercare/stats */
  stats: asyncHandler(async (req: Request, res: Response) => {
    const stats = await caseService.getCaseStats();
    sendSuccess(res, stats);
  }),
};
