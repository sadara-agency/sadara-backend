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

/**
 * Fetch matches — placeholder, requires competition detail page scraping.
 */
export async function fetchMatches(
  _competitionId: number | string,
  _season?: string,
): Promise<SaffPlusMatch[]> {
  // TODO: scrape /competitions/{slug}/fixtures page
  return [];
}
