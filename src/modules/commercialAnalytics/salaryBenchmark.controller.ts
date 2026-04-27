import { createCrudController } from "@shared/utils/crudController";
import { CachePrefix } from "@shared/utils/cache";
import type { Request, Response } from "express";
import { sendSuccess } from "@shared/utils/apiResponse";
import * as service from "./salaryBenchmark.service";

const crud = createCrudController({
  service: {
    list: (query) => service.listSalaryBenchmarks(query),
    getById: (id) => service.getSalaryBenchmarkById(id),
    create: (body, userId) => service.createSalaryBenchmark(body, userId),
    update: (id, body) => service.updateSalaryBenchmark(id, body),
    delete: (id) => service.deleteSalaryBenchmark(id),
  },
  entity: "salary_benchmarks",
  cachePrefixes: [CachePrefix.SALARY_BENCHMARKS],
  label: (item) => `${item.position} ${item.tier} ${item.league}`,
});

export const { list, getById, create, update, remove } = crud;

export async function byPosition(req: Request, res: Response): Promise<void> {
  const { positions, league, season, playerType } = req.query as Record<
    string,
    string
  >;
  const result = await service.getBenchmarksByPosition({
    positions: positions ? positions.split(",") : undefined,
    league,
    season,
    playerType,
  });
  sendSuccess(res, result);
}
