// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.seasons.pulselive.ts
// HTTP wrapper for the Pulselive comp-seasons listing.
// Endpoint: GET /football/competitions/{compId}/compseasons
//
// Note: COMP_ID for the SPL is 72 in our existing client. Pulselive
// also exposes 215 as an aggregate league id; both work, default to 72.
// ─────────────────────────────────────────────────────────────

import { client, fetchJson, COMP_ID } from "@modules/spl/spl.pulselive";

export interface PulseLiveCompSeason {
  id: number;
  label: string;
  competition?: { id: number };
  current?: boolean;
}

export interface PulseLiveCompSeasonsResponse {
  pageInfo?: { numEntries?: number };
  content: PulseLiveCompSeason[];
}

export async function fetchCompSeasons(
  compId?: number,
): Promise<PulseLiveCompSeason[]> {
  const data = await fetchJson<PulseLiveCompSeasonsResponse>(
    `fetchCompSeasons(${compId ?? COMP_ID})`,
    () =>
      client.get<PulseLiveCompSeasonsResponse>(
        `/football/competitions/${compId ?? COMP_ID}/compseasons`,
        { params: { pageSize: 50 } },
      ),
  );
  return data?.content ?? [];
}
