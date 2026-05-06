import { Op, WhereOptions } from "sequelize";
import { AppError } from "@middleware/errorHandler";
import { Player } from "@modules/players/player.model";
import { Match } from "@modules/matches/match.model";
import { HeatmapMatchData } from "./heatmap.model";
import type {
  AggregateHeatmapQuery,
  CreateHeatmapInput,
  PlayerHeatmapsQuery,
} from "./heatmap.validation";

// ── Density-grid configuration ──

export const GRID_WIDTH = 60;
export const GRID_HEIGHT = 40;
/** Gaussian smoothing radius in cells. Half-width of the kernel. */
const KERNEL_RADIUS = 3;
/** Standard deviation for the Gaussian kernel, in cells. */
const KERNEL_SIGMA = 1.5;

/** Build a 1-D Gaussian kernel — separable, applied twice (rows then cols). */
function gaussianKernel(radius: number, sigma: number): number[] {
  const kernel: number[] = [];
  const denom = 2 * sigma * sigma;
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    const v = Math.exp(-(i * i) / denom);
    kernel.push(v);
    sum += v;
  }
  return kernel.map((v) => v / sum);
}

const KERNEL = gaussianKernel(KERNEL_RADIUS, KERNEL_SIGMA);

/**
 * Compute a (GRID_WIDTH × GRID_HEIGHT) density grid from raw positions.
 * Positions are expected in coordinate range [0, 100] (normalized).
 *
 * Steps:
 *   1. Bucket each (x, y) into the grid (count occurrences).
 *   2. Apply a separable Gaussian blur (rows + cols).
 *   3. Normalize the maximum cell value to 255 and round to int.
 *
 * Returns row-major: grid[y][x] where y in [0, GRID_HEIGHT-1].
 */
export function computeDensityGrid(positions: number[]): number[][] {
  const w = GRID_WIDTH;
  const h = GRID_HEIGHT;
  const counts: Float32Array = new Float32Array(w * h);

  // Step 1 — bucket. Positions stored as flat [x,y,t,...]; we ignore t here.
  for (let i = 0; i + 2 < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x < 0 || x > 100 || y < 0 || y > 100) continue;
    const cx = Math.min(w - 1, Math.max(0, Math.floor((x / 100) * w)));
    const cy = Math.min(h - 1, Math.max(0, Math.floor((y / 100) * h)));
    counts[cy * w + cx] += 1;
  }

  // Step 2 — separable Gaussian. Horizontal pass then vertical pass.
  const tmp = new Float32Array(w * h);
  const r = KERNEL_RADIUS;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = -r; k <= r; k++) {
        const sx = Math.min(w - 1, Math.max(0, x + k));
        acc += counts[y * w + sx] * KERNEL[k + r];
      }
      tmp[y * w + x] = acc;
    }
  }

  const blurred = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = -r; k <= r; k++) {
        const sy = Math.min(h - 1, Math.max(0, y + k));
        acc += tmp[sy * w + x] * KERNEL[k + r];
      }
      blurred[y * w + x] = acc;
    }
  }

  // Step 3 — normalize.
  let max = 0;
  for (let i = 0; i < blurred.length; i++) {
    if (blurred[i] > max) max = blurred[i];
  }
  const grid: number[][] = [];
  for (let y = 0; y < h; y++) {
    const row: number[] = new Array(w);
    for (let x = 0; x < w; x++) {
      row[x] = max > 0 ? Math.round((blurred[y * w + x] / max) * 255) : 0;
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Sum N grids of the same dimensions cell-by-cell, then renormalize to 0–255.
 */
export function sumGrids(grids: number[][][]): number[][] {
  if (grids.length === 0) return emptyGrid();
  const w = GRID_WIDTH;
  const h = GRID_HEIGHT;
  const acc = new Float32Array(w * h);
  for (const g of grids) {
    for (let y = 0; y < h; y++) {
      const row = g[y];
      if (!row) continue;
      for (let x = 0; x < w; x++) acc[y * w + x] += row[x] ?? 0;
    }
  }
  let max = 0;
  for (let i = 0; i < acc.length; i++) if (acc[i] > max) max = acc[i];
  const out: number[][] = [];
  for (let y = 0; y < h; y++) {
    const row: number[] = new Array(w);
    for (let x = 0; x < w; x++) {
      row[x] = max > 0 ? Math.round((acc[y * w + x] / max) * 255) : 0;
    }
    out.push(row);
  }
  return out;
}

function emptyGrid(): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < GRID_HEIGHT; y++)
    grid.push(new Array(GRID_WIDTH).fill(0));
  return grid;
}

/** Convert object-form positions to the flat [x,y,t,...] storage form. */
function flattenPositions(
  triplets: { x: number; y: number; timestamp: number }[],
): number[] {
  const out: number[] = new Array(triplets.length * 3);
  for (let i = 0; i < triplets.length; i++) {
    out[i * 3] = triplets[i].x;
    out[i * 3 + 1] = triplets[i].y;
    out[i * 3 + 2] = triplets[i].timestamp;
  }
  return out;
}

