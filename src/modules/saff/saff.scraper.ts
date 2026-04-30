import axios from "axios";
import * as cheerio from "cheerio";
import * as iconv from "iconv-lite";
import { logger } from "@config/logger";
import { env } from "@config/env";
import { createBreaker, CircuitOpenError } from "@shared/utils/circuitBreaker";
import { DomainRateLimiter } from "@shared/utils/rateLimiter";
import { assertSafeOutboundUrl } from "@shared/utils/safeOutboundUrl";

// SAFF scraper only ever talks to saff.com.sa — assert this on every fetch
// so a future code path can't accidentally feed an attacker-controlled URL
// through the scraper into the backend's network.
const SAFF_ALLOWED_HOSTS = ["www.saff.com.sa", "saff.com.sa"] as const;
import {
  scrapedStandingSchema,
  scrapedFixtureSchema,
  scrapedTeamSchema,
  type ScrapedStandingInput,
  type ScrapedFixtureInput,
  type ScrapedTeamInput,
} from "@modules/saff/saff.validation";
import {
  SELECTORS,
  SELECTOR_VERSION,
  STANDINGS_HEADER_LABELS,
  URL_PATTERNS,
  resolveStandingsColumnMap,
} from "@modules/saff/saff.selectors";

// /en/ subpath may 404 depending on SAFF server config — scrapeChampionship
// falls back to root URL if the English page fails.
const BASE_URL_EN = "https://www.saff.com.sa/en";
const BASE_URL_AR = "https://www.saff.com.sa";

// Per-domain rate limiter — interval is configurable via env so ops can tune
// without a code deploy. Default: 1500ms for saff.com.sa.
export const saffLimiter = new DomainRateLimiter(
  { "saff.com.sa": env.saff.requestDelayMs },
  env.saff.requestDelayMs,
);

// Standard browser UA — SAFF's WAF rejects non-browser User-Agents
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// ── Errors ──

/**
 * Thrown when the scraped HTML doesn't look like a SAFF tournament page.
 * Surfaces to the wizard as a red banner so the user sees the failure
 * instead of a silent zero-row result.
 */
export class ScraperShapeError extends Error {
  public readonly tournamentId: number;
  public readonly reason: string;
  public readonly scraperVersion: number;

  constructor(tournamentId: number, reason: string) {
    super(
      `[SAFF] Scraper shape error for tournament ${tournamentId}: ${reason}`,
    );
    this.name = "ScraperShapeError";
    this.tournamentId = tournamentId;
    this.reason = reason;
    this.scraperVersion = SELECTOR_VERSION;
  }
}

// ── Types ──

export type ScrapedStanding = ScrapedStandingInput;
export type ScrapedFixture = ScrapedFixtureInput;
export type ScrapedTeam = ScrapedTeamInput;

export interface ValidationWarning {
  entity: "standing" | "fixture" | "team";
  reason: string;
  raw: unknown;
}

export interface ScrapeResult {
  tournamentId: number;
  season: string;
  standings: ScrapedStanding[];
  fixtures: ScrapedFixture[];
  teams: ScrapedTeam[];
  /** Championship logo URL scraped from the page header. null if no
   * recognisable image was found — the scraper does not throw for this
   * since not every page has a logo. */
  tournamentLogoUrl: string | null;
  validationWarnings: ValidationWarning[];
  scraperVersion: number;
  scrapedAt: Date;
}

/**
 * Resolves Arabic team names from a warm cache (typically saff_team_maps).
 * Returned map: saffTeamId → teamNameAr. Missing entries trigger an AR-page
 * fetch as a fallback. Without a resolver, scrapeChampionship always fetches
 * the AR page (cold path).
 */
export interface ArNameResolver {
  lookupTeamNamesAr(saffTeamIds: number[]): Promise<Map<number, string>>;
}

/** Same shape, for the championships index (saffId → nameAr). */
export interface ArTournamentNameResolver {
  lookupTournamentNamesAr(saffIds: number[]): Promise<Map<number, string>>;
}

// ── Utility: Delay between requests ──

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Utility: Extract SAFF team ID from href ──

