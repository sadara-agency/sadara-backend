/**
 * Converts a snake_case string to camelCase.
 *   "contract_status" → "contractStatus"
 *   "full_name_ar"    → "fullNameAr"
 *   "id"              → "id"  (no-op for single words)
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Recursively converts all keys of a plain object (or array of objects)
 * from snake_case to camelCase. Leaves non-object values untouched.
 */
export function camelCaseKeys<T = Record<string, any>>(obj: any): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map((item) => camelCaseKeys(item)) as T;
  if (typeof obj !== "object" || obj instanceof Date) return obj;

  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    result[snakeToCamel(key)] = camelCaseKeys(obj[key]);
  }
  return result as T;
}
