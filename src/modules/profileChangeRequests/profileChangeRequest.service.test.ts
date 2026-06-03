jest.mock("@config/logger", () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("@modules/portal/portal.service", () => ({
  getLinkedPlayer: jest.fn(),
}));

jest.mock("@modules/approvals/approval.service", () => ({
  createApprovalRequest: jest.fn(),
}));

jest.mock("@modules/players/player.model", () => ({
  Player: { findByPk: jest.fn() },
}));

jest.mock("./profileChangeRequest.model", () => ({
  ProfileChangeRequest: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("@shared/utils/cache", () => ({
  invalidateMultiple: jest.fn().mockResolvedValue(undefined),
  CachePrefix: { PORTAL: "portal", PLAYERS: "players" },
}));

import {
  submitProfileChange,
  applyProfileChangeRequest,
  rejectProfileChangeRequest,
  listMyProfileChanges,
  LEADERSHIP_ROLES,
} from "./profileChangeRequest.service";
import { getLinkedPlayer } from "@modules/portal/portal.service";
import { createApprovalRequest } from "@modules/approvals/approval.service";
import { Player } from "@modules/players/player.model";
import { ProfileChangeRequest } from "./profileChangeRequest.model";
import { invalidateMultiple } from "@shared/utils/cache";

/**
 * Build a fake linked-Player instance whose getDataValue mirrors the columns
 * the service reads (id, firstName, lastName, and the whitelisted fields).
 */
function makeLinkedPlayer(overrides: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = {
    id: "p-1",
    firstName: "Khalid",
    lastName: "Al-Ghamdi",
    weightKg: 75,
    heightCm: 180,
    dateOfBirth: "2000-01-01",
    preferredFoot: "Right",
    position: "ST",
    ...overrides,
  };
  return {
    getDataValue: (k: string) => data[k],
  };
}

describe("submitProfileChange", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws 422 when the submitted values match the current values (no-op)", async () => {
    (getLinkedPlayer as jest.Mock).mockResolvedValue(
      makeLinkedPlayer({ weightKg: 75 }),
    );

    await expect(
      submitProfileChange("user-1", { weightKg: 75 }),
    ).rejects.toMatchObject({ statusCode: 422 });

    expect(ProfileChangeRequest.findOne).not.toHaveBeenCalled();
    expect(createApprovalRequest).not.toHaveBeenCalled();
    expect(ProfileChangeRequest.create).not.toHaveBeenCalled();
  });

  it("throws 409 when a pending request already exists", async () => {
    (getLinkedPlayer as jest.Mock).mockResolvedValue(
      makeLinkedPlayer({ weightKg: 75 }),
    );
    (ProfileChangeRequest.findOne as jest.Mock).mockResolvedValue({
      id: "pcr-existing",
      status: "Pending",
    });

    await expect(
      submitProfileChange("user-1", { weightKg: 80 }),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(createApprovalRequest).not.toHaveBeenCalled();
    expect(ProfileChangeRequest.create).not.toHaveBeenCalled();
  });

  it("creates a request with the from→to diff and a player/update_profile approval", async () => {
    (getLinkedPlayer as jest.Mock).mockResolvedValue(
      makeLinkedPlayer({ weightKg: 75, position: "ST" }),
    );
    (ProfileChangeRequest.findOne as jest.Mock).mockResolvedValue(null);
    (createApprovalRequest as jest.Mock).mockResolvedValue({ id: "appr-1" });
    (ProfileChangeRequest.create as jest.Mock).mockImplementation(
      async (payload: unknown) => ({ id: "pcr-1", ...(payload as object) }),
    );

    const result = await submitProfileChange("user-1", {
      weightKg: 80,
      position: "CF",
    });

    // Approval: correct entity/action/role
    expect(createApprovalRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "player",
        entityId: "p-1",
        action: "update_profile",
        requestedBy: "user-1",
        assignedRole: "Admin",
        priority: "normal",
        entityTitle: "Profile change - Khalid Al-Ghamdi",
      }),
    );

    // Request row: diff is only the changed whitelisted fields, with from→to
    expect(ProfileChangeRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        playerId: "p-1",
        requestedBy: "user-1",
        approvalRequestId: "appr-1",
        changes: {
          weightKg: { from: 75, to: 80 },
          position: { from: "ST", to: "CF" },
        },
      }),
    );
    expect(result).toMatchObject({ id: "pcr-1" });
  });

  it("records from: null when the current value is null/undefined", async () => {
    (getLinkedPlayer as jest.Mock).mockResolvedValue(
      makeLinkedPlayer({ preferredFoot: null }),
    );
    (ProfileChangeRequest.findOne as jest.Mock).mockResolvedValue(null);
    (createApprovalRequest as jest.Mock).mockResolvedValue({ id: "appr-2" });
    (ProfileChangeRequest.create as jest.Mock).mockResolvedValue({
      id: "pcr-2",
    });

    await submitProfileChange("user-1", { preferredFoot: "Left" });

    expect(ProfileChangeRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        changes: { preferredFoot: { from: null, to: "Left" } },
      }),
    );
  });
});

