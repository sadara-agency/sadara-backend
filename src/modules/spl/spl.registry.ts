// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.registry.ts
// Static registry of all 18 SPL 2025/26 clubs.
// ─────────────────────────────────────────────────────────────

import { SplClubEntry } from "./spl.types";

export const SPL_CLUB_REGISTRY: SplClubEntry[] = [
  {
    splTeamId: "3093",
    splCode: "NSR",
    espnTeamId: "817",
    nameEn: "Al Nassr",
    nameAr: "النصر",
    city: "Riyadh",
  },
  {
    splTeamId: "3095",
    splCode: "HIL",
    espnTeamId: "929",
    nameEn: "Al Hilal",
    nameAr: "الهلال",
    city: "Riyadh",
  },
  {
    splTeamId: "3097",
    splCode: "AHL",
    espnTeamId: "8346",
    nameEn: "Al Ahli",
    nameAr: "الأهلي",
    city: "Jeddah",
  },
  {
    splTeamId: "3081",
    splCode: "ITD",
    espnTeamId: "804",
    nameEn: "Al Ittihad",
    nameAr: "الاتحاد",
    city: "Jeddah",
  },
  {
    splTeamId: "3094",
    splCode: "SHB",
    espnTeamId: "8344",
    nameEn: "Al Shabab",
    nameAr: "الشباب",
    city: "Riyadh",
  },
  {
    splTeamId: "3087",
    splCode: "TAW",
    espnTeamId: "8345",
    nameEn: "Al Taawoun",
    nameAr: "التعاون",
    city: "Buraidah",
  },
  {
    splTeamId: "3089",
    splCode: "QAD",
    espnTeamId: "18974",
    nameEn: "Al Qadsiah",
    nameAr: "القادسية",
    city: "Khobar",
  },
  {
    splTeamId: "3090",
    splCode: "RAE",
    espnTeamId: "8352",
    nameEn: "Al Raed",
    nameAr: "الرائد",
    city: "Buraidah",
  },
  {
    splTeamId: "3096",
    splCode: "FYH",
    espnTeamId: "18975",
    nameEn: "Al Fayha",
    nameAr: "الفيحاء",
    city: "Al Majmaah",
  },
  {
    splTeamId: "3086",
    splCode: "ETF",
    espnTeamId: "8347",
    nameEn: "Al Ettifaq",
    nameAr: "الاتفاق",
    city: "Dammam",
  },
  {
    splTeamId: "3082",
    splCode: "FTH",
    espnTeamId: "8348",
    nameEn: "Al Fateh",
    nameAr: "الفتح",
    city: "Al-Hasa",
  },
  {
    splTeamId: "3088",
    splCode: "RYD",
    espnTeamId: "8351",
    nameEn: "Al Riyadh",
    nameAr: "الرياض",
    city: "Riyadh",
  },
  {
    splTeamId: "3098",
    splCode: "KHJ",
    espnTeamId: "18972",
    nameEn: "Al Khaleej",
    nameAr: "الخليج",
    city: "Saihat",
  },
  {
    splTeamId: "3084",
    splCode: "KHL",
    espnTeamId: "18973",
    nameEn: "Al Kholood",
    nameAr: "الخلود",
    city: "Al-Hasa",
  },
  {
    splTeamId: "3083",
    splCode: "OKH",
    espnTeamId: "18971",
    nameEn: "Al Okhdood",
    nameAr: "الأخدود",
    city: "Najran",
  },
  {
    splTeamId: "3099",
    splCode: "HZM",
    espnTeamId: "18976",
    nameEn: "Al Hazem",
    nameAr: "الحزم",
    city: "Ar Rass",
  },
  {
    splTeamId: "3091",
    splCode: "ORB",
    espnTeamId: "18970",
    nameEn: "Al Orubah",
    nameAr: "العروبة",
    city: "Al Jawf",
  },
  {
    splTeamId: "3092",
    splCode: "NJM",
    espnTeamId: "18977",
    nameEn: "Al Najma",
    nameAr: "النجمة",
    city: "Unaizah",
  },
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
