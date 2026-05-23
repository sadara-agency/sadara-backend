import { UniqueConstraintError } from "sequelize";

// ── Mock model ──

jest.mock(
  "../../../src/modules/transfer-windows/transferWindow.model",
  () => ({
    __esModule: true,
    default: {
      findAndCountAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
    },
  }),
);

jest.mock("@shared/utils/pagination", () => ({
  parsePagination: jest.fn((q, defaultSort) => ({
    page: q.page ?? 1,
    limit: q.limit ?? 20,
    sort: q.sort ?? defaultSort ?? "createdAt",
    order: q.order ?? "DESC",
    offset: ((q.page ?? 1) - 1) * (q.limit ?? 20),
  })),
  buildMeta: jest.fn((count, page, limit) => ({
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  })),
}));

import TransferWindow from "../../../src/modules/transfer-windows/transferWindow.model";
import {
  listTransferWindows,
  getTransferWindowById,
  createTransferWindow,
  updateTransferWindow,
  deleteTransferWindow,
} from "../../../src/modules/transfer-windows/transferWindow.service";

// ── Helpers ──

function freshWindow(overrides: Record<string, unknown> = {}) {
  return {
    id: "tw-1",
    season: "2025-26",
    status: "Upcoming",
    startDate: "2025-07-01",
    endDate: "2025-08-31",
    shortlistThreshold: 60,
    ...overrides,
    update: jest.fn().mockImplementation(function (this: Record<string, unknown>, data: Record<string, unknown>) {
      Object.assign(this, data);
      return Promise.resolve(this);
    }),
    destroy: jest.fn().mockResolvedValue(undefined),
  };
}

const defaultQuery = {
  page: 1,
  limit: 20,
  sort: "start_date" as const,
  order: "desc" as const,
};

// ═══════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════

describe("TransferWindowService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── listTransferWindows ──

  describe("listTransferWindows", () => {
    it("returns paginated windows with meta", async () => {
      const rows = [freshWindow()];
      (TransferWindow.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 1,
        rows,
      });

      const result = await listTransferWindows(defaultQuery);

      expect(TransferWindow.findAndCountAll).toHaveBeenCalled();
      expect(result.data).toEqual(rows);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it("applies status filter", async () => {
      (TransferWindow.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      await listTransferWindows({ ...defaultQuery, status: "Active" });

      const call = (TransferWindow.findAndCountAll as jest.Mock).mock.calls[0][0];
      expect(call.where.status).toBe("Active");
    });

    it("returns empty list when no windows match", async () => {
      (TransferWindow.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      const result = await listTransferWindows(defaultQuery);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  // ── getTransferWindowById ──

  describe("getTransferWindowById", () => {
    it("returns window when found", async () => {
      const window = freshWindow();
      (TransferWindow.findByPk as jest.Mock).mockResolvedValue(window);

      const result = await getTransferWindowById("tw-1");

      expect(TransferWindow.findByPk).toHaveBeenCalledWith("tw-1");
      expect(result).toEqual(window);
    });

    it("throws 404 when not found", async () => {
      (TransferWindow.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(getTransferWindowById("missing")).rejects.toMatchObject({
        statusCode: 404,
        message: "Transfer window not found",
      });
    });
  });

  // ── createTransferWindow ──

  describe("createTransferWindow", () => {
    it("creates and returns new window", async () => {
      const input = {
        season: "2025-26",
        startDate: "2025-07-01",
        endDate: "2025-08-31",
        shortlistThreshold: 60,
        status: "Upcoming" as const,
      };
      const created = freshWindow(input);
      (TransferWindow.create as jest.Mock).mockResolvedValue(created);

      const result = await createTransferWindow(input, "user-1");

      expect(TransferWindow.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(created);
    });

    it("throws 409 on duplicate season constraint", async () => {
      (TransferWindow.create as jest.Mock).mockRejectedValue(
        new UniqueConstraintError({ message: "Unique violation", errors: [] }),
      );

      await expect(
        createTransferWindow(
          {
            season: "2025-26",
            startDate: "2025-07-01",
            endDate: "2025-08-31",
            shortlistThreshold: 60,
            status: "Upcoming" as const,
          },
          "user-1",
        ),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "Window already exists for this season",
      });
    });
  });

  // ── updateTransferWindow ──

  describe("updateTransferWindow", () => {
    it("finds window and updates it", async () => {
      const window = freshWindow({ status: "Upcoming" });
      (TransferWindow.findByPk as jest.Mock).mockResolvedValue(window);

      await updateTransferWindow("tw-1", { status: "Closed" });

      expect(window.update).toHaveBeenCalledWith({ status: "Closed" });
    });

    it("throws 404 when window not found", async () => {
      (TransferWindow.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(
        updateTransferWindow("missing", { status: "Closed" }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ── deleteTransferWindow ──

  describe("deleteTransferWindow", () => {
    it("deletes and returns { id }", async () => {
      const window = freshWindow();
      (TransferWindow.findByPk as jest.Mock).mockResolvedValue(window);

      const result = await deleteTransferWindow("tw-1");

      expect(window.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: "tw-1" });
    });

    it("throws 404 when window not found", async () => {
      (TransferWindow.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(deleteTransferWindow("missing")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
