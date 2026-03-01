"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeChampionship = scrapeChampionship;
exports.scrapeWeek = scrapeWeek;
exports.scrapeAllWeeks = scrapeAllWeeks;
exports.scrapeBatch = scrapeBatch;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const iconv = __importStar(require("iconv-lite"));
const BASE_URL = 'https://www.saff.com.sa/en';
const REQUEST_DELAY = 1500; // ms between requests to be respectful
// ── Utility: Delay between requests ──
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// ── Utility: Extract SAFF team ID from href ──
function extractTeamId(href) {
    if (!href)
        return 0;
    const match = href.match(/id=(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
}
// ── Utility: Parse score string "2 - 3" → [2, 3] ──
function parseScore(scoreStr) {
    const cleaned = scoreStr.replace(/\s/g, '');
    if (cleaned === '-' || cleaned === 'vs' || !cleaned)
        return [null, null];
    const parts = cleaned.split('-');
    if (parts.length !== 2)
        return [null, null];
    const home = parseInt(parts[0], 10);
    const away = parseInt(parts[1], 10);
    return [isNaN(home) ? null : home, isNaN(away) ? null : away];
}
// ── Fetch page with proper encoding ──
async function fetchPage(url) {
    const response = await axios_1.default.get(url, {
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
    let html;
    if (contentType.includes('1256')) {
        html = iconv.decode(Buffer.from(response.data), 'windows-1256');
    }
    else {
        html = Buffer.from(response.data).toString('utf-8');
    }
    return cheerio.load(html);
}
// ══════════════════════════════════════════
// SCRAPE CHAMPIONSHIP PAGE
// ══════════════════════════════════════════
async function scrapeChampionship(saffId, season) {
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
function scrapeStandings($) {
    const standings = [];
    // Find the standings table — it has headers: P, W, D, L, GF, GA, +/-, Pts
    $('table').each((_, table) => {
        const headers = $(table).find('th').map((_, th) => $(th).text().trim()).get();
        // Identify standings table by checking for "Pts" or "P" columns
        const hasPts = headers.some(h => h === 'Pts' || h === 'نقاط');
        const hasP = headers.some(h => h === 'P' || h === 'لعب');
        if (!hasPts || !hasP)
            return;
        // Find column indices from headers
        const colIdx = {
            pts: headers.findIndex(h => h === 'Pts' || h === 'نقاط'),
            p: headers.findIndex(h => h === 'P' || h === 'لعب'),
            w: headers.findIndex(h => h === 'W' || h === 'فوز'),
            d: headers.findIndex(h => h === 'D' || h === 'تعادل'),
            l: headers.findIndex(h => h === 'L' || h === 'خسارة'),
            gf: headers.findIndex(h => h === 'GF' || h === 'له'),
            ga: headers.findIndex(h => h === 'GA' || h === 'عليه'),
            gd: headers.findIndex(h => h === '+/-' || h === 'الفارق' || h === 'فرق'),
        };
        let rowNum = 0;
        $(table).find('tbody tr').each((_, row) => {
            const cells = $(row).find('td');
            if (cells.length < 8)
                return;
            // Find team link
            const teamLink = $(row).find('a[href*="team.php"]');
            if (!teamLink.length)
                return;
            const saffTeamId = extractTeamId(teamLink.attr('href'));
            const teamNameEn = teamLink.text().trim();
            if (!saffTeamId || !teamNameEn)
                return;
            rowNum++;
            // Helper: parse a cell's text as integer (handles +46, -7, etc.)
            const cellInt = (idx) => {
                if (idx < 0 || idx >= cells.length)
                    return 0;
                const text = $(cells[idx]).text().trim().replace(/\+/, '');
                const n = parseInt(text, 10);
                return isNaN(n) ? 0 : n;
            };
            // Try to get position from first cell, fall back to row number
            const firstCellText = $(cells[0]).text().trim().replace(/[^\d]/g, '');
            const position = parseInt(firstCellText, 10) || rowNum;
            // Parse stats by column index (most reliable method)
            const played = cellInt(colIdx.p);
            const won = cellInt(colIdx.w);
            const drawn = cellInt(colIdx.d);
            const lost = cellInt(colIdx.l);
            const goalsFor = cellInt(colIdx.gf);
            const goalsAgainst = cellInt(colIdx.ga);
            const points = cellInt(colIdx.pts);
            // Goal difference: parse from column if available, otherwise compute
            let goalDifference = 0;
            if (colIdx.gd >= 0) {
                const gdText = $(cells[colIdx.gd]).text().trim();
                goalDifference = parseInt(gdText.replace(/\+/, ''), 10);
                if (isNaN(goalDifference))
                    goalDifference = goalsFor - goalsAgainst;
            }
            else {
                goalDifference = goalsFor - goalsAgainst;
            }
            // Validate: at least played > 0 or points > 0 to avoid junk rows
            if (played > 0 || points > 0) {
                standings.push({
                    position,
                    saffTeamId,
                    teamNameEn,
                    teamNameAr: '',
                    played, won, drawn, lost,
                    goalsFor,
                    goalsAgainst,
                    goalDifference,
                    points,
                });
            }
        });
    });
    // Sort by position
    return standings.sort((a, b) => a.position - b.position);
}
// ── Scrape fixtures ──
function scrapeFixtures($) {
    const fixtures = [];
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
                if (dateMatch)
                    currentDate = dateMatch[1];
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
                let homeScore = null;
                let awayScore = null;
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
                    }
                    else {
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
    const seen = new Set();
    return fixtures.filter(f => {
        const key = `${f.date}-${f.saffHomeTeamId}-${f.saffAwayTeamId}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
// ── Extract unique teams from page ──
function extractTeams($) {
    const teamMap = new Map();
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
async function scrapeWeek(saffId, season, week) {
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
async function scrapeAllWeeks(saffId, season, totalWeeks = 34) {
    // This would require understanding the SAFF site's week
    // switching mechanism. Placeholder for phased implementation.
    console.log(`[SAFF Scraper] Scraping all ${totalWeeks} weeks for championship ${saffId}`);
    const result = await scrapeChampionship(saffId, season);
    return result.fixtures;
}
// ══════════════════════════════════════════
// BATCH SCRAPE MULTIPLE TOURNAMENTS
// ══════════════════════════════════════════
async function scrapeBatch(saffIds, season, onProgress) {
    const results = [];
    for (let i = 0; i < saffIds.length; i++) {
        const saffId = saffIds[i];
        try {
            if (onProgress)
                onProgress(i + 1, saffIds.length, `Championship #${saffId}`);
            const result = await scrapeChampionship(saffId, season);
            results.push(result);
            console.log(`[SAFF Scraper] ✓ #${saffId}: ${result.standings.length} standings, ` +
                `${result.fixtures.length} fixtures, ${result.teams.length} teams`);
        }
        catch (error) {
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
//# sourceMappingURL=saff.scraper.js.map