function extractTeamId(href: string | undefined): number {
  if (!href) return 0;
  const match = href.match(/id=(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

// ── Utility: Parse score string "2 - 3" → [2, 3] ──

function parseScore(scoreStr: string): [number | null, number | null] {
  const cleaned = scoreStr.replace(/\s/g, "");
  if (cleaned === "-" || cleaned === "vs" || !cleaned) return [null, null];
  const parts = cleaned.split("-");
  if (parts.length !== 2) return [null, null];
  const home = parseInt(parts[0], 10);
  const away = parseInt(parts[1], 10);
  return [isNaN(home) ? null : home, isNaN(away) ? null : away];
}

// ── Fetch page with proper encoding + retry + circuit breaker ──

const MAX_RETRIES = 2;
const RETRY_DELAY = 3000; // ms

// One breaker for the whole SAFF endpoint — when SAFF is down, every cron
// caller short-circuits instead of stacking up timeouts behind a dead host.
const saffBreaker = createBreaker({
  name: "saff",
  failureThreshold: 5,
  monitoringWindowMs: 30_000,
  resetTimeoutMs: 60_000,
});

export function getSaffBreakerState() {
  return saffBreaker.state;
}

export { CircuitOpenError };

async function fetchOnce(
  url: string,
  lang: "en" | "ar",
): Promise<cheerio.CheerioAPI> {
  assertSafeOutboundUrl(url, SAFF_ALLOWED_HOSTS);
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 30000,
    maxRedirects: 5,
    headers: {
      "User-Agent": BROWSER_UA,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": lang === "ar" ? "ar,en;q=0.5" : "en,ar;q=0.5",
      "Accept-Encoding": "gzip, deflate",
      Connection: "keep-alive",
      "Cache-Control": "no-cache",
      Referer: "https://www.saff.com.sa/",
    },
  });

  // SAFF uses windows-1256 encoding — decode properly
  const contentType = response.headers["content-type"] || "";
  const html = contentType.includes("1256")
    ? iconv.decode(Buffer.from(response.data), "windows-1256")
    : Buffer.from(response.data).toString("utf-8");

  return cheerio.load(html);
}

async function fetchPage(
  url: string,
  lang: "en" | "ar" = "en",
): Promise<cheerio.CheerioAPI> {
  return saffBreaker.run(async () => {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) await delay(RETRY_DELAY * attempt);
        return await fetchOnce(url, lang);
      } catch (err) {
        lastError = err as Error;
        if (attempt < MAX_RETRIES) {
          logger.warn(
            `[SAFF Scraper] Retry ${attempt + 1}/${MAX_RETRIES} for ${url}: ${(err as Error).message}`,
          );
        }
      }
    }
    throw lastError;
  });
}

// ══════════════════════════════════════════
// SCRAPE CHAMPIONSHIP PAGE
// ══════════════════════════════════════════

export async function scrapeChampionship(
  saffId: number,
  season: string,
  arResolver?: ArNameResolver,
): Promise<ScrapeResult> {
  const path = URL_PATTERNS.championship(saffId);
  const urlEn = `${BASE_URL_EN}/${path}`;
  const urlArFallback = `${BASE_URL_AR}/${path}`;

  // Fetch EN page with fallback to root URL if /en/ path 404s
  let $en: cheerio.CheerioAPI;
  try {
    await saffLimiter.acquire("saff.com.sa");
    $en = await fetchPage(urlEn, "en");
  } catch {
    logger.warn(
      `[SAFF Scraper] EN page failed for saffId=${saffId}, falling back to root URL`,
    );
    await saffLimiter.acquire("saff.com.sa");
    $en = await fetchPage(urlArFallback, "en");
  }

  // Scrape English data (primary)
  const rawStandingsEn = scrapeStandings($en);
  const rawFixturesEn = scrapeFixtures($en);
  const rawTeamsEn = extractTeams($en);

  // Collect every saffTeamId we saw — these are the IDs we need AR names for
  const allTeamIds = new Set<number>();
  for (const s of rawStandingsEn) allTeamIds.add(s.saffTeamId);
  for (const f of rawFixturesEn) {
    allTeamIds.add(f.saffHomeTeamId);
    allTeamIds.add(f.saffAwayTeamId);
  }
  for (const t of rawTeamsEn) allTeamIds.add(t.saffTeamId);

  // 1) Try the warm cache first (saff_team_maps via resolver)
  const arNameMap = arResolver
    ? await arResolver.lookupTeamNamesAr([...allTeamIds])
    : new Map<number, string>();

  // 2) Only fetch the AR page if some IDs are still unknown
  const missing = [...allTeamIds].filter((id) => !arNameMap.has(id));
  if (missing.length > 0) {
    try {
      await saffLimiter.acquire("saff.com.sa");
      const $ar = await fetchPage(urlArFallback, "ar");
      // Note: extractTeams/scrapeStandings parse the AR HTML — the
      // "teamNameEn" field on returned rows actually contains Arabic text
      // because we're reusing the EN-page parser on AR HTML.
      const arTeams = extractTeams($ar);
      for (const t of arTeams) {
        if (!arNameMap.has(t.saffTeamId) && t.teamNameEn) {
          arNameMap.set(t.saffTeamId, t.teamNameEn);
        }
      }
      const arStandings = scrapeStandings($ar);
      for (const s of arStandings) {
        if (!arNameMap.has(s.saffTeamId) && s.teamNameEn) {
          arNameMap.set(s.saffTeamId, s.teamNameEn);
        }
      }
    } catch (err) {
      logger.warn(
        `[SAFF Scraper] AR fallback fetch failed for saffId=${saffId}: ${
          (err as Error).message
        } — proceeding with partial AR names (warm-cache hits will still apply)`,
      );
      // Don't throw — partial bilingual data is better than none. The next
      // successful scrape (or a manual re-run) will fill the gaps.
    }
  }

  // 3) Merge AR names into the EN data, keyed on saffTeamId (stable)
  const mergedStandings = rawStandingsEn.map((s) => ({
    ...s,
    teamNameAr: arNameMap.get(s.saffTeamId) || "",
  }));

  const mergedFixtures = rawFixturesEn.map((f) => ({
    ...f,
    homeTeamNameAr: arNameMap.get(f.saffHomeTeamId) || "",
    awayTeamNameAr: arNameMap.get(f.saffAwayTeamId) || "",
  }));

  const mergedTeams = rawTeamsEn.map((t) => ({
    ...t,
    teamNameAr: arNameMap.get(t.saffTeamId) || "",
  }));

  // Validate every row with Zod and split valid/invalid
  const validationWarnings: ValidationWarning[] = [];
  const standings: ScrapedStanding[] = [];
  const fixtures: ScrapedFixture[] = [];
  const teams: ScrapedTeam[] = [];

  for (const row of mergedStandings) {
    const parsed = scrapedStandingSchema.safeParse(row);
    if (parsed.success) {
      standings.push(parsed.data);
    } else {
      validationWarnings.push({
        entity: "standing",
        reason: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
        raw: row,
      });
    }
  }

  for (const row of mergedFixtures) {
    const parsed = scrapedFixtureSchema.safeParse(row);
    if (parsed.success) {
      fixtures.push(parsed.data);
    } else {
      validationWarnings.push({
        entity: "fixture",
        reason: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
        raw: row,
      });
    }
  }

  for (const row of mergedTeams) {
    const parsed = scrapedTeamSchema.safeParse(row);
    if (parsed.success) {
      teams.push(parsed.data);
    } else {
      validationWarnings.push({
        entity: "team",
        reason: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
        raw: row,
      });
    }
  }

  // Shape assertion — empty result on a championship page means SAFF DOM
  // changed or the tournament has no data published. Either way the user
  // needs to know explicitly instead of seeing 0 rows in the wizard.
  if (standings.length === 0 && fixtures.length === 0 && teams.length === 0) {
    throw new ScraperShapeError(
      saffId,
      `No standings, fixtures, or teams parsed (${mergedStandings.length} raw standings, ${mergedFixtures.length} raw fixtures, ${mergedTeams.length} raw teams — all rejected by validation or selectors didn't match)`,
    );
  }

  // Extract tournament/championship logo from the EN page header.
  // Best-effort — null if no recognisable image is found.
  const tournamentLogoUrl = extractTournamentLogo($en);

  return {
    tournamentId: saffId,
    season,
    standings,
    fixtures,
    teams,
    tournamentLogoUrl,
    validationWarnings,
    scraperVersion: SELECTOR_VERSION,
    scrapedAt: new Date(),
  };
}

