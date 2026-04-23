// ── Staff Monitoring Service — lifecycle functions (Session 1)
// Aggregation functions are added in Session 2 (CLI-MON-002).

import { QueryTypes } from "sequelize";
import { sequelize } from "@config/database";
import { logger } from "@config/logger";

// ══════════════════════════════════════════════════════════════
// Session Lifecycle
// ══════════════════════════════════════════════════════════════

export interface CreateSessionInput {
  userId: string;
  userType?: "user" | "player";
  ipAddress?: string;
  userAgent?: string;
}

export async function createSession(
  input: CreateSessionInput,
): Promise<{ id: string }> {
  const { userId, userType = "user", ipAddress, userAgent } = input;

  const rows = await sequelize.query<{ id: string }>(
    `INSERT INTO user_sessions
       (user_id, user_type, started_at, last_heartbeat_at, ip_address, user_agent, created_at, updated_at)
     VALUES
       (:userId, :userType, NOW(), NOW(), :ipAddress, :userAgent, NOW(), NOW())
     RETURNING id`,
    {
      replacements: {
        userId,
        userType,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
      type: QueryTypes.SELECT,
    },
  );

  return { id: (rows[0] as { id: string }).id };
}

export async function heartbeat(userId: string): Promise<void> {
  await sequelize.query(
    `UPDATE user_sessions
     SET last_heartbeat_at = NOW(), updated_at = NOW()
     WHERE user_id = :userId AND ended_at IS NULL`,
    { replacements: { userId } },
  );
}

export async function endSession(
  userId: string,
  reason: string,
): Promise<void> {
  await sequelize.query(
    `UPDATE user_sessions
     SET ended_at = NOW(),
         end_reason = :reason,
         duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER,
         updated_at = NOW()
     WHERE user_id = :userId AND ended_at IS NULL`,
    { replacements: { userId, reason } },
  );
}

export async function endAllOpenSessions(
  userId: string,
  reason: string,
): Promise<number> {
  const result = await sequelize.query(
    `UPDATE user_sessions
     SET ended_at = NOW(),
         end_reason = :reason,
         duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER,
         updated_at = NOW()
     WHERE user_id = :userId AND ended_at IS NULL`,
    { replacements: { userId, reason } },
  );

  // result[1] is metadata; rowCount may be on the metadata object
  const meta = result[1] as { rowCount?: number } | undefined;
  return meta?.rowCount ?? 0;
}

// ══════════════════════════════════════════════════════════════
// Idle Session Closer (called by cron every 10 min)
// Closes sessions where last_heartbeat_at is older than 30 min.
// Sets ended_at = last_heartbeat_at + 5 min (the last known-active moment)
// so duration does not over-count.
// ══════════════════════════════════════════════════════════════

export async function closeIdleSessions(): Promise<number> {
  try {
    const result = await sequelize.query(
      `UPDATE user_sessions
       SET ended_at = last_heartbeat_at + INTERVAL '5 minutes',
           end_reason = 'idle_timeout',
           duration_seconds = EXTRACT(EPOCH FROM (last_heartbeat_at + INTERVAL '5 minutes' - started_at))::INTEGER,
           updated_at = NOW()
       WHERE ended_at IS NULL
         AND last_heartbeat_at < NOW() - INTERVAL '30 minutes'`,
    );

    const meta = result[1] as { rowCount?: number } | undefined;
    const closed = meta?.rowCount ?? 0;

    if (closed > 0) {
      logger.info(`[StaffMonitoring] Closed ${closed} idle sessions`);
    }

    return closed;
  } catch (err) {
    logger.error("[StaffMonitoring] closeIdleSessions failed", {
      error: (err as Error).message,
    });
    return 0;
  }
}
