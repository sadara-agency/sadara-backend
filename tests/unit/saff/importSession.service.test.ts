/// <reference types="jest" />

const mockSessionFindOne = jest.fn();
const mockSessionFindByPk = jest.fn();
const mockSessionFindAll = jest.fn();
const mockSessionCreate = jest.fn();
const mockSessionDestroy = jest.fn();

const mockTournamentFindOne = jest.fn();

const mockStandingCount = jest.fn();
const mockFixtureCount = jest.fn();

const mockRunImportPlan = jest.fn();
const mockWriteStagingFromPayload = jest.fn();

jest.mock("../../../src/modules/saff/importSession.model", () => ({
  SaffImportSession: {
    findOne: (...a: unknown[]) => mockSessionFindOne(...a),
    findByPk: (...a: unknown[]) => mockSessionFindByPk(...a),
    findAll: (...a: unknown[]) => mockSessionFindAll(...a),
    create: (...a: unknown[]) => mockSessionCreate(...a),
    destroy: (...a: unknown[]) => mockSessionDestroy(...a),
  },
}));

jest.mock("../../../src/modules/saff/saff.model", () => ({
  SaffTournament: {
    findOne: (...a: unknown[]) => mockTournamentFindOne(...a),
    name: "SaffTournament",
  },
  SaffStanding: {
    count: (...a: unknown[]) => mockStandingCount(...a),
    name: "SaffStanding",
  },
  SaffFixture: {
    count: (...a: unknown[]) => mockFixtureCount(...a),
    name: "SaffFixture",
  },
  SaffTeamMap: { name: "SaffTeamMap" },
}));

jest.mock("../../../src/modules/saff/saff.service", () => ({
  runImportPlan: (...a: unknown[]) => mockRunImportPlan(...a),
  writeStagingFromPayload: (...a: unknown[]) =>
    mockWriteStagingFromPayload(...a),
}));

jest.mock("../../../src/config/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import {
  createSession,
  getSession,
  uploadStaging,
  updateDecisions,
  previewSession,
  applySession,
  abortSession,
  reapExpiredSessions,
  _internal,
} from "../../../src/modules/saff/importSession.service";

const USER_ID = "user-1";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("importSession.service — createSession", () => {
  it("creates a session at step='fetch' when no active session exists", async () => {
    mockTournamentFindOne.mockResolvedValue({ id: "t-uuid", saffId: 333 });
    mockSessionFindOne.mockResolvedValue(null);
    mockSessionCreate.mockResolvedValue({
      id: "s-1",
      tournamentId: "t-uuid",
      saffId: 333,
      season: "2025-2026",
      step: "fetch",
    });

    const session = await createSession(
      { saffTournamentId: 333, season: "2025-2026" },
      USER_ID,
    );

    expect(session.step).toBe("fetch");
    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        tournamentId: "t-uuid",
        saffId: 333,
        season: "2025-2026",
        step: "fetch",
        createdBy: USER_ID,
      }),
    );
  });

  it("rejects when an active session exists for the same (tournament, season)", async () => {
    mockTournamentFindOne.mockResolvedValue({ id: "t-uuid", saffId: 333 });
    mockSessionFindOne.mockResolvedValue({
      id: "existing",
      step: "map",
    });

    await expect(
      createSession(
        { saffTournamentId: 333, season: "2025-2026" },
        USER_ID,
      ),
    ).rejects.toThrow(/already in progress/i);
  });

  it("rejects when the SAFF tournament is unknown", async () => {
    mockTournamentFindOne.mockResolvedValue(null);

    await expect(
      createSession(
        { saffTournamentId: 9999, season: "2025-2026" },
        USER_ID,
      ),
    ).rejects.toThrow(/not found/i);
  });
});

describe("importSession.service — getSession ownership", () => {
  it("returns the session when the caller owns it", async () => {
    mockSessionFindByPk.mockResolvedValue({
      id: "s-1",
      createdBy: USER_ID,
      step: "fetch",
    });
    const session = await getSession("s-1", USER_ID);
    expect(session.id).toBe("s-1");
  });

  it("rejects when the caller is not the session owner", async () => {
    mockSessionFindByPk.mockResolvedValue({
      id: "s-1",
      createdBy: "other-user",
      step: "fetch",
    });
    await expect(getSession("s-1", USER_ID)).rejects.toThrow(/Forbidden/i);
  });

  it("rejects when the session does not exist", async () => {
    mockSessionFindByPk.mockResolvedValue(null);
    await expect(getSession("missing", USER_ID)).rejects.toThrow(/not found/i);
  });
});

