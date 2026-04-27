import { createHash, randomUUID } from "crypto";
import { Op } from "sequelize";
import { AuditLog } from "@modules/audit/AuditLog.model";
import { AuditContext, UserRole } from "@shared/types";
import { logger } from "@config/logger";

export function computeAuditHash(entry: {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  userId: string | null;
  loggedAt: string;
  prevHash: string | null;
}): string {
  const payload = [
    entry.id,
    entry.action,
    entry.entity,
    entry.entityId ?? "",
    entry.userId ?? "",
    entry.loggedAt,
    entry.prevHash ?? "",
  ].join("|");
  return createHash("sha256").update(payload).digest("hex");
}

export async function logAudit(
  action: string,
  entity: string,
  entityId: string | null,
  context: AuditContext,
  detail?: string,
  changes?: Record<string, { old: any; new: any }>,
): Promise<void> {
  try {
    const last = await AuditLog.findOne({
      attributes: ["hash"],
      order: [["loggedAt", "DESC"]],
    });
    const prevHash = last?.hash ?? null;
    const id = randomUUID();
    const loggedAt = new Date();
    const hash = computeAuditHash({
      id,
      action,
      entity,
      entityId: entityId ?? null,
      userId: context.userId,
      loggedAt: loggedAt.toISOString(),
      prevHash,
    });

    await AuditLog.create({
      id,
      action,
      userId: context.userId,
      userName: context.userName,
      userRole: context.userRole,
      entity,
      entityId,
      detail: detail || null,
      changes: changes || null,
      ipAddress: context.ip || null,
      loggedAt,
      hash,
      prevHash,
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

/** Verify hash-chain integrity for the last N hashed audit entries. */
export async function verifyAuditChain(
  limit = 1000,
): Promise<{ valid: boolean; checked: number; errors: string[] }> {
  const entries = await AuditLog.findAll({
    attributes: [
      "id",
      "action",
      "entity",
      "entityId",
      "userId",
      "loggedAt",
      "hash",
      "prevHash",
    ],
    where: { hash: { [Op.ne]: null } },
    order: [["loggedAt", "ASC"]],
    limit,
  });

  const errors: string[] = [];

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const expected = computeAuditHash({
      id: e.id,
      action: e.action,
      entity: e.entity,
      entityId: e.entityId,
      userId: e.userId,
      loggedAt: e.loggedAt.toISOString(),
      prevHash: e.prevHash ?? null,
    });

    if (e.hash !== expected) {
      errors.push(`Hash mismatch at entry ${e.id}`);
    }

    if (i > 0 && entries[i - 1].hash && e.prevHash !== entries[i - 1].hash) {
      errors.push(`Chain break at entry ${e.id}`);
    }
  }

  return { valid: errors.length === 0, checked: entries.length, errors };
}
