/**
 * SAFF+ Provider
 *
 * saffplus.sa is a Next.js app on the Motto platform. It has NO public REST API.
 * Data is embedded in React Server Component streams and rendered client-side.
 *
 * This provider scrapes the rendered pages for structured data:
 *   /competitions — list of all competitions
 *   /clubs — list of all clubs
 *   /competitions/{slug} — competition detail (standings, fixtures)
 *
 * The Motto platform key is stored in SAFFPLUS_PLATFORM_KEY env var (see config/env.ts).
 */

import * as cheerio from "cheerio";
import { logger } from "@config/logger";
import { env } from "@config/env";
import { DomainRateLimiter } from "@shared/utils/rateLimiter";
import { cacheGet, cacheSet, CachePrefix } from "@shared/utils/cache";
import type {
  SaffPlusCompetition,
  SaffPlusTeam,
  SaffPlusStanding,
  SaffPlusMatch,
  SaffPlusPlayerProfile,
  SaffPlusPlayerTeam,
  SaffPlusMatchWithLineup,
  SaffPlusLineupRole,
} from "./saffplus.types";
import type { MatchEventType } from "@modules/matches/matchEvent.model";
import { renderSaffPlusPage, type RenderResult } from "./saffplus.video";

// ── Page Fetching ──
//
// saffplus.sa is fully client-side rendered (its server returns an empty
// React shell with `BAILOUT_TO_CLIENT_SIDE_RENDERING`). Plain HTTP fetches
// (axios) see no competition/club data — only an empty document. We have
// to render the page in headless Chrome and let JS hydrate before scraping.
// renderSaffPlusPage reuses the same Puppeteer pool as the video extractor
// so we don't spin up a second Chromium instance.
//
// Set SAFFPLUS_RENDER_DISABLED=true to short-circuit (returns empty string,
// so callers see "0 competitions" gracefully). Useful for local dev where
// Chromium isn't installed.

const saffPlusLimiter = new DomainRateLimiter(
  { "saffplus.sa": env.saff.saffplusRequestDelayMs },
  env.saff.saffplusRequestDelayMs,
);

async function fetchPage(path: string): Promise<string> {
  const r = await fetchPageWithJson(path);
  return r.html;
}

/**
 * Like fetchPage but also surfaces the JSON XHR responses captured
 * during rendering. saffplus.sa fetches its actual data (competitions,
 * clubs, etc.) via post-hydration JSON XHR — DOM scraping rarely
 * succeeds, but the captured JSON usually contains exactly what we
 * want. Callers should try JSON extraction first and fall back to
 * HTML parsing only as a backup.
 *
 * @param waitForSelector - CSS selector to wait for after initial page load.
 *   Use this for pages where content loads in a second render pass (e.g.
 *   React Suspense / deferred XHR after networkidle0). Puppeteer will wait
 *   up to selectorTimeoutMs for the element before capturing HTML.
 */
async function fetchPageWithJson(
  path: string,
  waitForSelector?: string,
): Promise<{
  html: string;
  jsonResponses: RenderResult["jsonResponses"];
}> {
  if (process.env.SAFFPLUS_RENDER_DISABLED === "true") {
    logger.info(
      `[SAFF+] Render disabled (SAFFPLUS_RENDER_DISABLED=true) — returning empty for ${path}`,
    );
    return { html: "", jsonResponses: [] };
  }

  await saffPlusLimiter.acquire("saffplus.sa");
  const result = await renderSaffPlusPage(path, {
    waitForNetworkIdle: true,
    selectorTimeoutMs: 15_000,
    waitForSelector,
  });

  if (result.reason !== "ok") {
    logger.warn(`[SAFF+] Render failed for ${path}: ${result.reason}`);
    return { html: "", jsonResponses: [] };
  }
  return { html: result.html, jsonResponses: result.jsonResponses };
}

/**
 * Walks an arbitrary JSON value looking for the largest array of
 * objects where each item has a `name` field plus at least one of
 * `id`, `slug`, or `uuid`. This heuristic targets the shape SAFF+
 * (and most CMS-like platforms) use for competitions/clubs lists.
 *
 * Returns the array (or [] if no candidate found). The caller
 * normalizes the items into the expected shape — this only locates
 * the data, not its semantics.
 */
function findEntityArrayInJson(
  jsonResponses: RenderResult["jsonResponses"],
  options: { minItems?: number } = {},
): { items: Record<string, unknown>[]; sourceUrl: string | null } {
  const minItems = options.minItems ?? 2;
  let best: { items: Record<string, unknown>[]; sourceUrl: string | null } = {
    items: [],
    sourceUrl: null,
  };

  function isCandidate(arr: unknown): arr is Record<string, unknown>[] {
    if (!Array.isArray(arr) || arr.length < minItems) return false;
    let matchingItems = 0;
    for (const item of arr) {
      if (item == null || typeof item !== "object" || Array.isArray(item)) {
        continue;
      }
      const o = item as Record<string, unknown>;
      const hasName = typeof o.name === "string" || typeof o.title === "string";
      const hasIdent =
        typeof o.id === "string" ||
        typeof o.id === "number" ||
        typeof o.slug === "string" ||
        typeof o.uuid === "string";
      if (hasName && hasIdent) matchingItems++;
    }
    // Require ≥75% of items to match the shape (avoids picking up a
    // generic list that happens to contain mostly other things).
    return matchingItems / arr.length >= 0.75;
  }

  function walk(value: unknown, sourceUrl: string): void {
    if (value == null) return;
    if (Array.isArray(value)) {
      if (isCandidate(value) && value.length > best.items.length) {
        best = {
          items: value as Record<string, unknown>[],
          sourceUrl,
        };
      }
      for (const v of value) walk(v, sourceUrl);
      return;
    }
    if (typeof value === "object") {
      for (const v of Object.values(value)) walk(v, sourceUrl);
    }
  }

  for (const r of jsonResponses) {
    walk(r.data, r.url);
  }
  return best;
}

/**
 * Generic array finder — like findEntityArrayInJson but accepts a
 * caller-supplied validator so callers can target shapes other than
 * the simple {name, id} list (e.g. standings rows, fixture objects).
 */
function findArrayInJson(
  jsonResponses: RenderResult["jsonResponses"],
  itemValidator: (o: Record<string, unknown>) => boolean,
  options: { minItems?: number; minFraction?: number } = {},
): { items: Record<string, unknown>[]; sourceUrl: string | null } {
  const minItems = options.minItems ?? 1;
  const minFraction = options.minFraction ?? 0.6;
  let best: { items: Record<string, unknown>[]; sourceUrl: string | null } = {
    items: [],
    sourceUrl: null,
  };

  function isCandidate(arr: unknown): arr is Record<string, unknown>[] {
    if (!Array.isArray(arr) || arr.length < minItems) return false;
    let hits = 0;
    for (const item of arr) {
      if (item != null && typeof item === "object" && !Array.isArray(item)) {
        if (itemValidator(item as Record<string, unknown>)) hits++;
      }
    }
    return hits / arr.length >= minFraction;
  }

  function walk(value: unknown, sourceUrl: string): void {
    if (value == null) return;
    if (Array.isArray(value)) {
      if (isCandidate(value) && value.length > best.items.length) {
        best = { items: value as Record<string, unknown>[], sourceUrl };
      }
      for (const v of value) walk(v, sourceUrl);
      return;
    }
    if (typeof value === "object") {
      for (const v of Object.values(value as object)) walk(v, sourceUrl);
    }
  }

  for (const r of jsonResponses) walk(r.data, r.url);
  return best;
}

// ══════════════════════════════════════════
// DIRECT MOTTO CDA API — bypasses Puppeteer
// ══════════════════════════════════════════
//
// saffplus.sa is a server-rendered Next.js app. Competition-specific data
// (standings, matches) is fetched SERVER-SIDE by the Next.js server and
// embedded in the RSC stream — the browser never makes an XHR for it.
// Puppeteer can only intercept browser XHR; it cannot see server-side calls.
//
// Solution: call the Motto CDA ListEntities API directly from our Node.js
// backend, the same way the saffplus.sa Next.js server does. This is far
// faster (no Puppeteer spin-up) and more reliable.

const MOTTO_CDA_LIST =
  "https://cda.mottostreaming.com/motto.cda.cms.entity.v1.EntityService/ListEntities";

/**
 * Call the Motto CDA ListEntities endpoint directly. Returns the `entities`
 * array from the response, or [] on error. Does not throw — callers should
 * try multiple filters and fall back gracefully.
 */
async function listMottoCdaEntities(
  filter: string,
  options: { locale?: string; pageSize?: number } = {},
): Promise<Record<string, unknown>[]> {
  const message = JSON.stringify({
    pageSize: String(options.pageSize ?? 200),
    filter,
    locale: options.locale ?? "en",
  });
  const url = `${MOTTO_CDA_LIST}?encoding=json&message=${encodeURIComponent(message)}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      logger.info(`[SAFF+ CDA] ${filter} → HTTP ${res.status}`);
      return [];
    }
    const data = (await res.json()) as Record<string, unknown>;
    const keys = Object.keys(data).join(", ");
    const list = data.entities ?? data.items ?? data.results ?? data.data;
    const count = Array.isArray(list) ? list.length : 0;
    logger.info(
      `[SAFF+ CDA] ${filter} → keys: [${keys}] count: ${count}` +
        (count === 0 ? ` raw: ${JSON.stringify(data).slice(0, 400)}` : ""),
    );
    return Array.isArray(list) ? (list as Record<string, unknown>[]) : [];
  } catch (err) {
    logger.info(`[SAFF+ CDA] ${filter} → error: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Pull a string field from a JSON-extracted entity. Returns undefined
 * when the field is missing or not a string. Use for cherry-picking
 * `name` / `slug` / etc. without TypeScript griping.
 */
function pickStr(
  o: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
}

/**
 * Extract JSON data from Next.js RSC payload embedded in the HTML.
 * Next.js embeds data as: self.__next_f.push([1,"..."]) with serialized React nodes.
 */
function extractRscData(html: string): string[] {
  const chunks: string[] = [];
  const regex = /self\.__next_f\.push\(\[1,"([^"]*)"\]\)/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      // Unescape the JSON string
      const decoded = match[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
      chunks.push(decoded);
    } catch {
      // skip malformed chunks
    }
  }
  return chunks;
}

// ══════════════════════════════════════════
// WOMEN'S LEAGUE FILTER
// ══════════════════════════════════════════

// Multi-signal detection. SAFF+ exposes a `gender` field on some
// competition payloads but not all, so we also check slug and name
// substrings in both Arabic and English.
const WOMEN_GENDER_VALUES = new Set([
  "female",
  "women",
  "womens",
  "w",
  "ladies",
  "girls",
]);

const WOMEN_SLUG_FRAGMENTS = [
  "women",
  "womens",
  "ladies",
  "girls",
  "female",
  "wsl",
  "w-league",
];

// Arabic women keywords: نساء (women), سيدات (ladies), فتيات (girls),
// بنات (girls), النسائية (the women's), السيدات (the ladies').
const WOMEN_ARABIC_FRAGMENTS = [
  "نساء",
  "سيدات",
  "فتيات",
  "بنات",
  "النسائية",
  "السيدات",
];

/**
 * Returns true when any signal (explicit gender field, URL slug, or
 * Arabic/English name substring) indicates this is a women's competition.
 *
 * Used by Layer-1 of the women's filter — provider-side rejection — so
 * we never persist women's competitions, clubs, or fixtures. The service
 * layer adds a belt-and-suspenders check on the same signals.
 */
