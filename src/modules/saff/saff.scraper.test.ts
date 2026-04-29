jest.mock("@config/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock("axios", () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

import path from "path";
import fs from "fs";
import axios from "axios";
import {
  scrapeChampionship,
  type ArNameResolver,
} from "@modules/saff/saff.scraper";

const mockedGet = axios.get as jest.MockedFunction<typeof axios.get>;

// Minimal SAFF-like HTML — enough for selectors.ts to extract one standings
// row, one team link, and one fixture. Mirrors the real DOM shape closely
// enough that scrapeStandings/scrapeFixtures/extractTeams produce non-empty
// output and the ScraperShapeError check passes.
function buildPage(opts: { teamName: string; teamId: number }) {
  const { teamName, teamId } = opts;
  return `<!doctype html>
<html><body>
<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Team</th>
      <th>P</th><th>W</th><th>D</th><th>L</th>
      <th>GF</th><th>GA</th><th>+/-</th><th>Pts</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td><a href="team.php?id=${teamId}">${teamName}</a></td>
      <td>10</td><td>7</td><td>2</td><td>1</td>
      <td>20</td><td>5</td><td>+15</td><td>23</td>
    </tr>
  </tbody>
</table>
<table>
  <tbody>
    <tr><td><a href="?calendar_date=2025-09-15">2025-09-15</a></td></tr>
    <tr>
      <td>18:00</td>
      <td><a href="team.php?id=${teamId}">${teamName}</a></td>
      <td>2 - 1</td>
      <td><a href="team.php?id=${teamId + 1}">Other Team</a></td>
      <td>King Fahd Stadium (Riyadh)</td>
    </tr>
  </tbody>
</table>
</body></html>`;
}

function htmlResponse(html: string) {
  return {
    data: Buffer.from(html, "utf-8"),
    headers: { "content-type": "text/html; charset=utf-8" },
  };
}

beforeEach(() => {
  mockedGet.mockReset();
});

// ══════════════════════════════════════════════════════════════════════════
// CONTRACT TESTS — SAFF HTML fixture
//
// These tests run the real scraper logic against a known-good snapshot of
// the SAFF championship page (stored in __fixtures__/championship_333_en.html).
// If a test fails after updating saff.selectors.ts, the selector change is
// the root cause. If it fails without a selector change, SAFF changed their
// DOM and the fixture + selectors need updating.
//
// HOW TO UPDATE: re-scrape championship.php?id=333, save the HTML to the
// fixture file, re-run the tests to confirm the assertions still hold, then
// bump SELECTOR_VERSION in saff.selectors.ts.
// ══════════════════════════════════════════════════════════════════════════

const FIXTURE_PATH = path.join(
  __dirname,
  "__fixtures__",
  "championship_333_en.html",
);

function fixtureHtmlResponse() {
  const html = fs.readFileSync(FIXTURE_PATH, "utf-8");
  return {
    data: Buffer.from(html, "utf-8"),
    headers: { "content-type": "text/html; charset=utf-8" },
  };
}

describe("scrapeChampionship — DOM contract (championship_333_en.html)", () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it("extracts ≥18 standings rows from the fixture page", async () => {
    // Serve the fixture for both EN and AR fetches (AR is the fallback for
    // unknown team IDs; serving the same HTML means Arabic names will equal
    // English names in the test output, which is fine for contract purposes).
    mockedGet.mockResolvedValue(fixtureHtmlResponse());

    const result = await scrapeChampionship(333, "2025-2026");

    expect(result.standings.length).toBeGreaterThanOrEqual(18);
  });

  it("extracts ≥306 fixtures from the fixture page (full double round-robin)", async () => {
    mockedGet.mockResolvedValue(fixtureHtmlResponse());

    const result = await scrapeChampionship(333, "2025-2026");

    expect(result.fixtures.length).toBeGreaterThanOrEqual(306);
  });

  it("extracts ≥18 distinct teams from the fixture page", async () => {
    mockedGet.mockResolvedValue(fixtureHtmlResponse());

    const result = await scrapeChampionship(333, "2025-2026");

    expect(result.teams.length).toBeGreaterThanOrEqual(18);
  });

  it("all standings rows pass Zod validation (no validation warnings for standings)", async () => {
    mockedGet.mockResolvedValue(fixtureHtmlResponse());

    const result = await scrapeChampionship(333, "2025-2026");

    const standingWarnings = result.validationWarnings.filter(
      (w) => w.entity === "standing",
    );
    expect(standingWarnings).toHaveLength(0);
  });

  it("all fixture rows pass Zod validation (no validation warnings for fixtures)", async () => {
    mockedGet.mockResolvedValue(fixtureHtmlResponse());

    const result = await scrapeChampionship(333, "2025-2026");

    const fixtureWarnings = result.validationWarnings.filter(
      (w) => w.entity === "fixture",
    );
    expect(fixtureWarnings).toHaveLength(0);
  });

  it("extracts tournament logo URL from the fixture page", async () => {
    mockedGet.mockResolvedValue(fixtureHtmlResponse());

    const result = await scrapeChampionship(333, "2025-2026");

    expect(result.tournamentLogoUrl).not.toBeNull();
    expect(result.tournamentLogoUrl).toContain("roshn-league");
  });

  it("standings positions are sequential starting from 1", async () => {
    mockedGet.mockResolvedValue(fixtureHtmlResponse());

    const result = await scrapeChampionship(333, "2025-2026");

    const positions = result.standings.map((s) => s.position);
    expect(positions[0]).toBe(1);
    // All positions are unique
    expect(new Set(positions).size).toBe(positions.length);
  });

  it("all fixture team IDs appear in the teams list", async () => {
    mockedGet.mockResolvedValue(fixtureHtmlResponse());

    const result = await scrapeChampionship(333, "2025-2026");

    const teamIdSet = new Set(result.teams.map((t) => t.saffTeamId));
    for (const f of result.fixtures) {
      expect(teamIdSet.has(f.saffHomeTeamId)).toBe(true);
      expect(teamIdSet.has(f.saffAwayTeamId)).toBe(true);
    }
  });
});

