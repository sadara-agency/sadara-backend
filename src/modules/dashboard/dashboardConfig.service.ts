import { DashboardWidgetConfig } from "@modules/dashboard/dashboardConfig.model";
import { cacheGet, cacheSet, cacheDel, CacheTTL } from "@shared/utils/cache";

// ── Types ──

export interface WidgetConfigEntry {
  widgetKey: string;
  position: number;
  size: string;
  enabled: boolean;
}

/** role → WidgetConfigEntry[] sorted by position */
type WidgetConfigMap = Record<string, WidgetConfigEntry[]>;

// ── Cache ──

const CACHE_KEY = "dashboard:widget-configs";
let memoryCache: WidgetConfigMap | null = null;
let memoryCacheTimestamp = 0;
const MEMORY_TTL_MS = 60 * 60 * 1000; // 1 hour

// ── Load ──

async function loadAll(): Promise<WidgetConfigMap> {
  const rows = await DashboardWidgetConfig.findAll({
    raw: true,
    order: [["position", "ASC"]],
  });

  const map: WidgetConfigMap = {};
  for (const row of rows) {
    if (!map[row.role]) map[row.role] = [];
    map[row.role].push({
      widgetKey: row.widgetKey,
      position: row.position,
      size: row.size,
      enabled: row.enabled,
    });
  }

  memoryCache = map;
  memoryCacheTimestamp = Date.now();
  await cacheSet(CACHE_KEY, map, CacheTTL.HOUR);
  return map;
}

async function getAll(): Promise<WidgetConfigMap> {
  if (memoryCache && Date.now() - memoryCacheTimestamp < MEMORY_TTL_MS) {
    return memoryCache;
  }
  const cached = await cacheGet<WidgetConfigMap>(CACHE_KEY);
  if (cached) {
    memoryCache = cached;
    memoryCacheTimestamp = Date.now();
    return cached;
  }
  return loadAll();
}

// ── Public API ──

/** Get widget config for a specific role, sorted by position. */
export async function getConfigForRole(
  role: string,
): Promise<WidgetConfigEntry[]> {
  const map = await getAll();
  return map[role] ?? [];
}

/** Get full config map (admin). */
export async function getAllConfigs(): Promise<WidgetConfigMap> {
  return getAll();
}

/** Bulk upsert widget configs for a role. */
export async function updateConfigForRole(
  role: string,
  entries: Array<{
    widgetKey: string;
    position: number;
    size?: string;
    enabled?: boolean;
  }>,
): Promise<void> {
  for (const entry of entries) {
    await DashboardWidgetConfig.upsert({
      role,
      widgetKey: entry.widgetKey,
      position: entry.position,
      size: entry.size ?? "normal",
      enabled: entry.enabled ?? true,
    });
  }
  await invalidateCache();
}

/** Clear all caches. */
export async function invalidateCache(): Promise<void> {
  memoryCache = null;
  memoryCacheTimestamp = 0;
  await cacheDel(CACHE_KEY);
}