export function isWomensCompetition(input: {
  gender?: string | null;
  slug?: string | null;
  name?: string | null;
  nameAr?: string | null;
}): boolean {
  if (input.gender) {
    const g = input.gender.toLowerCase().trim();
    if (WOMEN_GENDER_VALUES.has(g)) return true;
  }

  const slug = (input.slug ?? "").toLowerCase();
  if (slug && WOMEN_SLUG_FRAGMENTS.some((f) => slug.includes(f))) return true;

  const en = (input.name ?? "").toLowerCase();
  if (en && WOMEN_SLUG_FRAGMENTS.some((f) => en.includes(f))) return true;

  const ar = input.nameAr ?? "";
  if (ar && WOMEN_ARABIC_FRAGMENTS.some((f) => ar.includes(f))) return true;

  return false;
}

// ══════════════════════════════════════════
// ARABIC NAME NORMALIZATION (used by the player matcher)
// ══════════════════════════════════════════

/**
 * Normalize an Arabic name so trigram similarity comparisons treat
 * common spelling variants as equivalent. Idempotent — safe to run
 * twice. Latin text passes through untouched (the function only
 * targets Arabic codepoints).
 *
 * Transformations applied (in order):
 *   1. Strip tashkeel diacritics (U+064B–U+065F, U+0670)
 *   2. Strip tatweel (kashida) elongation (U+0640)
 *   3. Alef variants → bare alef (أ إ آ → ا)
 *   4. Alef maksura → ya (ى → ي)
 *   5. Tah marbuta → ha (ة → ه)
 *   6. Collapse internal whitespace, trim ends
 */
export function normalizeArabicName(input: string): string {
  if (!input) return "";
  return input
    .replace(/[ً-ٰٟ]/g, "")
    .replace(/ـ/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize an SAFF+-emitted age-category label to the canonical
 * Sadara form used by `squads.age_category`. Tolerant of "U-18",
 * "Under 18", "u18", "تحت 18", "Senior", "First Team".
 *
 * Returns `'senior'` as a safe default when nothing matches — the
 * caller should treat that as low-confidence and confirm via the
 * SAFF+ team URL slug if available.
 */
export function normalizeAgeCategory(input: string | null | undefined): string {
  if (!input) return "senior";
  const s = input.toLowerCase().replace(/[-_\s]/g, "");

  // u17 / u-17 / under17 / under 17
  const en = s.match(/u(?:nder)?(\d{1,2})/);
  if (en) return `u${en[1]}`;

  if (
    s.includes("senior") ||
    s.includes("first") ||
    s.includes("الأول") ||
    s.includes("الاول")
  ) {
    return "senior";
  }

  // Arabic: "تحت 18" / "تحت18"
  const ar = input.match(/تحت\s*(\d{1,2})/);
  if (ar) return `u${ar[1]}`;

  // Arabic: "ناشئين" (youth, u17ish), "براعم" (cubs, u13ish), "أشبال" (cadets, u15ish)
  if (input.includes("ناشئين")) return "u17";
  if (input.includes("أشبال") || input.includes("اشبال")) return "u15";
  if (input.includes("براعم")) return "u13";

  return "senior";
}

// ══════════════════════════════════════════
// CLUB SQUAD + ROSTER SCRAPING
// ══════════════════════════════════════════

export interface SaffPlusClubSquad {
  id: string; // SAFF+ team/squad slug or numeric id
  name: string;
  nameAr?: string;
  ageCategory: string; // normalized via normalizeAgeCategory
  division: string | null;
  parentClubSlug: string;
  rosterPath?: string; // path to fetch the roster, when distinct from squadPath
}

export interface SaffPlusRosterEntry {
  externalId: string | null;
  name: string;
  nameAr?: string | null;
  dob: string | null; // ISO YYYY-MM-DD when available
  nationality: string | null;
  jerseyNumber: number | null;
  position: string | null;
  raw: Record<string, unknown>;
}

/**
 * Scrape the squad list under a SAFF+ club detail page.
 *
 * URL strategy: SAFF+ club detail pages list age-group teams as cards
 * or tabs. We try `/ar/clubs/{slug}` first (richest with Arabic names)
 * then `/en/clubs/{slug}`. The RSC payload usually exposes a `teams`
 * or `squads` array with name + age_category fields.
 *
 * Falls back to scanning DOM anchors that link to a per-squad page
 * when RSC parsing yields nothing.
 */
export async function scrapeClubSquads(
  clubSlug: string,
): Promise<SaffPlusClubSquad[]> {
  const seen = new Map<string, SaffPlusClubSquad>();
  const paths = [`/ar/clubs/${clubSlug}`, `/en/clubs/${clubSlug}`];

  for (const path of paths) {
    let html: string;
    try {
      html = await fetchPage(path);
    } catch (err) {
      logger.warn(
        `[SAFF+] scrapeClubSquads: ${path} failed — ${(err as Error).message}`,
      );
      continue;
    }

    // Layer 1 — RSC. Look for objects with both name and age/category fields.
    const rscChunks = extractRscData(html);
    for (const chunk of rscChunks) {
      const blocks = chunk.matchAll(
        /\{[^{}]*?"(?:slug|id)"\s*:\s*"([^"]+)"[^{}]{0,400}?"(?:name|title)"\s*:\s*"([^"]+)"[^{}]*?\}/gs,
      );
      for (const block of blocks) {
        const id = block[1];
        const name = block[2];
        if (!id || !name) continue;
        if (id === clubSlug) continue; // skip the parent club itself

        const text = block[0];
        const nameAr = text.match(/"name_ar"\s*:\s*"([^"]+)"/)?.[1];
        const rawAge =
          text.match(/"age_category"\s*:\s*"([^"]+)"/)?.[1] ??
          text.match(/"category"\s*:\s*"([^"]+)"/)?.[1] ??
          text.match(/"age_group"\s*:\s*"([^"]+)"/)?.[1];
        const division = text.match(/"division"\s*:\s*"([^"]+)"/)?.[1] ?? null;

        // Heuristic: only treat as a squad if it has an age signal OR the
        // name itself implies one (avoids picking up sponsor links etc.)
        const looksLikeSquad =
          rawAge != null ||
          /u-?\d{1,2}|under\s*\d{1,2}|senior|first/i.test(name) ||
          /تحت|الأول|الاول|ناشئين|اشبال|أشبال|براعم/i.test(name) ||
          (nameAr != null &&
            /تحت|الأول|الاول|ناشئين|اشبال|أشبال|براعم/.test(nameAr));
        if (!looksLikeSquad) continue;

        const ageCategory = normalizeAgeCategory(rawAge ?? nameAr ?? name);
        seen.set(id, {
          id,
          name,
          nameAr,
          ageCategory,
          division,
          parentClubSlug: clubSlug,
        });
      }
    }

    // Layer 2 — DOM anchors, in case RSC parsing missed everything.
    if (seen.size === 0) {
      const $ = cheerio.load(html);
      $(`a[href*="/clubs/${clubSlug}/"]`).each((_, el) => {
        const href = $(el).attr("href") || "";
        const sub = href.replace(`/clubs/${clubSlug}/`, "").split(/[/?]/)[0];
        if (!sub) return;
        const name = $(el).text().trim().split("\n")[0]?.trim();
        if (!name) return;
        if (seen.has(sub)) return;
        seen.set(sub, {
          id: sub,
          name,
          ageCategory: normalizeAgeCategory(name),
          division: null,
          parentClubSlug: clubSlug,
          rosterPath: href,
        });
      });
    }

    if (seen.size > 0) break;
  }

  const squads = Array.from(seen.values());
  logger.info(`[SAFF+] scrapeClubSquads(${clubSlug}): ${squads.length} squads`);
  return squads;
}

/**
 * Scrape a single squad's roster from SAFF+. Tries the per-squad URL
 * first; if that 404s, walks the parent club's combined roster page
 * and filters to entries matching the squad slug.
 */
export async function scrapeSquadRoster(
  parentClubSlug: string,
  squadSlug: string,
  _season?: string,
): Promise<SaffPlusRosterEntry[]> {
  const seen = new Map<string, SaffPlusRosterEntry>();
  const paths = [
    `/ar/clubs/${parentClubSlug}/${squadSlug}/players`,
    `/ar/clubs/${parentClubSlug}/${squadSlug}/squad`,
    `/ar/clubs/${parentClubSlug}/players`,
    `/en/clubs/${parentClubSlug}/${squadSlug}/players`,
  ];

  for (const path of paths) {
    let html: string;
    try {
      html = await fetchPage(path);
    } catch (err) {
      logger.warn(
        `[SAFF+] scrapeSquadRoster: ${path} failed — ${(err as Error).message}`,
      );
      continue;
    }

    const rscChunks = extractRscData(html);
    for (const entry of extractRosterFromRsc(rscChunks)) {
      const key = entry.externalId ?? `${entry.name}|${entry.dob ?? ""}`;
      if (!seen.has(key)) seen.set(key, entry);
    }
    if (seen.size > 0) break;
  }

  const roster = Array.from(seen.values());
  logger.info(
    `[SAFF+] scrapeSquadRoster(${parentClubSlug}/${squadSlug}): ${roster.length} players`,
  );
  return roster;
}

// ══════════════════════════════════════════
// MATCH EVENT TIMELINE SCRAPING (Phase 3)
// ══════════════════════════════════════════

export interface SaffPlusMatchEvent {
  externalEventId: string | null;
  minute: number;
  stoppageMinute: number | null;
  type: MatchEventType;
  teamSide: "home" | "away";
  /** Primary actor's display name (En/Ar best-effort) */
  playerName: string | null;
  playerNameAr: string | null;
  /** Secondary actor — assist provider, sub partner, etc. */
  relatedPlayerName: string | null;
  relatedPlayerNameAr: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  raw: Record<string, unknown>;
}

/**
 * Normalize a SAFF+ event-type string (English or Arabic) to one of
 * the canonical match_event types. Returns null if the string doesn't
 * match any recognized event so callers can decide whether to skip
 * the row or store it as a generic note.
 */
export function normalizeMatchEventType(
  input: string | null | undefined,
): MatchEventType | null {
  if (!input) return null;
  const s = input.toLowerCase().replace(/[-_\s]/g, "");

  // Goals
  if (s.includes("owngoal")) return "own_goal";
  if (s.includes("penaltygoal") || s.includes("penaltyscored"))
    return "penalty_goal";
  if (s.includes("penaltymiss") || s.includes("penaltymissed"))
    return "penalty_miss";
  if (s === "goal" || s.endsWith("goal") || s.includes("scored")) return "goal";

  // Cards
  if (s.includes("secondyellow") || s.includes("secyellow"))
    return "second_yellow";
  if (s === "yellow" || s.includes("yellowcard")) return "yellow";
  if (s === "red" || s.includes("redcard")) return "red";

  // Substitutions
  if (s.includes("subin") || s === "in") return "sub_in";
  if (s.includes("subout") || s === "out") return "sub_out";
  if (s === "sub" || s.includes("substitut")) return "sub_in";

  // Assists / VAR
  if (s.includes("assist")) return "assist";
  if (s.includes("varoverturn") || s.includes("varreversal"))
    return "var_overturn";
  if (s.includes("varreview") || s === "var") return "var_review";
  if (s.includes("injury")) return "injury";

  // Period markers
  if (s.includes("kickoff") || s.includes("ko")) return "kickoff";
  if (s.includes("halftime") || s === "ht") return "halftime";
  if (s.includes("fulltime") || s === "ft") return "fulltime";

  // Arabic raw fragments (less common — most SAFF+ payloads use English keys)
  if (input.includes("هدف")) return "goal";
  if (input.includes("بطاقة صفراء")) return "yellow";
  if (input.includes("بطاقة حمراء")) return "red";
  if (input.includes("تبديل")) return "sub_in";
  if (input.includes("ركلة جزاء")) return "penalty_goal";

  return null;
}

/**
 * Scrape the per-match event timeline page on SAFF+. URL pattern:
 *   /ar/event/match/:providerMatchId
 *
 * Strategy mirrors fetchMatches: prefer RSC payload, fall back to
 * loose DOM scraping. The caller passes the raw provider match id
 * (stored in matches.provider_match_id by the fixtures sync).
 */
