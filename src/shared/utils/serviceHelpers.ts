import { Op, Model, ModelStatic } from "sequelize";
import { AppError } from "@middleware/errorHandler";
import { logger } from "@config/logger";

/**
 * Find a record by primary key or throw a 404 AppError.
 */
export async function findOrThrow<T extends Model>(
  model: ModelStatic<T>,
  id: string,
  label: string,
): Promise<T> {
  const record = await model.findByPk(id);
  if (!record) throw new AppError(`${label} not found`, 404);
  return record;
}

/**
 * Find a record by primary key, destroy it, and return `{ id }`.
 * Throws 404 if not found.
 */
export async function destroyById<T extends Model>(
  model: ModelStatic<T>,
  id: string,
  label: string,
): Promise<{ id: string }> {
  const record = await findOrThrow(model, id, label);
  await record.destroy();
  return { id };
}

/**
 * Build an `Op.or` clause for bilingual name search (nameEn / nameAr).
 * Returns an empty object if `search` is falsy.
 */
export function bilingualSearch(search: string | undefined) {
  if (!search) return {};
  return {
    [Op.or]: [
      { nameEn: { [Op.iLike]: `%${search}%` } },
      { nameAr: { [Op.iLike]: `%${search}%` } },
    ],
  };
}

/**
 * Build an `Op.or` clause for player first/last name search (EN + AR).
 * Returns an empty object if `search` is falsy.
 */
export function playerNameSearch(search: string | undefined) {
  if (!search) return {};
  const pattern = `%${search}%`;
  return {
    [Op.or]: [
      { firstName: { [Op.iLike]: pattern } },
      { lastName: { [Op.iLike]: pattern } },
      { firstNameAr: { [Op.iLike]: pattern } },
      { lastNameAr: { [Op.iLike]: pattern } },
    ],
  };
}

/**
 * Pick only defined (non-undefined) keys from an object.
 * Useful for building Sequelize `where` clauses from query params.
 */
export function pickDefined<T extends Record<string, unknown>>(
  source: T,
  keys: (keyof T)[],
): Partial<T> {
  const result: Partial<T> = {};
  for (const key of keys) {
    if (source[key] !== undefined) result[key] = source[key];
  }
  return result;
}

/**
 * Build a Sequelize date range filter using Op.gte / Op.lte.
 * Returns undefined if neither `from` nor `to` is provided.
 */
export function buildDateRange(from?: string, to?: string) {
  const range: Record<symbol, string> = {};
  if (from) range[Op.gte] = from;
  if (to) range[Op.lte] = to;
  return Object.getOwnPropertySymbols(range).length > 0 ? range : undefined;
}

/**
 * Execute a promise without awaiting it, logging any errors at warn level.
 * Use for non-critical side effects like notifications and cache writes.
 */
export function fireAndForget(
  promise: Promise<unknown>,
  context: string,
): void {
  promise.catch((err) =>
    logger.warn(`[fire-and-forget] ${context}`, {
      error: (err as Error).message,
    }),
  );
}
