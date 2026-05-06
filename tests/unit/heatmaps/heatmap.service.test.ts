/// <reference types="jest" />
// ─────────────────────────────────────────────────────────────
// tests/unit/heatmaps/heatmap.service.test.ts
// Unit tests for the heatmaps service: KDE math + business logic.
// Mocks the Sequelize models.
// ─────────────────────────────────────────────────────────────

const mockHeatmapFindByPk = jest.fn();
const mockHeatmapFindOne = jest.fn();
const mockHeatmapFindAll = jest.fn();
const mockHeatmapCreate = jest.fn();
const mockPlayerFindByPk = jest.fn();
const mockMatchFindByPk = jest.fn();

jest.mock("../../../src/config/database", () => ({
  sequelize: {
    query: jest.fn().mockResolvedValue([]),
    authenticate: jest.fn(),
  },
}));

jest.mock("../../../src/modules/heatmaps/heatmap.model", () => ({
  HeatmapMatchData: {
    findByPk: (...a: unknown[]) => mockHeatmapFindByPk(...a),
    findOne: (...a: unknown[]) => mockHeatmapFindOne(...a),
    findAll: (...a: unknown[]) => mockHeatmapFindAll(...a),
    create: (...a: unknown[]) => mockHeatmapCreate(...a),
  },
}));

jest.mock("../../../src/modules/players/player.model", () => ({
  Player: {
    findByPk: (...a: unknown[]) => mockPlayerFindByPk(...a),
  },
}));

