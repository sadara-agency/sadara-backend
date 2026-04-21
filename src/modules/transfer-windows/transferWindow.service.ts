import { UniqueConstraintError } from "sequelize";
import TransferWindow from "./transferWindow.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import type { AuthUser } from "@shared/types";
import type {
  CreateTransferWindowInput,
  UpdateTransferWindowInput,
  TransferWindowQuery,
} from "./transferWindow.validation";

export async function listTransferWindows(
  query: TransferWindowQuery,
  _user?: AuthUser,
) {
  const { limit, offset, page, sort, order } = parsePagination(
    query,
    "startDate",
  );

  const where: Record<string, unknown> = {};
  if (query.status) where.status = query.status;

  const { count, rows } = await TransferWindow.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order.toUpperCase()]],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getTransferWindowById(id: string, _user?: AuthUser) {
  const item = await TransferWindow.findByPk(id);
  if (!item) throw new AppError("Transfer window not found", 404);
  return item;
}

export async function createTransferWindow(
  data: CreateTransferWindowInput,
  _createdBy: string,
) {
  try {
    return await TransferWindow.create(data);
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      throw new AppError("Window already exists for this season", 409);
    }
    throw err;
  }
}

export async function updateTransferWindow(
  id: string,
  data: UpdateTransferWindowInput,
) {
  const item = await getTransferWindowById(id);
  return item.update(data);
}

export async function deleteTransferWindow(id: string) {
  const item = await getTransferWindowById(id);
  await item.destroy();
  return { id };
}
