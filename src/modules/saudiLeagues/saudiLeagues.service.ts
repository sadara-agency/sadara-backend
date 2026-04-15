// ─────────────────────────────────────────────────────────────
// src/modules/saudiLeagues/saudiLeagues.service.ts
// Read-only view of Saudi league competitions.
// All 19 Saudi competitions live in the shared `competitions` table
// (seeded by migration 122).  This service returns them grouped by
// category so the Saudi Leagues hub page can render tier/cup/youth cards.
// ─────────────────────────────────────────────────────────────

import { Competition } from "@modules/competitions/competition.model";
import { AppError } from "@middleware/errorHandler";

export interface SaudiLeagueGroup {
  category:
    | "senior_professional"
    | "senior_cups"
    | "elite_youth"
    | "youth"
    | "grassroots";
  label: string;
  labelAr: string;
  competitions: Competition[];
}

// ── List all Saudi leagues as a flat list ──

export async function listSaudiLeagues(): Promise<Competition[]> {
  return Competition.findAll({
    where: { country: "Saudi Arabia", isActive: true },
    order: [
      ["tier", "ASC"],
      ["agencyValue", "ASC"],
      ["name", "ASC"],
    ],
  });
}

// ── List grouped by category ──

export async function getSaudiLeaguesGrouped(): Promise<SaudiLeagueGroup[]> {
  const all = await listSaudiLeagues();

  const raw: SaudiLeagueGroup[] = [
    {
      category: "senior_professional",
      label: "Senior Professional",
      labelAr: "الدوريات الاحترافية الكبار",
      competitions: all.filter(
        (c) =>
          !c.ageGroup &&
          c.type === "league" &&
          ["Critical", "High", "Medium", "Low"].includes(c.agencyValue),
      ),
    },
    {
      category: "senior_cups",
      label: "Cups & Super Cup",
      labelAr: "الكؤوس والسوبر",
      competitions: all.filter(
        (c) => !c.ageGroup && (c.type === "cup" || c.type === "super_cup"),
      ),
    },
    {
      category: "elite_youth",
      label: "Elite Youth (U21)",
      labelAr: "نخبة الشباب (تحت 21)",
      competitions: all.filter((c) => c.ageGroup === "U21"),
    },
    {
      category: "youth",
      label: "Saudi Premier Youth",
      labelAr: "دوري الشباب السعودي الممتاز",
      competitions: all.filter(
        (c) =>
          !!c.ageGroup &&
          c.ageGroup !== "U21" &&
          !["U14", "U13", "U12", "U11"].includes(c.ageGroup) &&
          c.agencyValue === "Scouting",
      ),
    },
    {
      category: "grassroots",
      label: "Braem Grassroots",
      labelAr: "دوري البراعم",
      competitions: all.filter((c) => c.agencyValue === "Niche"),
    },
  ];

  return raw.filter((g) => g.competitions.length > 0);
}

// ── Get single competition (Saudi-scoped) ──

export async function getSaudiLeagueById(id: string): Promise<Competition> {
  const comp = await Competition.findOne({
    where: { id, country: "Saudi Arabia" },
  });
  if (!comp) throw new AppError("Saudi league not found", 404);
  return comp;
}
