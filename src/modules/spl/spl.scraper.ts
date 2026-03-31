// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.scraper.ts
// Scrapes player profiles from spl.com.sa (server-rendered HTML).
// Rate limit: 1.5s between requests.
// ─────────────────────────────────────────────────────────────

import axios from "axios";
import * as cheerio from "cheerio";
import { logger } from "@config/logger";
import {
  ScrapedPlayerBio,
  ScrapedSeasonStats,
  ScrapedCareerEntry,
  ScrapedPlayerFull,
} from "@modules/spl/spl.types";

const SPL_BASE = "https://www.spl.com.sa";
const REQUEST_DELAY = 1500;
const REQUEST_TIMEOUT = 15000;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sanitize = (t: string) => t.replace(/\s+/g, " ").trim();

function parseHeight(raw: string | null): number | null {
  if (!raw) return null;
  const m = raw.match(/([\d.]+)\s*m/i);
  if (m) {
    const v = parseFloat(m[1]);
    return v < 3 ? Math.round(v * 100) : Math.round(v);
  }
  const cm = raw.match(/(\d{2,3})\s*cm/i);
  if (cm) return parseInt(cm[1], 10);
  const n = raw.match(/([\d.]+)/);
  if (n) {
    const v = parseFloat(n[1]);
    return v < 3 ? Math.round(v * 100) : Math.round(v);
  }
  return null;
}

function parseDateOfBirth(raw: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
}

function extractPulseLiveId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/\/p(\d+)\./);
  return m ? `p${m[1]}` : null;
}

function extractSplId(url: string): { id: string; slug: string } | null {
  const m = url.match(/\/players\/(\d+)\/([a-z0-9-]+)/i);
  return m ? { id: m[1], slug: m[2] } : null;
}

// ══════════════════════════════════════════
// SCRAPE SINGLE PLAYER
// ══════════════════════════════════════════

export async function scrapePlayerProfile(
  splPlayerId: string,
  slug = "player",
): Promise<ScrapedPlayerFull | null> {
  const url = `${SPL_BASE}/en/players/${splPlayerId}/${slug}`;
  try {
    const { data: html } = await axios.get(url, {
      timeout: REQUEST_TIMEOUT,
      headers: {
        "User-Agent": "Sadara-Sports-Platform/1.0 (data-sync)",
        Accept: "text/html",
        "Accept-Language": "en",
      },
    });
    const $ = cheerio.load(html);
    const bio = extractBio($, splPlayerId, slug);
    if (!bio.fullName) {
      logger.warn(`[SPL] No name for ${splPlayerId}`);
      return null;
    }
    return {
      bio,
      currentSeasonStats: extractStats($),
      careerHistory: extractCareer($),
      scrapedAt: new Date(),
    };
  } catch (err: any) {
    if (err.response?.status === 404) {
      logger.warn(`[SPL] 404 for ${splPlayerId}`);
      return null;
    }
    throw err;
  }
}

// ── Bio extraction ──

function extractBio(
  $: cheerio.CheerioAPI,
  splPlayerId: string,
  slug: string,
): ScrapedPlayerBio {
  const fullName = sanitize(
    $("h1").first().text() ||
      $('[class*="player-name"], [class*="playerName"]').first().text() ||
      $("title")
        .text()
        .replace(/\s*[|–-].*$/, ""),
  );

  const jerseyText = $('[class*="jersey"], [class*="number"], [class*="shirt"]')
    .first()
    .text()
    .trim();
  const jerseyNumber = jerseyText
    ? parseInt(jerseyText.replace(/\D/g, ""), 10) || null
    : null;

  const info = new Map<string, string>();
  $(
    '[class*="info"] li, [class*="detail"] li, [class*="meta"] li, dl dt, table.info tr',
  ).each((_, el) => {
    const label = sanitize(
      $(el).find('dt, th, label, [class*="label"], span:first-child').text(),
    ).toLowerCase();
    const value = sanitize(
      $(el).find('dd, td, [class*="value"], span:last-child').text(),
    );
    if (label && value && label !== value) info.set(label, value);
  });

  let photoUrl: string | null = null;
  $(
    'img[src*="pulselive"], img[src*="headshot"], img[class*="player-image"]',
  ).each((_, img) => {
    const src = $(img).attr("src") || $(img).attr("data-src");
    if (src && (src.includes("headshot") || src.includes("player")))
      photoUrl = src.startsWith("http")
        ? src
        : `https://static-files.saudi-pro-league.pulselive.com${src}`;
  });

  if (!photoUrl) {
    logger.debug(
      `[SPL Scraper] No photo URL found for SPL#${splPlayerId} (${sanitize($("h1").first().text() || "unknown")})`,
    );
  } else if (!extractPulseLiveId(photoUrl)) {
    logger.debug(
      `[SPL Scraper] Photo URL found but no PulseLive ID extracted for SPL#${splPlayerId}: ${photoUrl}`,
    );
  }

  let splTeamId: string | null = null;
  $('a[href*="/en/teams/"]').each((_, el) => {
    const m = ($(el).attr("href") || "").match(/\/teams\/(\d+)/);
    if (m) splTeamId = m[1];
  });

  return {
    splPlayerId,
    slug,
    fullName,
    jerseyNumber,
    nationality: info.get("nationality") || null,
    position: info.get("position") || null,
    dateOfBirth: parseDateOfBirth(
      info.get("date of birth") || info.get("born") || null,
    ),
    heightCm: parseHeight(info.get("height") || null),
    photoUrl,
    pulseLiveId: extractPulseLiveId(photoUrl),
    clubName: info.get("club") || info.get("team") || null,
    splTeamId,
  };
}

