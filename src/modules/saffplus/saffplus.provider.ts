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
 * The Motto platform key: 5O1SNE9VGH62MA16F2G088VJSV33FLF6
 */

import axios from "axios";
import * as cheerio from "cheerio";
import { logger } from "@config/logger";
import type {
  SaffPlusCompetition,
  SaffPlusTeam,
  SaffPlusStanding,
  SaffPlusMatch,
} from "./saffplus.types";

const BASE_URL = "https://saffplus.sa";
const TIMEOUT = 15000;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// ── Page Fetching ──

async function fetchPage(path: string): Promise<string> {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await axios.get(url, {
      timeout: TIMEOUT,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en,ar;q=0.9",
      },
      maxRedirects: 3,
    });
    return typeof res.data === "string" ? res.data : JSON.stringify(res.data);
  } catch (err) {
    logger.warn(`[SAFF+] Failed to fetch ${url}: ${(err as Error).message}`);
    throw err;
  }
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
 */
export async function fetchCompetitions(): Promise<SaffPlusCompetition[]> {
  try {
    const html = await fetchPage("/competitions");
    const $ = cheerio.load(html);
    const competitions: SaffPlusCompetition[] = [];

    // SAFF+ renders competition cards with links to /competitions/{slug}
    $('a[href*="/competitions/"]').each((_, el) => {
      const href = $(el).attr("href") || "";
      const slug = href.replace("/competitions/", "").split("/")[0];
      if (!slug || slug === "competitions") return;

      const name =
        $(el).find("h3, h2, [class*=title]").first().text().trim() ||
        $(el).text().trim().split("\n")[0]?.trim();

      if (name && !competitions.find((c) => c.id === slug)) {
        competitions.push({
          id: slug,
          name: name || slug,
          season: "",
          type: "league",
        });
      }
    });

    // Also try to extract from RSC payload
    const rscChunks = extractRscData(html);
    for (const chunk of rscChunks) {
      // Look for competition-like objects in the serialized data
      const competitionMatches = chunk.matchAll(
        /"slug"\s*:\s*"([^"]+)"[^}]*?"name"\s*:\s*"([^"]+)"/g,
      );
      for (const m of competitionMatches) {
        const slug = m[1];
        const name = m[2];
        if (!competitions.find((c) => c.id === slug)) {
          competitions.push({ id: slug, name, season: "", type: "league" });
        }
      }
    }

    logger.info(`[SAFF+] Found ${competitions.length} competitions`);
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
 */
export async function fetchTeams(): Promise<SaffPlusTeam[]> {
  try {
    const html = await fetchPage("/clubs");
    const $ = cheerio.load(html);
    const teams: SaffPlusTeam[] = [];

    // Extract club cards
    $('a[href*="/clubs/"]').each((_, el) => {
      const href = $(el).attr("href") || "";
      const slug = href.replace("/clubs/", "").split("/")[0];
      if (!slug || slug === "clubs") return;

      const name =
        $(el).find("h3, h2, span, [class*=name]").first().text().trim() ||
        $(el).text().trim().split("\n")[0]?.trim();
      const logo = $(el).find("img").first().attr("src");

      if (name && !teams.find((t) => t.id === slug)) {
        teams.push({
          id: slug,
          name: name || slug,
          logo: logo || undefined,
        });
      }
    });

    // Also extract from RSC payload
    const rscChunks = extractRscData(html);
    for (const chunk of rscChunks) {
      const teamMatches = chunk.matchAll(
        /"slug"\s*:\s*"([^"]+)"[^}]*?"name"\s*:\s*"([^"]+)"/g,
      );
      for (const m of teamMatches) {
        if (!teams.find((t) => t.id === m[1])) {
          teams.push({ id: m[1], name: m[2] });
        }
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
 * Fetch standings — placeholder, requires competition detail page scraping.
 */
export async function fetchStandings(
  _competitionId: number | string,
  _season?: string,
): Promise<SaffPlusStanding[]> {
  // TODO: scrape /competitions/{slug} page for standings table
  return [];
}

// ── Rate-limit helper ──
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
 * 1. Fetch /competitions/{slug}/fixtures (upcoming) and /competitions/{slug}/results (completed).
 * 2. Try RSC flight payload extraction first.
 * 3. Fall back to HTML table scraping.
 * 4. Rate-limit: 1500 ms between requests.
 */
export async function fetchMatches(
  competitionSlug: number | string,
  _season?: string,
): Promise<SaffPlusMatch[]> {
  const slug = String(competitionSlug);
  const allMatches: SaffPlusMatch[] = [];
  const seen = new Set<string>();

  const paths = [
    `/en/competitions/${slug}/fixtures`,
    `/en/competitions/${slug}/results`,
    `/ar/competitions/${slug}/fixtures`,
  ];

  for (const path of paths) {
    try {
      const html = await fetchPage(path);
      await sleep(1500);

      const rscChunks = extractRscData(html);
      const fromRsc = extractMatchesFromRsc(rscChunks);

      if (fromRsc.length > 0) {
        for (const m of fromRsc) {
          if (!seen.has(String(m.id))) {
            seen.add(String(m.id));
            allMatches.push(m);
          }
        }
      } else {
        // RSC yielded nothing — try HTML table fallback
        const fromHtml = extractMatchesFromHtml(html, slug);
        for (const m of fromHtml) {
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
      // Throttle between retried paths
      await sleep(1500);
    }
  }

  logger.info(
    `[SAFF+] fetchMatches(${slug}): ${allMatches.length} fixtures found`,
  );
  return allMatches;
}
