// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.registry.ts
// Static registry of Roshn Saudi League (18) + Yelo First Division (9) clubs.
// PulseLive team IDs verified from GET /football/fixtures (2025/26 season).
// ─────────────────────────────────────────────────────────────

import { SplClubEntry } from "@modules/spl/spl.types";

// ── Roshn Saudi League clubs ──

const ROSHN_CLUBS: SplClubEntry[] = [
  {
    splTeamId: "3093",
    splCode: "NSR",
    espnTeamId: "817",
    nameEn: "Al Nassr",
    nameAr: "النصر",
    city: "Riyadh",
    pulseLiveTeamId: 3503,
    pulseLiveLeague: "roshn",
  },
  {
    splTeamId: "3095",
    splCode: "HIL",
    espnTeamId: "929",
    nameEn: "Al Hilal",
    nameAr: "الهلال",
    city: "Riyadh",
    pulseLiveTeamId: 3505,
    pulseLiveLeague: "roshn",
  },
  {
    splTeamId: "3097",
    splCode: "AHL",
    espnTeamId: "8346",
    nameEn: "Al Ahli",
    nameAr: "الأهلي",
    city: "Jeddah",
    pulseLiveTeamId: 3507,
    pulseLiveLeague: "roshn",
  },
  {
    splTeamId: "3081",
    splCode: "ITD",
    espnTeamId: "804",
    nameEn: "Al Ittihad",
    nameAr: "الاتحاد",
    city: "Jeddah",
    pulseLiveTeamId: 3492,
    pulseLiveLeague: "roshn",
  },
  {
    splTeamId: "3094",
    splCode: "SHB",
    espnTeamId: "8344",
    nameEn: "Al Shabab",
    nameAr: "الشباب",
    city: "Riyadh",
    pulseLiveTeamId: 3494,
    pulseLiveLeague: "roshn",
  },
  {
    splTeamId: "3087",
    splCode: "TAW",
    espnTeamId: "8345",
    nameEn: "Al Taawoun",
    nameAr: "التعاون",
    city: "Buraidah",
    pulseLiveTeamId: 3499,
    pulseLiveLeague: "roshn",
  },
  {
    splTeamId: "3089",
    splCode: "QAD",
    espnTeamId: "18974",
    nameEn: "Al Qadsiah",
    nameAr: "القادسية",
    city: "Khobar",
    pulseLiveTeamId: 3513,
    pulseLiveLeague: "roshn",
  },
  {
    splTeamId: "3090",
    splCode: "RAE",
    espnTeamId: "8352",
    nameEn: "Al Raed",
    nameAr: "الرائد",
    city: "Buraidah",
    pulseLiveTeamId: 3506, // was incorrectly 3500 (Al Riyadh's ID) — fixed
    pulseLiveLeague: "roshn",
  },
  {
    splTeamId: "3096",
    splCode: "FYH",
    espnTeamId: "18975",
    nameEn: "Al Fayha",
    nameAr: "الفيحاء",
    city: "Al Majmaah",
    pulseLiveTeamId: 3496,
    pulseLiveLeague: "roshn",
  },
  {
    splTeamId: "3086",
    splCode: "ETF",
    espnTeamId: "8347",
    nameEn: "Al Ettifaq",
    nameAr: "الاتفاق",
    city: "Dammam",
    pulseLiveTeamId: 3491,
    pulseLiveLeague: "roshn",
  },
  {
    splTeamId: "3082",
    splCode: "FTH",
    espnTeamId: "8348",
    nameEn: "Al Fateh",
    nameAr: "الفتح",
    city: "Al-Hasa",
    pulseLiveTeamId: 3490,
    pulseLiveLeague: "roshn",
  },
  {
    splTeamId: "3088",
    splCode: "RYD",
    espnTeamId: "8351",
    nameEn: "Al Riyadh",
    nameAr: "الرياض",
    city: "Riyadh",
    pulseLiveTeamId: 3500,
    pulseLiveLeague: "roshn",
  },
  {
    splTeamId: "3098",
    splCode: "KHJ",
    espnTeamId: "18972",
    nameEn: "Al Khaleej",
    nameAr: "الخليج",
    city: "Saihat",
    pulseLiveTeamId: 3498,
    pulseLiveLeague: "roshn",
  },
  {
    splTeamId: "3084",
    splCode: "KHL",
    espnTeamId: "18973",
    nameEn: "Al Kholood",
    nameAr: "الخلود",
    city: "Al-Hasa",
    pulseLiveTeamId: 3521,
    pulseLiveLeague: "roshn",
  },
  {
    splTeamId: "3083",
    splCode: "OKH",
    espnTeamId: "18971",
    nameEn: "Al Okhdood",
    nameAr: "الأخدود",
    city: "Najran",
    pulseLiveTeamId: 3493,
    pulseLiveLeague: "roshn",
  },
  {
    splTeamId: "3099",
    splCode: "HZM",
    espnTeamId: "18976",
    nameEn: "Al Hazem",
    nameAr: "الحزم",
    city: "Ar Rass",
    pulseLiveTeamId: 3497,
    pulseLiveLeague: "roshn",
  },
  {
    splTeamId: "3091",
    splCode: "ORB",
    espnTeamId: "18970",
    nameEn: "Al Orubah",
    nameAr: "العروبة",
    city: "Al Jawf",
    pulseLiveTeamId: 3517,
    pulseLiveLeague: "roshn",
  },
  {
    splTeamId: "3092",
    splCode: "NJM",
    espnTeamId: "18977",
    nameEn: "Al Najmah",
    nameAr: "النجمة",
    city: "Unaizah",
    pulseLiveTeamId: 3522,
    pulseLiveLeague: "roshn",
  },
];

