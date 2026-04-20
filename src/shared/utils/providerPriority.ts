// Cross-provider precedence for shared-entity writes.
//
// When multiple external data sources (PulseLive API, SPL scraper, SAFF
// scraper, Sportmonks, SAFF+) can write to the same row, consulting these
// maps lets a writer decide whether to overwrite an existing row or skip
// to avoid downgrading richer data.
//
// Higher number = higher priority. Unknown sources default to 0.

export const PERFORMANCE_PRIORITY: Record<string, number> = {
  PulseLive: 3,
  SPL: 2,
  SAFF: 1,
};

export const MATCH_PRIORITY: Record<string, number> = {
  PulseLive: 3,
  Sportmonks: 2,
  SAFF: 1,
  SAFFPlus: 0,
};

export const CLUB_PRIORITY: Record<string, number> = {
  PulseLive: 3,
  SPL: 2,
  Sportmonks: 2,
  SAFF: 1,
};

/**
 * Returns true when a write from `newSource` is allowed to replace data
 * previously written by `existingSource` against the given priority map.
 * Equal priority is allowed (idempotent re-runs by the same provider).
 * Null/undefined existing source always allows the write.
 */
export function canOverwrite(
  existingSource: string | null | undefined,
  newSource: string,
  priorityMap: Record<string, number>,
): boolean {
  if (!existingSource) return true;
  const existing = priorityMap[existingSource] ?? 0;
  const incoming = priorityMap[newSource] ?? 0;
  return incoming >= existing;
}