export async function scrapeMatchEvents(
  providerMatchId: string,
): Promise<SaffPlusMatchEvent[]> {
  const seen = new Map<string, SaffPlusMatchEvent>();

  function addEvent(ev: SaffPlusMatchEvent) {
    const key =
      ev.externalEventId ??
      `${ev.minute}|${ev.type}|${ev.playerName ?? ev.playerNameAr ?? ""}`;
    if (!seen.has(key)) seen.set(key, ev);
  }

  // ── PRIMARY: Motto CDA API ──
  // Try multiple filter patterns — the exact type_id varies by competition.
  const eventFilters = [
    `type_id:match_event AND fields.match_id:${providerMatchId}`,
    `type_id:event AND fields.match_id:${providerMatchId}`,
    `type_id:timeline AND fields.match_id:${providerMatchId}`,
    `type_id:match_event AND fields.event_id:${providerMatchId}`,
    `type_id:match_incident AND fields.match_id:${providerMatchId}`,
  ];
  for (const filter of eventFilters) {
    const entities = await listMottoCdaEntities(filter, {
      locale: "ar",
      pageSize: 200,
    });
    if (entities.length === 0) continue;
    logger.info(
      `[SAFF+] Match events via CDA: "${filter}" (${entities.length} items)`,
    );
    for (const o of entities) {
      try {
        const f = (o.fields as Record<string, unknown> | undefined) ?? {};
        const merged: Record<string, unknown> = { ...f, ...o };
        const minute =
          typeof merged.minute === "number"
            ? merged.minute
            : typeof merged.time === "number"
              ? merged.time
              : typeof merged.elapsed === "number"
                ? merged.elapsed
                : null;
        if (minute == null) continue;
        const rawType =
          (merged.type as string) ??
          (merged.event_type as string) ??
          (merged.event as string) ??
          null;
        const type = normalizeMatchEventType(rawType);
        if (!type) continue;
        const teamSideRaw =
          (merged.team as string) ?? (merged.side as string) ?? null;
        const teamSide: "home" | "away" =
          teamSideRaw === "away" || teamSideRaw === "guest" ? "away" : "home";
        addEvent({
          externalEventId:
            (merged.id as string) ?? (merged.event_id as string) ?? null,
          minute,
          stoppageMinute:
            (merged.stoppage as number) ??
            (merged.added_time as number) ??
            null,
          type,
          teamSide,
          playerName:
            (merged.player_name as string) ?? (merged.player as string) ?? null,
          playerNameAr:
            (merged.player_name_ar as string) ??
            (merged.name_ar as string) ??
            null,
          relatedPlayerName:
            (merged.assist as string) ??
            (merged.related_player as string) ??
            null,
          relatedPlayerNameAr:
            (merged.assist_ar as string) ??
            (merged.related_player_ar as string) ??
            null,
          descriptionEn:
            (merged.description as string) ?? (merged.text as string) ?? null,
          descriptionAr:
            (merged.description_ar as string) ??
            (merged.text_ar as string) ??
            null,
          raw: { source: "cda", filter, rawType },
        });
      } catch {
        // skip malformed entity
      }
    }
    if (seen.size > 0) break;
  }

  // ── FALLBACK: Puppeteer render + RSC + jsonResponses ──
  if (seen.size === 0) {
    const paths = [
      `/ar/event/match/${providerMatchId}`,
      `/en/event/match/${providerMatchId}`,
    ];
    for (const path of paths) {
      let html: string;
      let jsonResponses: Array<{ url: string; data: unknown }> = [];
      try {
        const result = await fetchPageWithJson(path);
        html = result.html;
        jsonResponses = result.jsonResponses;
      } catch (err) {
        logger.warn(
          `[SAFF+] scrapeMatchEvents: ${path} failed — ${(err as Error).message}`,
        );
        continue;
      }

      // Try RSC chunks from the rendered HTML
      const rscChunks = extractRscData(html);
      for (const ev of extractEventsFromRsc(rscChunks)) addEvent(ev);

      // Also scan captured XHR/fetch responses for event arrays
      if (seen.size === 0) {
        logger.info(
          `[SAFF+] scrapeMatchEvents fallback: ${jsonResponses.length} json responses — keys: ${jsonResponses.map((r) => `${r.url.split("/").slice(-2).join("/")}→[${Object.keys((r.data as Record<string, unknown>) ?? {}).join(",")}]`).join(" | ")}`,
        );
        for (const { url, data } of jsonResponses) {
          if (!data || typeof data !== "object") continue;
          const d = data as Record<string, unknown>;
          // Look for arrays keyed as events/incidents/timeline
          for (const key of [
            "events",
            "incidents",
            "timeline",
            "match_events",
            "data",
            "items",
            "results",
            "entities",
          ]) {
            const arr = d[key];
            if (!Array.isArray(arr) || arr.length === 0) continue;
            logger.info(
              `[SAFF+] scrapeMatchEvents: found array key="${key}" len=${arr.length} in ${url.split("/").slice(-2).join("/")} — sample keys: ${Object.keys((arr[0] as Record<string, unknown>) ?? {}).join(",")}`,
            );
            const chunks = arr.map((item) => JSON.stringify(item));
            for (const ev of extractEventsFromRsc(chunks)) addEvent(ev);
          }
        }
      }

      if (seen.size > 0) break;
    }
  }

  const events = Array.from(seen.values()).sort(
    (a, b) =>
      a.minute - b.minute || (a.stoppageMinute ?? 0) - (b.stoppageMinute ?? 0),
  );
  logger.info(
    `[SAFF+] scrapeMatchEvents(${providerMatchId}): ${events.length} events`,
  );
  return events;
}

function extractEventsFromRsc(rscChunks: string[]): SaffPlusMatchEvent[] {
  const out: SaffPlusMatchEvent[] = [];

  for (const chunk of rscChunks) {
    // Event blocks always have a minute and a type; team is required so
    // we know which side scored / was carded.
    const blocks = chunk.matchAll(
      /\{[^{}]*?"(?:minute|time|elapsed)"\s*:\s*\d+[^{}]*?"(?:type|event_type|event)"\s*:\s*"[^"]+"[^{}]*?\}/gs,
    );

    for (const block of blocks) {
      try {
        const text = block[0];
        const str = (re: RegExp) => text.match(re)?.[1];
        const num = (re: RegExp) => {
          const m = text.match(re);
          return m ? Number(m[1]) : null;
        };

        const minute = num(/"(?:minute|time|elapsed)"\s*:\s*(\d+)/);
        if (minute == null) continue;
        const stoppageMinute = num(
          /"(?:stoppage|extra_minute|added_time|injury_time)"\s*:\s*(\d+)/,
        );

        const rawType =
          str(/"(?:type|event_type|event)"\s*:\s*"([^"]+)"/) ?? null;
        const type = normalizeMatchEventType(rawType);
        if (!type) continue;

        const teamSideRaw =
          str(/"(?:team|side|team_side)"\s*:\s*"([^"]+)"/) ?? null;
        const teamSide: "home" | "away" =
          teamSideRaw === "away" || teamSideRaw === "guest" ? "away" : "home";

        const playerName =
          str(/"(?:player_name|player|name|scorer)"\s*:\s*"([^"]+)"/) ?? null;
        const playerNameAr =
          str(/"player_name_ar"\s*:\s*"([^"]+)"/) ??
          str(/"name_ar"\s*:\s*"([^"]+)"/) ??
          null;
        const relatedPlayerName =
          str(/"(?:assist|sub_partner|related_player)"\s*:\s*"([^"]+)"/) ??
          null;
        const relatedPlayerNameAr =
          str(/"(?:assist_ar|related_player_ar)"\s*:\s*"([^"]+)"/) ?? null;
        const descriptionEn =
          str(/"description"\s*:\s*"([^"]+)"/) ??
          str(/"text"\s*:\s*"([^"]+)"/) ??
          null;
        const descriptionAr =
          str(/"description_ar"\s*:\s*"([^"]+)"/) ??
          str(/"text_ar"\s*:\s*"([^"]+)"/) ??
          null;
        const externalEventId =
          str(/"id"\s*:\s*"?([^",}]+)"?/) ??
          str(/"event_id"\s*:\s*"([^"]+)"/) ??
          null;

        out.push({
          externalEventId,
          minute,
          stoppageMinute,
          type,
          teamSide,
          playerName,
          playerNameAr,
          relatedPlayerName,
          relatedPlayerNameAr,
          descriptionAr,
          descriptionEn,
          raw: { snippet: text.slice(0, 200), rawType: rawType ?? null },
        });
      } catch {
        // skip malformed
      }
    }
  }

  return out;
}

function extractRosterFromRsc(rscChunks: string[]): SaffPlusRosterEntry[] {
  const out: SaffPlusRosterEntry[] = [];

  for (const chunk of rscChunks) {
    // Roster entries always carry a name and at least one of: jersey,
    // position, dob, nationality. Match a JSON-ish block with name + at
    // least one of those signals.
    const blocks = chunk.matchAll(
      /\{[^{}]*?"(?:name|full_name|player_name)"\s*:\s*"([^"]+)"[^{}]*?"(?:jersey_number|jersey|number|position|date_of_birth|dob|nationality)"[^{}]*?\}/gs,
    );

    for (const block of blocks) {
      try {
        const text = block[0];
        const str = (re: RegExp) => text.match(re)?.[1];
        const num = (re: RegExp) => {
          const m = text.match(re);
          return m ? Number(m[1]) : null;
        };

        const name = block[1];
        if (!name) continue;
        const nameAr =
          str(/"name_ar"\s*:\s*"([^"]+)"/) ??
          str(/"full_name_ar"\s*:\s*"([^"]+)"/) ??
          null;
        const externalId =
          str(/"id"\s*:\s*"?([^",}]+)"?/) ??
          str(/"slug"\s*:\s*"([^"]+)"/) ??
          null;
        const jerseyNumber =
          num(/"jersey_number"\s*:\s*(\d+)/) ??
          num(/"jersey"\s*:\s*(\d+)/) ??
          num(/"number"\s*:\s*(\d+)/);
        const position =
          str(/"position"\s*:\s*"([^"]+)"/) ??
          str(/"role"\s*:\s*"([^"]+)"/) ??
          null;
        const dobRaw =
          str(/"date_of_birth"\s*:\s*"([^"]+)"/) ??
          str(/"dob"\s*:\s*"([^"]+)"/) ??
          str(/"birth_date"\s*:\s*"([^"]+)"/);
        const dob = dobRaw ? dobRaw.split("T")[0] : null;
        const nationality =
          str(/"nationality"\s*:\s*"([^"]+)"/) ??
          str(/"country"\s*:\s*"([^"]+)"/) ??
          null;

        out.push({
          externalId,
          name,
          nameAr,
          dob,
          nationality,
          jerseyNumber,
          position,
          raw: { snippet: text.slice(0, 200) },
        });
      } catch {
        // skip malformed
      }
    }
  }

  return out;
}

// ══════════════════════════════════════════
// API DISCOVERY (lightweight — no probing)
// ══════════════════════════════════════════

export interface ApiDiscovery {
  type: "motto-platform" | "unknown";
  platform: string;
  publicKey?: string;
  locales: string[];
  navPages: string[];
  discoveredAt: Date;
}

let cachedDiscovery: ApiDiscovery | null = null;

/**
 * Discover SAFF+ platform info from the homepage.
 * Fast — single page fetch, no endpoint probing.
 */
