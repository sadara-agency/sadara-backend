/// <reference types="jest" />
import { mockModelInstance } from "../../setup/test-helpers";

// ── Mock dependencies ──
const mockDesignFindAndCountAll = jest.fn();
const mockDesignFindByPk = jest.fn();
const mockDesignCreate = jest.fn();
const mockPlayerFindByPk = jest.fn();
const mockMatchFindByPk = jest.fn();
const mockClubFindByPk = jest.fn();

jest.mock("../../../src/config/database", () => ({
  sequelize: {
    query: jest.fn().mockResolvedValue([]),
    authenticate: jest.fn(),
    QueryTypes: { SELECT: "SELECT" },
  },
}));

jest.mock("../../../src/config/env", () => ({
  env: {
    pagination: { defaultLimit: 50, maxLimit: 200 },
  },
}));

jest.mock("../../../src/modules/designs/design.model", () => ({
  __esModule: true,
  default: {
    findAndCountAll: (...a: unknown[]) => mockDesignFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockDesignFindByPk(...a),
    create: (...a: unknown[]) => mockDesignCreate(...a),
  },
  Design: {
    findAndCountAll: (...a: unknown[]) => mockDesignFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockDesignFindByPk(...a),
    create: (...a: unknown[]) => mockDesignCreate(...a),
  },
}));

jest.mock("../../../src/modules/players/player.model", () => ({
  Player: {
    name: "Player",
    findByPk: (...a: unknown[]) => mockPlayerFindByPk(...a),
  },
}));

jest.mock("../../../src/modules/matches/match.model", () => ({
  Match: {
    name: "Match",
    findByPk: (...a: unknown[]) => mockMatchFindByPk(...a),
  },
}));

jest.mock("../../../src/modules/clubs/club.model", () => ({
  Club: {
    name: "Club",
    findByPk: (...a: unknown[]) => mockClubFindByPk(...a),
  },
}));

jest.mock("../../../src/modules/users/user.model", () => ({
  User: { name: "User" },
}));

