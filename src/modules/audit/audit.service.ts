import { Op } from "sequelize";
import { AuditLog } from "./AuditLog.model";
import { parsePagination, buildMeta } from "../../shared/utils/pagination";

export async function listAuditLogs(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "logged_at",
  );

  const where: any = {};

  if (search) {
    where[Op.or] = [
      { action: { [Op.iLike]: `%${search}%` } },
      { entity: { [Op.iLike]: `%${search}%` } },
      { userName: { [Op.iLike]: `%${search}%` } },
    ];
  }

  if (queryParams.entity) {
    where.entity = queryParams.entity;
  }

  if (queryParams.dateFrom || queryParams.dateTo) {
    where.loggedAt = {};
    if (queryParams.dateFrom) {
      where.loggedAt[Op.gte] = queryParams.dateFrom;
    }
    if (queryParams.dateTo) {
      where.loggedAt[Op.lte] = queryParams.dateTo + "T23:59:59.999Z";
    }
  }

  const { count, rows } = await AuditLog.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}
