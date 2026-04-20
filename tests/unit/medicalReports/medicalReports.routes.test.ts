/// <reference types="jest" />
jest.mock("../../../src/modules/medicalReports/medicalReports.service");
jest.mock("../../../src/shared/utils/audit", () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({
    userId: "user-001",
    userName: "Admin",
    userRole: "Admin",
  }),
  buildChanges: jest.fn().mockReturnValue(null),
}));

import * as controller from "../../../src/modules/medicalReports/medicalReports.controller";
import * as svc from "../../../src/modules/medicalReports/medicalReports.service";

const mockReq = (overrides: Record<string, unknown> = {}) =>
  ({
    params: {},
    body: {},
    query: {},
    user: { id: "user-001", fullName: "Admin", role: "Admin" },
    ip: "127.0.0.1",
    protocol: "https",
    get: () => "localhost",
    ...overrides,
  }) as unknown as import("@shared/types").AuthRequest;

const mockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    sendFile: jest.fn(),
    send: jest.fn(),
  };
  return res as unknown as import("express").Response;
};

describe("medicalReports.controller", () => {
  beforeEach(() => jest.clearAllMocks());

  // ── list ───────────────────────────────────────

  describe("list", () => {
    it("returns paginated results (200)", async () => {
      (svc.listReports as jest.Mock).mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 1 },
      });
      const res = mockRes();
      await controller.list(
        mockReq({ query: { playerId: "player-001" } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.listReports).toHaveBeenCalled();
    });
  });

  // ── getById ────────────────────────────────────

  describe("getById", () => {
    it("returns a single report (200)", async () => {
      (svc.getReport as jest.Mock).mockResolvedValue({
        id: "report-1",
        labResults: [],
      });
      const res = mockRes();
      await controller.getById(mockReq({ params: { id: "report-1" } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("surfaces service-thrown 404", async () => {
      (svc.getReport as jest.Mock).mockRejectedValue(
        new Error("Medical report not found"),
      );
      await expect(
        controller.getById(mockReq({ params: { id: "bad" } }), mockRes()),
      ).rejects.toThrow("Medical report not found");
    });
  });

  // ── upload ─────────────────────────────────────

  describe("upload", () => {
    const okFile = {
      originalname: "report.pdf",
      mimetype: "application/pdf",
      buffer: Buffer.from("%PDF"),
      size: 1024,
    };

    it("creates + audits (201)", async () => {
      (svc.uploadReport as jest.Mock).mockResolvedValue({
        id: "report-1",
        parseStatus: "parsed",
      });
      const res = mockRes();
      await controller.upload(
        mockReq({
          file: okFile,
          body: { playerId: "player-001", provider: "Delta Medical Labs" },
        }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(svc.uploadReport).toHaveBeenCalled();
    });

    it("rejects missing file (400)", async () => {
      await expect(controller.upload(mockReq(), mockRes())).rejects.toThrow(
        "No file uploaded",
      );
    });

    it("rejects non-PDF mime (400)", async () => {
      await expect(
        controller.upload(
          mockReq({
            file: {
              ...okFile,
              mimetype: "image/png",
            },
            body: { playerId: "player-001" },
          }),
          mockRes(),
        ),
      ).rejects.toThrow("Only PDF files are supported");
    });

    it("rejects missing playerId (400)", async () => {
      await expect(
        controller.upload(
          mockReq({ file: okFile, body: {} }),
          mockRes(),
        ),
      ).rejects.toThrow("playerId is required");
    });
  });

  // ── update metadata ────────────────────────────

  describe("update", () => {
    it("returns updated report (200)", async () => {
      (svc.updateReport as jest.Mock).mockResolvedValue({ id: "report-1" });
      const res = mockRes();
      await controller.update(
        mockReq({ params: { id: "report-1" }, body: { reportType: "Blood" } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.updateReport).toHaveBeenCalledWith("report-1", {
        reportType: "Blood",
      });
    });
  });

  // ── updateLabResults ───────────────────────────

  describe("updateLabResults", () => {
    it("replaces rows and returns report (200)", async () => {
      (svc.updateLabResults as jest.Mock).mockResolvedValue({
        id: "report-1",
        parseStatus: "manual",
      });
      const res = mockRes();
      await controller.updateLabResults(
        mockReq({
          params: { id: "report-1" },
          body: {
            labResults: [
              {
                name: "CK",
                valueNumeric: 400,
                unit: "U/L",
                flag: "H",
                sortOrder: 0,
              },
            ],
          },
        }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.updateLabResults).toHaveBeenCalledWith(
        "report-1",
        expect.arrayContaining([expect.objectContaining({ name: "CK" })]),
      );
    });
  });

  // ── remove ─────────────────────────────────────

  describe("remove", () => {
    it("deletes and audits (200)", async () => {
      (svc.deleteReport as jest.Mock).mockResolvedValue({ id: "report-1" });
      const res = mockRes();
      await controller.remove(mockReq({ params: { id: "report-1" } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.deleteReport).toHaveBeenCalledWith("report-1");
    });

    it("surfaces service-thrown 404", async () => {
      (svc.deleteReport as jest.Mock).mockRejectedValue(
        new Error("Medical report not found"),
      );
      await expect(
        controller.remove(mockReq({ params: { id: "bad" } }), mockRes()),
      ).rejects.toThrow("Medical report not found");
    });
  });
});