// ── Extract tournament/championship logo from the page ──
//
// SAFF's championship pages don't use a stable CSS class for the header
// image, so we walk a list of selectors in order of specificity and pick
// the first one that resolves to an http(s) URL. Returns null when nothing
// matches — calling code treats that as "logo unknown" and never fails.
function extractTournamentLogo($: cheerio.CheerioAPI): string | null {
  const candidates = $(SELECTORS.tournamentLogo);
  for (let i = 0; i < candidates.length; i++) {
    const src = $(candidates[i]).attr("src");
    if (!src) continue;
    // Skip team logos masquerading as headers — they live under team URLs.
    if (src.includes("saffteam")) continue;
    if (src.startsWith("http")) return src;
    const cleanPath = src.replace(/^(\.\.\/)+/, "").replace(/^\/+/, "");
    return `https://www.saff.com.sa/${cleanPath}`;
  }
  return null;
}

// ── Scrape standings table ──
//
// Returns "raw" rows that may not yet pass Zod validation — merging with
// the Arabic page happens before schema enforcement in scrapeChampionship().
type RawStanding = Omit<ScrapedStanding, "teamNameAr"> & {
  teamNameAr: string;
};

function scrapeStandings($: cheerio.CheerioAPI): RawStanding[] {
  const standings: RawStanding[] = [];

  $(SELECTORS.table).each((_, table) => {
    const headers = $(table)
      .find(SELECTORS.tableHeader)
      .map((_, th) => $(th).text().trim())
      .get();

    const { idx, missing } = resolveStandingsColumnMap(
      headers,
      STANDINGS_HEADER_LABELS,
    );

    // If the table is missing the two anchor columns (P + Pts) it's not a
    // standings table — skip silently so other tables on the page can be
    // examined.
    if (missing.includes("p") || missing.includes("pts")) return;

    let rowNum = 0;

    $(table)
      .find(SELECTORS.tableBodyRow)
      .each((_, row) => {
        const cells = $(row).find(SELECTORS.tableCell);
        if (cells.length < 8) return;

        const teamLink = $(row).find(SELECTORS.teamLink);
        if (!teamLink.length) return;

        const saffTeamId = extractTeamId(teamLink.attr("href"));
        const teamNameEn = teamLink.text().trim();
        if (!saffTeamId || !teamNameEn) return;

        rowNum++;

        const cellInt = (i: number): number => {
          if (i < 0 || i >= cells.length) return 0;
          const text = $(cells[i]).text().trim().replace(/\+/, "");
          const n = parseInt(text, 10);
          return isNaN(n) ? 0 : n;
        };

        const firstCellText = $(cells[0]).text().trim().replace(/[^\d]/g, "");
        const position = parseInt(firstCellText, 10) || rowNum;

        const played = cellInt(idx.p);
        const won = cellInt(idx.w);
        const drawn = cellInt(idx.d);
        const lost = cellInt(idx.l);
        const goalsFor = cellInt(idx.gf);
        const goalsAgainst = cellInt(idx.ga);
        const points = cellInt(idx.pts);

        let goalDifference = 0;
        if (idx.gd >= 0) {
          const gdText = $(cells[idx.gd]).text().trim();
          goalDifference = parseInt(gdText.replace(/\+/, ""), 10);
          if (isNaN(goalDifference)) goalDifference = goalsFor - goalsAgainst;
        } else {
          goalDifference = goalsFor - goalsAgainst;
        }

        if (played > 0 || points > 0) {
          standings.push({
            position,
            saffTeamId,
            teamNameEn,
            teamNameAr: "",
            played,
            won,
            drawn,
            lost,
            goalsFor,
            goalsAgainst,
            goalDifference,
            points,
          });
        }
      });
  });

  return standings.sort((a, b) => a.position - b.position);
}