export async function discoverApi(): Promise<ApiDiscovery> {
  if (cachedDiscovery) return cachedDiscovery;

  try {
    const html = await fetchPage("/");

    // Extract platform info from RSC data
    const publicKeyMatch = html.match(/"publicKey"\s*:\s*"([^"]+)"/);
    const localesMatch = html.match(/"locales"\s*:\s*\[([^\]]+)\]/);
    const navMatch = html.match(/"navbarEntries"\s*:\s*\[(.*?)\]/s);

    const navPages: string[] = [];
    if (navMatch) {
      const urlMatches = navMatch[1].matchAll(/"url"\s*:\s*"([^"]+)"/g);
      for (const m of urlMatches) navPages.push(m[1]);
    }

    cachedDiscovery = {
      type: "motto-platform",
      platform: "Motto (mottocdn.com)",
      publicKey: publicKeyMatch?.[1],
      locales: localesMatch
        ? localesMatch[1]
            .replace(/"/g, "")
            .split(",")
            .map((s) => s.trim())
        : ["en", "ar"],
      navPages,
      discoveredAt: new Date(),
    };
  } catch {
    cachedDiscovery = {
      type: "unknown",
      platform: "unknown",
      locales: [],
      navPages: [],
      discoveredAt: new Date(),
    };
  }

  return cachedDiscovery;
}

export function clearDiscoveryCache() {
  cachedDiscovery = null;
}

// ══════════════════════════════════════════
// DATA SCRAPING
// ══════════════════════════════════════════

/**
 * Fetch the competitions page and extract competition data.
 *
 * Strategy:
 *   1. Render /competitions in headless Chrome (saffplus.sa is fully CSR).
 *   2. PRIMARY: scan the captured JSON XHR responses for a competitions
 *      array. SAFF+ uses Motto's content_grid component which fetches
 *      its data via JSON — that's where the actual data lives.
 *   3. FALLBACK: parse the rendered HTML for competition anchors.
 *   4. FALLBACK: scan the RSC flight payload (legacy code path).
 *
 * Women's competitions are filtered at this layer (Layer 1 of the
 * defense-in-depth women's filter) and never returned to callers.
 */
export async function fetchCompetitions(): Promise<SaffPlusCompetition[]> {
  try {
    const competitions: SaffPlusCompetition[] = [];
    const womenSkipped: string[] = [];

    const tryAdd = (comp: SaffPlusCompetition) => {
      if (
        isWomensCompetition({
          gender: comp.gender,
          slug: String(comp.id),
          name: comp.name,
          nameAr: comp.nameAr,
        })
      ) {
        womenSkipped.push(String(comp.id));
        return;
      }
      if (!competitions.find((c) => c.id === comp.id)) {
        competitions.push(comp);
      }
    };

    // ── PRIMARY: Direct Motto CDA API (no Puppeteer) ──
    const compFilters = [
      "type_id:competition",
      "type_id:season",
      "type_id:tournament",
      "type_id:league",
    ];
    for (const filter of compFilters) {
      const entities = await listMottoCdaEntities(filter, {
        locale: "en",
        pageSize: 200,
      });
      if (entities.length === 0) continue;
      logger.info(
        `[SAFF+] Competitions via direct CDA API: "${filter}" (${entities.length} items)`,
      );
      for (const item of entities) {
        const id = pickStr(item, "slug", "id", "uuid") ?? String(item.id ?? "");
        const name = pickStr(item, "name", "title");
        if (!id || !name) continue;
        tryAdd({
          id,
          name,
          nameAr: pickStr(item, "name_ar", "nameAr", "title_ar", "titleAr"),
          season: pickStr(item, "season") ?? "",
          type: pickStr(item, "type", "competition_type") ?? "league",
          gender: pickStr(item, "gender"),
          ageGroup: pickStr(item, "age_group", "ageGroup", "category"),
        });
      }
      if (competitions.length > 0) break;
    }

    // ── FALLBACK: Puppeteer render (when CDA returns nothing) ──
    if (competitions.length === 0) {
      const { html, jsonResponses } = await fetchPageWithJson("/competitions");

      const jsonHit = findEntityArrayInJson(jsonResponses, { minItems: 1 });
      if (jsonHit.items.length > 0) {
        logger.info(
          `[SAFF+] Competitions JSON source (Puppeteer XHR): ${jsonHit.sourceUrl} (${jsonHit.items.length} items)`,
        );
        for (const item of jsonHit.items) {
          const id =
            pickStr(item, "slug", "id", "uuid") ?? String(item.id ?? "");
          const name = pickStr(item, "name", "title");
          if (!id || !name) continue;
          tryAdd({
            id,
            name,
            nameAr: pickStr(item, "name_ar", "nameAr", "title_ar", "titleAr"),
            season: pickStr(item, "season") ?? "",
            type: pickStr(item, "type", "competition_type") ?? "league",
            gender: pickStr(item, "gender"),
            ageGroup: pickStr(item, "age_group", "ageGroup", "category"),
          });
        }
      }

      if (competitions.length === 0 && html) {
        const $ = cheerio.load(html);
        $('a[href*="/competitions/"]').each((_, el) => {
          const href = $(el).attr("href") || "";
          const slug = href.match(/\/competitions\/([^/]+)/)?.[1] ?? "";
          if (!slug || slug === "competitions") return;
          const name =
            $(el).find("h3, h2, [class*=title]").first().text().trim() ||
            $(el).text().trim().split("\n")[0]?.trim();
          if (!name) return;
          tryAdd({ id: slug, name, season: "", type: "league" });
        });
      }

      if (competitions.length === 0 && html) {
        const rscChunks = extractRscData(html);
        for (const chunk of rscChunks) {
          const competitionMatches = chunk.matchAll(
            /"slug"\s*:\s*"([^"]+)"[^{}]{0,400}?"name"\s*:\s*"([^"]+)"/g,
          );
          for (const m of competitionMatches) {
            const slug = m[1];
            const name = m[2];
            const win = chunk.slice(m.index ?? 0, (m.index ?? 0) + 800);
            const nameAr = win.match(/"name_ar"\s*:\s*"([^"]+)"/)?.[1];
            const gender = win.match(/"gender"\s*:\s*"([^"]+)"/)?.[1];
            const ageGroup =
              win.match(/"age_group"\s*:\s*"([^"]+)"/)?.[1] ??
              win.match(/"category"\s*:\s*"([^"]+)"/)?.[1];
            tryAdd({
              id: slug,
              name,
              nameAr,
              season: "",
              type: "league",
              gender,
              ageGroup,
            });
          }
        }
      }

      if (competitions.length === 0 && jsonResponses.length > 0) {
        logger.info(
          `[SAFF+] No competitions extracted; captured JSON URLs: ${jsonResponses
            .map((r) => r.url)
            .slice(0, 8)
            .join(" | ")}`,
        );
      }
    }

    if (womenSkipped.length > 0) {
      logger.info(
        `[SAFF+] Women's filter skipped ${womenSkipped.length} competition(s) at provider layer: ${womenSkipped.slice(0, 5).join(", ")}${womenSkipped.length > 5 ? ", ..." : ""}`,
      );
    }
    logger.info(
      `[SAFF+] Found ${competitions.length} competitions (men's only)`,
    );
    return competitions;
  } catch (err) {
    logger.warn(
      `[SAFF+] Failed to fetch competitions: ${(err as Error).message}`,
    );
    return [];
  }
}

/**
 * Fetch the clubs page and extract club data.
 *
 * Strategy mirrors fetchCompetitions:
 *   1. Render /clubs in headless Chrome (saffplus.sa is fully CSR).
 *   2. PRIMARY: scan captured JSON XHR responses for a clubs array.
 *      The Motto content_grid loads its data this way.
 *   3. FALLBACK: scan rendered HTML anchors.
 *   4. FALLBACK: scan the RSC flight payload (legacy).
 */
