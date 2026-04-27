/// <reference types="jest" />
// ─────────────────────────────────────────────────────────────
// tests/unit/analystviews/analystview.service.test.ts
// Unit tests for the analystviews service. Mocks the AnalystView
// Sequelize model.
// ─────────────────────────────────────────────────────────────
import { mockModelInstance, mockUser } from "../../setup/test-helpers";

const mockFindByPk = jest.fn();
const mockFindAndCountAll = jest.fn();
const mockCreate = jest.fn();

jest.mock("../../../src/config/database", () => ({
  sequelize: {
    query: jest.fn().mockResolvedValue([]),
    authenticate: jest.fn(),
  },
}));

jest.mock("../../../src/modules/analystviews/analystview.model", () => {
  const ANALYST_PERSONAS = ["Performance", "Data", "Scouting", "Commercial"];
  const ANALYST_VIEW_SHARE_SCOPES = ["private", "tenant", "roles"];
  return {
    AnalystView: {
      findByPk: (...a: unknown[]) => mockFindByPk(...a),
      findAndCountAll: (...a: unknown[]) => mockFindAndCountAll(...a),
      create: (...a: unknown[]) => mockCreate(...a),
    },
    ANALYST_PERSONAS,
    ANALYST_VIEW_SHARE_SCOPES,
  };
});