// ── Scrape fixtures ──

type RawFixture = ScrapedFixture;

function scrapeFixtures($: cheerio.CheerioAPI): RawFixture[] {
  const fixtures: RawFixture[] = [];

  $(SELECTORS.table).each((_, table) => {
    const rows = $(table).find("tr");

    let currentDate = "";

    rows.each((_, row) => {
      const cells = $(row).find(SELECTORS.tableCell);

      const dateLink = $(row).find(SELECTORS.fixtureDateLink);
      if (dateLink.length) {
        const href = dateLink.attr("href") || "";
        const dateMatch = href.match(/calendar_date=(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) currentDate = dateMatch[1];
      }

      const teamLinks = $(row).find(SELECTORS.teamLink);
      if (teamLinks.length >= 2 && currentDate) {
        const homeLink = teamLinks.eq(0);
        const awayLink = teamLinks.eq(1);

        const homeId = extractTeamId(homeLink.attr("href"));
        const awayId = extractTeamId(awayLink.attr("href"));
        const homeName = homeLink.text().trim();
        const awayName = awayLink.text().trim();

        let time = "";
        let homeScore: number | null = null;
        let awayScore: number | null = null;

        cells.each((_, cell) => {
          const text = $(cell).text().trim();
          if (/^\d{1,2}:\d{2}$/.test(text)) {
            time = text;
          }
          if (/^\d+\s*-\s*\d+$/.test(text)) {
            [homeScore, awayScore] = parseScore(text);
          }
        });

        let stadium = "";
        let city = "";
        const lastCell = cells.last().text().trim();
        if (lastCell && !lastCell.match(/^\d/) && lastCell !== "-") {
          const stadiumMatch = lastCell.match(/^(.+?)\s*\((.+?)\)\s*$/);
          if (stadiumMatch) {
            stadium = stadiumMatch[1].trim();
            city = stadiumMatch[2].trim();
          } else {
            stadium = lastCell;
          }
        }

        if (homeId && awayId) {
          fixtures.push({
            date: currentDate,
            time,
            saffHomeTeamId: homeId,
            homeTeamNameEn: homeName,
            homeTeamNameAr: "",
            saffAwayTeamId: awayId,
            awayTeamNameEn: awayName,
            awayTeamNameAr: "",
            homeScore,
            awayScore,
            stadium,
            city,
          });
        }
      }
    });
  });

  // Deduplicate (page sometimes renders mobile + desktop tables)
  const seen = new Set<string>();
  return fixtures.filter((f) => {
    const key = `${f.date}-${f.saffHomeTeamId}-${f.saffAwayTeamId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Extract unique teams from page ──

function extractTeams($: cheerio.CheerioAPI): ScrapedTeam[] {
  const teamMap = new Map<number, string>();

  $(SELECTORS.teamLink).each((_, el) => {
    const href = $(el).attr("href") || "";
    const id = extractTeamId(href);
    const name = $(el).text().trim();
    if (id && name && !teamMap.has(id)) {
      teamMap.set(id, name);
    }
  });

  return Array.from(teamMap.entries()).map(([saffTeamId, teamNameEn]) => ({
    saffTeamId,
    teamNameEn,
    teamNameAr: "",
  }));
}

// ══════════════════════════════════════════
// SCRAPE TEAM LOGO
// ══════════════════════════════════════════

export async function scrapeTeamLogo(
  saffTeamId: number,
): Promise<string | null> {
  try {
    await saffLimiter.acquire("saff.com.sa");
    const url = `${BASE_URL_EN}/${URL_PATTERNS.team(saffTeamId)}`;
    const $ = await fetchPage(url, "en");

    let logoImg = $(SELECTORS.logoLarge).first();
    if (!logoImg.length) logoImg = $(SELECTORS.logoSmall).first();
    if (!logoImg.length) logoImg = $(SELECTORS.logoFallback).first();

    let src = logoImg.attr("src");
    if (!src) return null;

    if (!src.startsWith("http")) {
      const cleanPath = src.replace(/^(\.\.\/)+/, "");
      src = `https://www.saff.com.sa/${cleanPath}`;
    }
    return src;
  } catch {
    return null;
  }
}

// ── Batch scrape logos for multiple teams ──

export async function scrapeTeamLogos(
  saffTeamIds: number[],
): Promise<Map<number, string>> {
  const logos = new Map<number, string>();
  const BATCH_SIZE = 5;

  for (let i = 0; i < saffTeamIds.length; i += BATCH_SIZE) {
    const batch = saffTeamIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (id) => {
        const logo = await scrapeTeamLogo(id);
        return { id, logo };
      }),
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value.logo) {
        logos.set(r.value.id, r.value.logo);
      } else if (r.status === "rejected") {
        const msg =
          r.reason instanceof Error ? r.reason.message : String(r.reason);
        logger.warn(`[SAFF Scraper] Failed to fetch logo: ${msg}`);
      }
    }
  }

  return logos;
}

