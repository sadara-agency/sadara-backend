// ── Infrastructure mocks (must come before imports) ──

jest.mock("@config/database", () => ({
  sequelize: {},
  transaction: jest.fn(async (cb: (t: unknown) => Promise<unknown>) => cb({})),
}));

jest.mock("@config/logger", () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock("@config/env", () => ({
  env: {
    pagination: { defaultLimit: 20, maxLimit: 100 },
  },
}));

// ── Model mock ──
jest.mock("./partner.model", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    findAndCountAll: jest.fn(),
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

import Partner from "./partner.model";
import { paginatedQuery } from "@shared/utils/pagination";
import * as service from "./partner.service";

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────
// listPartners
// ─────────────────────────────────────────────────────────────

describe("listPartners", () => {
  it("returns paginated shape from paginatedQuery", async () => {
    const mockResult = {
      data: [{ id: "p1", nameEn: "Alpha Partner" }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    (paginatedQuery as jest.Mock).mockResolvedValue(mockResult);

    const result = await service.listPartners({ page: 1, limit: 20 });

    expect(paginatedQuery).toHaveBeenCalledWith(
      Partner,
      { page: 1, limit: 20 },
      expect.objectContaining({ defaultSort: "createdAt" }),
    );
    expect(result).toEqual(mockResult);
  });
});

// ─────────────────────────────────────────────────────────────
// getPartnerById
// ─────────────────────────────────────────────────────────────

describe("getPartnerById", () => {
  it("returns the partner when found", async () => {
    const mockPartner = { id: "p1", nameEn: "Alpha Partner" };
    (Partner.findByPk as jest.Mock).mockResolvedValue(mockPartner);

    const result = await service.getPartnerById("p1");

    expect(Partner.findByPk).toHaveBeenCalledWith("p1");
    expect(result).toEqual(mockPartner);
  });

  it("throws 404 when partner does not exist", async () => {
    (Partner.findByPk as jest.Mock).mockResolvedValue(null);

    await expect(service.getPartnerById("missing")).rejects.toMatchObject({
      statusCode: 404,
      message: "Partner not found",
    });
  });
});

// ─────────────────────────────────────────────────────────────
// createPartner — reference number sequencing
// ─────────────────────────────────────────────────────────────

describe("createPartner", () => {
  const year = new Date().getFullYear();
  const basePayload = {
    nameEn: "Alpha Partner",
    capacity: "Introducer" as const,
    contactEmail: "alpha@example.com",
  };

  it("mints SDR-NP-YYYY-0001 for the first partner of the year", async () => {
    // No duplicate email
    (Partner.findOne as jest.Mock)
      .mockResolvedValueOnce(null) // email uniqueness check
      .mockResolvedValueOnce(null); // mintReferenceNo — no last

    (Partner.create as jest.Mock).mockImplementation(async (v) => v);

    await service.createPartner(basePayload);

    expect(Partner.create).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceNo: `SDR-NP-${year}-0001`,
        status: "Active",
      }),
    );
  });

  it("mints SDR-NP-YYYY-0002 when 0001 already exists", async () => {
    (Partner.findOne as jest.Mock)
      .mockResolvedValueOnce(null) // email check — no duplicate
      .mockResolvedValueOnce({
        referenceNo: `SDR-NP-${year}-0001`,
      }); // mintReferenceNo — existing last

    (Partner.create as jest.Mock).mockImplementation(async (v) => v);

    await service.createPartner({
      ...basePayload,
      contactEmail: "beta@example.com",
    });

    expect(Partner.create).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceNo: `SDR-NP-${year}-0002`,
      }),
    );
  });

  it("throws 409 when a partner with the same email already exists", async () => {
    (Partner.findOne as jest.Mock).mockResolvedValueOnce({
      id: "existing",
      contactEmail: "alpha@example.com",
    });

    await expect(service.createPartner(basePayload)).rejects.toMatchObject({
      statusCode: 409,
      message: "Partner with this email already exists",
    });

    expect(Partner.create).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// updatePartner
// ─────────────────────────────────────────────────────────────

describe("updatePartner", () => {
  it("updates and returns the partner", async () => {
    const update = jest.fn().mockResolvedValue({ id: "p1", nameEn: "Updated" });
    (Partner.findByPk as jest.Mock).mockResolvedValue({ id: "p1", update });

    const result = await service.updatePartner("p1", { nameEn: "Updated" });

    expect(update).toHaveBeenCalledWith({ nameEn: "Updated" });
    expect(result).toEqual({ id: "p1", nameEn: "Updated" });
  });

  it("throws 404 when partner does not exist", async () => {
    (Partner.findByPk as jest.Mock).mockResolvedValue(null);

    await expect(
      service.updatePartner("missing", { nameEn: "X" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─────────────────────────────────────────────────────────────
// deletePartner
// ─────────────────────────────────────────────────────────────

describe("deletePartner", () => {
  it("destroys the partner and returns its id", async () => {
    const destroy = jest.fn().mockResolvedValue(undefined);
    (Partner.findByPk as jest.Mock).mockResolvedValue({ id: "p1", destroy });

    const result = await service.deletePartner("p1");

    expect(destroy).toHaveBeenCalled();
    expect(result).toEqual({ id: "p1" });
  });

  it("throws 404 when partner does not exist", async () => {
    (Partner.findByPk as jest.Mock).mockResolvedValue(null);

    await expect(service.deletePartner("missing")).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