describe("applyProfileChangeRequest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("writes the diff to-values onto the player and marks the request Approved", async () => {
    const reqUpdate = jest.fn().mockResolvedValue(undefined);
    (ProfileChangeRequest.findOne as jest.Mock).mockResolvedValue({
      id: "pcr-1",
      playerId: "p-1",
      status: "Pending",
      changes: {
        weightKg: { from: 75, to: 80 },
        position: { from: "ST", to: "CF" },
      },
      update: reqUpdate,
    });
    const playerUpdate = jest.fn().mockResolvedValue(undefined);
    (Player.findByPk as jest.Mock).mockResolvedValue({ update: playerUpdate });

    await applyProfileChangeRequest("appr-1", "admin-9");

    expect(playerUpdate).toHaveBeenCalledWith({ weightKg: 80, position: "CF" });
    expect(reqUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "Approved",
        resolvedBy: "admin-9",
        resolvedAt: expect.any(Date),
      }),
    );
    expect(invalidateMultiple).toHaveBeenCalledWith(["portal", "players"]);
  });

  it("is a no-op when no pending request is found (idempotent)", async () => {
    (ProfileChangeRequest.findOne as jest.Mock).mockResolvedValue(null);

    const result = await applyProfileChangeRequest("appr-x", "admin-9");

    expect(result).toBeUndefined();
    expect(Player.findByPk).not.toHaveBeenCalled();
    expect(invalidateMultiple).not.toHaveBeenCalled();
  });

  it("throws 404 when the player no longer exists", async () => {
    (ProfileChangeRequest.findOne as jest.Mock).mockResolvedValue({
      id: "pcr-1",
      playerId: "p-gone",
      status: "Pending",
      changes: { weightKg: { from: 75, to: 80 } },
      update: jest.fn(),
    });
    (Player.findByPk as jest.Mock).mockResolvedValue(null);

    await expect(
      applyProfileChangeRequest("appr-1", "admin-9"),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("rejectProfileChangeRequest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("marks the request Rejected and does NOT touch the player", async () => {
    const reqUpdate = jest.fn().mockResolvedValue(undefined);
    (ProfileChangeRequest.findOne as jest.Mock).mockResolvedValue({
      id: "pcr-1",
      status: "Pending",
      update: reqUpdate,
    });

    await rejectProfileChangeRequest("appr-1", "admin-9", "Not allowed");

    expect(reqUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "Rejected",
        resolvedBy: "admin-9",
        resolvedAt: expect.any(Date),
        reviewerComment: "Not allowed",
      }),
    );
    expect(Player.findByPk).not.toHaveBeenCalled();
  });

  it("stores null reviewerComment when no comment is provided", async () => {
    const reqUpdate = jest.fn().mockResolvedValue(undefined);
    (ProfileChangeRequest.findOne as jest.Mock).mockResolvedValue({
      id: "pcr-2",
      status: "Pending",
      update: reqUpdate,
    });

    await rejectProfileChangeRequest("appr-2", "admin-9");

    expect(reqUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ reviewerComment: null }),
    );
  });

  it("is a no-op when no pending request is found (idempotent)", async () => {
    (ProfileChangeRequest.findOne as jest.Mock).mockResolvedValue(null);

    const result = await rejectProfileChangeRequest("appr-x", "admin-9");

    expect(result).toBeUndefined();
    expect(Player.findByPk).not.toHaveBeenCalled();
  });
});

describe("listMyProfileChanges", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the player's recent requests scoped by playerId", async () => {
    (getLinkedPlayer as jest.Mock).mockResolvedValue(makeLinkedPlayer());
    (ProfileChangeRequest.findAll as jest.Mock).mockResolvedValue([
      { id: "pcr-1" },
    ]);

    const result = await listMyProfileChanges("user-1");

    expect(ProfileChangeRequest.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { playerId: "p-1" },
        order: [["createdAt", "DESC"]],
        limit: 20,
      }),
    );
    expect(result).toEqual([{ id: "pcr-1" }]);
  });
});

describe("LEADERSHIP_ROLES", () => {
  it("exposes the leader roles permitted to resolve profile changes", () => {
    expect(LEADERSHIP_ROLES).toEqual(["Admin", "Manager", "SportingDirector"]);
  });
});