describe("scrapeChampionship — bilingual fetching", () => {
  it("warm path: skips AR fetch when resolver returns names for all team IDs", async () => {
    const enHtml = buildPage({ teamName: "Al Hilal", teamId: 100 });
    mockedGet.mockResolvedValueOnce(htmlResponse(enHtml));

    const resolver: ArNameResolver = {
      lookupTeamNamesAr: jest.fn().mockResolvedValue(
        new Map<number, string>([
          [100, "الهلال"],
          [101, "فريق آخر"],
        ]),
      ),
    };

    const result = await scrapeChampionship(333, "2025-2026", resolver);

    expect(mockedGet).toHaveBeenCalledTimes(1); // EN only — no AR fetch
    expect(resolver.lookupTeamNamesAr).toHaveBeenCalledTimes(1);
    expect(result.standings[0]?.teamNameAr).toBe("الهلال");
    expect(result.fixtures[0]?.homeTeamNameAr).toBe("الهلال");
    expect(result.fixtures[0]?.awayTeamNameAr).toBe("فريق آخر");
  });

  it("cold path: fetches AR page when resolver returns no names", async () => {
    const enHtml = buildPage({ teamName: "Al Hilal", teamId: 100 });
    const arHtml = buildPage({ teamName: "الهلال", teamId: 100 });
    mockedGet
      .mockResolvedValueOnce(htmlResponse(enHtml))
      .mockResolvedValueOnce(htmlResponse(arHtml));

    const resolver: ArNameResolver = {
      lookupTeamNamesAr: jest.fn().mockResolvedValue(new Map()),
    };

    const result = await scrapeChampionship(333, "2025-2026", resolver);

    expect(mockedGet).toHaveBeenCalledTimes(2); // EN + AR fallback
    expect(result.standings[0]?.teamNameAr).toBe("الهلال");
  });

  it("cold path with no resolver: still fetches AR page", async () => {
    const enHtml = buildPage({ teamName: "Al Hilal", teamId: 100 });
    const arHtml = buildPage({ teamName: "الهلال", teamId: 100 });
    mockedGet
      .mockResolvedValueOnce(htmlResponse(enHtml))
      .mockResolvedValueOnce(htmlResponse(arHtml));

    const result = await scrapeChampionship(333, "2025-2026");

    expect(mockedGet).toHaveBeenCalledTimes(2);
    expect(result.standings[0]?.teamNameAr).toBe("الهلال");
  });

  it("does not throw when AR fallback fetch fails — returns EN data with empty AR names", async () => {
    const enHtml = buildPage({ teamName: "Al Hilal", teamId: 100 });
    mockedGet
      .mockResolvedValueOnce(htmlResponse(enHtml))
      // AR fetch — fail every retry (scraper retries up to 3 times)
      .mockRejectedValue(new Error("AR upstream timeout"));

    const resolver: ArNameResolver = {
      lookupTeamNamesAr: jest.fn().mockResolvedValue(new Map()),
    };

    const result = await scrapeChampionship(333, "2025-2026", resolver);

    expect(result.standings.length).toBeGreaterThan(0);
    expect(result.standings[0]?.teamNameEn).toBe("Al Hilal");
    expect(result.standings[0]?.teamNameAr).toBe("");
  }, 30_000);
});
