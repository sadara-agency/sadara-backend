import { Request, Response } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import * as caseService from "./playercare.service";
import {
  playerCareQuerySchema,
  playerIdSchema,
  createCaseSchema,
  createMedicalCaseSchema,
  updateCaseSchema,
  updateCaseStatusSchema,
} from "./playercare.schema";

export const playerCareController = {
  /** GET /api/v1/playercare — list all cases */
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = playerCareQuerySchema.parse(req.query);
    const result = await caseService.listCases(query);
    res.json({ success: true, ...result });
  }),

  /** GET /api/v1/playercare/:id — get case detail with injury */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const caseRecord = await caseService.getCaseById(req.params.id);
    res.json({ success: true, data: caseRecord });
  }),

  /** POST /api/v1/playercare — create Performance/Mental case */
  create: asyncHandler(async (req: Request, res: Response) => {
    const input = createCaseSchema.parse(req.body);
    const caseRecord = await caseService.createCase(
      input,
      (req as any).user.id,
    );
    res.status(201).json({ success: true, data: caseRecord });
  }),

  /** POST /api/v1/playercare/medical — create Medical case (injury + case) */
  createMedical: asyncHandler(async (req: Request, res: Response) => {
    const input = createMedicalCaseSchema.parse(req.body);
    const caseRecord = await caseService.createMedicalCase(
      input,
      (req as any).user.id,
    );
    res.status(201).json({ success: true, data: caseRecord });
  }),

  /** PATCH /api/v1/playercare/:id — update case */
  update: asyncHandler(async (req: Request, res: Response) => {
    const input = updateCaseSchema.parse(req.body);
    const caseRecord = await caseService.updateCase(req.params.id, input);
    res.json({ success: true, data: caseRecord });
  }),

  /** PATCH /api/v1/playercare/:id/status — update status with sync */
  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const { status, outcome, notes } = updateCaseStatusSchema.parse(req.body);
    const caseRecord = await caseService.updateCaseStatus(
      req.params.id,
      status,
      outcome,
      notes,
    );
    res.json({ success: true, data: caseRecord });
  }),

  /** DELETE /api/v1/playercare/:id — delete case */
  delete: asyncHandler(async (req: Request, res: Response) => {
    await caseService.deleteCase(req.params.id);
    res.json({ success: true, message: "Case deleted" });
  }),

  /** GET /api/v1/playercare/player/:playerId/timeline */
  timeline: asyncHandler(async (req: Request, res: Response) => {
    const { playerId } = playerIdSchema.parse(req.params);
    const timeline = await caseService.getPlayerTimeline(playerId);
    res.json({ success: true, data: timeline });
  }),

  /** GET /api/v1/playercare/stats */
  stats: asyncHandler(async (req: Request, res: Response) => {
    const stats = await caseService.getCaseStats();
    res.json({ success: true, data: stats });
  }),
};