jest.mock("../../../src/config/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import * as service from "../../../src/modules/analystviews/analystview.service";
import { AppError } from "../../../src/middleware/errorHandler";

const baseView = (overrides: Record<string, unknown> = {}) => ({
  id: "view-1",
  ownerUserId: "user-1",
  persona: "Performance",
  name: "Saved view",
  description: null,
  routePath: "/analyst/players",
  paramsJson: { position: "ST" },
  isPinned: false,
  isShared: false,
  shareScope: "private",
  sharedRoleIds: null,
  lastViewedAt: null,
  viewCount: 0,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ════════════════════════════════════════════════════════
// listAnalystViews
// ════════════════════════════════════════════════════════
describe("listAnalystViews", () => {
  it("returns paginated rows for the owner", async () => {
    mockFindAndCountAll.mockResolvedValue({
      count: 1,
      rows: [mockModelInstance(baseView())],
    });

    const result = await service.listAnalystViews(
      {
        page: 1,
        limit: 50,
        sort: "last_viewed_at",
        order: "desc",
      } as never,
      mockUser({ id: "user-1", role: "Analyst" }) as never,
    );

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(mockFindAndCountAll).toHaveBeenCalledTimes(1);
  });

  it("throws 401 when no user is provided", async () => {
    await expect(
      service.listAnalystViews(
        {
          page: 1,
          limit: 50,
          sort: "last_viewed_at",
          order: "desc",
        } as never,
        undefined,
      ),
    ).rejects.toBeInstanceOf(AppError);
  });
});

// ════════════════════════════════════════════════════════
// getAnalystViewById
// ════════════════════════════════════════════════════════
describe("getAnalystViewById", () => {
  it("returns the view to its owner", async () => {
    mockFindByPk.mockResolvedValue(
      mockModelInstance(baseView({ ownerUserId: "user-1" })),
    );
    const v = await service.getAnalystViewById(
      "view-1",
      mockUser({ id: "user-1", role: "Analyst" }) as never,
    );
    expect(v.id).toBe("view-1");
  });

  it("throws 404 when not found", async () => {
    mockFindByPk.mockResolvedValue(null);
    await expect(
      service.getAnalystViewById(
        "missing",
        mockUser({ id: "user-1", role: "Analyst" }) as never,
      ),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("hides a non-shared view from a non-owner (404, not 403, to avoid leaking existence)", async () => {
    mockFindByPk.mockResolvedValue(
      mockModelInstance(
        baseView({ ownerUserId: "user-1", isShared: false }),
      ),
    );
    await expect(
      service.getAnalystViewById(
        "view-1",
        mockUser({ id: "user-2", role: "Analyst" }) as never,
      ),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("returns a tenant-shared view to any authenticated user", async () => {
    mockFindByPk.mockResolvedValue(
      mockModelInstance(
        baseView({
          ownerUserId: "user-1",
          isShared: true,
          shareScope: "tenant",
        }),
      ),
    );
    const v = await service.getAnalystViewById(
      "view-1",
      mockUser({ id: "user-2", role: "Analyst" }) as never,
    );
    expect(v.id).toBe("view-1");
  });

  it("returns a role-shared view only when role matches", async () => {
    mockFindByPk.mockResolvedValue(
      mockModelInstance(
        baseView({
          ownerUserId: "user-1",
          isShared: true,
          shareScope: "roles",
          sharedRoleIds: ["Manager"],
        }),
      ),
    );
    const v = await service.getAnalystViewById(
      "view-1",
      mockUser({ id: "user-2", role: "Manager" }) as never,
    );
    expect(v.id).toBe("view-1");

    mockFindByPk.mockResolvedValue(
      mockModelInstance(
        baseView({
          ownerUserId: "user-1",
          isShared: true,
          shareScope: "roles",
          sharedRoleIds: ["Manager"],
        }),
      ),
    );
    await expect(
      service.getAnalystViewById(
        "view-1",
        mockUser({ id: "user-3", role: "Scout" }) as never,
      ),
    ).rejects.toBeInstanceOf(AppError);
  });
});

// ════════════════════════════════════════════════════════
// createAnalystView
// ════════════════════════════════════════════════════════
describe("createAnalystView", () => {
  it("persists the payload with sensible defaults", async () => {
    mockCreate.mockImplementation(async (data: Record<string, unknown>) =>
      mockModelInstance({ id: "new-id", ...data }),
    );
    const result = await service.createAnalystView(
      {
        persona: "Scouting",
        name: "U-21 watchlist",
        routePath: "/analyst/scouting",
        paramsJson: { position: "ST" },
      } as never,
      "user-1",
    );
    expect(result.id).toBe("new-id");
    const payload = mockCreate.mock.calls[0][0];
    expect(payload).toMatchObject({
      ownerUserId: "user-1",
      persona: "Scouting",
      name: "U-21 watchlist",
      routePath: "/analyst/scouting",
      paramsJson: { position: "ST" },
      isPinned: false,
      isShared: false,
      shareScope: "private",
      sharedRoleIds: null,
    });
  });
});

// ════════════════════════════════════════════════════════
// updateAnalystView / deleteAnalystView
// ════════════════════════════════════════════════════════
describe("updateAnalystView", () => {
  it("throws 403 when caller is not the owner", async () => {
    mockFindByPk.mockResolvedValue(
      mockModelInstance(baseView({ ownerUserId: "user-1" })),
    );
    await expect(
      service.updateAnalystView(
        "view-1",
        { name: "Renamed" } as never,
        mockUser({ id: "user-2", role: "Analyst" }) as never,
      ),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe("deleteAnalystView", () => {
  it("returns the deleted id when the owner deletes their own view", async () => {
    const instance = mockModelInstance(baseView({ ownerUserId: "user-1" }));
    mockFindByPk.mockResolvedValue(instance);
    const result = await service.deleteAnalystView(
      "view-1",
      mockUser({ id: "user-1", role: "Analyst" }) as never,
    );
    expect(result).toEqual({ id: "view-1" });
  });

  it("throws 403 when caller is not the owner", async () => {
    mockFindByPk.mockResolvedValue(
      mockModelInstance(baseView({ ownerUserId: "user-1" })),
    );
    await expect(
      service.deleteAnalystView(
        "view-1",
        mockUser({ id: "user-2", role: "Analyst" }) as never,
      ),
    ).rejects.toBeInstanceOf(AppError);
  });
});
