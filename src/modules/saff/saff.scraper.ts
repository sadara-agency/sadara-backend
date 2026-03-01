import axios from 'axios';
import * as cheerio from 'cheerio';
import * as iconv from 'iconv-lite';

const BASE_URL = 'https://www.saff.com.sa/en';
const REQUEST_DELAY = 1500; // ms between requests to be respectful

// ── Types ──

export interface ScrapedStanding {
  position: number;
  saffTeamId: number;
  teamNameEn: string;
  teamNameAr: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface ScrapedFixture {
  date: string;       // YYYY-MM-DD
  time: string;       // HH:MM
  saffHomeTeamId: number;
  homeTeamNameEn: string;
  saffAwayTeamId: number;
  awayTeamNameEn: string;
  homeScore: number | null;
  awayScore: number | null;
  stadium: string;
  city: string;
}

export interface ScrapedTeam {
  saffTeamId: number;
  teamNameEn: string;
}

export interface ScrapeResult {
  tournamentId: number;
  season: string;
  standings: ScrapedStanding[];
  fixtures: ScrapedFixture[];
  teams: ScrapedTeam[];
  scrapedAt: Date;
}

// ── Utility: Delay between requests ──

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Utility: Extract SAFF team ID from href ──

function extractTeamId(href: string | undefined): number {
  if (!href) return 0;
  const match = href.match(/id=(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

// ── Utility: Parse score string "2 - 3" → [2, 3] ──

function parseScore(scoreStr: string): [number | null, number | null] {
  const cleaned = scoreStr.replace(/\s/g, '');
  if (cleaned === '-' || cleaned === 'vs' || !cleaned) return [null, null];
  const parts = cleaned.split('-');
  if (parts.length !== 2) return [null, null];
  const home = parseInt(parts[0], 10);
  const away = parseInt(parts[1], 10);
  return [isNaN(home) ? null : home, isNaN(away) ? null : away];
}

// ── Fetch page with proper encoding ──

async function fetchPage(url: string): Promise<cheerio.CheerioAPI> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 15000,
    headers: {
      'User-Agent': 'Sadara-Sports-Platform/1.0 (data-integration)',
      'Accept': 'text/html',
      'Accept-Language': 'en',
    },
  });

  // SAFF uses windows-1256 encoding — decode properly
  const contentType = response.headers['content-type'] || '';
  let html: string;

  if (contentType.includes('1256')) {
    html = iconv.decode(Buffer.from(response.data), 'windows-1256');
  } else {
    html = Buffer.from(response.data).toString('utf-8');
  }

  return cheerio.load(html);
}

// ══════════════════════════════════════════
// SCRAPE CHAMPIONSHIP PAGE
// ══════════════════════════════════════════

export async function scrapeChampionship(
  saffId: number,
  season: string
): Promise<ScrapeResult> {
  const url = `${BASE_URL}/championship.php?id=${saffId}`;
  const $ = await fetchPage(url);

  const standings = scrapeStandings($);
  const fixtures = scrapeFixtures($);
  const teams = extractTeams($);

  return {
    tournamentId: saffId,
    season,
    standings,
    fixtures,
    teams,
    scrapedAt: new Date(),
  };
}

// ── Scrape standings table ──

function scrapeStandings($: cheerio.CheerioAPI): ScrapedStanding[] {
  const standings: ScrapedStanding[] = [];

  // Find the standings table — it has headers: P, W, D, L, GF, GA, +/-, Pts
  $('table').each((_, table) => {
    const headers = $(table).find('th').map((_, th) => $(th).text().trim()).get();

    // Identify standings table by checking for "Pts" or "P" columns
    const hasPts = headers.some(h => h === 'Pts' || h === 'نقاط');
    const hasP = headers.some(h => h === 'P' || h === 'لعب');

    if (!hasPts || !hasP) return;

    $(table).find('tbody tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 8) return;

      // Find team link
      const teamLink = $(row).find('a[href*="team.php"]');
      if (!teamLink.length) return;

      const saffTeamId = extractTeamId(teamLink.attr('href'));
      const teamNameEn = teamLink.text().trim();

      // Parse numeric cells — the order is: [checkbox?], pos, [logo?], name, P, W, D, L, GF, GA, GD, Pts
      const nums: number[] = [];
      cells.each((_, cell) => {
        const text = $(cell).text().trim();
        const num = parseInt(text, 10);
        if (!isNaN(num) && text === String(num)) {
          nums.push(num);
        }
      });

      // We expect: position, played, won, drawn, lost, gf, ga, gd(signed), pts
      if (nums.length >= 9) {
        const [pos, played, won, drawn, lost, gf, ga] = nums;
        const gd = nums[nums.length - 2]; // goal difference (may be negative)
        const pts = nums[nums.length - 1]; // points is always last

        standings.push({
          position: pos,
          saffTeamId,
          teamNameEn,
          teamNameAr: '', // Will be filled from Arabic page or team map
          played, won, drawn, lost,
          goalsFor: gf,
          goalsAgainst: ga,
          goalDifference: gf - ga,
          points: pts,
        });
      }
    });
  });