jest.mock("../../../src/modules/matches/match.model", () => ({
  Match: {
    findByPk: (...a: unknown[]) => mockMatchFindByPk(...a),
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

import * as service from "../../../src/modules/heatmaps/heatmap.service";
import { AppError } from "../../../src/middleware/errorHandler";

const PLAYER_ID = "11111111-1111-1111-1111-111111111111";
const MATCH_ID = "22222222-2222-2222-2222-222222222222";
const USER_ID = "33333333-3333-3333-3333-333333333333";

beforeEach(() => {
  jest.clearAllMocks();
});

// ════════════════════════════════════════════════════════
// computeDensityGrid (pure math)
// ════════════════════════════════════════════════════════
describe("computeDensityGrid", () => {
  it("returns a 60x40 grid of zeros for empty input", () => {
    const grid = service.computeDensityGrid([]);
    expect(grid).toHaveLength(service.GRID_HEIGHT);
    expect(grid[0]).toHaveLength(service.GRID_WIDTH);
    expect(grid.every((row) => row.every((v) => v === 0))).toBe(true);
  });

  it("places density near the input coordinate", () => {
    // single point in dead center: (50, 50)
    const grid = service.computeDensityGrid([50, 50, 0]);

    // center cell ~ x=30, y=20 in 60x40 grid
    const cx = 30;
    const cy = 20;
    expect(grid[cy][cx]).toBe(255); // normalized peak

    // far corners should be ~0
    expect(grid[0][0]).toBeLessThan(10);
    expect(grid[39][59]).toBeLessThan(10);
  });

  it("ignores out-of-range coordinates", () => {
    const grid = service.computeDensityGrid([-5, 50, 0, 50, 200, 1]);
    // Both samples are out of range — grid should be all zeros.
    expect(grid.every((row) => row.every((v) => v === 0))).toBe(true);
  });

  it("normalizes the maximum cell to 255", () => {
    const positions: number[] = [];
    for (let i = 0; i < 100; i++) positions.push(50, 50, i);
    const grid = service.computeDensityGrid(positions);
    let max = 0;
    for (const row of grid) for (const v of row) if (v > max) max = v;
    expect(max).toBe(255);
  });
});

// ════════════════════════════════════════════════════════
// sumGrids
// ════════════════════════════════════════════════════════
describe("sumGrids", () => {
  it("returns an empty grid when given no inputs", () => {
    const out = service.sumGrids([]);
    expect(out).toHaveLength(service.GRID_HEIGHT);
    expect(out[0]).toHaveLength(service.GRID_WIDTH);
    expect(out.every((row) => row.every((v) => v === 0))).toBe(true);
  });

  it("sums two grids and renormalizes the result to 0–255", () => {
    const a = service.computeDensityGrid([25, 25, 0]);
    const b = service.computeDensityGrid([75, 75, 0]);
    const summed = service.sumGrids([a, b]);
    let max = 0;
    for (const row of summed) for (const v of row) if (v > max) max = v;
    expect(max).toBe(255);
  });
});

// ════════════════════════════════════════════════════════
// saveHeatmapData
// ════════════════════════════════════════════════════════
describe("saveHeatmapData", () => {
  const validBody = {
    playerId: PLAYER_ID,
    matchId: MATCH_ID,
    positions: [
      { x: 50, y: 50, timestamp: 0 },
      { x: 51, y: 49, timestamp: 1 },
    ],
  };

  it("404s if player does not exist", async () => {
    mockPlayerFindByPk.mockResolvedValue(null);

    await expect(
      service.saveHeatmapData(validBody, USER_ID),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("404s if match does not exist", async () => {
    mockPlayerFindByPk.mockResolvedValue({ id: PLAYER_ID });
    mockMatchFindByPk.mockResolvedValue(null);

    await expect(
      service.saveHeatmapData(validBody, USER_ID),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("422s when coordinates are out of range for normalized_0_100", async () => {
    mockPlayerFindByPk.mockResolvedValue({ id: PLAYER_ID });
    mockMatchFindByPk.mockResolvedValue({ id: MATCH_ID });
    mockHeatmapFindOne.mockResolvedValue(null);

    await expect(
      service.saveHeatmapData(
        {
          ...validBody,
          positions: [{ x: 150, y: 50, timestamp: 0 }],
        },
        USER_ID,
      ),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it("409s on duplicate (player, match, half) without replace", async () => {
    mockPlayerFindByPk.mockResolvedValue({ id: PLAYER_ID });
    mockMatchFindByPk.mockResolvedValue({ id: MATCH_ID });
    mockHeatmapFindOne.mockResolvedValue({ id: "existing", destroy: jest.fn() });

    await expect(
      service.saveHeatmapData(validBody, USER_ID),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("replaces existing data when replace=true and creates a new record", async () => {
    const destroy = jest.fn();
    mockPlayerFindByPk.mockResolvedValue({ id: PLAYER_ID });
    mockMatchFindByPk.mockResolvedValue({ id: MATCH_ID });
    mockHeatmapFindOne.mockResolvedValue({ id: "existing", destroy });
    mockHeatmapCreate.mockImplementation(async (data: any) => ({ id: "new", ...data }));

    const result = await service.saveHeatmapData(
      { ...validBody, replace: true },
      USER_ID,
    );

    expect(destroy).toHaveBeenCalled();
    expect(mockHeatmapCreate).toHaveBeenCalled();
    expect(result.id).toBe("new");
  });

  it("happy path: stores flattened positions, sample count, and a precomputed grid", async () => {
    mockPlayerFindByPk.mockResolvedValue({ id: PLAYER_ID });
    mockMatchFindByPk.mockResolvedValue({ id: MATCH_ID });
    mockHeatmapFindOne.mockResolvedValue(null);
    mockHeatmapCreate.mockImplementation(async (data: any) => ({ id: "new", ...data }));

    const result: any = await service.saveHeatmapData(validBody, USER_ID);

    expect(result.sampleCount).toBe(2);
    expect(result.positions).toEqual([50, 50, 0, 51, 49, 1]);
    expect(result.precomputedGrid).toHaveLength(service.GRID_HEIGHT);
    expect(result.precomputedGrid[0]).toHaveLength(service.GRID_WIDTH);
    expect(result.createdBy).toBe(USER_ID);
  });
});

// ════════════════════════════════════════════════════════
// getAggregatedHeatmap
// ════════════════════════════════════════════════════════
describe("getAggregatedHeatmap", () => {
  it("404s if player does not exist", async () => {
    mockPlayerFindByPk.mockResolvedValue(null);

    await expect(
      service.getAggregatedHeatmap(PLAYER_ID, {}),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("returns an empty grid + zero counts when no records exist", async () => {
    mockPlayerFindByPk.mockResolvedValue({ id: PLAYER_ID });
    mockHeatmapFindAll.mockResolvedValue([]);

    const result = await service.getAggregatedHeatmap(PLAYER_ID, {});
    expect(result.matchCount).toBe(0);
    expect(result.totalSamples).toBe(0);
    expect(result.grid).toHaveLength(service.GRID_HEIGHT);
    expect(result.grid[0]).toHaveLength(service.GRID_WIDTH);
    expect(result.grid.every((row) => row.every((v) => v === 0))).toBe(true);
  });

  it("aggregates precomputed grids across matches and counts samples", async () => {
    const grid = service.computeDensityGrid([50, 50, 0]);
    mockPlayerFindByPk.mockResolvedValue({ id: PLAYER_ID });
    mockHeatmapFindAll.mockResolvedValue([
      { matchId: "m1", precomputedGrid: grid, sampleCount: 100 },
      { matchId: "m2", precomputedGrid: grid, sampleCount: 200 },
    ]);

    const result = await service.getAggregatedHeatmap(PLAYER_ID, {});
    expect(result.matchCount).toBe(2);
    expect(result.totalSamples).toBe(300);
    let max = 0;
    for (const row of result.grid) for (const v of row) if (v > max) max = v;
    expect(max).toBe(255);
  });
});

// ════════════════════════════════════════════════════════
// getPlayerHeatmaps / getMatchHeatmaps / getHeatmapById
// ════════════════════════════════════════════════════════
describe("getPlayerHeatmaps", () => {
  it("404s if player does not exist", async () => {
    mockPlayerFindByPk.mockResolvedValue(null);
    await expect(
      service.getPlayerHeatmaps(PLAYER_ID, {}),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("getMatchHeatmaps", () => {
  it("404s if match does not exist", async () => {
    mockMatchFindByPk.mockResolvedValue(null);
    await expect(service.getMatchHeatmaps(MATCH_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe("getHeatmapById", () => {
  it("404s if record not found", async () => {
    mockHeatmapFindByPk.mockResolvedValue(null);
    await expect(service.getHeatmapById("missing")).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
