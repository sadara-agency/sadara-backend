/// <reference types="jest" />
import { mockModelInstance, mockPlayer } from "../../setup/test-helpers";

// ── Mocks ──────────────────────────────────────────────

const mockReportFindByPk = jest.fn();
const mockReportFindAndCountAll = jest.fn();
const mockReportCreate = jest.fn();
const mockLabBulkCreate = jest.fn();
const mockLabDestroy = jest.fn();
const mockDocCreate = jest.fn();
const mockPlayerFindByPk = jest.fn();
const mockUploadFile = jest.fn();
const mockDeleteFile = jest.fn();
const mockTransaction = jest.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb({}));
const mockPdfParse = jest.fn();

jest.mock("../../../src/config/database", () => ({
  sequelize: {
    query: jest.fn(),
    authenticate: jest.fn(),
    transaction: (cb: (tx: unknown) => Promise<unknown>) => mockTransaction(cb),
  },
}));

jest.mock("../../../src/config/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("../../../src/shared/utils/storage", () => ({
  uploadFile: (...a: unknown[]) => mockUploadFile(...a),
  deleteFile: (...a: unknown[]) => mockDeleteFile(...a),
}));

jest.mock("../../../src/modules/documents/document.model", () => ({
  Document: {
    create: (...a: unknown[]) => mockDocCreate(...a),
  },
}));

jest.mock("../../../src/modules/players/player.model", () => ({
  Player: {
    findByPk: (...a: unknown[]) => mockPlayerFindByPk(...a),
    name: "Player",
  },
}));

jest.mock(
  "../../../src/modules/medicalReports/medicalReports.model",
  () => ({
    MedicalReport: {
      findByPk: (...a: unknown[]) => mockReportFindByPk(...a),
      findAndCountAll: (...a: unknown[]) => mockReportFindAndCountAll(...a),
      create: (...a: unknown[]) => mockReportCreate(...a),
      hasMany: jest.fn(),
      belongsTo: jest.fn(),
    },
    MedicalLabResult: {
      bulkCreate: (...a: unknown[]) => mockLabBulkCreate(...a),
      destroy: (...a: unknown[]) => mockLabDestroy(...a),
      belongsTo: jest.fn(),
    },
  }),
);

jest.mock("pdf-parse", () => ({
  __esModule: true,
  default: (buf: Buffer) => mockPdfParse(buf),
}));

import * as svc from "../../../src/modules/medicalReports/medicalReports.service";

// ── Fixtures ──────────────────────────────────────────

const DELTA_FIXTURE = `
Patient
MUHAMMAD HISHAM
Male - 17 Years
Reservation ID: 4451425
Registered At 03/01/26 22:04
Collected At 03/02/26 10:44
Reported At 03/03/26 00:04
Delta Medical Labs

Blood Tests
Creatine Kinase (CK - Total), Serum 476.91 U/L H
Reference Range : 30 - 200
Reported At 03/03/26 00:04

Cortisol, Total, Serum 405.79 nmol/L
Reference Range : 185 - 624
Reported At 03/02/26 22:03

Hormones
Testosterone - Total 18.62 nmol/L
Reference Range : 0.38 - 19.64
Reported At 03/02/26 21:32

Thyroid Profile
Thyroid Stimulating Hormone (TSH) 4.39 uIU/ml H
Reference Range : 0.51 - 4.3
`;

const QUEST_FIXTURE = `
HISHAM,MUHAMMAD
Quest Diagnostics

EPA+DPA+DHA  4.7
Reference Range: >5.4 % by wt

DHA  3.3
Reference Range: 1.4-5.1 % by wt

EPA  0.5
Reference Range: 0.2-2.3 % by wt
`;

// ── Tests ──────────────────────────────────────────────

