import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendPaginated } from "@shared/utils/apiResponse";
import * as auditService from "@modules/audit/audit.service";

export async function list(req: AuthRequest, res: Response) {
  const result = await auditService.listAuditLogs(req.query);

  const mapped = result.data.map((log) => ({
    id: log.id,
    action: log.action,
    entity: log.entity,
    entityType: log.entity,
    performedBy: log.userName || "System",
    performedAt: log.loggedAt?.toISOString?.() || new Date().toISOString(),
    details: log.detail || "",
  }));

  sendPaginated(res, mapped, result.meta);
}