export async function fetchTeams(): Promise<SaffPlusTeam[]> {
  try {
    const teams: SaffPlusTeam[] = [];

    const tryAdd = (team: SaffPlusTeam) => {
      if (!teams.find((t) => t.id === team.id)) {
        teams.push(team);
      }
    };

    // ── PRIMARY: Direct Motto CDA API ──
    const clubFilters = [
      "type_id:club",
      "type_id:team",
      "type_id:organization",
    ];
    for (const filter of clubFilters) {
      const entities = await listMottoCdaEntities(filter, {
        locale: "en",
        pageSize: 200,
      });
      if (entities.length === 0) continue;
      logger.info(
        `[SAFF+] Clubs via direct CDA API: "${filter}" (${entities.length} items)`,
      );
      for (const item of entities) {
        const id = pickStr(item, "slug", "id", "uuid") ?? String(item.id ?? "");
        const name = pickStr(item, "name", "title");
        if (!id || !name) continue;
        tryAdd({
          id,
          name,
          nameAr: pickStr(item, "name_ar", "nameAr", "title_ar", "titleAr"),
          logo: pickStr(item, "logo", "thumbnail_url", "thumbnailUrl", "image"),
          city: pickStr(item, "city", "location"),
          stadium: pickStr(item, "stadium", "venue"),
        });
      }
      if (teams.length > 0) break;
    }

    // ── FALLBACK: Puppeteer render ──
    if (teams.length === 0) {
      const { html, jsonResponses } = await fetchPageWithJson("/clubs");

      const jsonHit = findEntityArrayInJson(jsonResponses, { minItems: 1 });
      if (jsonHit.items.length > 0) {
        logger.info(
          `[SAFF+] Clubs JSON source (Puppeteer XHR): ${jsonHit.sourceUrl} (${jsonHit.items.length} items)`,
        );
        for (const item of jsonHit.items) {
          const id =
            pickStr(item, "slug", "id", "uuid") ?? String(item.id ?? "");
          const name = pickStr(item, "name", "title");
          if (!id || !name) continue;
          tryAdd({
            id,
            name,
            nameAr: pickStr(item, "name_ar", "nameAr", "title_ar", "titleAr"),
            logo: pickStr(
              item,
              "logo",
              "thumbnail_url",
              "thumbnailUrl",
              "image",
            ),
            city: pickStr(item, "city", "location"),
            stadium: pickStr(item, "stadium", "venue"),
          });
        }
      }

      if (teams.length === 0 && html) {
        const $ = cheerio.load(html);
        $('a[href*="/clubs/"]').each((_, el) => {
          const href = $(el).attr("href") || "";
          const slug = href.replace("/clubs/", "").split("/")[0];
          if (!slug || slug === "clubs") return;
          const name =
            $(el).find("h3, h2, span, [class*=name]").first().text().trim() ||
            $(el).text().trim().split("\n")[0]?.trim();
          const logo = $(el).find("img").first().attr("src");
          if (name) {
            tryAdd({ id: slug, name: name || slug, logo: logo || undefined });
          }
        });
      }

      if (teams.length === 0 && html) {
        const rscChunks = extractRscData(html);
        for (const chunk of rscChunks) {
          const teamMatches = chunk.matchAll(
            /"slug"\s*:\s*"([^"]+)"[^}]*?"name"\s*:\s*"([^"]+)"/g,
          );
          for (const m of teamMatches) {
            tryAdd({ id: m[1], name: m[2] });
          }
        }
      }

      if (teams.length === 0 && jsonResponses.length > 0) {
        logger.info(
          `[SAFF+] No clubs extracted; captured JSON URLs: ${jsonResponses
            .map((r) => r.url)
            .slice(0, 8)
            .join(" | ")}`,
        );
      }
    }

    logger.info(`[SAFF+] Found ${teams.length} clubs`);
    return teams;
  } catch (err) {
    logger.warn(`[SAFF+] Failed to fetch clubs: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Fetch standings for a SAFF+ competition.
 *
 * Strategy:
 *   1. PRIMARY: call Motto CDA ListEntities directly (no Puppeteer).
 *      The saffplus.sa Next.js server fetches this data server-side and
 *      embeds it in the RSC stream — the browser never issues a client XHR
 *      for it, so Puppeteer cannot intercept it. We replicate the server call.
 *   2. FALLBACK: Puppeteer render + RSC payload extraction.
 *   3. FALLBACK: HTML <table> parsing.
 */
export async function fetchStandings(
  competitionId: number | string,
  _season?: string,
): Promise<SaffPlusStanding[]> {
  const slug = String(competitionId);
  const seen = new Map<string, SaffPlusStanding>();

  // ── PRIMARY: Direct Motto CDA API ──
  // Try candidate entity type IDs; the first that returns rows wins.
  const standingFilters = [
    `type_id:standing AND fields.season_id:${slug}`,
    `type_id:standing AND fields.competition_id:${slug}`,
    `type_id:group_standing AND fields.season_id:${slug}`,
    `type_id:season_standing AND fields.season_id:${slug}`,
    `type_id:standing_row AND fields.season_id:${slug}`,
  ];
  for (const filter of standingFilters) {
    const entities = await listMottoCdaEntities(filter, { locale: "en" });
    if (entities.length > 0) {
      logger.info(
        `[SAFF+] Standings via direct CDA API: "${filter}" (${entities.length} rows)`,
      );
      entities.forEach((o, idx) => {
        const f = (o.fields as Record<string, unknown> | undefined) ?? {};
        const merged: Record<string, unknown> = { ...f, ...o };
        const club =
          (merged.club as Record<string, unknown> | undefined) ??
          (merged.team as Record<string, unknown> | undefined) ??
          (merged.entity as Record<string, unknown> | undefined) ??
          {};
        const teamId =
          pickStr(club, "id", "slug", "uuid") ??
          pickStr(merged, "team_id", "club_id", "id") ??
          String(idx);
        if (seen.has(teamId)) return;
        const num = (k: string): number =>
          typeof merged[k] === "number" ? (merged[k] as number) : 0;
        const gf = num("goals_for") || num("gf") || num("scored") || num("sf");
        const ga =
          num("goals_against") || num("ga") || num("conceded") || num("sa");
        seen.set(teamId, {
          position: num("position") || num("rank") || num("pos") || idx + 1,
          teamId,
          teamName:
            pickStr(club, "name", "title") ??
            pickStr(merged, "team_name", "club_name") ??
            "",
          teamNameAr:
            pickStr(club, "name_ar", "nameAr", "title_ar") ??
            pickStr(merged, "team_name_ar", "club_name_ar"),
          teamLogo: pickStr(club, "thumbnail_url", "logo", "image"),
          played: num("played") || num("games_played") || num("p"),
          won: num("won") || num("wins") || num("w"),
          drawn: num("drawn") || num("draws") || num("d"),
          lost: num("lost") || num("losses") || num("l"),
          goalsFor: gf,
          goalsAgainst: ga,
          goalDifference: num("goal_difference") || num("gd") || gf - ga,
          points: num("points") || num("pts"),
          group: pickStr(merged, "group", "group_name"),
        });
      });
      break;
    }
  }
  if (seen.size > 0) {
    const rows = Array.from(seen.values()).sort(
      (a, b) => (a.position || 0) - (b.position || 0),
    );
    logger.info(
      `[SAFF+] fetchStandings(${slug}): ${rows.length} rows (direct API)`,
    );
    return rows;
  }

  // ── FALLBACK: Puppeteer render ──
  const paths = [
    `/en/competitions/${slug}/standings`,
    `/ar/competitions/${slug}/standings`,
    `/en/competitions/${slug}`,
  ];

  for (const path of paths) {
    let html: string;
    let jsonResponses: RenderResult["jsonResponses"];
    try {
      ({ html, jsonResponses } = await fetchPageWithJson(
        path,
        // Wait for a standings row or table cell to appear — this ensures any
        // deferred XHR that fires after networkidle0 has completed before we
        // capture. Falls through silently if the selector never appears.
        "table tr:nth-child(2), [class*=standing] [class*=row], [class*=standing] tr",
      ));
    } catch (err) {
      logger.warn(
        `[SAFF+] fetchStandings: ${path} failed — ${(err as Error).message}`,
      );
      continue;
    }

    // ── PRIMARY: JSON XHR responses ──
    // Motto CDA entities: stats may be top-level OR nested under entity.fields.
    const jsonHit = findArrayInJson(
      jsonResponses,
      (o) => {
        const f = (o.fields as Record<string, unknown> | undefined) ?? {};
        return (
          typeof o.points === "number" ||
          typeof o.pts === "number" ||
          (typeof o.played === "number" && typeof o.won === "number") ||
          typeof f.points === "number" ||
          typeof f.pts === "number" ||
          (typeof f.played === "number" && typeof f.won === "number")
        );
      },
      { minItems: 1 },
    );
    if (jsonHit.items.length > 0) {
      logger.info(
        `[SAFF+] Standings JSON source: ${jsonHit.sourceUrl} (${jsonHit.items.length} rows)`,
      );
      jsonHit.items.forEach((o, idx) => {
        // Motto CDA wraps custom fields under entity.fields — merge into a flat lookup.
        const f = (o.fields as Record<string, unknown> | undefined) ?? {};
        const merged: Record<string, unknown> = { ...f, ...o };

        const club =
          (merged.club as Record<string, unknown> | undefined) ??
          (merged.team as Record<string, unknown> | undefined) ??
          (merged.entity as Record<string, unknown> | undefined) ??
          {};
        const teamId =
          pickStr(club, "id", "slug", "uuid") ??
          pickStr(merged, "team_id", "club_id", "id") ??
          String(idx);
        if (seen.has(teamId)) return;
        const num = (k: string): number =>
          typeof merged[k] === "number" ? (merged[k] as number) : 0;
        const goalsFor =
          num("goals_for") || num("gf") || num("scored") || num("sf");
        const goalsAgainst =
          num("goals_against") || num("ga") || num("conceded") || num("sa");
        seen.set(teamId, {
          position: num("position") || num("rank") || num("pos") || idx + 1,
          teamId,
          teamName:
            pickStr(club, "name", "title") ??
            pickStr(merged, "team_name", "club_name") ??
            "",
          teamNameAr:
            pickStr(club, "name_ar", "nameAr", "title_ar") ??
            pickStr(merged, "team_name_ar", "club_name_ar"),
          teamLogo: pickStr(club, "thumbnail_url", "logo", "image"),
          played: num("played") || num("games_played") || num("p"),
          won: num("won") || num("wins") || num("w"),
          drawn: num("drawn") || num("draws") || num("d"),
          lost: num("lost") || num("losses") || num("l"),
          goalsFor,
          goalsAgainst,
          goalDifference:
            num("goal_difference") || num("gd") || goalsFor - goalsAgainst,
          points: num("points") || num("pts"),
          group: pickStr(merged, "group", "group_name"),
        });
      });
    } else if (jsonResponses.length > 0) {
      logger.info(
        `[SAFF+] Standings: no JSON match from ${jsonResponses.length} responses. URLs: ${jsonResponses
          .map((r) => r.url)
          .slice(0, 5)
          .join(" | ")}`,
      );
      if (jsonResponses[0]?.data) {
        const sample = JSON.stringify(jsonResponses[0].data).slice(0, 300);
        logger.info(`[SAFF+] Standings: first response preview: ${sample}`);
      }
    }

    // ── FALLBACK 1: RSC payload ──
    if (seen.size === 0) {
      const rscChunks = extractRscData(html);
      for (const row of extractStandingsFromRsc(rscChunks)) {
        const key = String(row.teamId);
        if (!seen.has(key)) seen.set(key, row);
      }
    }

    // ── FALLBACK 2: HTML table ──
    if (seen.size === 0) {
      for (const row of extractStandingsFromHtml(html)) {
        const key = String(row.teamId);
        if (!seen.has(key)) seen.set(key, row);
      }
    }

    if (seen.size > 0) break;
  }

  const rows = Array.from(seen.values()).sort(
    (a, b) => (a.position || 0) - (b.position || 0),
  );
  logger.info(`[SAFF+] fetchStandings(${slug}): ${rows.length} rows`);
  return rows;
}

/**
 * Extract standing rows from RSC flight chunks. SAFF+ emits objects
 * shaped like { team: {...}, played, won, drawn, lost, gf, ga, gd,
 * points, position }. We tolerate variations in field naming.
 */
function extractStandingsFromRsc(rscChunks: string[]): SaffPlusStanding[] {
  const rows: SaffPlusStanding[] = [];

  for (const chunk of rscChunks) {
    // Standings objects always carry "points" + "played" together.
    // Match a JSON-ish window containing both, then extract sub-fields.
    const blocks = chunk.matchAll(
      /\{[^{}]*"(?:played|games_played|matches_played|p)"\s*:\s*\d+[^{}]*"(?:points|pts)"\s*:\s*\d+[^{}]*\}/gs,
    );

    for (const block of blocks) {
      try {
        const text = block[0];
        const num = (re: RegExp): number => {
          const m = text.match(re);
          return m ? Number(m[1]) : 0;
        };
        const str = (re: RegExp): string | undefined => {
          const m = text.match(re);
          return m ? m[1] : undefined;
        };

        const teamId =
          str(/"team_id"\s*:\s*"?([^",}]+)"?/) ??
          str(/"id"\s*:\s*"?([^",}]+)"?/) ??
          "";
        if (!teamId) continue;

        const teamName =
          str(/"team_name"\s*:\s*"([^"]+)"/) ??
          str(/"name"\s*:\s*"([^"]+)"/) ??
          "";
        const teamNameAr =
          str(/"team_name_ar"\s*:\s*"([^"]+)"/) ??
          str(/"name_ar"\s*:\s*"([^"]+)"/);
        const teamLogo =
          str(/"thumbnail_url"\s*:\s*"([^"]+)"/) ??
          str(/"logo"\s*:\s*"([^"]+)"/);

        const played = num(
          /"(?:played|games_played|matches_played|p)"\s*:\s*(\d+)/,
        );
        const won = num(/"(?:won|wins|w)"\s*:\s*(\d+)/);
        const drawn = num(/"(?:drawn|draws|d)"\s*:\s*(\d+)/);
        const lost = num(/"(?:lost|losses|l)"\s*:\s*(\d+)/);
        const goalsFor = num(/"(?:goals_for|gf|scored|sf)"\s*:\s*(\d+)/);
        const goalsAgainst = num(
          /"(?:goals_against|ga|conceded|sa)"\s*:\s*(\d+)/,
        );
        const goalDifference =
          num(/"(?:goal_difference|gd|diff)"\s*:\s*(-?\d+)/) ||
          goalsFor - goalsAgainst;
        const points = num(/"(?:points|pts)"\s*:\s*(\d+)/);
        const position = num(/"(?:position|rank|pos)"\s*:\s*(\d+)/);
        const group = str(/"group"\s*:\s*"([^"]+)"/);

        rows.push({
          position,
          teamId,
          teamName,
          teamNameAr,
          teamLogo,
          played,
          won,
          drawn,
          lost,
          goalsFor,
          goalsAgainst,
          goalDifference,
          points,
          group,
        });
      } catch {
        // skip malformed block
      }
    }
  }

  return rows;
}

/**
 * Fallback: parse a <table> rendered server-side. Heuristic — find
 * the first table whose header row contains "P" (played) and "Pts"
 * (points) signals. Walk rows, extract by column index.
 */
function extractStandingsFromHtml(html: string): SaffPlusStanding[] {
  const $ = cheerio.load(html);
  const rows: SaffPlusStanding[] = [];

  $("table").each((_, tableEl) => {
    if (rows.length > 0) return; // first matching table wins

    const headerCells = $(tableEl)
      .find("thead th, tr")
      .first()
      .find("th, td")
      .map((_, c) => $(c).text().trim().toLowerCase())
      .get();

    // Identify column indices via header keywords (Arabic + English).
    const idx = (...keys: string[]) =>
      headerCells.findIndex((h) =>
        keys.some((k) => h.includes(k.toLowerCase())),
      );

    const colTeam = idx("team", "club", "نادي", "فريق");
    const colP = idx("p", "played", "لعب", "اللعب");
    const colW = idx("w", "won", "wins", "فوز");
    const colD = idx("d", "draw", "تعادل");
    const colL = idx("l", "lost", "loss", "خسارة");
    const colGD = idx("gd", "diff", "+/-", "فارق");
    const colPts = idx("pts", "points", "نقاط");

    if (colTeam < 0 || colPts < 0) return;

    $(tableEl)
      .find("tbody tr")
      .each((rowIdx, rowEl) => {
        const cells = $(rowEl)
          .find("td")
          .map((_, c) => $(c).text().trim())
          .get();
        if (cells.length === 0) return;

        const teamName = cells[colTeam] ?? "";
        if (!teamName) return;

        const num = (i: number) => (i >= 0 ? Number(cells[i] ?? 0) : 0);

        rows.push({
          position: rowIdx + 1,
          teamId: teamName, // best we can do without an ID column
          teamName,
          played: num(colP),
          won: num(colW),
          drawn: num(colD),
          lost: 0 + num(colL),
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: num(colGD),
          points: num(colPts),
        });
      });
  });

  return rows;
}

/**
 * Extract all JSON-like objects from RSC flight chunks that look like match records.
 * Looks for objects containing both home/away team fields and a date.
 */
function extractMatchesFromRsc(rscChunks: string[]): SaffPlusMatch[] {
  const matches: SaffPlusMatch[] = [];
  const seen = new Set<string>();

  for (const chunk of rscChunks) {
    // Walk the chunk looking for objects with match-like keys
    // Pattern: "home_club" + "away_club" + date-like field, or "home_team" + "away_team"
    const matchBlocks = chunk.matchAll(
      /\{[^{}]*"(?:home_club|home_team)"[^{}]*"(?:away_club|away_team)"[^{}]*\}/gs,
    );

    for (const block of matchBlocks) {
      try {
        const obj = JSON.parse(block[0]);
        const id =
          obj.id ??
          obj.uuid ??
          obj.slug ??
          JSON.stringify(block[0]).slice(0, 40);
        if (seen.has(String(id))) continue;
        seen.add(String(id));

        const homeTeam =
          obj.home_club?.name ?? obj.home_team?.name ?? obj.home_team ?? "";
        const awayTeam =
          obj.away_club?.name ?? obj.away_team?.name ?? obj.away_team ?? "";

        if (!homeTeam || !awayTeam) continue;

        matches.push({
          id: String(id),
          competitionId: obj.competition?.slug ?? obj.season?.competition ?? "",
          date: obj.date ?? obj.match_date ?? obj.start_date ?? "",
          time: obj.time ?? obj.match_time ?? undefined,
          homeTeamId: obj.home_club?.id ?? obj.home_team?.id ?? 0,
          homeTeamName: homeTeam,
          homeTeamNameAr:
            obj.home_club?.name_ar ?? obj.home_team?.name_ar ?? undefined,
          homeTeamLogo:
            obj.home_club?.thumbnail_url ?? obj.home_club?.logo ?? undefined,
          awayTeamId: obj.away_club?.id ?? obj.away_team?.id ?? 0,
          awayTeamName: awayTeam,
          awayTeamNameAr:
            obj.away_club?.name_ar ?? obj.away_team?.name_ar ?? undefined,
          awayTeamLogo:
            obj.away_club?.thumbnail_url ?? obj.away_club?.logo ?? undefined,
          homeScore: obj.home_score ?? obj.fields?.home_score ?? null,
          awayScore: obj.away_score ?? obj.fields?.away_score ?? null,
          status:
            obj.status ?? (obj.home_score != null ? "finished" : "scheduled"),
          stadium: obj.stadium ?? obj.venue ?? obj.fields?.stadium ?? undefined,
          week: obj.week ?? obj.round ?? undefined,
        });
      } catch {
        // skip malformed blocks
      }
    }

    // Also try a looser array extraction — SAFF+ sometimes emits match arrays
    // as: ["match-slug-1", {...}, "match-slug-2", {...}] in flight payloads
    const arrayMatch = chunk.match(/"matches"\s*:\s*(\[[\s\S]*?\])/);
    if (arrayMatch) {
      try {
        const arr = JSON.parse(arrayMatch[1]) as Array<Record<string, unknown>>;
        for (const item of arr) {
          if (typeof item !== "object" || !item) continue;
          const home =
            ((item.home_team as Record<string, unknown>)?.name as string) ?? "";
          const away =
            ((item.away_team as Record<string, unknown>)?.name as string) ?? "";
          if (!home || !away) continue;
          const id = String(item.id ?? item.slug ?? Math.random());
          if (seen.has(id)) continue;
          seen.add(id);
          matches.push({
            id,
            competitionId: String(
              (item.competition as Record<string, unknown>)?.slug ?? "",
            ),
            date: String(item.date ?? item.match_date ?? ""),
            homeTeamId: String(
              (item.home_team as Record<string, unknown>)?.id ?? "",
            ),
            homeTeamName: home,
            awayTeamId: String(
              (item.away_team as Record<string, unknown>)?.id ?? "",
            ),
            awayTeamName: away,
            homeScore: (item.home_score as number) ?? null,
            awayScore: (item.away_score as number) ?? null,
            status: String(item.status ?? "scheduled"),
          });
        }
      } catch {
        // skip
      }
    }
  }

  return matches;
}

/**
 * Scrape fixture rows from a rendered HTML table (fallback when RSC parsing yields nothing).
 */
function extractMatchesFromHtml(html: string, slug: string): SaffPlusMatch[] {
  const $ = cheerio.load(html);
  const matches: SaffPlusMatch[] = [];

  // Common SAFF+ / Motto fixture card selectors
  $("[class*=fixture], [class*=match-card], [class*=game-row], table tr").each(
    (i, el) => {
      const cells = $(el)
        .find("td, [class*=team]")
        .map((_, c) => $(c).text().trim())
        .get();
      if (cells.length < 2) return;

      // Heuristic: first non-empty cell with Arabic/Latin text = home team, last = away team
      const teams = cells.filter((c) => c.length > 1 && !/^\d+$/.test(c));
      if (teams.length < 2) return;

      const dateEl = $(el).find("time, [class*=date], [datetime]").first();
      const date = dateEl.attr("datetime") ?? dateEl.text().trim();

      matches.push({
        id: `${slug}-${i}`,
        competitionId: slug,
        date,
        homeTeamId: 0,
        homeTeamName: teams[0],
        awayTeamId: 0,
        awayTeamName: teams[teams.length - 1],
        homeScore: null,
        awayScore: null,
        status: "scheduled",
      });
    },
  );

  return matches;
}

/**
 * Fetch matches for a competition from SAFF+.
 *
 * Strategy:
 * 1. PRIMARY: call Motto CDA ListEntities directly (no Puppeteer).
 * 2. FALLBACK: Puppeteer render + RSC payload extraction.
 * 3. FALLBACK: HTML table scraping.
 */
export async function fetchMatches(
  competitionSlug: number | string,
  _season?: string,
): Promise<SaffPlusMatch[]> {
  const slug = String(competitionSlug);
  const allMatches: SaffPlusMatch[] = [];
  const seen = new Set<string>();

  // ── PRIMARY: Direct Motto CDA API ──
  const matchFilters = [
    `type_id:match AND fields.season_id:${slug}`,
    `type_id:match AND fields.competition_id:${slug}`,
    `type_id:game AND fields.season_id:${slug}`,
    `type_id:fixture AND fields.season_id:${slug}`,
    `type_id:event AND fields.season_id:${slug}`,
    `type_id:match_event AND fields.season_id:${slug}`,
  ];
  for (const filter of matchFilters) {
    const entities = await listMottoCdaEntities(filter, {
      locale: "en",
      pageSize: 500,
    });
    if (entities.length > 0) {
      logger.info(
        `[SAFF+] Matches via direct CDA API: "${filter}" (${entities.length} items)`,
      );
      for (const o of entities) {
        const f = (o.fields as Record<string, unknown> | undefined) ?? {};
        const merged: Record<string, unknown> = { ...f, ...o };
        const id = String(
          merged.id ?? merged.uuid ?? merged.slug ?? Math.random(),
        );
        if (seen.has(id)) continue;
        seen.add(id);
        const home =
          (merged.home_club as Record<string, unknown> | undefined) ??
          (merged.home_team as Record<string, unknown> | undefined) ??
          {};
        const away =
          (merged.away_club as Record<string, unknown> | undefined) ??
          (merged.away_team as Record<string, unknown> | undefined) ??
          {};
        const homeScore =
          typeof merged.home_score === "number" ? merged.home_score : null;
        const awayScore =
          typeof merged.away_score === "number" ? merged.away_score : null;
        allMatches.push({
          id,
          competitionId: slug,
          date: String(
            merged.date ?? merged.match_date ?? merged.start_date ?? "",
          ),
          time:
            typeof merged.time === "string" || typeof merged.time === "number"
              ? String(merged.time)
              : undefined,
          homeTeamId:
            pickStr(home, "id", "slug") ??
            (typeof home.id === "number" ? home.id : 0),
          homeTeamName: pickStr(home, "name", "title") ?? "",
          homeTeamNameAr: pickStr(home, "name_ar", "nameAr", "title_ar"),
          homeTeamLogo: pickStr(home, "thumbnail_url", "logo", "image"),
          awayTeamId:
            pickStr(away, "id", "slug") ??
            (typeof away.id === "number" ? away.id : 0),
          awayTeamName: pickStr(away, "name", "title") ?? "",
          awayTeamNameAr: pickStr(away, "name_ar", "nameAr", "title_ar"),
          awayTeamLogo: pickStr(away, "thumbnail_url", "logo", "image"),
          homeScore,
          awayScore,
          status: String(
            merged.status ?? (homeScore != null ? "finished" : "scheduled"),
          ),
          stadium: pickStr(merged, "stadium", "venue"),
          week:
            merged.week != null
              ? Number(merged.week) || undefined
              : merged.round != null
                ? Number(merged.round) || undefined
                : undefined,
        });
      }
      break;
    }
  }
  if (allMatches.length > 0) {
    logger.info(
      `[SAFF+] fetchMatches(${slug}): ${allMatches.length} fixtures found (direct API)`,
    );
    return allMatches;
  }

  // ── FALLBACK: Puppeteer render ──
  const paths = [
    `/en/competitions/${slug}/fixtures`,
    `/en/competitions/${slug}/results`,
    `/ar/competitions/${slug}/fixtures`,
  ];

  for (const path of paths) {
    try {
      const { html, jsonResponses } = await fetchPageWithJson(
        path,
        // Wait for a fixture/match card to appear — ensures deferred XHR has
        // fired before we capture. Falls through silently on timeout.
        "[class*=fixture], [class*=match-card], [class*=game-row], [class*=event-row]",
      );

      // ── PRIMARY: JSON XHR responses ──
      // Motto CDA: fixture fields may be top-level or nested under entity.fields.
      const jsonHit = findArrayInJson(
        jsonResponses,
        (o) => {
          const isObj = (v: unknown) =>
            v != null && typeof v === "object" && !Array.isArray(v);
          const f = (o.fields as Record<string, unknown> | undefined) ?? {};
          return (
            isObj(o.home_club) ||
            isObj(o.away_club) ||
            isObj(o.home_team) ||
            isObj(o.away_team) ||
            isObj(f.home_club) ||
            isObj(f.away_club) ||
            isObj(f.home_team) ||
            isObj(f.away_team)
          );
        },
        { minItems: 1 },
      );

      if (jsonHit.items.length > 0) {
        logger.info(
          `[SAFF+] Matches JSON source: ${jsonHit.sourceUrl} (${jsonHit.items.length} items) from ${path}`,
        );
        for (const o of jsonHit.items) {
          // Merge entity.fields into a flat object so all lookups work uniformly.
          const f = (o.fields as Record<string, unknown> | undefined) ?? {};
          const merged: Record<string, unknown> = { ...f, ...o };

          const id = String(
            merged.id ??
              merged.uuid ??
              merged.slug ??
              `${merged.home_club}-${merged.away_club}`,
          );
          if (seen.has(id)) continue;
          seen.add(id);

          const home =
            (merged.home_club as Record<string, unknown> | undefined) ??
            (merged.home_team as Record<string, unknown> | undefined) ??
            {};
          const away =
            (merged.away_club as Record<string, unknown> | undefined) ??
            (merged.away_team as Record<string, unknown> | undefined) ??
            {};

          const homeScore =
            typeof merged.home_score === "number"
              ? merged.home_score
              : ((merged.home_score as number | undefined) ?? null);
          const awayScore =
            typeof merged.away_score === "number"
              ? merged.away_score
              : ((merged.away_score as number | undefined) ?? null);

          allMatches.push({
            id,
            competitionId: slug,
            date: String(
              merged.date ?? merged.match_date ?? merged.start_date ?? "",
            ),
            time:
              typeof merged.time === "string" || typeof merged.time === "number"
                ? String(merged.time)
                : undefined,
            homeTeamId:
              pickStr(home, "id", "slug") ??
              (typeof home.id === "number" ? home.id : 0),
            homeTeamName: pickStr(home, "name", "title") ?? "",
            homeTeamNameAr: pickStr(home, "name_ar", "nameAr", "title_ar"),
            homeTeamLogo: pickStr(home, "thumbnail_url", "logo", "image"),
            awayTeamId:
              pickStr(away, "id", "slug") ??
              (typeof away.id === "number" ? away.id : 0),
            awayTeamName: pickStr(away, "name", "title") ?? "",
            awayTeamNameAr: pickStr(away, "name_ar", "nameAr", "title_ar"),
            awayTeamLogo: pickStr(away, "thumbnail_url", "logo", "image"),
            homeScore,
            awayScore,
            status: String(
              merged.status ?? (homeScore != null ? "finished" : "scheduled"),
            ),
            stadium: pickStr(merged, "stadium", "venue"),
            week:
              merged.week != null
                ? Number(merged.week) || undefined
                : merged.round != null
                  ? Number(merged.round) || undefined
                  : undefined,
          });
        }
      } else if (jsonResponses.length > 0) {
        logger.info(
          `[SAFF+] Matches: no JSON match from ${jsonResponses.length} responses on ${path}. URLs: ${jsonResponses
            .map((r) => r.url)
            .slice(0, 5)
            .join(" | ")}`,
        );
        if (jsonResponses[0]?.data) {
          const sample = JSON.stringify(jsonResponses[0].data).slice(0, 300);
          logger.info(`[SAFF+] Matches: first response preview: ${sample}`);
        }
      }

      // ── FALLBACK 1: RSC payload ──
      if (allMatches.length === 0 || jsonHit.items.length === 0) {
        const rscChunks = extractRscData(html);
        for (const m of extractMatchesFromRsc(rscChunks)) {
          if (!seen.has(String(m.id))) {
            seen.add(String(m.id));
            allMatches.push(m);
          }
        }
      }

      // ── FALLBACK 2: HTML table ──
      if (allMatches.length === 0) {
        for (const m of extractMatchesFromHtml(html, slug)) {
          const key = `${m.homeTeamName}-${m.awayTeamName}-${m.date}`;
          if (!seen.has(key)) {
            seen.add(key);
            allMatches.push(m);
          }
        }
      }
    } catch (err) {
      logger.warn(
        `[SAFF+] fetchMatches failed for ${path}: ${(err as Error).message}`,
      );
    }
  }

  logger.info(
    `[SAFF+] fetchMatches(${slug}): ${allMatches.length} fixtures found`,
  );
  return allMatches;
}

// ══════════════════════════════════════════
// PLAYER PROFILE (entity/player/:id)
// ══════════════════════════════════════════

const MOTTO_CDA_GET =
  "https://cda.mottostreaming.com/motto.cda.cms.entity.v1.EntityService/GetEntity";

/**
 * Fetch a single player entity from Motto CDA by saffPlayerId (slug).
 * Tries multiple filter strategies in sequence — the Motto CDA GetEntity
 * endpoint requires a numeric internal ID, whereas player page slugs like
 * "NMD_mPMtk2HQTDmgvxD7x" are handled by ListEntities filters.
 */
async function getMottoCdaEntity(
  id: string,
  locale: "ar" | "en",
): Promise<Record<string, unknown> | null> {
  // Strategy 1: ListEntities with slug filter (works for alphanumeric slugs)
  const filters = [
    `type_id:player AND slug:${id}`,
    `type_id:player AND fields.slug:${id}`,
    `type_id:player AND id:${id}`,
    `type_id:person AND slug:${id}`,
    `type_id:person AND fields.slug:${id}`,
  ];

  for (const filter of filters) {
    const entities = await listMottoCdaEntities(filter, {
      locale,
      pageSize: 1,
    });
    if (entities.length > 0) {
      logger.info(
        `[SAFF+ CDA] getMottoCdaEntity(${id}, ${locale}): hit via filter "${filter}"`,
      );
      // Unwrap fields if present
      const e = entities[0];
      const fields = e.fields as Record<string, unknown> | undefined;
      return fields ? { ...fields, ...e } : e;
    }
  }

  // Strategy 2: GetEntity with id (works if id is a numeric CDA internal ID)
  const message = JSON.stringify({ id, locale });
  const url = `${MOTTO_CDA_GET}?encoding=json&message=${encodeURIComponent(message)}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      logger.info(
        `[SAFF+ CDA] GetEntity(${id}, ${locale}) → HTTP ${res.status}`,
      );
      return null;
    }
    const data = (await res.json()) as Record<string, unknown>;
    const entity = data.entity ?? data.data ?? data;
    if (entity && typeof entity === "object" && !Array.isArray(entity)) {
      logger.info(`[SAFF+ CDA] GetEntity(${id}, ${locale}): hit`);
      return entity as Record<string, unknown>;
    }
    return null;
  } catch (err) {
    logger.info(
      `[SAFF+ CDA] GetEntity(${id}, ${locale}) → error: ${(err as Error).message}`,
    );
    return null;
  }
}

