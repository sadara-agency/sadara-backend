// ═══════════════════════════════════════════════════════════════
// SAFF Scraper Selector Manifest (versioned)
//
// All HTML selectors and column-header labels live here so DOM-shape
// changes on saff.com.sa are a one-file edit. Each scrape stamps the
// version into the SaffImportSession.snapshot for forensics.
//
// Bump `SELECTOR_VERSION` whenever this file is meaningfully edited.
// ═══════════════════════════════════════════════════════════════

export const SELECTOR_VERSION = 3;

export interface ColumnHeaderLabels {
  /** Played */
  p: string[];
  /** Won */
  w: string[];
  /** Drawn */
  d: string[];
  /** Lost */
  l: string[];
  /** Goals For */
  gf: string[];
  /** Goals Against */
  ga: string[];
  /** Goal Difference */
  gd: string[];
  /** Points */
  pts: string[];
}

export const STANDINGS_HEADER_LABELS: ColumnHeaderLabels = {
  p: ["P", "لعب"],
  w: ["W", "فوز"],
  d: ["D", "تعادل"],
  l: ["L", "خسارة"],
  gf: ["GF", "له"],
  ga: ["GA", "عليه"],
  gd: ["+/-", "الفارق", "فرق"],
  pts: ["Pts", "نقاط"],
};

export const SELECTORS = {
  /** Find all candidate tables on a championship page */
  table: "table",
  tableHeader: "th",
  tableBodyRow: "tbody tr",
  tableCell: "td",
  /** Team-detail link inside a standings row or fixture row */
  teamLink: 'a[href*="team.php?id="]',
  /** Date header link inside a fixtures table */
  fixtureDateLink: 'a[href*="calendar_date"]',
  /** Tournament index page link */
  tournamentLink: 'a[href*="championship.php?id="]',
  /** Logo images on a team page */
  logoLarge: 'img[src*="saffteamlarge"]',
  logoSmall: 'img[src*="saffteamsmall"]',
  logoFallback: 'img[src*="uploadcenter/saffteam"]',
  /** Player roster rows on team.php?id=N — tried in order, first to yield rows wins */
  rosterTable: "table",
  rosterRow: "tbody tr",
  rosterCell: "td",
  /** Player detail link — same pattern as teamLink but for player pages */
  playerLink: 'a[href*="player.php?id="]',
  /**
   * Tournament/championship logo on championship.php?id=X.
   * Multiple selectors are tried in order — SAFF's championship pages don't
   * use a stable CSS class for the header crest, so we look for the most
   * specific patterns first and fall back to generic championship imagery.
   */
  tournamentLogo: [
    'img[src*="champion"]',
    'img[src*="tournament"]',
    'img[src*="uploadcenter/champ"]',
    ".championship-logo img",
    ".tournament-header img",
    "header img",
  ].join(", "),
} as const;

export const URL_PATTERNS = {
  championship: (saffId: number) => `championship.php?id=${saffId}`,
  team: (saffTeamId: number) => `team.php?id=${saffTeamId}`,
  championships: "championships.php",
  nationalTeams: "nationalteams.php",
  nationalTeam: (saffId: number) => `nationalteams.php?id=${saffId}`,
} as const;

/**
 * Resolve column indices from a header row.
 * Returns null for any header that wasn't found, plus a `missing` list
 * so the caller can decide whether the table is even a standings table.
 */
export function resolveStandingsColumnMap(
  headers: string[],
  labels: ColumnHeaderLabels = STANDINGS_HEADER_LABELS,
): {
  idx: {
    p: number;
    w: number;
    d: number;
    l: number;
    gf: number;
    ga: number;
    gd: number;
    pts: number;
  };
  missing: string[];
} {
  const find = (candidates: string[]): number =>
    headers.findIndex((h) => candidates.includes(h));

  const idx = {
    p: find(labels.p),
    w: find(labels.w),
    d: find(labels.d),
    l: find(labels.l),
    gf: find(labels.gf),
    ga: find(labels.ga),
    gd: find(labels.gd),
    pts: find(labels.pts),
  };

  const missing: string[] = [];
  if (idx.p < 0) missing.push("p");
  if (idx.pts < 0) missing.push("pts");
  // gf/ga/w/d/l absences are recoverable; p+pts absence means it's not the standings table

  return { idx, missing };
}
