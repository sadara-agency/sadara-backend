import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess } from "@shared/utils/apiResponse";
import { AppError } from "@middleware/errorHandler";
import * as coachService from "@modules/dashboard/coach.service";
import {
  attendanceTrendQuerySchema,
  taskVelocityQuerySchema,
} from "@modules/dashboard/coach.validation";

function requireUser(req: AuthRequest) {
  if (!req.user) throw new AppError("Unauthenticated", 401);
  return req.user;
}

// GET /dashboard/coach/kpi-strip
export async function getKpiStrip(req: AuthRequest, res: Response) {
  const data = await coachService.getKpiStrip(requireUser(req));
  sendSuccess(res, data);
}

// GET /dashboard/coach/agenda
export async function getAgenda(req: AuthRequest, res: Response) {
  const data = await coachService.getAgenda(requireUser(req));
  sendSuccess(res, data);
}

// GET /dashboard/coach/alerts
export async function getAlerts(req: AuthRequest, res: Response) {
  const data = await coachService.getAlerts(requireUser(req));
  sendSuccess(res, data);
}

// GET /dashboard/coach/attendance-trend
export async function getAttendanceTrend(req: AuthRequest, res: Response) {
  const { days } = attendanceTrendQuerySchema.parse(req.query);
  const data = await coachService.getAttendanceTrend(requireUser(req), days);
  sendSuccess(res, data);
}

// GET /dashboard/coach/task-velocity
export async function getTaskVelocity(req: AuthRequest, res: Response) {
  const { weeks } = taskVelocityQuerySchema.parse(req.query);
  const data = await coachService.getTaskVelocity(requireUser(req), weeks);
  sendSuccess(res, data);
}
