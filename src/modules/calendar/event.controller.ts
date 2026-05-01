import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess, sendPaginated } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { createCrudController } from "@shared/utils/crudController";
import * as eventService from "@modules/calendar/event.service";
import type { CalendarScope } from "@modules/calendar/calendarScope";

declare module "express" {
  interface Request {
    calendarScope?: CalendarScope;
  }
}

const crud = createCrudController({
  service: {
    list: (query) => eventService.listEvents(query),
    getById: (id) => eventService.getEventById(id),
    create: (body, userId) => eventService.createEvent(body, userId),
    update: (id, body) => eventService.updateEvent(id, body),
    delete: (id) => eventService.deleteEvent(id),
  },
  entity: "calendar",
  cachePrefixes: [],
  label: (e) => e.title,
});

// Override list to use aggregated endpoint with scope-based filtering
export async function list(req: AuthRequest, res: Response) {
  const result = await eventService.listAggregatedEvents(
    req.query,
    req.calendarScope!,
  );
  sendPaginated(res, result.data, result.meta);
}

export const { getById, create, update, remove } = crud;

// Debug: return the resolved calendar scope for the current user (read-only)
export async function getScope(req: AuthRequest, res: Response) {
  sendSuccess(res, req.calendarScope ?? null);
}

// Source detail for virtual events
export async function getSourceDetail(req: AuthRequest, res: Response) {
  const { sourceType, sourceId } = req.params;
  const data = await eventService.getSourceDetail(sourceType, sourceId);
  sendSuccess(res, data);
}