// ── CRUD / business logic ──

export async function saveHeatmapData(
  body: CreateHeatmapInput,
  createdBy: string,
) {
  const player = await Player.findByPk(body.playerId);
  if (!player) throw new AppError("Player not found", 404);

  if (body.matchId) {
    const match = await Match.findByPk(body.matchId);
    if (!match) throw new AppError("Match not found", 404);
  }

  const coordinateSystem = body.coordinateSystem ?? "normalized_0_100";

  // 422: positions out of range (only validate the normalized system here).
  if (coordinateSystem === "normalized_0_100") {
    for (const p of body.positions) {
      if (p.x < 0 || p.x > 100 || p.y < 0 || p.y > 100) {
        throw new AppError(
          "Position coordinates must be within [0, 100] for normalized_0_100",
          422,
        );
      }
    }
  }

  // 409: duplicate (playerId, matchId, half) unless replace=true.
  if (body.matchId) {
    const existing = await HeatmapMatchData.findOne({
      where: {
        playerId: body.playerId,
        matchId: body.matchId,
        half: body.half ?? null,
      },
    });
    if (existing) {
      if (!body.replace) {
        throw new AppError(
          "Heatmap data already exists for this player/match/half",
          409,
        );
      }
      await existing.destroy();
    }
  }

  const flat = flattenPositions(body.positions);
  const precomputedGrid = computeDensityGrid(flat);

  const created = await HeatmapMatchData.create({
    playerId: body.playerId,
    matchId: body.matchId ?? null,
    positions: flat,
    sampleCount: body.positions.length,
    durationSeconds: body.durationSeconds ?? null,
    coordinateSystem,
    half: body.half ?? null,
    source: body.source ?? "manual",
    precomputedGrid,
    createdBy,
  });

  return created;
}

export async function getHeatmapById(id: string) {
  const item = await HeatmapMatchData.findByPk(id);
  if (!item) throw new AppError("Heatmap not found", 404);
  return item;
}

export async function getPlayerHeatmaps(
  playerId: string,
  query: PlayerHeatmapsQuery,
) {
  const player = await Player.findByPk(playerId);
  if (!player) throw new AppError("Player not found", 404);

  const where: WhereOptions = { playerId };
  if (query.matchId) (where as any).matchId = query.matchId;
  if (query.half) (where as any).half = query.half;
  if (query.from || query.to) {
    (where as any).createdAt = {};
    if (query.from) (where as any).createdAt[Op.gte] = new Date(query.from);
    if (query.to) (where as any).createdAt[Op.lte] = new Date(query.to);
  }

  const rows = await HeatmapMatchData.findAll({
    where,
    order: [["createdAt", "DESC"]],
    attributes: [
      "id",
      "playerId",
      "matchId",
      "sampleCount",
      "durationSeconds",
      "coordinateSystem",
      "half",
      "source",
      "precomputedGrid",
      "createdAt",
    ],
  });

  return { data: rows, meta: { total: rows.length } };
}

export async function getAggregatedHeatmap(
  playerId: string,
  query: AggregateHeatmapQuery,
) {
  const player = await Player.findByPk(playerId);
  if (!player) throw new AppError("Player not found", 404);

  const where: WhereOptions = { playerId };
  if (query.half) (where as any).half = query.half;
  if (query.from || query.to) {
    (where as any).createdAt = {};
    if (query.from) (where as any).createdAt[Op.gte] = new Date(query.from);
    if (query.to) (where as any).createdAt[Op.lte] = new Date(query.to);
  }

  const rows = await HeatmapMatchData.findAll({
    where,
    attributes: ["id", "matchId", "precomputedGrid", "sampleCount"],
  });

  const grids = rows
    .map((r) => r.precomputedGrid)
    .filter((g): g is number[][] => Array.isArray(g));

  const aggregated = sumGrids(grids);
  const totalSamples = rows.reduce((acc, r) => acc + (r.sampleCount ?? 0), 0);

  return {
    playerId,
    matchCount: rows.length,
    totalSamples,
    gridWidth: GRID_WIDTH,
    gridHeight: GRID_HEIGHT,
    grid: aggregated,
  };
}

export async function getMatchHeatmaps(matchId: string) {
  const match = await Match.findByPk(matchId);
  if (!match) throw new AppError("Match not found", 404);

  const rows = await HeatmapMatchData.findAll({
    where: { matchId },
    order: [["createdAt", "DESC"]],
  });
  return { data: rows, meta: { total: rows.length } };
}

export async function deleteHeatmap(id: string) {
  const item = await getHeatmapById(id);
  await item.destroy();
  return { id };
}