// ── Yelo First Division clubs ──
// PulseLive comp ID: 219, season ID: 863 (2025/26)
// splTeamId / espnTeamId are placeholders — Yelo clubs are not in the SPL API

const YELO_CLUBS: SplClubEntry[] = [
  {
    splTeamId: "",
    splCode: "DMC",
    espnTeamId: "",
    nameEn: "Damac",
    nameAr: "ضماك",
    city: "Khamis Mushait",
    pulseLiveTeamId: 3495,
    pulseLiveLeague: "yelo",
  },
  {
    splTeamId: "",
    splCode: "WHA",
    espnTeamId: "",
    nameEn: "Al Wehda",
    nameAr: "الوحدة",
    city: "Mecca",
    pulseLiveTeamId: 3502,
    pulseLiveLeague: "yelo",
  },
  {
    splTeamId: "",
    splCode: "ANS",
    espnTeamId: "",
    nameEn: "Al-Ansar",
    nameAr: "الأنصار",
    city: "Medina",
    pulseLiveTeamId: 3510,
    pulseLiveLeague: "yelo",
  },
  {
    splTeamId: "",
    splCode: "HAJ",
    espnTeamId: "",
    nameEn: "Hajer",
    nameAr: "هجر",
    city: "Hofuf",
    pulseLiveTeamId: 3511,
    pulseLiveLeague: "yelo",
  },
  {
    splTeamId: "",
    splCode: "NJR",
    espnTeamId: "",
    nameEn: "Najran SC",
    nameAr: "نجران",
    city: "Najran",
    pulseLiveTeamId: 3512,
    pulseLiveLeague: "yelo",
  },
  {
    splTeamId: "",
    splCode: "FSL",
    espnTeamId: "",
    nameEn: "Al-Faisaly",
    nameAr: "الفيصلي",
    city: "Harma",
    pulseLiveTeamId: 3514,
    pulseLiveLeague: "yelo",
  },
  {
    splTeamId: "",
    splCode: "SHL",
    espnTeamId: "",
    nameEn: "Al-Shoalah",
    nameAr: "الشعلة",
    city: "Sakaka",
    pulseLiveTeamId: 3515,
    pulseLiveLeague: "yelo",
  },
  {
    splTeamId: "",
    splCode: "NHD",
    espnTeamId: "",
    nameEn: "Al-Nahda",
    nameAr: "النهضة",
    city: "Riyadh",
    pulseLiveTeamId: 3516,
    pulseLiveLeague: "yelo",
  },
  {
    splTeamId: "",
    splCode: "NOM",
    espnTeamId: "",
    nameEn: "Neom SC",
    nameAr: "نيوم",
    city: "NEOM",
    pulseLiveTeamId: 3523,
    pulseLiveLeague: "yelo",
  },
];

export const SPL_CLUB_REGISTRY: SplClubEntry[] = [
  ...ROSHN_CLUBS,
  ...YELO_CLUBS,
];

export function findRegistryEntry(
  key: "splTeamId" | "espnTeamId" | "splCode" | "nameEn",
  value: string,
): SplClubEntry | undefined {
  return SPL_CLUB_REGISTRY.find((c) =>
    key === "nameEn"
      ? c.nameEn.toLowerCase() === value.toLowerCase()
      : c[key] === value,
  );
}

export function findByPulseLiveTeamId(
  pulseLiveTeamId: number,
): SplClubEntry | undefined {
  return SPL_CLUB_REGISTRY.find((c) => c.pulseLiveTeamId === pulseLiveTeamId);
}
