/// <reference types="jest" />
jest.mock("../../../src/modules/designs/design.service");
jest.mock("../../../src/shared/utils/audit", () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest.fn().mockReturnValue({
    userId: "u1",
    userName: "Designer",
    userRole: "GraphicDesigner",
  }),
  buildChanges: jest.fn().mockReturnValue(null),
}));
jest.mock("../../../src/shared/utils/cache", () => ({
  CachePrefix: { DESIGNS: "designs", DASHBOARD: "dash" },
  invalidateMultiple: jest.fn().mockResolvedValue(undefined),
}));

import * as controller from "../../../src/modules/designs/design.controller";
import * as designService from "../../../src/modules/designs/design.service";

const mockReq = (overrides: Record<string, any> = {}) =>
  ({
    params: {},
    body: {},
    query: {},
    user: {
      id: "user-001",
      fullName: "Designer",
      role: "GraphicDesigner",
      email: "designer@sadara.com",
    },
    ip: "127.0.0.1",
    protocol: "https",
    get: () => "localhost",
    ...overrides,
  }) as any;

const mockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as any;
};

describe("Design Controller", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("list", () => {
    it("returns paginated designs", async () => {
      (designService.listDesigns as jest.Mock).mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 50 },
      });
      const res = mockRes();
      await controller.list(mockReq(), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getById", () => {
    it("returns the design", async () => {
      (designService.getDesignById as jest.Mock).mockResolvedValue({
        id: "d1",
        title: "Match",
      });
      const res = mockRes();
      await controller.getById(mockReq({ params: { id: "d1" } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("create", () => {
    it("creates a design and returns 201", async () => {
      (designService.createDesign as jest.Mock).mockResolvedValue({
        id: "d1",
        title: "New",
      });
      const res = mockRes();
      await controller.create(
        mockReq({ body: { title: "New", type: "match_day_poster" } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("update", () => {
    it("updates a design", async () => {
      (designService.updateDesign as jest.Mock).mockResolvedValue({
        id: "d1",
        title: "Updated",
      });
      const res = mockRes();
      await controller.update(
        mockReq({ params: { id: "d1" }, body: { title: "Updated" } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("remove", () => {
    it("deletes a design", async () => {
      (designService.deleteDesign as jest.Mock).mockResolvedValue({
        id: "d1",
      });
      const res = mockRes();
      await controller.remove(mockReq({ params: { id: "d1" } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("publish", () => {
    it("publishes the design when authenticated", async () => {
      (designService.publishDesign as jest.Mock).mockResolvedValue({
        id: "d1",
        title: "Published",
        status: "published",
      });
      const res = mockRes();
      await controller.publish(mockReq({ params: { id: "d1" } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("short-circuits side effects when req.user is missing", async () => {
      (designService.publishDesign as jest.Mock).mockResolvedValue({
        id: "d1",
        title: "Published",
      });
      const res = mockRes();
      // No user on the req — this hits the `if (!req.user) return` early-return branch
      await controller.publish(mockReq({ params: { id: "d1" }, user: undefined }), res);
      // Response was still sent before the early return
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("uploadAsset", () => {
    it("delegates to the service with the file buffer and base URL", async () => {
      (designService.uploadDesignAsset as jest.Mock).mockResolvedValue({
        id: "d1",
        title: "Match",
        assetUrl: "https://cdn/x.webp",
      });
      const res = mockRes();
      const req = mockReq({
        params: { id: "d1" },
        file: {
          buffer: Buffer.from("png"),
          originalname: "poster.png",
          mimetype: "image/png",
        },
      });
      await controller.uploadAsset(req, res);

      expect(designService.uploadDesignAsset).toHaveBeenCalledWith(
        "d1",
        expect.objectContaining({
          originalname: "poster.png",
          mimetype: "image/png",
        }),
        "https://localhost",
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("throws 400 when no file is attached", async () => {
      const res = mockRes();
      await expect(
        controller.uploadAsset(mockReq({ params: { id: "d1" } }), res),
      ).rejects.toThrow("No file uploaded");
      expect(designService.uploadDesignAsset).not.toHaveBeenCalled();
    });
  });
});
