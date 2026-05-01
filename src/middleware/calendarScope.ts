import { Response, NextFunction } from "express";
import { AuthRequest } from "@shared/types";
import {
  buildCalendarScope,
  CalendarScope,
} from "@modules/calendar/calendarScope";
import type { UserRole } from "@shared/types";

declare module "express" {
  interface Request {
    calendarScope?: CalendarScope;
  }
}

/**
 * Middleware: computes and attaches req.calendarScope for the authenticated user.
 * Must be placed after `authenticate`.
 */
export async function attachCalendarScope(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!;
    const roles: UserRole[] = [user.role];
    req.calendarScope = await buildCalendarScope(user.id, roles, user.playerId);
    next();
  } catch (err) {
    next(err);
  }
}