describe("importSession.service — uploadStaging", () => {
  it("advances to 'map' on a successful upload", async () => {
    const update = jest.fn();
    mockSessionFindByPk.mockResolvedValue({
      id: "s-1",
      createdBy: USER_ID,
      step: "fetch",
      saffId: 333,
      season: "2025-2026",
      snapshot: {},
      update,
    });
    mockWriteStagingFromPayload.mockResolvedValue({
      standings: 18,
      fixtures: 30,
      teams: 18,
    });

    const payload = {
      tournamentId: 333,
      season: "2025-2026",
      standings: [],
      fixtures: [],
      teams: [],
    } as any;

    await uploadStaging("s-1", USER_ID, payload, "manual.json");

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        step: "map",
        uploadFilename: "manual.json",
        snapshot: expect.objectContaining({
          source: "upload",
          validCounts: { standings: 18, fixtures: 30, teams: 18 },
        }),
      }),
    );
  });

  it("rejects upload when session is not at step='fetch'", async () => {
    mockSessionFindByPk.mockResolvedValue({
      id: "s-1",
      createdBy: USER_ID,
      step: "review",
      saffId: 333,
      season: "2025-2026",
      snapshot: {},
      update: jest.fn(),
    });

    await expect(
      uploadStaging(
        "s-1",
        USER_ID,
        { tournamentId: 333, season: "2025-2026" } as any,
        "x.json",
      ),
    ).rejects.toThrow(/Cannot upload at step/i);
  });

  it("rejects upload with mismatched tournamentId", async () => {
    mockSessionFindByPk.mockResolvedValue({
      id: "s-1",
      createdBy: USER_ID,
      step: "fetch",
      saffId: 333,
      season: "2025-2026",
      snapshot: {},
      update: jest.fn(),
    });

    await expect(
      uploadStaging(
        "s-1",
        USER_ID,
        { tournamentId: 999, season: "2025-2026" } as any,
        "x.json",
      ),
    ).rejects.toThrow(/does not match session/i);
  });
});

describe("importSession.service — updateDecisions", () => {
  it("merges patch into existing decisions and clears preview cache", async () => {
    const update = jest.fn();
    mockSessionFindByPk.mockResolvedValue({
      id: "s-1",
      createdBy: USER_ID,
      step: "map",
      decisions: { teamResolutions: [{ saffTeamId: 1, action: "skip" }] },
      update,
    });

    await updateDecisions("s-1", USER_ID, {
      teamResolutions: [
        {
          saffTeamId: 2,
          action: "map",
          clubId: "11111111-1111-1111-1111-111111111111",
        },
      ],
    });

    const arg = update.mock.calls[0][0];
    expect(arg.decisions.teamResolutions).toEqual([
      {
        saffTeamId: 2,
        action: "map",
        clubId: "11111111-1111-1111-1111-111111111111",
      },
    ]);
    expect(arg.preview).toBeNull();
    expect(arg.previewDigest).toBeNull();
  });

  it("rejects updating decisions when session is at step='done'", async () => {
    mockSessionFindByPk.mockResolvedValue({
      id: "s-1",
      createdBy: USER_ID,
      step: "done",
      decisions: {},
      update: jest.fn(),
    });

    await expect(
      updateDecisions("s-1", USER_ID, { teamResolutions: [] }),
    ).rejects.toThrow(/Cannot update decisions/i);
  });
});

describe("importSession.service — previewSession", () => {
  it("rejects when staging is empty", async () => {
    mockSessionFindByPk.mockResolvedValue({
      id: "s-1",
      createdBy: USER_ID,
      step: "map",
      tournamentId: "t-uuid",
      season: "2025-2026",
      decisions: {},
      update: jest.fn(),
    });
    mockStandingCount.mockResolvedValue(0);
    mockFixtureCount.mockResolvedValue(0);

    await expect(previewSession("s-1", USER_ID)).rejects.toThrow(
      /Staging is empty/i,
    );
  });

  it("runs runImportPlan with commit=false, caches preview, advances to 'review'", async () => {
    const update = jest.fn();
    mockSessionFindByPk.mockResolvedValue({
      id: "s-1",
      createdBy: USER_ID,
      step: "map",
      tournamentId: "t-uuid",
      season: "2025-2026",
      decisions: { teamResolutions: [{ saffTeamId: 1, action: "skip" }] },
      update,
    });
    mockStandingCount.mockResolvedValue(18);
    mockFixtureCount.mockResolvedValue(30);

    const fakePreview = {
      willCreate: { clubs: [], matches: [], competitions: [], clubCompetitions: 0 },
      willUpdate: { clubs: [], matches: [] },
      conflicts: [],
      blockers: [],
      unchanged: { clubs: 0, matches: 0 },
      playerLinks: { totalPlayers: 0, byClub: [] },
    };
    mockRunImportPlan.mockResolvedValue({ preview: fakePreview, applied: null });

    const result = await previewSession("s-1", USER_ID);

    expect(mockRunImportPlan).toHaveBeenCalledWith(
      expect.objectContaining({ commit: false }),
    );
    expect(result.preview).toEqual(fakePreview);
    expect(result.digest).toMatch(/^[a-f0-9]{64}$/);
    const updateArg = update.mock.calls[0][0];
    expect(updateArg.step).toBe("review");
    expect(updateArg.previewDigest).toBe(result.digest);
  });
});