/** Parse a YYYY-MM-DD date from various field shapes CDA might return. */
function parseDob(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw))
    return raw.slice(0, 10);
  if (typeof raw === "object" && raw !== null) {
    const o = raw as Record<string, unknown>;
    const candidate = pickStr(o, "date", "value", "iso", "dateOfBirth", "dob");
    if (candidate && /^\d{4}-\d{2}-\d{2}/.test(candidate))
      return candidate.slice(0, 10);
  }
  return null;
}

/** Normalise a lineup role string from SAFF+ into our enum, or return undefined. */
function parseLineupRole(raw: unknown): SaffPlusLineupRole | undefined {
  if (!raw || typeof raw !== "string") return undefined;
  const v = raw.toLowerCase().trim();
  const map: Record<string, SaffPlusLineupRole> = {
    starter: "starter",
    starting: "starter",
    bench: "bench",
    substitute: "bench",
    sub: "bench",
    injured: "injured",
    suspended: "suspended",
    not_called: "not_called",
    notcalled: "not_called",
  };
  return map[v];
}

/** Extract team entries from CDA entity payload. */
function extractTeams(entity: Record<string, unknown>): SaffPlusPlayerTeam[] {
  const teamsRaw =
    entity.teams ??
    entity.clubs ??
    entity.clubHistory ??
    entity.teamHistory ??
    entity.playerTeams;
  if (!Array.isArray(teamsRaw)) return [];

  const teams: SaffPlusPlayerTeam[] = [];
  for (const t of teamsRaw) {
    if (t == null || typeof t !== "object") continue;
    const o = t as Record<string, unknown>;
    const rawId = o.teamId ?? o.clubId ?? o.id ?? o.saffTeamId;
    const saffTeamId = rawId ? Number(rawId) : NaN;
    if (isNaN(saffTeamId)) continue;
    teams.push({
      saffTeamId,
      name: pickStr(o, "name", "teamName", "clubName") ?? "",
      nameAr: pickStr(o, "nameAr", "teamNameAr", "clubNameAr") ?? "",
      logoUrl: pickStr(o, "logo", "logoUrl", "teamLogo") ?? null,
      from: parseDob(o.from ?? o.startDate ?? o.joinedAt) ?? null,
      to: parseDob(o.to ?? o.endDate ?? o.leftAt) ?? null,
    });
  }
  return teams;
}

