/// <reference types="jest" />
import { AppError } from "@middleware/errorHandler";

const mockItemFindByPk = jest.fn();
const mockItemFindAndCountAll = jest.fn();
const mockItemFindAll = jest.fn();
const mockItemCreate = jest.fn();
const mockItemCount = jest.fn();
const mockEventCreate = jest.fn();
const mockPlayerFindByPk = jest.fn();
const mockUserFindByPk = jest.fn();
const mockUserFindOne = jest.fn();
const mockNotifyUser = jest.fn();
const mockNotifyByRole = jest.fn();
const mockLogAudit = jest.fn();
const mockGetLinkedPlayer = jest.fn();
const mockBuildRowScope = jest.fn();

jest.mock("@config/database", () => ({
  sequelize: { query: jest.fn(), authenticate: jest.fn() },
}));

const ITEM_ATTRS = {
  id: {},
  playerId: {},
  issuedByUserId: {},
  category: {},
  title: {},
  titleAr: {},
  body: {},
  bodyAr: {},
  priority: {},
  requiresAcknowledgement: {},
  fineAmount: {},
  fineCurrency: {},
  dueAt: {},
  status: {},
  firstViewedAt: {},
  acknowledgedAt: {},
  resolvedAt: {},
  resolvedByUserId: {},
  attachmentDocumentId: {},
  staffNotes: {},
};

jest.mock("./playerInbox.model", () => ({
  __esModule: true,
  default: {
    findByPk: (...a: unknown[]) => mockItemFindByPk(...a),
    findAndCountAll: (...a: unknown[]) => mockItemFindAndCountAll(...a),
    findAll: (...a: unknown[]) => mockItemFindAll(...a),
    create: (...a: unknown[]) => mockItemCreate(...a),
    count: (...a: unknown[]) => mockItemCount(...a),
    getAttributes: () => ITEM_ATTRS,
    belongsTo: jest.fn(),
  },
  PlayerInboxItem: {
    findByPk: (...a: unknown[]) => mockItemFindByPk(...a),
    findAndCountAll: (...a: unknown[]) => mockItemFindAndCountAll(...a),
    findAll: (...a: unknown[]) => mockItemFindAll(...a),
    create: (...a: unknown[]) => mockItemCreate(...a),
    count: (...a: unknown[]) => mockItemCount(...a),
    getAttributes: () => ITEM_ATTRS,
    belongsTo: jest.fn(),
  },
  PlayerInboxEvent: {
    create: (...a: unknown[]) => mockEventCreate(...a),
  },
}));

jest.mock("@modules/players/player.model", () => ({
  Player: {
    findByPk: (...a: unknown[]) => mockPlayerFindByPk(...a),
    name: "Player",
  },
}));

jest.mock("@modules/users/user.model", () => ({
  User: {
    findByPk: (...a: unknown[]) => mockUserFindByPk(...a),
    findOne: (...a: unknown[]) => mockUserFindOne(...a),
    name: "User",
  },
}));

jest.mock("@modules/documents/document.model", () => ({
  Document: { name: "Document" },
}));

jest.mock("@modules/notifications/notification.service", () => ({
  notifyUser: (...a: unknown[]) => mockNotifyUser(...a),
  notifyByRole: (...a: unknown[]) => mockNotifyByRole(...a),
}));

jest.mock("@shared/utils/audit", () => ({
  logAudit: (...a: unknown[]) => mockLogAudit(...a),
}));

jest.mock("@modules/portal/portal.service", () => ({
  getLinkedPlayer: (...a: unknown[]) => mockGetLinkedPlayer(...a),
}));

jest.mock("@shared/utils/rowScope", () => ({
  buildRowScope: (...a: unknown[]) => mockBuildRowScope(...a),
  mergeScope: jest.fn(),
  isBypassRole: (role: string) =>
    ["Admin", "Manager", "Executive", "SportingDirector"].includes(role),
}));

