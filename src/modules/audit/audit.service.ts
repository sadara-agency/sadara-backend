import { Op } from 'sequelize';
import { AuditLog } from './AuditLog.model';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';

export async function listAuditLogs(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(queryParams, 'logged_at');

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

  const { count, rows } = await AuditLog.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}