/** Extract a match list from CDA entity payload, tagging with lineupRole if present. */
function extractMatchList(raw: unknown): SaffPlusMatchWithLineup[] {
  if (!Array.isArray(raw)) return [];
  const out: SaffPlusMatchWithLineup[] = [];
  for (const m of raw) {
    if (m == null || typeof m !== "object") continue;
    const o = m as Record<string, unknown>;
    const id = pickStr(o, "id", "matchId", "fixtureId");
    if (!id) continue;
    const match: SaffPlusMatchWithLineup = {
      id,
      competitionId: pickStr(o, "competitionId", "tournamentId") ?? 0,
      date: pickStr(o, "date", "matchDate", "startDate") ?? "",
      time: pickStr(o, "time", "kickoffTime") ?? undefined,
      homeTeamId: (o.homeTeamId ?? o.homeClubId ?? 0) as string | number,
      homeTeamName: pickStr(o, "homeTeamName", "homeClubName") ?? "",
      homeTeamNameAr:
        pickStr(o, "homeTeamNameAr", "homeClubNameAr") ?? undefined,
      homeTeamLogo: pickStr(o, "homeTeamLogo", "homeClubLogo") ?? undefined,
      awayTeamId: (o.awayTeamId ?? o.awayClubId ?? 0) as string | number,
      awayTeamName: pickStr(o, "awayTeamName", "awayClubName") ?? "",
      awayTeamNameAr:
        pickStr(o, "awayTeamNameAr", "awayClubNameAr") ?? undefined,
      awayTeamLogo: pickStr(o, "awayTeamLogo", "awayClubLogo") ?? undefined,
      homeScore: typeof o.homeScore === "number" ? o.homeScore : null,
      awayScore: typeof o.awayScore === "number" ? o.awayScore : null,
      status: pickStr(o, "status", "matchStatus") ?? undefined,
      stadium: pickStr(o, "stadium", "venue") ?? undefined,
      city: pickStr(o, "city") ?? undefined,
    };
    const role = parseLineupRole(
      o.lineupRole ?? o.playerRole ?? o.role ?? o.status,
    );
    if (role) match.lineupRole = role;
    out.push(match);
  }
  return out;
}

/**
 * Fetch a player profile from saffplus.sa for the given saffPlayerId.
 *
 * Strategy:
 *   1. Call Motto CDA GetEntity in AR + EN and merge both locales.
 *   2. Fall back to Puppeteer page render + RSC/XHR extraction when CDA
 *      returns nothing (e.g. if the CDA shape changes).
 *
 * Returns null when the player cannot be found on SAFF+.
 */
const PLAYER_PROFILE_TTL = 6 * 3600; // 6 hours