jest.mock("@config/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import * as svc from "./playerInbox.service";

function makeItem(overrides: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = {
    id: "item-1",
    playerId: "player-1",
    issuedByUserId: "director-1",
    category: "disciplinary",
    title: "Media training",
    titleAr: null,
    body: "Attend media training Friday",
    bodyAr: null,
    priority: "normal",
    requiresAcknowledgement: true,
    fineAmount: null,
    fineCurrency: null,
    dueAt: null,
    status: "Sent",
    firstViewedAt: null,
    acknowledgedAt: null,
    ...overrides,
  };
  return {
    ...data,
    get: () => data,
    update: jest.fn(async (patch: Record<string, unknown>) => {
      Object.assign(data, patch);
      return data;
    }),
    destroy: jest.fn(),
  };
}

const director = {
  id: "director-1",
  email: "d@x.com",
  fullName: "Dir",
  role: "SportingDirector" as const,
};
const ctx = {
  userId: "director-1",
  userName: "Dir",
  userRole: "SportingDirector" as never,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockBuildRowScope.mockResolvedValue(null);
  mockEventCreate.mockResolvedValue({});
  mockNotifyUser.mockResolvedValue(undefined);
  mockNotifyByRole.mockResolvedValue(undefined);
  mockLogAudit.mockResolvedValue(undefined);
});

describe("createInboxItem", () => {
  it("creates an item, records a 'sent' event, returns it", async () => {
    mockPlayerFindByPk.mockResolvedValue({
      id: "player-1",
      firstName: "Sam",
      lastName: "Lee",
    });
    const created = makeItem();
    mockItemCreate.mockResolvedValue(created);
    mockUserFindOne.mockResolvedValue({ id: "user-1" });

    const result = await svc.createInboxItem(
      {
        playerId: "player-1",
        category: "disciplinary",
        title: "Media training",
        body: "Attend",
      },
      "director-1",
      ctx,
    );

    expect(result).toBe(created);
    expect(mockItemCreate).toHaveBeenCalled();
    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "sent", inboxItemId: "item-1" }),
    );
  });

  it("throws 404 when player does not exist", async () => {
    mockPlayerFindByPk.mockResolvedValue(null);
    await expect(
      svc.createInboxItem(
        { playerId: "nope", category: "directive", title: "x", body: "y" },
        "director-1",
        ctx,
      ),
    ).rejects.toThrow(AppError);
  });
});

describe("getMyInboxItemById — first view side effect", () => {
  it("stamps firstViewedAt and flips status Sent→Viewed", async () => {
    mockGetLinkedPlayer.mockResolvedValue({ id: "player-1" });
    const item = makeItem({ status: "Sent", firstViewedAt: null });
    mockItemFindByPk.mockResolvedValue(item);

    const result = await svc.getMyInboxItemById("user-1", "item-1");

    expect(item.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "Viewed",
        firstViewedAt: expect.any(Date),
      }),
    );
    expect(result).toBe(item);
  });

  it("does not re-stamp when firstViewedAt already set", async () => {
    mockGetLinkedPlayer.mockResolvedValue({ id: "player-1" });
    const item = makeItem({ status: "Viewed", firstViewedAt: new Date() });
    mockItemFindByPk.mockResolvedValue(item);

    await svc.getMyInboxItemById("user-1", "item-1");
    expect(item.update).not.toHaveBeenCalled();
  });

  it("throws 404 when item belongs to another player", async () => {
    mockGetLinkedPlayer.mockResolvedValue({ id: "player-2" });
    mockItemFindByPk.mockResolvedValue(makeItem({ playerId: "player-1" }));
    await expect(svc.getMyInboxItemById("user-1", "item-1")).rejects.toThrow(
      AppError,
    );
  });
});