// ── Season stats extraction ──

function extractStats($: cheerio.CheerioAPI): ScrapedSeasonStats | null {
  const map = new Map<string, number>();

  $('[class*="stat"] [class*="label"], [class*="stat"] dt').each((_, el) => {
    const l = sanitize($(el).text()).toLowerCase();
    const v = parseInt($(el).next().text().trim(), 10);
    if (!isNaN(v)) map.set(l, v);
  });
  $("table").each((_, table) => {
    $(table)
      .find("tr")
      .each((_, row) => {
        const cells = $(row).find("td, th");
        if (cells.length >= 2) {
          const l = sanitize(cells.eq(0).text()).toLowerCase();
          const v = parseInt(cells.eq(-1).text().trim(), 10);
          if (!isNaN(v)) map.set(l, v);
        }
      });
  });
  if (map.size === 0) return null;

  const get = (...keys: string[]) => {
    for (const k of keys) if (map.has(k)) return map.get(k)!;
    return 0;
  };
  return {
    season: "2025/26",
    appearances: get("appearances", "apps", "matches", "games played"),
    substitutions: get("substitutions", "subs", "sub appearances"),
    goals: get("goals", "goals scored"),
    assists: get("assists"),
    yellowCards: get("yellow cards", "yellows", "yellow"),
    redCards: get("red cards", "reds", "red"),
  };
}

// ── Career history extraction ──

function extractCareer($: cheerio.CheerioAPI): ScrapedCareerEntry[] {
  const entries: ScrapedCareerEntry[] = [];
  $("table").each((_, table) => {
    const hdrs = $(table)
      .find("th")
      .map((_, th) => sanitize($(th).text()).toLowerCase())
      .get();
    const si = hdrs.findIndex(
      (h) => h.includes("season") || h.includes("year"),
    );
    const ci = hdrs.findIndex((h) => h.includes("club") || h.includes("team"));
    if (si < 0 || ci < 0) return;
    const ai = hdrs.findIndex((h) => h.includes("app") || h.includes("match"));
    const gi = hdrs.findIndex((h) => h.includes("goal"));
    $(table)
      .find("tbody tr")
      .each((_, row) => {
        const cells = $(row).find("td");
        if (cells.length < 2) return;
        const season = sanitize(cells.eq(si).text());
        const club = sanitize(cells.eq(ci).text());
        if (season && club)
          entries.push({
            season,
            club,
            appearances: ai >= 0 ? parseInt(cells.eq(ai).text(), 10) || 0 : 0,
            goals: gi >= 0 ? parseInt(cells.eq(gi).text(), 10) || 0 : 0,
          });
      });
  });
  return entries;
}

// ══════════════════════════════════════════
// BATCH + TEAM ROSTER DISCOVERY
// ══════════════════════════════════════════

export async function scrapeTeamRoster(
  splTeamId: string,
): Promise<Array<{ splPlayerId: string; slug: string; name: string }>> {
  const players: Array<{ splPlayerId: string; slug: string; name: string }> =
    [];
  try {
    const { data: html } = await axios.get(
      `${SPL_BASE}/en/teams/${splTeamId}`,
      {
        timeout: REQUEST_TIMEOUT,
        headers: {
          "User-Agent": "Sadara-Sports-Platform/1.0 (data-sync)",
          Accept: "text/html",
        },
      },
    );
    const $ = cheerio.load(html);
    $('a[href*="/en/players/"]').each((_, el) => {
      const parsed = extractSplId($(el).attr("href") || "");
      if (parsed && !players.find((p) => p.splPlayerId === parsed.id))
        players.push({
          splPlayerId: parsed.id,
          slug: parsed.slug,
          name: sanitize($(el).text()) || parsed.slug.replace(/-/g, " "),
        });
    });
    logger.info(`[SPL] Team ${splTeamId}: ${players.length} players found`);
  } catch (err: any) {
    logger.error(`[SPL] Team ${splTeamId} roster error: ${err.message}`);
  }
  return players;
}

export async function scrapePlayers(
  list: Array<{ splPlayerId: string; slug?: string }>,
  onProgress?: (i: number, total: number, name: string) => void,
): Promise<Array<ScrapedPlayerFull | null>> {
  const results: Array<ScrapedPlayerFull | null> = [];
  for (let i = 0; i < list.length; i++) {
    try {
      if (onProgress) onProgress(i + 1, list.length, `#${list[i].splPlayerId}`);
      const r = await scrapePlayerProfile(
        list[i].splPlayerId,
        list[i].slug || "player",
      );
      results.push(r);
      if (r) logger.info(`[SPL] ✓ ${r.bio.fullName}`);
    } catch (err: any) {
      logger.error(`[SPL] ✗ #${list[i].splPlayerId}: ${err.message}`);
      results.push(null);
    }
    if (i < list.length - 1) await delay(REQUEST_DELAY);
  }
  return results;
}
