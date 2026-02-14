import { AuditLog } from '../../modules/audit/AuditLog.model';
import { AuditContext } from '../types';

export async function logAudit(
  action: string,
  entity: string,
  entityId: string | null,
  context: AuditContext,
  detail?: string,
  changes?: Record<string, { old: any; new: any }>
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
    console.error('Audit log error:', err);
  }
}

export function buildAuditContext(user: { id: string; fullName: string; role: string }, ip?: string): AuditContext {
  return {
    userId: user.id,
    userName: user.fullName,
    userRole: user.role as any,
    ip,
  };
}