  // Sort by position
  return standings.sort((a, b) => a.position - b.position);
}

// ── Scrape fixtures ──

function scrapeFixtures($: cheerio.CheerioAPI): ScrapedFixture[] {
  const fixtures: ScrapedFixture[] = [];

  // Find fixture tables — they have team links and time/score columns
  $('table').each((_, table) => {
    const rows = $(table).find('tr');

    let currentDate = '';

    rows.each((_, row) => {
      const cells = $(row).find('td');

      // Date row — contains a calendar link
      const dateLink = $(row).find('a[href*="calendar_date"]');
      if (dateLink.length) {
        const href = dateLink.attr('href') || '';
        const dateMatch = href.match(/calendar_date=(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) currentDate = dateMatch[1];
      }

      // Match row — has two team links
      const teamLinks = $(row).find('a[href*="team.php"]');
      if (teamLinks.length >= 2 && currentDate) {
        const homeLink = teamLinks.eq(0);
        const awayLink = teamLinks.eq(1);

        const homeId = extractTeamId(homeLink.attr('href'));
        const awayId = extractTeamId(awayLink.attr('href'));
        const homeName = homeLink.text().trim();
        const awayName = awayLink.text().trim();

        // Find time and score
        let time = '';
        let homeScore: number | null = null;
        let awayScore: number | null = null;

        cells.each((_, cell) => {
          const text = $(cell).text().trim();

          // Time pattern: HH:MM
          if (/^\d{1,2}:\d{2}$/.test(text)) {
            time = text;
          }

          // Score pattern: "N - N"
          if (/^\d+\s*-\s*\d+$/.test(text)) {
            [homeScore, awayScore] = parseScore(text);
          }
        });

        // Stadium — usually the last text cell
        let stadium = '';
        let city = '';
        const lastCell = cells.last().text().trim();
        if (lastCell && !lastCell.match(/^\d/) && lastCell !== '-') {
          // Parse "Stadium Name (City)"
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
            saffAwayTeamId: awayId,
            awayTeamNameEn: awayName,
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
  return fixtures.filter(f => {
    const key = `${f.date}-${f.saffHomeTeamId}-${f.saffAwayTeamId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Extract unique teams from page ──

function extractTeams($: cheerio.CheerioAPI): ScrapedTeam[] {
  const teamMap = new Map<number, string>();

  $('a[href*="team.php"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const id = extractTeamId(href);
    const name = $(el).text().trim();
    if (id && name && !teamMap.has(id)) {
      teamMap.set(id, name);
    }
  });

  return Array.from(teamMap.entries()).map(([saffTeamId, teamNameEn]) => ({
    saffTeamId,
    teamNameEn,
  }));
}


// ══════════════════════════════════════════
// SCRAPE SPECIFIC WEEK
// ══════════════════════════════════════════

export async function scrapeWeek(
  saffId: number,
  season: string,
  week: number
): Promise<ScrapedFixture[]> {
  // The SAFF site uses JavaScript to switch weeks via dropdown
  // For server-side scraping, we'd need to find if there's a
  // query parameter or POST body for week selection.
  // For now, we scrape the default (current/latest) week.
  // Future: investigate AJAX endpoints used by the dropdown.
  const result = await scrapeChampionship(saffId, season);
  return result.fixtures;
}


// ══════════════════════════════════════════
// SCRAPE ALL WEEKS (iterate 1-34)
// ══════════════════════════════════════════

export async function scrapeAllWeeks(
  saffId: number,
  season: string,
  totalWeeks: number = 34
): Promise<ScrapedFixture[]> {
  // This would require understanding the SAFF site's week
  // switching mechanism. Placeholder for phased implementation.
  console.log(`[SAFF Scraper] Scraping all ${totalWeeks} weeks for championship ${saffId}`);
  const result = await scrapeChampionship(saffId, season);
  return result.fixtures;
}


// ══════════════════════════════════════════
// BATCH SCRAPE MULTIPLE TOURNAMENTS
// ══════════════════════════════════════════

export async function scrapeBatch(
  saffIds: number[],
  season: string,
  onProgress?: (current: number, total: number, name: string) => void
): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = [];

  for (let i = 0; i < saffIds.length; i++) {
    const saffId = saffIds[i];

    try {
      if (onProgress) onProgress(i + 1, saffIds.length, `Championship #${saffId}`);

      const result = await scrapeChampionship(saffId, season);
      results.push(result);

      console.log(
        `[SAFF Scraper] ✓ #${saffId}: ${result.standings.length} standings, ` +
        `${result.fixtures.length} fixtures, ${result.teams.length} teams`
      );
    } catch (error: any) {
      console.error(`[SAFF Scraper] ✗ #${saffId}: ${error.message}`);
      results.push({
        tournamentId: saffId,
        season,
        standings: [],
        fixtures: [],
        teams: [],
        scrapedAt: new Date(),
      });
    }

    // Respectful delay between requests
    if (i < saffIds.length - 1) {
      await delay(REQUEST_DELAY);
    }
  }

  return results;
}