// ══════════════════════════════════════════
// SCRAPE TEAM ROSTER (team.php?id=N)
// ══════════════════════════════════════════

export interface ScrapedRosterPlayer {
  /** saffPlayerId extracted from player.php?id=N href — null when no link present */
  saffPlayerId: number | null;
  nameEn: string;
  /** Empty string when the AR page wasn't fetched */
  nameAr: string;
  jerseyNumber: number | null;
  position: string | null;
  nationality: string | null;
  /** Raw table row text for debugging */
  rawRow: string;
}

/**
 * Scrape the squad roster from team.php?id=N.
 *
 * SAFF renders each player as a table row. Columns vary by page but the
 * most common layout is: jersey | name | position | nationality. We detect
 * the header row to build a column map rather than relying on fixed offsets.
 *
 * Falls back to scanning anchor tags with player.php?id=N hrefs when the
 * table parse yields nothing — some team pages don't use a table at all.
 */
export async function scrapeTeamRoster(
  saffTeamId: number,
): Promise<ScrapedRosterPlayer[]> {
  await saffLimiter.acquire("saff.com.sa");
  const url = `${BASE_URL_EN}/${URL_PATTERNS.team(saffTeamId)}`;
  let $: cheerio.CheerioAPI;
  try {
    $ = await fetchPage(url, "en");
  } catch (err) {
    logger.warn(
      `[SAFF Scraper] Team ${saffTeamId} page failed: ${(err as Error).message}`,
    );
    return [];
  }

  const players: ScrapedRosterPlayer[] = [];

  // ── Primary: table-based roster ──
  $(SELECTORS.rosterTable).each((_, table) => {
    const rows = $(table).find(SELECTORS.rosterRow);
    if (rows.length === 0) return;

    // Detect header row to map column positions
    const headerRow = $(table).find("thead tr, tr:first-child");
    const headers: string[] = [];
    headerRow.find("th, td").each((_, cell) => {
      headers.push($(cell).text().trim().toLowerCase());
    });

    // Heuristic: skip tables that don't look like a player list
    const looksLikeRoster =
      headers.some((h) => /name|player|لاعب/i.test(h)) || rows.length >= 5;
    if (!looksLikeRoster) return;

    // Column index detection (fall back to 0-based if headers are absent)
    const nameIdx = headers.findIndex((h) => /name|player|لاعب/i.test(h));
    const posIdx = headers.findIndex((h) => /pos|position|مركز/i.test(h));
    const natIdx = headers.findIndex((h) => /nat|country|جنسية/i.test(h));
    const numIdx = headers.findIndex((h) => /^#|num|shirt|رقم/i.test(h));

    rows.each((_, row) => {
      const cells = $(row).find(SELECTORS.rosterCell);
      if (cells.length === 0) return;

      const cell = (i: number) =>
        i >= 0 && i < cells.length ? $(cells[i]).text().trim() : "";

      // Name: prefer the detected column; fall back to first non-numeric cell
      let nameEn =
        nameIdx >= 0
          ? cell(nameIdx)
          : (cells
              .toArray()
              .map((c) => $(c).text().trim())
              .find((t) => t && !/^\d+$/.test(t)) ?? "");

      nameEn = nameEn.replace(/\s+/g, " ").trim();
      if (!nameEn) return;

      // saffPlayerId from anchor href
      const playerAnchor = $(row).find(SELECTORS.playerLink).first();
      const hrefMatch = playerAnchor.attr("href")?.match(/id=(\d+)/);
      const saffPlayerId = hrefMatch ? parseInt(hrefMatch[1], 10) : null;

      const numRaw = numIdx >= 0 ? cell(numIdx) : "";
      const jerseyNumber = numRaw ? parseInt(numRaw, 10) || null : null;
      const position = posIdx >= 0 ? cell(posIdx) || null : null;
      const nationality = natIdx >= 0 ? cell(natIdx) || null : null;

      if (
        !players.find((p) => p.saffPlayerId && p.saffPlayerId === saffPlayerId)
      ) {
        players.push({
          saffPlayerId,
          nameEn,
          nameAr: "",
          jerseyNumber,
          position,
          nationality,
          rawRow: $(row).text().replace(/\s+/g, " ").trim(),
        });
      }
    });

    // Stop after the first table that yielded players
    if (players.length > 0) return false;
  });

  // ── Fallback: anchor scan ──
  if (players.length === 0) {
    $(SELECTORS.playerLink).each((_, el) => {
      const href = $(el).attr("href") || "";
      const hrefMatch = href.match(/id=(\d+)/);
      const saffPlayerId = hrefMatch ? parseInt(hrefMatch[1], 10) : null;
      const nameEn = $(el).text().trim();
      if (!nameEn) return;
      if (
        !players.find((p) => p.saffPlayerId && p.saffPlayerId === saffPlayerId)
      ) {
        players.push({
          saffPlayerId,
          nameEn,
          nameAr: "",
          jerseyNumber: null,
          position: null,
          nationality: null,
          rawRow: nameEn,
        });
      }
    });
  }

  logger.info(
    `[SAFF Scraper] Team ${saffTeamId} roster: ${players.length} players`,
  );
  return players;
}

// ══════════════════════════════════════════
// SCRAPE SPECIFIC WEEK (placeholder)
// ══════════════════════════════════════════

export async function scrapeWeek(
  saffId: number,
  season: string,
  _week: number,
  arResolver?: ArNameResolver,
): Promise<ScrapedFixture[]> {
  const result = await scrapeChampionship(saffId, season, arResolver);
  return result.fixtures;
}

export async function scrapeAllWeeks(
  saffId: number,
  season: string,
  totalWeeks: number = 34,
  arResolver?: ArNameResolver,
): Promise<ScrapedFixture[]> {
  logger.info(
    `[SAFF Scraper] Scraping all ${totalWeeks} weeks for championship ${saffId}`,
  );
  const result = await scrapeChampionship(saffId, season, arResolver);
  return result.fixtures;
}

// ══════════════════════════════════════════
// DISCOVER TOURNAMENT LIST FROM SAFF SITE
// ══════════════════════════════════════════

export interface ScrapedTournamentMeta {
  saffId: number;
  name: string;
  nameAr: string;
}

export async function scrapeTournamentList(
  arResolver?: ArTournamentNameResolver,
): Promise<ScrapedTournamentMeta[]> {
  const results = new Map<number, ScrapedTournamentMeta>();

  // 1) EN page (primary — gives us the saffId list and English names)
  try {
    await saffLimiter.acquire("saff.com.sa");
    const $en = await fetchPage(
      `${BASE_URL_EN}/${URL_PATTERNS.championships}`,
      "en",
    );
    $en(SELECTORS.tournamentLink).each((_, el) => {
      const href = $en(el).attr("href") || "";
      const match = href.match(/championship\.php\?id=(\d+)/);
      const id = match ? parseInt(match[1], 10) : 0;
      const name = $en(el).text().trim();
      if (id && name) {
        results.set(id, { saffId: id, name, nameAr: "" });
      }
    });
    logger.info(
      `[SAFF Scraper] Tournament list EN: found ${results.size} entries`,
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`[SAFF Scraper] EN tournament list failed: ${msg}`);
  }

  const allIds = [...results.keys()];

  // 2) Warm cache: ask the resolver (saff_tournaments.name_ar) for AR names
  let arNames = new Map<number, string>();
  if (arResolver && allIds.length > 0) {
    try {
      arNames = await arResolver.lookupTournamentNamesAr(allIds);
      for (const [id, nameAr] of arNames) {
        const existing = results.get(id);
        if (existing && nameAr) existing.nameAr = nameAr;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(
        `[SAFF Scraper] Tournament AR resolver failed (continuing to AR scrape): ${msg}`,
      );
    }
  }

  // 3) AR page only if (a) we discovered IDs without AR names from cache, OR
  //    (b) no resolver was provided (cold path). The AR scrape can also
  //    surface tournaments that didn't appear on the EN index.
  const needAr =
    allIds.length === 0 || [...results.values()].some((t) => !t.nameAr);

  if (needAr) {
    try {
      await saffLimiter.acquire("saff.com.sa");
      const $ar = await fetchPage(
        `${BASE_URL_AR}/${URL_PATTERNS.championships}`,
        "ar",
      );
      $ar(SELECTORS.tournamentLink).each((_, el) => {
        const href = $ar(el).attr("href") || "";
        const match = href.match(/championship\.php\?id=(\d+)/);
        const id = match ? parseInt(match[1], 10) : 0;
        const nameAr = $ar(el).text().trim();
        if (!id || !nameAr) return;
        const existing = results.get(id);
        if (existing) {
          if (!existing.nameAr) existing.nameAr = nameAr;
        } else {
          results.set(id, { saffId: id, name: nameAr, nameAr });
        }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`[SAFF Scraper] AR tournament list failed: ${msg}`);
    }
  }

  return Array.from(results.values()).filter((t) => t.name);
}

// ══════════════════════════════════════════
// BATCH SCRAPE MULTIPLE TOURNAMENTS
// ══════════════════════════════════════════

export async function scrapeBatch(
  saffIds: number[],
  season: string,
  onProgress?: (current: number, total: number, name: string) => void,
  arResolver?: ArNameResolver,
): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = [];

  for (let i = 0; i < saffIds.length; i++) {
    const saffId = saffIds[i];

    try {
      if (onProgress)
        onProgress(i + 1, saffIds.length, `Championship #${saffId}`);

      const result = await scrapeChampionship(saffId, season, arResolver);
      results.push(result);

      logger.info(
        `[SAFF Scraper] ✓ #${saffId}: ${result.standings.length} standings, ` +
          `${result.fixtures.length} fixtures, ${result.teams.length} teams ` +
          `(v${result.scraperVersion}, ${result.validationWarnings.length} warnings)`,
      );
    } catch (error: any) {
      logger.error(`[SAFF Scraper] ✗ #${saffId}: ${error.message}`);
      results.push({
        tournamentId: saffId,
        season,
        standings: [],
        fixtures: [],
        teams: [],
        tournamentLogoUrl: null,
        validationWarnings: [
          {
            entity: "standing",
            reason: error.message,
            raw: { saffId, circuitOpen: error instanceof CircuitOpenError },
          },
        ],
        scraperVersion: SELECTOR_VERSION,
        scrapedAt: new Date(),
      });

      // Circuit open: SAFF is down. Stop the batch — every remaining call
      // will short-circuit anyway, and a 50-tournament loop racing against a
      // dead host wastes ~75 seconds of inter-request delays.
      if (error instanceof CircuitOpenError) {
        logger.warn(
          `[SAFF Scraper] Aborting batch — circuit breaker open after #${saffId}`,
        );
        break;
      }
    }
  }

  return results;
}

// ══════════════════════════════════════════
// NATIONAL TEAMS
// ══════════════════════════════════════════

export interface ScrapedNationalTeam {
  saffId: number;
  nameEn: string;
  nameAr: string;
  /** "senior" | "u23" | "u20" | "u17" | "u15" | "women" | "futsal" | "beach" | "other" */
  ageGroup: string;
  gender: "men" | "women";
  logoUrl: string | null;
}

export interface ScrapedNationalRosterPlayer {
  saffPlayerId: number | null;
  nameEn: string;
  nameAr: string;
  jerseyNumber: number | null;
  position: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
}

function inferAgeGroup(name: string): {
  ageGroup: string;
  gender: "men" | "women";
} {
  const n = name.toLowerCase();
  if (/women|female|سيدات/.test(n))
    return { ageGroup: "senior", gender: "women" };
  if (/u-?23|تحت 23/.test(n)) return { ageGroup: "u23", gender: "men" };
  if (/u-?20|تحت 20/.test(n)) return { ageGroup: "u20", gender: "men" };
  if (/u-?17|تحت 17/.test(n)) return { ageGroup: "u17", gender: "men" };
  if (/u-?15|تحت 15/.test(n)) return { ageGroup: "u15", gender: "men" };
  if (/futsal|صالات/.test(n)) return { ageGroup: "futsal", gender: "men" };
  if (/beach|شاطئ/.test(n)) return { ageGroup: "beach", gender: "men" };
  return { ageGroup: "senior", gender: "men" };
}

/**
 * Scrape the national teams index — returns all national team entries with
 * their SAFF IDs, names, and inferred metadata.
 */
export async function scrapeNationalTeamList(): Promise<ScrapedNationalTeam[]> {
  const teams: ScrapedNationalTeam[] = [];

  async function scrapeIndex(
    lang: "en" | "ar",
  ): Promise<Map<number, { name: string; logoUrl: string | null }>> {
    const base = lang === "en" ? BASE_URL_EN : BASE_URL_AR;
    const url = `${base}/${URL_PATTERNS.nationalTeams}`;
    const map = new Map<number, { name: string; logoUrl: string | null }>();
    try {
      await saffLimiter.acquire("saff.com.sa");
      const $ = await fetchPage(url, lang);
      $(`a[href*="nationalteams.php?id="]`).each((_, el) => {
        const href = $(el).attr("href") || "";
        const match = href.match(/id=(\d+)/);
        if (!match) return;
        const id = parseInt(match[1], 10);
        const name =
          $(el).text().trim() || $(el).find("img").attr("alt")?.trim() || "";
        if (!id || !name) return;
        const imgEl = $(el).find("img").first();
        let logoUrl: string | null = imgEl.attr("src") ?? null;
        if (logoUrl && !logoUrl.startsWith("http")) {
          logoUrl = `https://www.saff.com.sa/${logoUrl.replace(/^(\.\.\/)+/, "")}`;
        }
        if (!map.has(id)) map.set(id, { name, logoUrl });
      });
    } catch (err) {
      logger.warn(
        `[SAFF Scraper] national teams index (${lang}) failed: ${(err as Error).message}`,
      );
    }
    return map;
  }

  const enMap = await scrapeIndex("en");
  const arMap = await scrapeIndex("ar");

  const allIds = new Set([...enMap.keys(), ...arMap.keys()]);
  for (const id of allIds) {
    const en = enMap.get(id);
    const ar = arMap.get(id);
    const nameEn = en?.name || ar?.name || "";
    const nameAr = ar?.name || en?.name || "";
    const { ageGroup, gender } = inferAgeGroup(nameEn || nameAr);
    teams.push({
      saffId: id,
      nameEn,
      nameAr,
      ageGroup,
      gender,
      logoUrl: en?.logoUrl ?? ar?.logoUrl ?? null,
    });
  }

  logger.info(`[SAFF Scraper] National teams: found ${teams.length}`);
  return teams;
}

/**
 * Scrape the squad roster for a national team (nationalteams.php?id=N).
 * Reuses the same table-parsing logic as scrapeTeamRoster but also attempts
 * to extract DOB from an extra column when present.
 */
export async function scrapeNationalTeamRoster(
  saffId: number,
): Promise<ScrapedNationalRosterPlayer[]> {
  const players: ScrapedNationalRosterPlayer[] = [];

  async function scrapePage(
    lang: "en" | "ar",
  ): Promise<Map<number | string, Partial<ScrapedNationalRosterPlayer>>> {
    const base = lang === "en" ? BASE_URL_EN : BASE_URL_AR;
    const url = `${base}/${URL_PATTERNS.nationalTeam(saffId)}`;
    const map = new Map<
      number | string,
      Partial<ScrapedNationalRosterPlayer>
    >();
    try {
      await saffLimiter.acquire("saff.com.sa");
      const $ = await fetchPage(url, lang);

      $(SELECTORS.rosterTable).each((_, table) => {
        const headerRow = $(table).find("thead tr, tr:first-child");
        const headers: string[] = [];
        headerRow.find("th, td").each((_, cell) => {
          headers.push($(cell).text().trim().toLowerCase());
        });

        const nameIdx = Math.max(
          headers.findIndex((h) => /name|player|لاعب/i.test(h)),
          0,
        );
        const posIdx = headers.findIndex((h) => /pos|position|مركز/i.test(h));
        const natIdx = headers.findIndex((h) => /nat|country|جنسية/i.test(h));
        const numIdx = headers.findIndex((h) => /^#|num|shirt|رقم/i.test(h));
        const dobIdx = headers.findIndex((h) =>
          /dob|birth|born|تاريخ/i.test(h),
        );

        $(table)
          .find(SELECTORS.rosterRow)
          .each((_, row) => {
            const cells = $(row).find(SELECTORS.rosterCell);
            if (cells.length === 0) return;

            const cell = (i: number) =>
              i >= 0 && i < cells.length ? $(cells[i]).text().trim() : "";

            const nameRaw = cell(nameIdx);
            if (!nameRaw || /^\d+$/.test(nameRaw)) return;

            const anchor = $(row).find(SELECTORS.playerLink).first();
            const hrefMatch = anchor.attr("href")?.match(/id=(\d+)/);
            const saffPlayerId = hrefMatch ? parseInt(hrefMatch[1], 10) : null;

            const key = saffPlayerId ?? nameRaw;
            const jerseyNumber =
              numIdx >= 0 ? parseInt(cell(numIdx), 10) || null : null;
            const position = posIdx >= 0 ? cell(posIdx) || null : null;
            const nationality = natIdx >= 0 ? cell(natIdx) || null : null;
            const dobRaw = dobIdx >= 0 ? cell(dobIdx) : null;
            // Attempt to normalise DOB to YYYY-MM-DD
            let dateOfBirth: string | null = null;
            if (dobRaw) {
              const isoMatch = dobRaw.match(/(\d{4}[-/]\d{2}[-/]\d{2})/);
              const dmyMatch = dobRaw.match(
                /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/,
              );
              if (isoMatch) dateOfBirth = isoMatch[1].replace(/\//g, "-");
              else if (dmyMatch)
                dateOfBirth = `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
            }

            if (!map.has(key)) {
              map.set(key, {
                saffPlayerId,
                [lang === "en" ? "nameEn" : "nameAr"]: nameRaw,
                jerseyNumber,
                position,
                nationality,
                dateOfBirth,
              });
            } else {
              const existing = map.get(key)!;
              if (lang === "ar" && !existing.nameAr) existing.nameAr = nameRaw;
              if (lang === "en" && !existing.nameEn) existing.nameEn = nameRaw;
            }
          });

        if (map.size > 0) return false; // stop after first valid table
      });
    } catch (err) {
      logger.warn(
        `[SAFF Scraper] National team ${saffId} (${lang}) failed: ${(err as Error).message}`,
      );
    }
    return map;
  }

  const enMap = await scrapePage("en");
  const arMap = await scrapePage("ar");

  // Merge EN + AR maps
  const merged = new Map<number | string, ScrapedNationalRosterPlayer>();
  for (const [key, en] of enMap) {
    const ar = arMap.get(key);
    merged.set(key, {
      saffPlayerId: en.saffPlayerId ?? ar?.saffPlayerId ?? null,
      nameEn: en.nameEn ?? ar?.nameEn ?? "",
      nameAr: ar?.nameAr ?? en.nameAr ?? "",
      jerseyNumber: en.jerseyNumber ?? ar?.jerseyNumber ?? null,
      position: en.position ?? ar?.position ?? null,
      nationality: en.nationality ?? ar?.nationality ?? null,
      dateOfBirth: en.dateOfBirth ?? ar?.dateOfBirth ?? null,
    });
  }
  for (const [key, ar] of arMap) {
    if (!merged.has(key)) {
      merged.set(key, {
        saffPlayerId: ar.saffPlayerId ?? null,
        nameEn: ar.nameEn ?? "",
        nameAr: ar.nameAr ?? "",
        jerseyNumber: ar.jerseyNumber ?? null,
        position: ar.position ?? null,
        nationality: ar.nationality ?? null,
        dateOfBirth: ar.dateOfBirth ?? null,
      });
    }
  }

  for (const p of merged.values()) {
    if (p.nameEn || p.nameAr) players.push(p as ScrapedNationalRosterPlayer);
  }

  logger.info(
    `[SAFF Scraper] National team ${saffId} roster: ${players.length} players`,
  );
  return players;
}
