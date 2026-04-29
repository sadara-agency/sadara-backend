// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.fixtures.types.ts
// Pulselive fixture API response shapes.
// Endpoints:
//   GET /football/fixtures?compSeasons={id}
//   GET /football/fixtures/{id}?detail=2
// ─────────────────────────────────────────────────────────────

import type { PulseLivePageInfo } from "@modules/spl/spl.types";

export type PulseLiveFixtureStatus = "C" | "U" | "L"; // Completed | Upcoming | Live

export interface PulseLiveFixtureTeamLine {
  teamId: number;
  team: {
    id: number;
    name: string;
    shortName?: string;
    club?: { id: number; name: string; shortName?: string };
    altIds?: { opta?: string };
  };
  score?: number | null;
  htScore?: number | null;
}

export interface PulseLiveFixtureGround {
  id: number;
  name: string;
  city?: string;
  capacity?: number;
}

export interface PulseLiveFixture {
  id: number;
  gameweek?: { id: number; gameweek: number };
  kickoff: {
    completeness?: number;
    millis: number; // epoch ms
    label?: string;
  };
  ground?: PulseLiveFixtureGround;
  status: PulseLiveFixtureStatus;
  phase?: string;
  outcome?: "H" | "A" | "D" | null;
  teams: PulseLiveFixtureTeamLine[];
  attendance?: number | null;
  altIds?: { opta?: string };
}

export interface PulseLiveFixturesResponse {
  pageInfo: PulseLivePageInfo;
  content: PulseLiveFixture[];
}

// ── Detail (=2) — adds events + lineups + officials ──

export interface PulseLiveFixtureMatchPlayer {
  playerId: number;
  matchPosition?: string;
  position?: string;
  shirtNum?: number;
  captain?: boolean;
  name?: { display?: string; first?: string; last?: string };
  altIds?: { opta?: string };
  // Per-player stats (not always present; depends on detail level)
  stats?: Array<{ name: string; value: number }>;
  // Substitution metadata
  subbedOn?: number; // minute
  subbedOff?: number; // minute
}

export interface PulseLiveFixtureLineup {
  teamId: number;
  formation?: { label?: string; players?: Array<{ id: number }> };
  lineup?: PulseLiveFixtureMatchPlayer[]; // starters
  substitutes?: PulseLiveFixtureMatchPlayer[];
}

export type PulseLiveFixtureEventType =
  | "G" // goal
  | "OG" // own goal
  | "PG" // penalty goal
  | "PM" // penalty miss
  | "Y" // yellow card
  | "YR" // second yellow → red
  | "R" // red card
  | "S" // substitution (combined)
  | "A" // assist
  | "VAR"
  | "I" // injury
  | "K" // kickoff
  | "HT"
  | "FT";

export interface PulseLiveFixtureEvent {
  id?: number;
  type: PulseLiveFixtureEventType | string;
  time?: { secs?: number; label?: string };
  clock?: { secs?: number; label?: string };
  phase?: string;
  teamId?: number;
  personId?: number;
  assistId?: number; // for goals
  subbedOn?: number;
  subbedOff?: number;
  description?: string;
  rawType?: string; // some payloads use freeform string
}

export interface PulseLiveFixtureOfficial {
  id?: number;
  name?: { display?: string; first?: string; last?: string };
  role?: string; // "MAIN" | "ASSISTANT_1" | "ASSISTANT_2" | "FOURTH" | "VAR" etc.
}

export interface PulseLiveFixtureDetail extends PulseLiveFixture {
  /** Lineups per team — both starters + subs. */
  lineups?: PulseLiveFixtureLineup[];
  /** Goals/cards/subs/timeline. Field name varies by API version — accept multiple. */
  events?: PulseLiveFixtureEvent[];
  goals?: PulseLiveFixtureEvent[];
  cards?: PulseLiveFixtureEvent[];
  substitutions?: PulseLiveFixtureEvent[];
  /** Match officials (referee, assistants, VAR). */
  officials?: PulseLiveFixtureOfficial[];
  matchOfficials?: PulseLiveFixtureOfficial[];
}

// ── Sadara-side mapping helpers ──

export interface MapStatusResult {
  status: "upcoming" | "live" | "completed" | "cancelled";
}
