import { env } from '../../config/env';
import { PaginationMeta, PaginationQuery } from '../types';

export interface ParsedPagination {
  limit: number;
  offset: number;
  page: number;
  sort: string;
  order: 'ASC' | 'DESC';
  search?: string;
}

export function parsePagination(query: PaginationQuery, defaultSort = 'created_at', allowedSorts?: string[]): ParsedPagination {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(
    env.pagination.maxLimit,
    Math.max(1, Number(query.limit) || env.pagination.defaultLimit)
  );
  const offset = (page - 1) * limit;
  const rawSort = query.sort || defaultSort;
  const sort = allowedSorts && allowedSorts.length > 0
    ? (allowedSorts.includes(rawSort) ? rawSort : defaultSort)
    : defaultSort;
  const order = (query.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';
  const search = query.search?.trim() || undefined;

  return { limit, offset, page, sort, order, search };
}

export function buildMeta(total: number, page: number, limit: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