describe("acknowledgeInboxItem", () => {
  it("acknowledges, stamps acknowledgedAt, records event", async () => {
    mockGetLinkedPlayer.mockResolvedValue({ id: "player-1" });
    const item = makeItem({ status: "Viewed", firstViewedAt: new Date() });
    mockItemFindByPk.mockResolvedValue(item);
    mockPlayerFindByPk.mockResolvedValue({ firstName: "Sam", lastName: "Lee" });
    mockUserFindByPk.mockResolvedValue({ id: "director-1" });

    const result = await svc.acknowledgeInboxItem("user-1", "item-1", ctx);

    expect(item.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "Acknowledged",
        acknowledgedAt: expect.any(Date),
      }),
    );
    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "acknowledged" }),
    );
    expect(result).toBe(item);
  });

  it("rejects a second acknowledge with 422", async () => {
    mockGetLinkedPlayer.mockResolvedValue({ id: "player-1" });
    mockItemFindByPk.mockResolvedValue(makeItem({ status: "Acknowledged" }));
    await expect(
      svc.acknowledgeInboxItem("user-1", "item-1", ctx),
    ).rejects.toThrow(/already been acknowledged/);
  });

  it("rejects acknowledge on a cancelled item with 422", async () => {
    mockGetLinkedPlayer.mockResolvedValue({ id: "player-1" });
    mockItemFindByPk.mockResolvedValue(makeItem({ status: "Cancelled" }));
    await expect(
      svc.acknowledgeInboxItem("user-1", "item-1", ctx),
    ).rejects.toThrow(/cancelled/);
  });

  it("rejects acknowledge by a non-owning player with 404", async () => {
    mockGetLinkedPlayer.mockResolvedValue({ id: "player-2" });
    mockItemFindByPk.mockResolvedValue(makeItem({ playerId: "player-1" }));
    await expect(
      svc.acknowledgeInboxItem("user-1", "item-1", ctx),
    ).rejects.toThrow(AppError);
  });
});

describe("resolveInboxItem / cancelInboxItem", () => {
  it("resolve sets status Resolved + resolvedAt + records event", async () => {
    const item = makeItem({ status: "Acknowledged" });
    mockItemFindByPk.mockResolvedValue(item);
    mockUserFindOne.mockResolvedValue({ id: "user-1" });

    await svc.resolveInboxItem("item-1", director, ctx);
    expect(item.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "Resolved",
        resolvedAt: expect.any(Date),
      }),
    );
    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "resolved" }),
    );
  });

  it("cancel sets status Cancelled + records event", async () => {
    const item = makeItem({ status: "Sent" });
    mockItemFindByPk.mockResolvedValue(item);
    mockUserFindOne.mockResolvedValue({ id: "user-1" });

    await svc.cancelInboxItem("item-1", { reason: "rescinded" }, director, ctx);
    expect(item.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "Cancelled" }),
    );
    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "cancelled" }),
    );
  });
});

describe("listMyInboxItems", () => {
  it("excludes staffNotes from the player projection", async () => {
    mockGetLinkedPlayer.mockResolvedValue({ id: "player-1" });
    mockItemFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await svc.listMyInboxItems("user-1", {
      page: 1,
      limit: 50,
      sort: "created_at",
      order: "desc",
    });

    const callArg = mockItemFindAndCountAll.mock.calls[0][0] as {
      attributes: string[];
    };
    expect(callArg.attributes).not.toContain("staffNotes");
    expect(callArg.attributes).toContain("title");
  });
});

describe("getMyInboxSummary", () => {
  it("returns total + unread + byCategory", async () => {
    mockGetLinkedPlayer.mockResolvedValue({ id: "player-1" });
    mockItemCount.mockResolvedValueOnce(5).mockResolvedValueOnce(2);
    mockItemFindAll.mockResolvedValue([
      { category: "disciplinary" },
      { category: "fine" },
    ]);

    const result = await svc.getMyInboxSummary("user-1");
    expect(result).toEqual({
      total: 5,
      unread: 2,
      byCategory: { disciplinary: 1, fine: 1 },
    });
  });
});
