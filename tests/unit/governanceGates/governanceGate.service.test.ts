// ── Mock model ──

jest.mock("../../../src/modules/governanceGates/governanceGate.model", () => ({
  __esModule: true,
  default: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("@shared/utils/pagination", () => ({
  buildMeta: jest.fn((count, page, limit) => ({
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  })),
}));

import GovernanceGate from "../../../src/modules/governanceGates/governanceGate.model";
import {
  listGates,
  getGateById,
  triggerGate,
  resolveGate,
  deleteGate,
} from "../../../src/modules/governanceGates/governanceGate.service";

// ── Helpers ──

function freshGate(overrides: Record<string, unknown> = {}) {
  return {
    id: "gate-1",
    gateType: "cross_border_transfer",
    entityType: "contract",
    entityId: "contract-1",
    status: "pending",
    triggeredBy: "user-1",
    triggeredByRole: "Manager",
    ...overrides,
    update: jest.fn().mockImplementation(function (this: Record<string, unknown>, data: Record<string, unknown>) {
      Object.assign(this, data);
      return Promise.resolve(this);
    }),
    destroy: jest.fn().mockResolvedValue(undefined),
  };
}

const mockUser = { id: "user-1", role: "Manager" } as any;

// ═══════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════

describe("GovernanceGateService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── listGates ──

  describe("listGates", () => {
    it("returns paginated gates with meta", async () => {
      const rows = [freshGate()];
      (GovernanceGate.findAndCountAll as jest.Mock).mockResolvedValue({
        rows,
        count: 1,
      });

      const result = await listGates({ page: 1, limit: 20 });

      expect(GovernanceGate.findAndCountAll).toHaveBeenCalled();
      expect(result.data).toEqual(rows);
      expect(result.meta.total).toBe(1);
    });

    it("applies status filter", async () => {
      (GovernanceGate.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: [],
        count: 0,
      });

      await listGates({ status: "pending" });

      const call = (GovernanceGate.findAndCountAll as jest.Mock).mock.calls[0][0];
      expect(call.where.status).toBe("pending");
    });

    it("applies gateType filter", async () => {
      (GovernanceGate.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: [],
        count: 0,
      });

      await listGates({ gateType: "ContractApproval" });

      const call = (GovernanceGate.findAndCountAll as jest.Mock).mock.calls[0][0];
      expect(call.where.gateType).toBe("ContractApproval");
    });

    it("applies entityType filter", async () => {
      (GovernanceGate.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: [],
        count: 0,
      });

      await listGates({ entityType: "contract" });

      const call = (GovernanceGate.findAndCountAll as jest.Mock).mock.calls[0][0];
      expect(call.where.entityType).toBe("contract");
    });
  });

  // ── getGateById ──

  describe("getGateById", () => {
    it("returns gate when found", async () => {
      const gate = freshGate();
      (GovernanceGate.findByPk as jest.Mock).mockResolvedValue(gate);

      const result = await getGateById("gate-1");

      expect(GovernanceGate.findByPk).toHaveBeenCalledWith("gate-1");
      expect(result).toEqual(gate);
    });

    it("throws 404 when not found", async () => {
      (GovernanceGate.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(getGateById("missing")).rejects.toMatchObject({
        statusCode: 404,
        message: "Governance gate not found",
      });
    });
  });

  // ── triggerGate ──

  describe("triggerGate", () => {
    it("creates gate with pending status and user info", async () => {
      const created = freshGate();
      (GovernanceGate.create as jest.Mock).mockResolvedValue(created);

      const input = {
        gateType: "cross_border_transfer" as const,
        entityType: "contract",
        entityId: "72b8c7a4-1234-4567-89ab-cdef01234567",
      };

      const result = await triggerGate(input, mockUser);

      expect(GovernanceGate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          gateType: "cross_border_transfer",
          entityType: "contract",
          status: "pending",
          triggeredBy: "user-1",
          triggeredByRole: "Manager",
        }),
      );
      expect(result).toEqual(created);
    });
  });

  // ── resolveGate ──

  describe("resolveGate", () => {
    it("approves a pending gate", async () => {
      const gate = freshGate({ status: "pending" });
      (GovernanceGate.findByPk as jest.Mock).mockResolvedValue(gate);

      await resolveGate("gate-1", "approve", "Looks good", mockUser);

      expect(gate.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "approved", resolvedBy: "user-1" }),
      );
    });

    it("rejects a pending gate", async () => {
      const gate = freshGate({ status: "pending" });
      (GovernanceGate.findByPk as jest.Mock).mockResolvedValue(gate);

      await resolveGate("gate-1", "reject", "Not approved", mockUser);

      expect(gate.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "rejected" }),
      );
    });

    it("bypasses a pending gate", async () => {
      const gate = freshGate({ status: "pending" });
      (GovernanceGate.findByPk as jest.Mock).mockResolvedValue(gate);

      await resolveGate("gate-1", "bypass", undefined, mockUser);

      expect(gate.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "bypassed" }),
      );
    });

    it("throws 409 when gate is already resolved", async () => {
      const gate = freshGate({ status: "approved" });
      (GovernanceGate.findByPk as jest.Mock).mockResolvedValue(gate);

      await expect(
        resolveGate("gate-1", "approve", undefined, mockUser),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "Gate is already resolved",
      });
    });

    it("throws 404 when gate not found", async () => {
      (GovernanceGate.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(
        resolveGate("missing", "approve", undefined, mockUser),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ── deleteGate ──

  describe("deleteGate", () => {
    it("deletes and returns { id }", async () => {
      const gate = freshGate();
      (GovernanceGate.findByPk as jest.Mock).mockResolvedValue(gate);

      const result = await deleteGate("gate-1");

      expect(gate.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: "gate-1" });
    });

    it("throws 404 when gate not found", async () => {
      (GovernanceGate.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(deleteGate("missing")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