describe("importSession.service — applySession", () => {
  it("rejects when session is not at step='review'", async () => {
    mockSessionFindByPk.mockResolvedValue({
      id: "s-1",
      createdBy: USER_ID,
      step: "map",
      preview: {},
      previewDigest: "abc",
      update: jest.fn(),
    });

    await expect(
      applySession("s-1", USER_ID, {
        decisions: {},
        confirmDigest: "abc",
      }),
    ).rejects.toThrow(/Cannot apply at step/i);
  });

  it("rejects when confirmDigest does not match cached previewDigest (PREVIEW_STALE)", async () => {
    mockSessionFindByPk.mockResolvedValue({
      id: "s-1",
      createdBy: USER_ID,
      step: "review",
      preview: { foo: "bar" },
      previewDigest: "real-digest",
      decisions: {},
      update: jest.fn(),
    });

    await expect(
      applySession("s-1", USER_ID, {
        decisions: {},
        confirmDigest: "stale-digest",
      }),
    ).rejects.toThrow(/PREVIEW_STALE/);
  });

  it("commits and transitions to 'done' on a matching digest", async () => {
    const update = jest.fn();
    mockSessionFindByPk.mockResolvedValue({
      id: "s-1",
      createdBy: USER_ID,
      step: "review",
      tournamentId: "t-uuid",
      season: "2025-2026",
      preview: { foo: "bar" },
      previewDigest: "good-digest",
      decisions: { teamResolutions: [] },
      update,
    });
    const applied = {
      clubsCreated: 1,
      clubsUpdated: 0,
      matchesCreated: 5,
      matchesUpdated: 0,
      competitionsCreated: 0,
      playersLinked: 7,
      skippedTeams: 0,
    };
    mockRunImportPlan.mockResolvedValue({ preview: {}, applied });

    const result = await applySession("s-1", USER_ID, {
      decisions: {},
      confirmDigest: "good-digest",
    });

    expect(mockRunImportPlan).toHaveBeenCalledWith(
      expect.objectContaining({ commit: true }),
    );
    expect(result.applied).toEqual(applied);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        step: "done",
        appliedSummary: applied,
      }),
    );
  });
});

describe("importSession.service — abortSession + reaper", () => {
  it("transitions an active session to 'aborted'", async () => {
    const update = jest.fn();
    mockSessionFindByPk.mockResolvedValue({
      id: "s-1",
      createdBy: USER_ID,
      step: "map",
      update,
    });
    await abortSession("s-1", USER_ID);
    expect(update).toHaveBeenCalledWith({ step: "aborted" });
  });

  it("is a no-op when session is already 'done'", async () => {
    const update = jest.fn();
    mockSessionFindByPk.mockResolvedValue({
      id: "s-1",
      createdBy: USER_ID,
      step: "done",
      update,
    });
    await abortSession("s-1", USER_ID);
    expect(update).not.toHaveBeenCalled();
  });

  it("reapExpiredSessions deletes expired in-flight rows", async () => {
    mockSessionDestroy.mockResolvedValue(3);
    const result = await reapExpiredSessions();
    expect(result).toBe(3);
    expect(mockSessionDestroy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          step: expect.any(Object),
          expiresAt: expect.any(Object),
        }),
      }),
    );
  });
});

describe("importSession.service — internal helpers", () => {
  it("digestPreview is deterministic and ~64 hex chars (SHA-256)", () => {
    const a = _internal.digestPreview({ foo: "bar" } as any);
    const b = _internal.digestPreview({ foo: "bar" } as any);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("digestPreview differs when content differs", () => {
    const a = _internal.digestPreview({ foo: "bar" } as any);
    const b = _internal.digestPreview({ foo: "baz" } as any);
    expect(a).not.toBe(b);
  });
});
