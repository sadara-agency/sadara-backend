import { env } from "@config/env";
import { PaginationMeta, PaginationQuery } from "@shared/types";

export interface ParsedPagination {
  limit: number;
  offset: number;
  page: number;
  sort: string;
  order: "ASC" | "DESC";
  search?: string;
}

export function parsePagination(
  query: PaginationQuery,
  defaultSort = "created_at",
  allowedSorts?: string[],
): ParsedPagination {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(
    env.pagination.maxLimit,
    Math.max(1, Number(query.limit) || env.pagination.defaultLimit),
  );
  const offset = (page - 1) * limit;
  const rawSort = query.sort || defaultSort;
  const sort =
    allowedSorts && allowedSorts.length > 0
      ? allowedSorts.includes(rawSort)
        ? rawSort
        : defaultSort
      : defaultSort;
  const order = (query.order?.toUpperCase() === "ASC" ? "ASC" : "DESC") as
    | "ASC"
    | "DESC";
  const search = query.search?.trim() || undefined;

  return { limit, offset, page, sort, order, search };
}

export function buildMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Run a paginated findAndCountAll with standard sort, offset, limit, and meta.
 * Reduces boilerplate in service list functions.
 */
export async function paginatedQuery<T extends import("sequelize").Model>(
  model: import("sequelize").ModelStatic<T>,
  queryParams: PaginationQuery,
  options: {
    where?: import("sequelize").WhereOptions;
    include?: import("sequelize").Includeable[];
    attributes?: import("sequelize").FindAttributeOptions;
    defaultSort?: string;
    allowedSorts?: string[];
    distinct?: boolean;
  } = {},
): Promise<{ data: T[]; meta: PaginationMeta }> {
  const { limit, offset, page, sort, order } = parsePagination(
    queryParams,
    options.defaultSort ?? "createdAt",
    options.allowedSorts,
  );

  const { count, rows } = await model.findAndCountAll({
    where: options.where,
    include: options.include,
    attributes: options.attributes,
    limit,
    offset,
    order: [[sort, order]],
    distinct: options.distinct ?? true,
    subQuery: false,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}