jest.mock("../../../src/modules/notifications/notification.service", () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
  notifyByRole: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../../src/config/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Storage util — dynamically imported by uploadDesignAsset
const mockUploadFile = jest.fn();
jest.mock("../../../src/shared/utils/storage", () => ({
  uploadFile: (...a: unknown[]) => mockUploadFile(...a),
}));

// sharp — dynamically imported by uploadDesignAsset for dimensions
const mockSharpMetadata = jest.fn();
jest.mock(
  "sharp",
  () => {
    return Object.assign(
      jest.fn(() => ({ metadata: mockSharpMetadata })),
      { default: jest.fn(() => ({ metadata: mockSharpMetadata })) },
    );
  },
  { virtual: false },
);

import * as designService from "../../../src/modules/designs/design.service";
import type { CreateDesignInput } from "../../../src/modules/designs/design.validation";

const baseCreate: CreateDesignInput = {
  title: "Match Day vs Al-Nassr",
  type: "Design",
  status: "Drafting",
  format: "square_1080",
  description: null,
  assetUrl: null,
  playerId: null,
  matchId: null,
  clubId: null,
  assetWidth: null,
  assetHeight: null,
  tags: null,
};

const designRow = (overrides: Record<string, any> = {}) => ({
  id: "design-001",
  title: "Match Day vs Al-Nassr",
  type: "Design",
  status: "Drafting",
  format: "square_1080" as const,
  playerId: null,
  matchId: null,
  clubId: null,
  assetUrl: null,
  assetWidth: null,
  assetHeight: null,
  description: null,
  tags: null,
  createdBy: "user-001",
  publishedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("Design Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ────────────────────────────────────────────────────────
  // listDesigns
  // ────────────────────────────────────────────────────────
  describe("listDesigns", () => {
    it("returns paginated designs with default sort", async () => {
      mockDesignFindAndCountAll.mockResolvedValue({
        count: 1,
        rows: [mockModelInstance(designRow())],
      });

      const result = await designService.listDesigns({
        page: 1,
        limit: 10,
        sort: "created_at",
        order: "desc",
      } as any);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(mockDesignFindAndCountAll).toHaveBeenCalled();
    });

    it("applies status + type + playerId filters", async () => {
      mockDesignFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await designService.listDesigns({
        page: 1,
        limit: 10,
        sort: "created_at",
        order: "desc",
        status: "review",
        type: "motm",
        playerId: "player-001",
        matchId: "match-001",
        clubId: "club-001",
        createdBy: "user-001",
      } as any);

      const call = mockDesignFindAndCountAll.mock.calls[0][0];
      expect(call.where).toEqual({
        status: "review",
        type: "motm",
        playerId: "player-001",
        matchId: "match-001",
        clubId: "club-001",
        createdBy: "user-001",
      });
    });
  });

  // ────────────────────────────────────────────────────────
  // getDesignById
  // ────────────────────────────────────────────────────────
  describe("getDesignById", () => {
    it("returns the design when found", async () => {
      const inst = mockModelInstance(designRow());
      mockDesignFindByPk.mockResolvedValue(inst);

      const result = await designService.getDesignById("design-001");

      expect(result).toBe(inst);
      expect(mockDesignFindByPk).toHaveBeenCalledWith(
        "design-001",
        expect.any(Object),
      );
    });

    it("throws 404 when not found", async () => {
      mockDesignFindByPk.mockResolvedValue(null);

      await expect(designService.getDesignById("missing")).rejects.toThrow(
        "Design not found",
      );
    });
  });

  // ────────────────────────────────────────────────────────
  // createDesign
  // ────────────────────────────────────────────────────────
  describe("createDesign", () => {
    it("creates a design with no FK references (happy path)", async () => {
      mockDesignCreate.mockResolvedValue(mockModelInstance(designRow()));

      const result = await designService.createDesign(baseCreate, "user-001");

      expect(result).toBeDefined();
      expect(mockDesignCreate).toHaveBeenCalledWith({
        ...baseCreate,
        scheduledAt: null,
        createdBy: "user-001",
      });
      // None of the FK lookups should fire because all FKs are null
      expect(mockPlayerFindByPk).not.toHaveBeenCalled();
      expect(mockMatchFindByPk).not.toHaveBeenCalled();
      expect(mockClubFindByPk).not.toHaveBeenCalled();
    });

    it("verifies playerId existence and creates when found", async () => {
      mockPlayerFindByPk.mockResolvedValue({ id: "player-001" });
      mockDesignCreate.mockResolvedValue(
        mockModelInstance(designRow({ playerId: "player-001" })),
      );

      await designService.createDesign(
        { ...baseCreate, playerId: "player-001" },
        "user-001",
      );

      expect(mockPlayerFindByPk).toHaveBeenCalledWith("player-001");
      expect(mockDesignCreate).toHaveBeenCalled();
    });

    it("throws 404 when playerId is set but the player does not exist", async () => {
      mockPlayerFindByPk.mockResolvedValue(null);

      await expect(
        designService.createDesign(
          { ...baseCreate, playerId: "missing-player" },
          "user-001",
        ),
      ).rejects.toThrow("Player not found");
      expect(mockDesignCreate).not.toHaveBeenCalled();
    });

    it("throws 404 when matchId is set but the match does not exist", async () => {
      mockMatchFindByPk.mockResolvedValue(null);

      await expect(
        designService.createDesign(
          { ...baseCreate, matchId: "missing-match" },
          "user-001",
        ),
      ).rejects.toThrow("Match not found");
      expect(mockDesignCreate).not.toHaveBeenCalled();
    });

    it("throws 404 when clubId is set but the club does not exist", async () => {
      mockClubFindByPk.mockResolvedValue(null);

      await expect(
        designService.createDesign(
          { ...baseCreate, clubId: "missing-club" },
          "user-001",
        ),
      ).rejects.toThrow("Club not found");
      expect(mockDesignCreate).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────
  // updateDesign
  // ────────────────────────────────────────────────────────
  describe("updateDesign", () => {
    it("updates an existing design", async () => {
      const inst = mockModelInstance(designRow());
      mockDesignFindByPk.mockResolvedValue(inst);

      await designService.updateDesign("design-001", { title: "New title" });

      expect(inst.update).toHaveBeenCalledWith({ title: "New title" });
    });

    it("throws 404 when the design does not exist", async () => {
      mockDesignFindByPk.mockResolvedValue(null);

      await expect(
        designService.updateDesign("missing", { title: "x" }),
      ).rejects.toThrow("Design not found");
    });
  });

  // ────────────────────────────────────────────────────────
  // deleteDesign
  // ────────────────────────────────────────────────────────
  describe("deleteDesign", () => {
    it("destroys the design and returns its id", async () => {
      const inst = mockModelInstance(designRow());
      mockDesignFindByPk.mockResolvedValue(inst);

      const result = await designService.deleteDesign("design-001");

      expect(inst.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: "design-001" });
    });

    it("throws 404 when the design does not exist", async () => {
      mockDesignFindByPk.mockResolvedValue(null);

      await expect(designService.deleteDesign("missing")).rejects.toThrow(
        "Design not found",
      );
    });
  });

  // ────────────────────────────────────────────────────────
  // publishDesign
  // ────────────────────────────────────────────────────────
  describe("publishDesign", () => {
    it("publishes a design that has an asset", async () => {
      const inst = mockModelInstance(
        designRow({ status: "Approved", assetUrl: "https://cdn/x.png" }),
      );
      mockDesignFindByPk.mockResolvedValue(inst);

      await designService.publishDesign("design-001");

      expect(inst.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "Published" }),
      );
      const updateArg = (inst.update as jest.Mock).mock.calls[0][0];
      expect(updateArg.publishedAt).toBeInstanceOf(Date);
    });

    it("marks as published even without an asset (copy-only content)", async () => {
      const inst = mockModelInstance(
        designRow({ status: "Approved", assetUrl: null }),
      );
      mockDesignFindByPk.mockResolvedValue(inst);

      await designService.publishDesign("design-001");

      expect(inst.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "Published" }),
      );
    });

    it("throws 404 when the design does not exist", async () => {
      mockDesignFindByPk.mockResolvedValue(null);

      await expect(designService.publishDesign("missing")).rejects.toThrow(
        "Design not found",
      );
    });
  });

  // ────────────────────────────────────────────────────────
  // uploadDesignAsset
  // ────────────────────────────────────────────────────────
  describe("uploadDesignAsset", () => {
    const file = {
      buffer: Buffer.from("fake-png-bytes"),
      originalname: "poster.png",
      mimetype: "image/png",
    };

    it("uploads the asset and updates assetUrl + dimensions for an image", async () => {
      const inst = mockModelInstance(designRow());
      mockDesignFindByPk.mockResolvedValue(inst);
      mockSharpMetadata.mockResolvedValue({ width: 1080, height: 1080 });
      mockUploadFile.mockResolvedValue({
        url: "https://storage.googleapis.com/bucket/designs/abc.webp",
        thumbnailUrl: "https://storage.googleapis.com/bucket/designs/thumb_abc.webp",
        key: "designs/abc.webp",
        size: 12345,
        mimeType: "image/webp",
      });

      await designService.uploadDesignAsset(
        "design-001",
        file,
        "https://api.sadara.local",
      );

      expect(mockUploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          folder: "designs",
          originalName: "poster.png",
          mimeType: "image/png",
        }),
      );
      expect(inst.update).toHaveBeenCalledWith({
        assetUrl: "https://storage.googleapis.com/bucket/designs/abc.webp",
        assetWidth: 1080,
        assetHeight: 1080,
      });
    });

    it("prefixes the request base URL when storage returns a relative path (local mode)", async () => {
      const inst = mockModelInstance(designRow());
      mockDesignFindByPk.mockResolvedValue(inst);
      mockSharpMetadata.mockResolvedValue({ width: 800, height: 600 });
      mockUploadFile.mockResolvedValue({
        url: "/uploads/designs/local.webp",
        thumbnailUrl: null,
        key: "designs/local.webp",
        size: 100,
        mimeType: "image/webp",
      });

      await designService.uploadDesignAsset(
        "design-001",
        file,
        "https://api.sadara.local",
      );

      expect(inst.update).toHaveBeenCalledWith({
        assetUrl: "https://api.sadara.local/uploads/designs/local.webp",
        assetWidth: 800,
        assetHeight: 600,
      });
    });

    it("leaves dimensions null for non-image (PDF) uploads", async () => {
      const inst = mockModelInstance(designRow());
      mockDesignFindByPk.mockResolvedValue(inst);
      mockUploadFile.mockResolvedValue({
        url: "https://cdn/designs/x.pdf",
        thumbnailUrl: null,
        key: "designs/x.pdf",
        size: 200,
        mimeType: "application/pdf",
      });

      await designService.uploadDesignAsset(
        "design-001",
        {
          buffer: Buffer.from("pdf"),
          originalname: "kit.pdf",
          mimetype: "application/pdf",
        },
        "https://api",
      );

      expect(mockSharpMetadata).not.toHaveBeenCalled();
      expect(inst.update).toHaveBeenCalledWith({
        assetUrl: "https://cdn/designs/x.pdf",
        assetWidth: null,
        assetHeight: null,
      });
    });

    it("throws 404 when the design does not exist", async () => {
      mockDesignFindByPk.mockResolvedValue(null);

      await expect(
        designService.uploadDesignAsset("missing", file, "https://api"),
      ).rejects.toThrow("Design not found");
      expect(mockUploadFile).not.toHaveBeenCalled();
    });
  });
});
