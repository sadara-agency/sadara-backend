import { AuditLog } from "../../modules/audit/AuditLog.model";
import { AuditContext } from "../types";
import { logger } from "../../config/logger";

export async function logAudit(
  action: string,
  entity: string,
  entityId: string | null,
  context: AuditContext,
  detail?: string,
  changes?: Record<string, { old: any; new: any }>,
): Promise<void> {
  try {
    // Sequelize handles the INSERT and JSON stringifying automatically
    await AuditLog.create({
      action,
      userId: context.userId,
      userName: context.userName,
      userRole: context.userRole,
      entity,
      entityId,
      detail: detail || null,
      changes: changes || null,
      ipAddress: context.ip || null,
    });
  } catch (err) {
    logger.error("Audit log write failed", {
      action,
      entity,
      entityId,
      userId: context.userId,
      error: (err as Error).message,
    });
  }
}

export function buildAuditContext(
  user: { id: string; fullName: string; role: string },
  ip?: string,
): AuditContext {
  return {
    userId: user.id,
    userName: user.fullName,
    userRole: user.role as any,
    ip,
  };
}
