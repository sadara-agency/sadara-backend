import { AuditLog } from "@modules/audit/AuditLog.model";
import { AuditContext, UserRole } from "@shared/types";
import { logger } from "@config/logger";

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
  user: { id: string; fullName: string; role: UserRole | string },
  ip?: string,
): AuditContext {
  return {
    userId: user.id,
    userName: user.fullName,
    userRole: user.role as UserRole,
    ip,
  };
}

/**
 * Compare old and new values, returning only fields that changed.
 * Pass the result to logAudit() as the `changes` parameter.
 */
export function buildChanges(
  oldValues: Record<string, any>,
  newValues: Record<string, any>,
): Record<string, { old: any; new: any }> | null {
  const changes: Record<string, { old: any; new: any }> = {};

  for (const key of Object.keys(newValues)) {
    if (newValues[key] === undefined) continue;
    const oldVal = oldValues[key];
    const newVal = newValues[key];
    if (String(oldVal ?? "") === String(newVal ?? "")) continue;
    changes[key] = { old: oldVal ?? null, new: newVal ?? null };
  }

  return Object.keys(changes).length > 0 ? changes : null;
}
