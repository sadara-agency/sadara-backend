import { OppositionReport } from "./oppositionReport.model";
import { AppError } from "@middleware/errorHandler";
import type {
  CreateOppositionReportInput,
  UpdateOppositionReportInput,
  OppositionReportQuery,
} from "./oppositionReport.validation";
import type { AuthUser } from "@shared/types";

export async function listOppositionReports(
  query: OppositionReportQuery,
  _user?: AuthUser,
) {
  const where: Record<string, unknown> = {};
  if (query.status) where.status = query.status;
  if (query.analystId) where.analystId = query.analystId;

  const offset = (query.page - 1) * query.limit;
  const { rows, count } = await OppositionReport.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit: query.limit,
    offset,
    distinct: true,
  });

  return {
    data: rows,
    meta: {
      total: count,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(count / query.limit),
    },
  };
}

export async function getOppositionReportById(id: string, _user?: AuthUser) {
  const record = await OppositionReport.findByPk(id);
  if (!record) throw new AppError("Opposition report not found", 404);
  return record;
}

export async function createOppositionReport(
  body: CreateOppositionReportInput,
  userId: string,
) {
  return OppositionReport.create({ ...body, analystId: userId });
}

export async function updateOppositionReport(
  id: string,
  body: UpdateOppositionReportInput,
) {
  const record = await getOppositionReportById(id);
  await record.update(body);
  return record;
}

export async function deleteOppositionReport(id: string) {
  const record = await getOppositionReportById(id);
  await record.destroy();
  return { id };
}

export async function publishOppositionReport(id: string) {
  const record = await getOppositionReportById(id);
  if (record.status === "published") {
    throw new AppError("Report is already published", 409);
  }
  await record.update({ status: "published" });
  return record;
}
