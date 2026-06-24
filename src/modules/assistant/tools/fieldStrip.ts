/**
 * Pure deep field-stripper, mirroring the `removeKeys` logic in
 * `middleware/fieldAccess.ts`, for use OUTSIDE the Express response pipeline.
 *
 * Sequelize model instances are converted to plain objects (`toJSON`) before
 * stripping so deletes actually take effect and the result is JSON-safe for the
 * model. Hidden fields come from `getHiddenFields(role, module, userId)`.
 */
export function stripHidden<T>(data: T, hidden: string[]): T {
  if (hidden.length === 0) return plainify(data);
  return strip(plainify(data), hidden) as T;
}

/** Recursively convert Sequelize instances / arrays to plain JSON values. */
function plainify<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => plainify(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const obj = value as { toJSON?: () => unknown };
    if (typeof obj.toJSON === "function") {
      return obj.toJSON() as T;
    }
  }
  return value;
}

function strip(value: unknown, hidden: string[]): unknown {
  if (Array.isArray(value)) {
    return value.map((v) => strip(v, hidden));
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const field of hidden) {
      if (field in record) delete record[field];
    }
    for (const key of Object.keys(record)) {
      record[key] = strip(record[key], hidden);
    }
    return record;
  }
  return value;
}
