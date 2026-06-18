// ── Infrastructure mocks (must come before imports) ──

jest.mock("@config/database", () => ({
  sequelize: {},
}));

jest.mock("@config/logger", () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock("@config/env", () => ({
  env: {
    pagination: { defaultLimit: 20, maxLimit: 100 },
  },
}));

// ── Model mocks ──
jest.mock("./pipeline.model", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    findAndCountAll: jest.fn(),
    findAll: jest.fn(),
  },
}));

jest.mock("@modules/partners/partner.model", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    hasMany: jest.fn(),
  },
}));

// ── Pagination mock ──
jest.mock("@shared/utils/pagination", () => ({
  paginatedQuery: jest.fn(),
  parsePagination: jest.fn(),
  buildMeta: jest.fn(),
}));

// ── ErrorHandler mock (exposes real AppError shape) ──
jest.mock("@middleware/errorHandler", () => ({
  AppError: class AppError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

import Pipeline from "./pipeline.model";
import Partner from "@modules/partners/partner.model";
import { paginatedQuery } from "@shared/utils/pagination";
import * as service from "./pipeline.service";
import type { AuthUser } from "@shared/types";

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────
// listSubmissions
// ─────────────────────────────────────────────────────────────

describe("listSubmissions", () => {
  const adminUser: AuthUser = {
    id: "user-admin",
    email: "admin@sadara.com",
    fullName: "Admin",
    role: "Admin",
  };

  const partnerUser: AuthUser = {
    id: "user-partner-1",
    email: "partner@example.com",
    fullName: "Partner User",
    role: "Partner",
  };

  it("returns all submissions with no where-filter for non-Partner roles", async () => {
    const mockResult = {
      data: [{ id: "s1", playerNameEn: "John Doe" }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    (paginatedQuery as jest.Mock).mockResolvedValue(mockResult);

    const result = await service.listSubmissions(
      { page: 1, limit: 20 },
      adminUser,
    );

    expect(paginatedQuery).toHaveBeenCalledWith(
      Pipeline,
      { page: 1, limit: 20 },
      expect.objectContaining({ where: {} }),
    );
    expect(result).toEqual(mockResult);
  });

  it("applies partnerId row-scope filter for Partner role (found)", async () => {
    const mockPartner = { id: "partner-uuid-1" };
    (Partner.findOne as jest.Mock).mockResolvedValue(mockPartner);

    const mockResult = {
      data: [
        { id: "s2", playerNameEn: "Jane Smith", partnerId: "partner-uuid-1" },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    (paginatedQuery as jest.Mock).mockResolvedValue(mockResult);

    const result = await service.listSubmissions(
      { page: 1, limit: 20 },
      partnerUser,
    );

    expect(Partner.findOne).toHaveBeenCalledWith({
      where: { userId: partnerUser.id },
    });
    expect(paginatedQuery).toHaveBeenCalledWith(
      Pipeline,
      { page: 1, limit: 20 },
      expect.objectContaining({ where: { partnerId: "partner-uuid-1" } }),
    );
    expect(result).toEqual(mockResult);
  });

  it("uses sentinel partnerId when Partner role user has no partner row", async () => {
    (Partner.findOne as jest.Mock).mockResolvedValue(null);
    (paginatedQuery as jest.Mock).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    await service.listSubmissions({ page: 1, limit: 20 }, partnerUser);

    expect(paginatedQuery).toHaveBeenCalledWith(
      Pipeline,
      expect.anything(),
      expect.objectContaining({ where: { partnerId: "NO_PARTNER_ROW" } }),
    );
  });
});

// ─────────────────────────────────────────────────────────────
// submitPlayer — reference number sequencing
// ─────────────────────────────────────────────────────────────

describe("submitPlayer", () => {
  const year = new Date().getFullYear();
  const basePayload = {
    partnerId: "partner-uuid-1",
    playerNameEn: "Ahmed Al-Ghamdi",
    dateOfBirth: "1998-06-15",
    nationality: "Saudi",
    position: "ST",
  };

  const activePartner = {
    id: "partner-uuid-1",
    nameEn: "Alpha FC",
    status: "Active",
  };

  it("mints SDR-PL-YYYY-0001 for the first submission of the year", async () => {
    (Partner.findByPk as jest.Mock).mockResolvedValue(activePartner);
    // Conflict check — no existing row
    (Pipeline.findOne as jest.Mock)
      .mockResolvedValueOnce(null) // conflict check
      .mockResolvedValueOnce(null); // mintSubmissionRef — no last
    (Pipeline.create as jest.Mock).mockImplementation(async (v) => v);

    await service.submitPlayer(basePayload);

    expect(Pipeline.create).toHaveBeenCalledWith(
      expect.objectContaining({
        submissionRef: `SDR-PL-${year}-0001`,
        phase: "Registered",
        conflictFlag: false,
      }),
    );
  });

  it("mints SDR-PL-YYYY-0002 when 0001 already exists", async () => {
    (Partner.findByPk as jest.Mock).mockResolvedValue(activePartner);
    (Pipeline.findOne as jest.Mock)
      .mockResolvedValueOnce(null) // conflict check
      .mockResolvedValueOnce({ submissionRef: `SDR-PL-${year}-0001` }); // mintSubmissionRef
    (Pipeline.create as jest.Mock).mockImplementation(async (v) => v);

    await service.submitPlayer({
      ...basePayload,
      playerNameEn: "Khalid Al-Dosari",
    });

    expect(Pipeline.create).toHaveBeenCalledWith(
      expect.objectContaining({ submissionRef: `SDR-PL-${year}-0002` }),
    );
  });

  it("sets conflictFlag=true and conflictNote when duplicate player detected", async () => {
    (Partner.findByPk as jest.Mock).mockResolvedValue(activePartner);

    const existingSubmission = {
      submissionRef: `SDR-PL-${year}-0001`,
      createdAt: new Date("2025-01-10T10:00:00Z"),
    };

    (Pipeline.findOne as jest.Mock)
      .mockResolvedValueOnce(existingSubmission) // conflict check finds match
      .mockResolvedValueOnce({ submissionRef: `SDR-PL-${year}-0001` }); // mintSubmissionRef
    (Pipeline.create as jest.Mock).mockImplementation(async (v) => v);

    await service.submitPlayer(basePayload);

    expect(Pipeline.create).toHaveBeenCalledWith(
      expect.objectContaining({
        conflictFlag: true,
        conflictNote: expect.stringContaining(`SDR-PL-${year}-0001`),
      }),
    );
  });

  it("throws 422 when partner status is not Active", async () => {
    (Partner.findByPk as jest.Mock).mockResolvedValue({
      ...activePartner,
      status: "Suspended",
    });

    await expect(service.submitPlayer(basePayload)).rejects.toMatchObject({
      statusCode: 422,
      message: "Partner is not active",
    });

    expect(Pipeline.create).not.toHaveBeenCalled();
  });

  it("throws 404 when partner does not exist", async () => {
    (Partner.findByPk as jest.Mock).mockResolvedValue(null);

    await expect(service.submitPlayer(basePayload)).rejects.toMatchObject({
      statusCode: 404,
      message: "Partner not found",
    });

    expect(Pipeline.create).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// getSubmissionById
// ─────────────────────────────────────────────────────────────

describe("getSubmissionById", () => {
  it("returns the submission when found", async () => {
    const mockSub = { id: "s1", playerNameEn: "Test Player" };
    (Pipeline.findByPk as jest.Mock).mockResolvedValue(mockSub);

    const result = await service.getSubmissionById("s1");

    expect(Pipeline.findByPk).toHaveBeenCalledWith("s1", expect.anything());
    expect(result).toEqual(mockSub);
  });

  it("throws 404 when submission does not exist", async () => {
    (Pipeline.findByPk as jest.Mock).mockResolvedValue(null);

    await expect(service.getSubmissionById("missing")).rejects.toMatchObject({
      statusCode: 404,
      message: "Submission not found",
    });
  });
});

// ─────────────────────────────────────────────────────────────
// advancePhase
// ─────────────────────────────────────────────────────────────

describe("advancePhase", () => {
  it("updates phase and resets phaseSince", async () => {
    const update = jest.fn().mockResolvedValue({
      id: "s1",
      phase: "Compliance",
    });
    (Pipeline.findByPk as jest.Mock).mockResolvedValue({
      id: "s1",
      phase: "Registered",
      nextAction: "Compliance screen",
      dueDate: null,
      hqOwner: null,
      notes: null,
      update,
    });

    const result = await service.advancePhase("s1", {
      phase: "Compliance",
      nextAction: "Run medical check",
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        phase: "Compliance",
        phaseSince: expect.any(Date),
        nextAction: "Run medical check",
      }),
    );
    expect(result).toEqual({ id: "s1", phase: "Compliance" });
  });

  it("throws 404 when submission does not exist", async () => {
    (Pipeline.findByPk as jest.Mock).mockResolvedValue(null);

    await expect(
      service.advancePhase("missing", { phase: "Compliance" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─────────────────────────────────────────────────────────────
// getSlaBreaches — queries Compliance/Fit-or-Pass with 48h cutoff
// ─────────────────────────────────────────────────────────────

describe("getSlaBreaches", () => {
  it("queries the two SLA phases and uses a cutoff ~48h in the past", async () => {
    const mockBreaches = [
      { id: "s1", phase: "Compliance", phaseSince: new Date("2025-06-10") },
    ];
    (Pipeline.findAll as jest.Mock).mockResolvedValue(mockBreaches);

    const before = Date.now();
    const result = await service.getSlaBreaches();
    const after = Date.now();

    expect(Pipeline.findAll).toHaveBeenCalledTimes(1);
    const callArgs = (Pipeline.findAll as jest.Mock).mock.calls[0][0];

    // Verify the where clause contains exactly the two SLA phase values
    // Op.in / Op.lt are symbols; inspect their string representations via JSON-like
    // extraction of the actual values stored in the where object.
    const phaseFilter = callArgs.where.phase;
    const phaseValues: string[] = Object.getOwnPropertySymbols(
      phaseFilter,
    ).flatMap((sym) => phaseFilter[sym]);
    expect(phaseValues).toEqual(
      expect.arrayContaining(["Compliance", "Fit-or-Pass"]),
    );
    expect(phaseValues).toHaveLength(2);

    // Verify the cutoff date is approximately 48 hours ago
    const phaseSinceFilter = callArgs.where.phaseSince;
    const cutoffValues: Date[] = Object.getOwnPropertySymbols(
      phaseSinceFilter,
    ).map((sym) => phaseSinceFilter[sym]);
    expect(cutoffValues).toHaveLength(1);
    const cutoff = cutoffValues[0];
    const expectedCutoffMin = before - 48 * 60 * 60 * 1000;
    const expectedCutoffMax = after - 48 * 60 * 60 * 1000;
    expect(cutoff.getTime()).toBeGreaterThanOrEqual(expectedCutoffMin);
    expect(cutoff.getTime()).toBeLessThanOrEqual(expectedCutoffMax);

    expect(result).toEqual(mockBreaches);
  });
});
