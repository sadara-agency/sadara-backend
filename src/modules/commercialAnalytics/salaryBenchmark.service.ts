import { Op } from "sequelize";
import SalaryBenchmark from "./salaryBenchmark.model";
import type {
  CreateSalaryBenchmarkDTO,
  UpdateSalaryBenchmarkDTO,
} from "./salaryBenchmark.validation";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";

export async function listSalaryBenchmarks(query: {
  position?: string;
  league?: string;
  season?: string;
  playerType?: string;
  page?: number;
  limit?: number;
}) {
  const { page = 1, limit = 50 } = query;
  const where: Record<string, unknown> = {};

  if (query.position) where.position = { [Op.iLike]: query.position };
  if (query.league) where.league = query.league;
  if (query.playerType) where.playerType = query.playerType;
  if (query.season !== undefined) {
    where.season = query.season || null;
  }

  const { rows, count } = await SalaryBenchmark.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [
      ["position", "ASC"],
      ["league", "ASC"],
      ["tier", "ASC"],
    ],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getSalaryBenchmarkById(id: string) {
  const item = await SalaryBenchmark.findByPk(id);
  if (!item) throw new AppError("Salary benchmark not found", 404);
  return item;
}

export async function createSalaryBenchmark(
  data: CreateSalaryBenchmarkDTO,
  userId: string,
) {
  return SalaryBenchmark.create({ ...data, createdBy: userId });
}

export async function updateSalaryBenchmark(
  id: string,
  data: UpdateSalaryBenchmarkDTO,
) {
  const item = await getSalaryBenchmarkById(id);
  return item.update(data);
}

export async function deleteSalaryBenchmark(id: string) {
  const item = await getSalaryBenchmarkById(id);
  await item.destroy();
  return { id };
}

/** Returns low/mid/high for each requested position in one query. */
export async function getBenchmarksByPosition(params: {
  positions?: string[];
  league?: string;
  season?: string;
  playerType?: string;
}) {
  const where: Record<string, unknown> = {};
  if (params.positions?.length) {
    where.position = { [Op.in]: params.positions };
  }
  if (params.league) where.league = params.league;
  if (params.playerType) where.playerType = params.playerType;
  where.season = params.season ?? null;

  const rows = await SalaryBenchmark.findAll({
    where,
    order: [
      ["position", "ASC"],
      ["tier", "ASC"],
    ],
  });

  // Group into { [position]: { low, mid, high } }
  type ByPosition = Record<
    string,
    { low: number | null; mid: number | null; high: number | null }
  >;
  return rows.reduce<ByPosition>((acc, r) => {
    if (!acc[r.position])
      acc[r.position] = { low: null, mid: null, high: null };
    acc[r.position][r.tier] = Number(r.annualSalarySar);
    return acc;
  }, {});
}
