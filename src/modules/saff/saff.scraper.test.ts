jest.mock("@config/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock("axios", () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

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