describe("medicalReports.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction.mockImplementation(async (cb) => cb({}));
  });

  describe("detectProvider", () => {
    it("detects Delta Medical", () => {
      expect(svc.detectProvider("... Delta Medical Labs ...")).toBe("delta");
    });

    it("detects Quest Diagnostics", () => {
      expect(svc.detectProvider("... Quest Diagnostics ...")).toBe("quest");
    });

    it("returns unknown for unrelated text", () => {
      expect(svc.detectProvider("random hospital report content")).toBe(
        "unknown",
      );
    });
  });

  describe("parseDelta", () => {
    it("extracts structured lab rows with categories", () => {
      const rows = svc.parseDelta(DELTA_FIXTURE);
      expect(rows.length).toBeGreaterThanOrEqual(3);

      const ck = rows.find((r) => r.name.includes("Creatine Kinase"));
      expect(ck).toBeDefined();
      expect(ck!.valueNumeric).toBeCloseTo(476.91);
      expect(ck!.unit).toBe("U/L");
      expect(ck!.flag).toBe("H");
      expect(ck!.refRangeLow).toBe(30);
      expect(ck!.refRangeHigh).toBe(200);
      expect(ck!.category).toBe("Blood Tests");

      const tsh = rows.find((r) => r.name.includes("TSH"));
      expect(tsh?.flag).toBe("H");
      expect(tsh?.category).toBe("Thyroid Profile");
    });

    it("returns empty array for unrelated text", () => {
      expect(svc.parseDelta("nothing here").length).toBe(0);
    });
  });

  describe("parseQuest", () => {
    it("extracts Quest-style rows", () => {
      const rows = svc.parseQuest(QUEST_FIXTURE);
      const dha = rows.find((r) => r.name === "DHA");
      expect(dha).toBeDefined();
      expect(dha!.valueNumeric).toBeCloseTo(3.3);
      expect(dha!.refRangeLow).toBe(1.4);
      expect(dha!.refRangeHigh).toBe(5.1);
    });
  });

  describe("parsePdfBuffer", () => {
    it("returns parsed rows for a Delta-shaped PDF", async () => {
      mockPdfParse.mockResolvedValue({ text: DELTA_FIXTURE });
      const out = await svc.parsePdfBuffer(Buffer.from("%PDF-stub"));
      expect(out.provider).toBe("Delta Medical Labs");
      expect(out.labResults.length).toBeGreaterThan(0);
      expect(out.reservationId).toBe("4451425");
    });

    it("returns empty labResults + null provider for unknown text", async () => {
      mockPdfParse.mockResolvedValue({ text: "random content" });
      const out = await svc.parsePdfBuffer(Buffer.from("%PDF"));
      expect(out.provider).toBeNull();
      expect(out.labResults).toEqual([]);
    });
  });

  describe("uploadReport", () => {
    const file = {
      originalname: "report.pdf",
      mimetype: "application/pdf",
      buffer: Buffer.from("%PDF-fake"),
      size: 1024,
    } as unknown as Express.Multer.File;

    beforeEach(() => {
      mockPlayerFindByPk.mockResolvedValue(mockPlayer());
      mockUploadFile.mockResolvedValue({
        url: "documents/abc-123.pdf",
        size: 1024,
        mimeType: "application/pdf",
        key: "documents/abc-123.pdf",
        thumbnailUrl: null,
      });
      mockDocCreate.mockResolvedValue(mockModelInstance({ id: "doc-1" }));
      mockReportCreate.mockResolvedValue(
        mockModelInstance({
          id: "report-1",
          playerId: "player-001",
          documentId: "doc-1",
          parseStatus: "pending",
        }),
      );
      mockLabBulkCreate.mockResolvedValue([]);
      mockReportFindByPk.mockResolvedValue(
        mockModelInstance({
          id: "report-1",
          parseStatus: "parsed",
          labResults: [],
        }),
      );
      mockPdfParse.mockResolvedValue({ text: DELTA_FIXTURE });
    });

    it("happy path: uploads, creates Document + MedicalReport, parses, bulk-inserts lab rows", async () => {
      const report = await svc.uploadReport(
        file,
        { playerId: "player-001" },
        "user-001",
      );
      expect(mockUploadFile).toHaveBeenCalled();
      expect(mockDocCreate).toHaveBeenCalled();
      expect(mockReportCreate).toHaveBeenCalled();
      expect(mockLabBulkCreate).toHaveBeenCalled();
      expect(report).toBeDefined();
    });

    it("throws 404 if player does not exist", async () => {
      mockPlayerFindByPk.mockResolvedValue(null);
      await expect(
        svc.uploadReport(file, { playerId: "bad" }, "user-001"),
      ).rejects.toThrow("Player not found");
    });

    it("throws 502 when storage upload fails", async () => {
      mockUploadFile.mockRejectedValue(new Error("GCS down"));
      await expect(
        svc.uploadReport(file, { playerId: "player-001" }, "user-001"),
      ).rejects.toThrow("Failed to store PDF");
    });

    it("marks parseStatus='failed' when PDF text is unrecognized", async () => {
      mockPdfParse.mockResolvedValue({ text: "unrelated garbage" });
      const reportInstance = mockModelInstance({
        id: "report-1",
        parseStatus: "pending",
      });
      mockReportCreate.mockResolvedValue(reportInstance);
      await svc.uploadReport(file, { playerId: "player-001" }, "user-001");
      expect(reportInstance.update).toHaveBeenCalledWith(
        expect.objectContaining({ parseStatus: "failed" }),
      );
    });
  });

  describe("updateLabResults", () => {
    it("replaces lab rows and sets parseStatus='manual'", async () => {
      const reportInstance = mockModelInstance({
        id: "report-1",
        parseStatus: "parsed",
      });
      mockReportFindByPk.mockResolvedValue(reportInstance);

      await svc.updateLabResults("report-1", [
        {
          name: "CK",
          valueNumeric: 400,
          unit: "U/L",
          flag: "H",
          refRangeLow: 30,
          refRangeHigh: 200,
          category: "Blood Tests",
          sortOrder: 0,
        },
      ]);

      expect(mockLabDestroy).toHaveBeenCalled();
      expect(mockLabBulkCreate).toHaveBeenCalled();
      expect(reportInstance.update).toHaveBeenCalledWith(
        expect.objectContaining({ parseStatus: "manual" }),
        expect.anything(),
      );
    });

    it("throws 404 when report does not exist", async () => {
      mockReportFindByPk.mockResolvedValue(null);
      await expect(svc.updateLabResults("bad", [])).rejects.toThrow(
        "Medical report not found",
      );
    });
  });

  describe("deleteReport", () => {
    it("destroys report and best-effort deletes the underlying blob", async () => {
      const reportInstance = mockModelInstance({ id: "report-1" });
      reportInstance.get = jest.fn(() => ({
        fileUrl: "documents/abc-123.pdf",
      }));
      mockReportFindByPk.mockResolvedValue(reportInstance);
      mockDeleteFile.mockResolvedValue(undefined);

      const out = await svc.deleteReport("report-1");
      expect(reportInstance.destroy).toHaveBeenCalled();
      expect(mockDeleteFile).toHaveBeenCalledWith("documents/abc-123.pdf");
      expect(out).toEqual({ id: "report-1" });
    });

    it("throws 404 when report is missing", async () => {
      mockReportFindByPk.mockResolvedValue(null);
      await expect(svc.deleteReport("bad")).rejects.toThrow(
        "Medical report not found",
      );
    });
  });

  describe("getReport", () => {
    it("returns the report when found", async () => {
      mockReportFindByPk.mockResolvedValue(
        mockModelInstance({ id: "report-1" }),
      );
      const out = await svc.getReport("report-1");
      expect(out).toBeDefined();
    });

    it("throws 404 when not found", async () => {
      mockReportFindByPk.mockResolvedValue(null);
      await expect(svc.getReport("bad")).rejects.toThrow(
        "Medical report not found",
      );
    });
  });

  describe("listReports", () => {
    it("returns paginated results filtered by playerId", async () => {
      mockReportFindAndCountAll.mockResolvedValue({
        count: 2,
        rows: [mockModelInstance({ id: "r1" }), mockModelInstance({ id: "r2" })],
      });
      const out = await svc.listReports({
        playerId: "player-001",
        page: 1,
        limit: 20,
      });
      expect(out.data.length).toBe(2);
      expect(out.meta.total).toBe(2);
    });
  });
});
