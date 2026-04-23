/// <reference types="jest" />
// ─────────────────────────────────────────────────────────────
// tests/unit/staffMonitoring/lifecycle.test.ts
// Unit tests for staffMonitoring.service lifecycle functions
// ─────────────────────────────────────────────────────────────

const mockQuery = jest.fn();

jest.mock("../../../src/config/database", () => ({
  sequelize: { query: (...args: unknown[]) => mockQuery(...args) },
}));

jest.mock("../../../src/config/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as svc from "../../../src/modules/staffMonitoring/staffMonitoring.service";

const USER_ID = "550e8400-e29b-41d4-a716-446655440001";

beforeEach(() => {
  mockQuery.mockReset();
});

// ══════════════════════════════════════════════════════════════
// createSession
// ══════════════════════════════════════════════════════════════

describe("createSession", () => {
  it("inserts a row and returns the id", async () => {
    mockQuery.mockResolvedValueOnce([{ id: "session-uuid" }]);

    const result = await svc.createSession({ userId: USER_ID });

    expect(result).toEqual({ id: "session-uuid" });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO user_sessions"),
      expect.objectContaining({
        replacements: expect.objectContaining({ userId: USER_ID, userType: "user" }),
      }),
    );
  });

  it("defaults userType to 'user' and ip/ua to null", async () => {
    mockQuery.mockResolvedValueOnce([{ id: "session-uuid-2" }]);

    await svc.createSession({ userId: USER_ID });

    const callArgs = mockQuery.mock.calls[0][1] as { replacements: Record<string, unknown> };
    expect(callArgs.replacements.userType).toBe("user");
    expect(callArgs.replacements.ipAddress).toBeNull();
    expect(callArgs.replacements.userAgent).toBeNull();
  });

  it("passes ip and userAgent when provided", async () => {
    mockQuery.mockResolvedValueOnce([{ id: "session-uuid-3" }]);

    await svc.createSession({
      userId: USER_ID,
      userType: "player",
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0",
    });

    const callArgs = mockQuery.mock.calls[0][1] as { replacements: Record<string, unknown> };
    expect(callArgs.replacements.userType).toBe("player");
    expect(callArgs.replacements.ipAddress).toBe("192.168.1.1");
    expect(callArgs.replacements.userAgent).toBe("Mozilla/5.0");
  });
});

// ══════════════════════════════════════════════════════════════
// heartbeat
// ══════════════════════════════════════════════════════════════

describe("heartbeat", () => {
  it("updates last_heartbeat_at for open sessions", async () => {
    mockQuery.mockResolvedValueOnce([[], { rowCount: 1 }]);

    await svc.heartbeat(USER_ID);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("last_heartbeat_at = NOW()"),
      expect.objectContaining({ replacements: { userId: USER_ID } }),
    );
  });
});

// ══════════════════════════════════════════════════════════════
// endSession
// ══════════════════════════════════════════════════════════════

describe("endSession", () => {
  it("stamps ended_at, end_reason, and duration_seconds", async () => {
    mockQuery.mockResolvedValueOnce([[], { rowCount: 1 }]);

    await svc.endSession(USER_ID, "logout");

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("ended_at = NOW()"),
      expect.objectContaining({
        replacements: { userId: USER_ID, reason: "logout" },
      }),
    );
  });
});

// ══════════════════════════════════════════════════════════════
// endAllOpenSessions
// ══════════════════════════════════════════════════════════════

describe("endAllOpenSessions", () => {
  it("closes all open sessions and returns row count", async () => {
    mockQuery.mockResolvedValueOnce([[], { rowCount: 3 }]);

    const count = await svc.endAllOpenSessions(USER_ID, "refresh_revoked");

    expect(count).toBe(3);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("ended_at = NOW()"),
      expect.objectContaining({
        replacements: { userId: USER_ID, reason: "refresh_revoked" },
      }),
    );
  });

  it("returns 0 when rowCount is missing", async () => {
    mockQuery.mockResolvedValueOnce([[], {}]);

    const count = await svc.endAllOpenSessions(USER_ID, "forced");
    expect(count).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
// closeIdleSessions
// ══════════════════════════════════════════════════════════════

describe("closeIdleSessions", () => {
  it("closes sessions with stale heartbeat and returns count", async () => {
    mockQuery.mockResolvedValueOnce([[], { rowCount: 5 }]);

    const count = await svc.closeIdleSessions();

    expect(count).toBe(5);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("idle_timeout"),
    );
  });

  it("returns 0 when no idle sessions exist", async () => {
    mockQuery.mockResolvedValueOnce([[], { rowCount: 0 }]);
    const count = await svc.closeIdleSessions();
    expect(count).toBe(0);
  });

  it("returns 0 and does not throw when the query fails", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB error"));
    const count = await svc.closeIdleSessions();
    expect(count).toBe(0);
  });
});
