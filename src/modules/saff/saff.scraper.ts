import axios from "axios";
import * as cheerio from "cheerio";
import * as iconv from "iconv-lite";
import { logger } from "@config/logger";
import { createBreaker, CircuitOpenError } from "@shared/utils/circuitBreaker";
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
const REQUEST_DELAY = 1500; // ms between requests to be respectful

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
    $en = await fetchPage(urlEn, "en");
  } catch {
    logger.warn(
      `[SAFF Scraper] EN page failed for saffId=${saffId}, falling back to root URL`,
    );
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

    if (i + BATCH_SIZE < saffTeamIds.length) {
      await delay(800);
    }
  }

  return logos;
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
      await delay(REQUEST_DELAY);
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

    if (i < saffIds.length - 1) {
      await delay(REQUEST_DELAY);
    }
  }

  return results;
}
