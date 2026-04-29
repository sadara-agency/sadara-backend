// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.fixtures.pulselive.ts
// HTTP wrappers for the Pulselive fixtures + fixture-detail endpoints.
// Reuses fetchJson + client from spl.pulselive.ts so rate-limiting,
// retries, and the circuit breaker apply uniformly.
// ─────────────────────────────────────────────────────────────

import {
  client,
  fetchJson,
  COMP_ID,
  DEFAULT_SEASON_ID,
} from "@modules/spl/spl.pulselive";
import type {
  PulseLiveFixture,
  PulseLiveFixtureDetail,
  PulseLiveFixturesResponse,
  PulseLiveFixtureStatus,
} from "@modules/spl/spl.fixtures.types";

function seasonParam(seasonId?: number): number {
  return seasonId ?? DEFAULT_SEASON_ID;
}

/**
 * Fetch fixtures for a season. Paginates through all pages.
 * Endpoint: GET /football/fixtures
 *
 * Statuses: "C" completed, "U" upcoming, "L" live. Default = all three.
 */
export async function fetchFixtures(
  seasonId?: number,
  opts: {
    statuses?: PulseLiveFixtureStatus[];
    pulseLiveTeamId?: number;
    compId?: number;
    pageSize?: number;
    maxPages?: number;
  } = {},
): Promise<PulseLiveFixture[]> {
  const statuses = opts.statuses ?? ["C", "U", "L"];
  const pageSize = opts.pageSize ?? 100;
  const maxPages = opts.maxPages ?? 10;

  const all: PulseLiveFixture[] = [];
  for (let page = 0; page < maxPages; page++) {
    const data = await fetchJson<PulseLiveFixturesResponse>(
      `fetchFixtures(season=${seasonParam(seasonId)} page=${page})`,
      () =>
        client.get<PulseLiveFixturesResponse>("/football/fixtures", {
          params: {
            comps: opts.compId ?? COMP_ID,
            compSeasons: seasonParam(seasonId),
            statuses: statuses.join(","),
            page,
            pageSize,
            altIds: true,
            ...(opts.pulseLiveTeamId ? { teams: opts.pulseLiveTeamId } : {}),
          },
        }),
    );
    if (!data || !Array.isArray(data.content) || data.content.length === 0)
      break;
    all.push(...data.content);
    if (page + 1 >= (data.pageInfo?.numPages ?? page + 1)) break;
  }
  return all;
}

/**
 * Fetch a single fixture with full detail (lineups, events, officials).
 * Endpoint: GET /football/fixtures/{id}?detail=2
 */
export async function fetchFixtureDetail(
  pulselivefixtureId: number,
): Promise<PulseLiveFixtureDetail | null> {
  return fetchJson<PulseLiveFixtureDetail>(
    `fetchFixtureDetail(${pulselivefixtureId})`,
    () =>
      client.get<PulseLiveFixtureDetail>(
        `/football/fixtures/${pulselivefixtureId}`,
        { params: { detail: 2, altIds: true } },
      ),
  );
}