export async function fetchPlayerProfile(
  saffPlayerId: string,
  { fresh = false }: { fresh?: boolean } = {},
): Promise<SaffPlusPlayerProfile | null> {
  const cacheKey = `${CachePrefix.SAFFPLUS_PLAYER}:${saffPlayerId}`;

  if (!fresh) {
    const cached = await cacheGet<SaffPlusPlayerProfile>(cacheKey);
    if (cached) {
      logger.info(`[SAFF+] fetchPlayerProfile(${saffPlayerId}): cache hit`);
      return cached;
    }
  }

  // ── Tier A: CDA direct ──
  const [arEntity, enEntity] = await Promise.all([
    getMottoCdaEntity(saffPlayerId, "ar"),
    getMottoCdaEntity(saffPlayerId, "en"),
  ]);

  // Names from CDA summary — used as fallbacks if Puppeteer tier runs
  let cdaNameAr = "";
  let cdaNameEn = "";

  if (arEntity ?? enEntity) {
    const ar = arEntity ?? {};
    const en = enEntity ?? {};

    const nameAr =
      pickStr(ar, "name", "nameAr", "fullName", "fullNameAr") ??
      pickStr(en, "nameAr", "name") ??
      "";
    const nameEn =
      pickStr(en, "name", "nameEn", "fullName") ??
      pickStr(ar, "nameEn", "name") ??
      "";
    cdaNameAr = nameAr;
    cdaNameEn = nameEn;

    const position =
      pickStr(ar, "position", "positionAr") ?? pickStr(en, "position") ?? null;
    const dateOfBirth = parseDob(
      ar.dateOfBirth ?? ar.dob ?? en.dateOfBirth ?? en.dob,
    );
    const nationality =
      pickStr(ar, "nationality", "nationalityCode", "country") ??
      pickStr(en, "nationality", "nationalityCode", "country") ??
      null;
    const photoUrl =
      pickStr(ar, "photo", "photoUrl", "avatar", "image") ??
      pickStr(en, "photo", "photoUrl", "avatar", "image") ??
      null;

    const teams =
      extractTeams(ar).length > 0 ? extractTeams(ar) : extractTeams(en);

    const recentMatches = extractMatchList(
      ar.recentMatches ??
        ar.lastMatches ??
        ar.playedMatches ??
        en.recentMatches ??
        en.lastMatches ??
        en.playedMatches,
    );
    const upcomingMatches = extractMatchList(
      ar.upcomingMatches ??
        ar.nextMatches ??
        ar.fixtures ??
        en.upcomingMatches ??
        en.nextMatches ??
        en.fixtures,
    );

    const cdaHasRichData =
      teams.length > 0 ||
      recentMatches.length > 0 ||
      upcomingMatches.length > 0;

    logger.info(
      `[SAFF+] fetchPlayerProfile(${saffPlayerId}): CDA hit — ` +
        `teams=${teams.length} recent=${recentMatches.length} upcoming=${upcomingMatches.length}` +
        (cdaHasRichData ? "" : " — summary-only, falling through to Puppeteer"),
    );

    if (cdaHasRichData) {
      const profile: SaffPlusPlayerProfile = {
        saffPlayerId,
        nameEn,
        nameAr,
        position,
        dateOfBirth,
        nationality,
        photoUrl,
        teams,
        recentMatches,
        upcomingMatches,
      };
      void cacheSet(cacheKey, profile, PLAYER_PROFILE_TTL);
      return profile;
    }
  }

  // ── Tier B: Puppeteer fallback ──
  logger.info(
    `[SAFF+] fetchPlayerProfile(${saffPlayerId}): CDA miss — falling back to Puppeteer`,
  );

  const { html, jsonResponses } = await fetchPageWithJson(
    `/ar/entity/player/${saffPlayerId}`,
    "[data-testid='player-name'], h1, .player-name",
  );

  if (!html && jsonResponses.length === 0) {
    logger.warn(
      `[SAFF+] fetchPlayerProfile(${saffPlayerId}): no content from Puppeteer`,
    );
    return null;
  }

  // Log what we got for diagnostics
  logger.info(
    `[SAFF+] fetchPlayerProfile(${saffPlayerId}): Puppeteer got ${jsonResponses.length} JSON responses, ` +
      `URLs: ${jsonResponses.map((r) => r.url.slice(0, 80)).join(" | ")}`,
  );
  if (jsonResponses.length > 0) {
    logger.info(
      `[SAFF+] fetchPlayerProfile(${saffPlayerId}): first JSON response keys: ` +
        `${Object.keys((jsonResponses[0].data as Record<string, unknown>) ?? {}).join(", ")} ` +
        `— sample: ${JSON.stringify(jsonResponses[0].data).slice(0, 300)}`,
    );
  }

  // Walk captured JSON responses for a player-shaped object.
  // SAFF+ delivers data via Motto CDA — entities are shaped like:
  //   { slug, type_id, fields: { name_ar, name_en, position, dob, ... } }
  // OR the RSC stream embeds the page props with a nested entity object.
  let playerObj: Record<string, unknown> | null = null;

  function isPlayerShaped(o: Record<string, unknown>): boolean {
    // Direct fields (CDA entity merged)
    const hasName =
      typeof o.name === "string" ||
      typeof o.nameAr === "string" ||
      typeof o.name_ar === "string" ||
      typeof o.name_en === "string" ||
      typeof o.fullName === "string";
    const hasPlayerField =
      o.dateOfBirth != null ||
      o.date_of_birth != null ||
      o.dob != null ||
      o.position != null ||
      o.nationality != null ||
      o.age != null ||
      Array.isArray(o.teams) ||
      Array.isArray(o.clubs) ||
      Array.isArray(o.clubHistory);
    if (hasName && hasPlayerField) return true;
    // Motto CDA entity shape: { type_id: "player", fields: {...} }
    const typeId = pickStr(o, "type_id", "typeId");
    if (typeId && /player|person/i.test(typeId)) {
      const fields = o.fields as Record<string, unknown> | undefined;
      if (fields && typeof fields === "object") return true;
    }
    // Slug matches the saffPlayerId
    if (pickStr(o, "slug", "id") === saffPlayerId) return true;
    return false;
  }

  function findPlayerObj(
    v: unknown,
    depth = 0,
  ): Record<string, unknown> | null {
    if (depth > 8 || v == null || typeof v !== "object") return null;
    if (Array.isArray(v)) {
      for (const item of v) {
        const found = findPlayerObj(item, depth + 1);
        if (found) return found;
      }
      return null;
    }
    const o = v as Record<string, unknown>;
    if (isPlayerShaped(o)) return o;
    for (const child of Object.values(o)) {
      const found = findPlayerObj(child, depth + 1);
      if (found) return found;
    }
    return null;
  }

  for (const r of jsonResponses) {
    if (!r.data || typeof r.data !== "object") continue;
    const found = findPlayerObj(r.data);
    if (found) {
      logger.info(
        `[SAFF+] fetchPlayerProfile(${saffPlayerId}): player object found in JSON response from ${r.url.slice(0, 80)}`,
      );
      // If it's a Motto CDA entity, merge fields into the root
      const fields = found.fields as Record<string, unknown> | undefined;
      playerObj = fields ? { ...fields, ...found } : found;
      break;
    }
  }

  // RSC fallback — walk Next.js RSC flight chunks embedded in the HTML
  if (!playerObj) {
    const rscChunks = extractRscData(html);
    logger.info(
      `[SAFF+] fetchPlayerProfile(${saffPlayerId}): RSC chunks: ${rscChunks.length}`,
    );
    for (const chunk of rscChunks) {
      // Try parsing the chunk as JSON
      try {
        const parsed = JSON.parse(chunk) as unknown;
        const found = findPlayerObj(parsed);
        if (found) {
          const fields = found.fields as Record<string, unknown> | undefined;
          playerObj = fields ? { ...fields, ...found } : found;
          logger.info(
            `[SAFF+] fetchPlayerProfile(${saffPlayerId}): player found in RSC JSON chunk`,
          );
          break;
        }
      } catch {
        // not JSON — try regex extraction from raw chunk text
      }

      // Regex extraction: look for Motto CDA entity patterns in the raw RSC text
      if (!playerObj) {
        const slugMatch = new RegExp(
          `"slug"\\s*:\\s*"${saffPlayerId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`,
        ).test(chunk);
        if (slugMatch) {
          // Extract the enclosing JSON object containing this slug
          const nameArMatch = /"name_ar"\s*:\s*"([^"]+)"/.exec(chunk);
          const nameEnMatch = /"name(?:_en|En)?"\s*:\s*"([^"]+)"/.exec(chunk);
          const posMatch = /"position"\s*:\s*"([^"]+)"/.exec(chunk);
          const dobMatch =
            /"(?:date_of_birth|dateOfBirth|dob)"\s*:\s*"([^"]+)"/.exec(chunk);
          const natMatch = /"nationality"\s*:\s*"([^"]+)"/.exec(chunk);
          const photoMatch =
            /"(?:photo|image|avatar|thumbnail_url)"\s*:\s*"([^"]+)"/.exec(
              chunk,
            );
          if (nameArMatch ?? nameEnMatch) {
            playerObj = {
              slug: saffPlayerId,
              name_ar: nameArMatch?.[1] ?? null,
              name: nameEnMatch?.[1] ?? null,
              position: posMatch?.[1] ?? null,
              date_of_birth: dobMatch?.[1] ?? null,
              nationality: natMatch?.[1] ?? null,
              photo: photoMatch?.[1] ?? null,
            };
            logger.info(
              `[SAFF+] fetchPlayerProfile(${saffPlayerId}): player found via RSC regex extraction`,
            );
            break;
          }
        }
      }
    }
  }

  if (!playerObj) {
    // Last resort: scrape HTML for name + basic fields
    const $ = cheerio.load(html);
    const nameText = $("h1").first().text().trim();
    // Also try to find the player name from any element containing the slug
    const slugInPage = html.includes(saffPlayerId);
    if (!nameText && !slugInPage) {
      logger.warn(
        `[SAFF+] fetchPlayerProfile(${saffPlayerId}): nothing found in Puppeteer output`,
      );
      return null;
    }
    if (nameText) {
      playerObj = { name: nameText };
    } else {
      // Page loaded and has the slug but no extractable name — return minimal
      playerObj = { slug: saffPlayerId };
    }
  }

  // Support both camelCase (saffplus.sa frontend) and snake_case (Motto CDA)
  const nameAr =
    pickStr(playerObj, "nameAr", "fullNameAr", "name_ar", "full_name_ar") ??
    pickStr(playerObj, "name", "fullName") ??
    (cdaNameAr || "");
  const nameEn =
    pickStr(playerObj, "nameEn", "fullNameEn", "name_en", "full_name_en") ??
    pickStr(playerObj, "name", "fullName") ??
    (cdaNameEn || "");

  logger.info(
    `[SAFF+] fetchPlayerProfile(${saffPlayerId}): Puppeteer hit — nameAr="${nameAr}" nameEn="${nameEn}"`,
  );

  const puppeteerProfile: SaffPlusPlayerProfile = {
    saffPlayerId,
    nameEn,
    nameAr,
    position:
      pickStr(playerObj, "position", "position_ar", "positionEn") ?? null,
    dateOfBirth: parseDob(
      playerObj.dateOfBirth ??
        playerObj.date_of_birth ??
        playerObj.dob ??
        playerObj.birthDate,
    ),
    nationality:
      pickStr(
        playerObj,
        "nationality",
        "nationalityCode",
        "country",
        "nationality_code",
      ) ?? null,
    photoUrl:
      pickStr(
        playerObj,
        "photo",
        "photoUrl",
        "avatar",
        "image",
        "thumbnail_url",
        "photo_url",
      ) ?? null,
    teams: extractTeams(playerObj),
    recentMatches: extractMatchList(
      playerObj.recentMatches ??
        playerObj.lastMatches ??
        playerObj.playedMatches ??
        playerObj.recent_matches,
    ),
    upcomingMatches: extractMatchList(
      playerObj.upcomingMatches ??
        playerObj.nextMatches ??
        playerObj.fixtures ??
        playerObj.upcoming_matches,
    ),
  };
  void cacheSet(cacheKey, puppeteerProfile, PLAYER_PROFILE_TTL);
  return puppeteerProfile;
}
