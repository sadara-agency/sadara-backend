"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePagination = parsePagination;
exports.buildMeta = buildMeta;
const env_1 = require("../../config/env");
function parsePagination(query, defaultSort = 'created_at') {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(env_1.env.pagination.maxLimit, Math.max(1, Number(query.limit) || env_1.env.pagination.defaultLimit));
    const offset = (page - 1) * limit;
    const sort = query.sort || defaultSort;
    const order = (query.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC');
    const search = query.search?.trim() || undefined;
    return { limit, offset, page, sort, order, search };
}
function buildMeta(total, page, limit) {
    return {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    };
}
//# sourceMappingURL=pagination.js.map