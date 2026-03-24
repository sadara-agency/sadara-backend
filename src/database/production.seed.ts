// ─────────────────────────────────────────────────────────────
// src/database/production.seed.ts
// Production seed — creates the minimum data needed for the
// platform to be operational: admin user + SPL clubs.
// ─────────────────────────────────────────────────────────────
import bcrypt from "bcryptjs";
import { User } from "@modules/users/user.model";
import { Club } from "@modules/clubs/club.model";
import { env } from "@config/env";
import { logger } from "@config/logger";

// ── Admin User ──

const PROD_ADMIN_ID = "a0000001-0000-4000-a000-000000000001";
const DEFAULT_ADMIN_PASSWORD = "Sadara2025!";

export async function seedProdAdmin(): Promise<void> {
  const email = process.env.PROD_ADMIN_EMAIL || "admin@sadara.com";
  const password = process.env.PROD_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    logger.info(`Admin user ${email} already exists — skipping`);
    return;
  }

  const hash = await bcrypt.hash(password, env.bcrypt.saltRounds);

  await User.create({
    id: PROD_ADMIN_ID,
    email,
    passwordHash: hash,
    fullName: process.env.PROD_ADMIN_NAME || "System Admin",
    fullNameAr: process.env.PROD_ADMIN_NAME_AR || "مدير النظام",
    role: "Admin",
    isActive: true,
  });

  logger.info(`Admin user created: ${email}`);
}

// ── SPL Clubs (real reference data) ──

const SPL_CLUBS = [
  {
    id: "c0000001-0000-0000-0000-000000000001",
    name: "Al Hilal",
    nameAr: "الهلال",
    city: "Riyadh",
    primaryColor: "#003DA5",
    secondaryColor: "#FFFFFF",
    stadium: "Kingdom Arena",
    stadiumCapacity: 60000,
    foundedYear: 1957,
  },
  {
    id: "c0000001-0000-0000-0000-000000000002",
    name: "Al Nassr",
    nameAr: "النصر",
    city: "Riyadh",
    primaryColor: "#FFD700",
    secondaryColor: "#000080",
    stadium: "Al Awwal Park",
    stadiumCapacity: 25000,
    foundedYear: 1955,
  },
  {
    id: "c0000001-0000-0000-0000-000000000003",
    name: "Al Ahli",
    nameAr: "الأهلي",
    city: "Jeddah",
    primaryColor: "#006633",
    secondaryColor: "#FFFFFF",
    stadium: "King Abdullah Sports City",
    stadiumCapacity: 62000,
    foundedYear: 1937,
  },
  {
    id: "c0000001-0000-0000-0000-000000000004",
    name: "Al Ittihad",
    nameAr: "الاتحاد",
    city: "Jeddah",
    primaryColor: "#FFD700",
    secondaryColor: "#000000",
    stadium: "King Abdullah Sports City",
    stadiumCapacity: 62000,
    foundedYear: 1927,
  },
  {
    id: "c0000001-0000-0000-0000-000000000005",
    name: "Al Shabab",
    nameAr: "الشباب",
    city: "Riyadh",
    primaryColor: "#FFFFFF",
    secondaryColor: "#006400",
    stadium: "Al Shabab Stadium",
    stadiumCapacity: 25000,
    foundedYear: 1947,
  },
  {
    id: "c0000001-0000-0000-0000-000000000006",
    name: "Al Fateh",
    nameAr: "الفتح",
    city: "Al-Hasa",
    primaryColor: "#005A2B",
    secondaryColor: "#FFFFFF",
    stadium: "Prince Abdullah bin Jalawi",
    stadiumCapacity: 20000,
    foundedYear: 1946,
  },
  {
    id: "c0000001-0000-0000-0000-000000000007",
    name: "Al Taawoun",
    nameAr: "التعاون",
    city: "Buraidah",
    primaryColor: "#FFA500",
    secondaryColor: "#FFFFFF",
    stadium: "King Abdullah Sport City",
    stadiumCapacity: 25000,
    foundedYear: 1956,
  },
  {
    id: "c0000001-0000-0000-0000-000000000008",
    name: "Al Raed",
    nameAr: "الرائد",
    city: "Buraidah",
    primaryColor: "#FF0000",
    secondaryColor: "#FFFFFF",
    stadium: "King Abdullah Sport City",
    stadiumCapacity: 25000,
    foundedYear: 1954,
  },
  {
    id: "c0000001-0000-0000-0000-000000000009",
    name: "Al Ettifaq",
    nameAr: "الاتفاق",
    city: "Dammam",
    primaryColor: "#006400",
    secondaryColor: "#FFFFFF",
    stadium: "Prince Mohamed bin Fahd",
    stadiumCapacity: 35000,
    foundedYear: 1945,
  },
  {
    id: "c0000001-0000-0000-0000-000000000010",
    name: "Al Khaleej",
    nameAr: "الخليج",
    city: "Saihat",
    primaryColor: "#FF6600",
    secondaryColor: "#FFFFFF",
    stadium: "Al Khaleej Club Stadium",
    stadiumCapacity: 10000,
    foundedYear: 1945,
  },
  {
    id: "c0000001-0000-0000-0000-000000000011",
    name: "Al Riyadh",
    nameAr: "الرياض",
    city: "Riyadh",
    primaryColor: "#FFFFFF",
    secondaryColor: "#87CEEB",
    stadium: "Prince Faisal bin Fahd",
    stadiumCapacity: 22500,
    foundedYear: 1954,
  },
  {
    id: "c0000001-0000-0000-0000-000000000012",
    name: "Al Akhdoud",
    nameAr: "الأخدود",
    city: "Najran",
    primaryColor: "#800020",
    secondaryColor: "#FFFFFF",
    stadium: "Najran University Stadium",
    stadiumCapacity: 12000,
    foundedYear: 1981,
  },
  {
    id: "c0000001-0000-0000-0000-000000000013",
    name: "Al Fayha",
    nameAr: "الفيحاء",
    city: "Al Majma'ah",
    primaryColor: "#FFD700",
    secondaryColor: "#008000",
    stadium: "Al Majma'ah Sports City",
    stadiumCapacity: 10700,
    foundedYear: 1954,
  },
  {
    id: "c0000001-0000-0000-0000-000000000014",
    name: "Al Wehda",
    nameAr: "الوحدة",
    city: "Mecca",
    primaryColor: "#800080",
    secondaryColor: "#FFFFFF",
    stadium: "King Abdulaziz Sports City",
    stadiumCapacity: 38000,
    foundedYear: 1945,
  },
  {
    id: "c0000001-0000-0000-0000-000000000015",
    name: "Damac",
    nameAr: "ضمك",
    city: "Khamis Mushait",
    primaryColor: "#003366",
    secondaryColor: "#FFD700",
    stadium: "Prince Sultan bin Abdulaziz",
    stadiumCapacity: 18000,
    foundedYear: 1972,
  },
  {
    id: "c0000001-0000-0000-0000-000000000016",
    name: "Al Orubah",
    nameAr: "العروبة",
    city: "Al-Jawf",
    primaryColor: "#0000FF",
    secondaryColor: "#FFFFFF",
    stadium: "Al Orubah Club Stadium",
    stadiumCapacity: 8000,
    foundedYear: 1975,
  },
  {
    id: "c0000001-0000-0000-0000-000000000017",
    name: "Al Qadsiah",
    nameAr: "القادسية",
    city: "Khobar",
    primaryColor: "#FFD700",
    secondaryColor: "#000000",
    stadium: "Prince Saud bin Jalawi",
    stadiumCapacity: 16000,
    foundedYear: 1967,
  },
  {
    id: "c0000001-0000-0000-0000-000000000018",
    name: "Al Kholood",
    nameAr: "الخلود",
    city: "Al-Ahsa",
    primaryColor: "#00BFFF",
    secondaryColor: "#FFFFFF",
    stadium: "Al Kholood Club Stadium",
    stadiumCapacity: 8000,
    foundedYear: 1953,
  },
].map((c) => ({
  ...c,
  league: "Saudi Pro League",
  type: "Club" as const,
  country: "Saudi Arabia",
  isActive: true,
}));

export async function seedProdClubs(): Promise<void> {
  const existing = await Club.count();
  if (existing >= SPL_CLUBS.length) {
    logger.info(`${existing} clubs already exist — skipping club seed`);
    return;
  }

  await Club.bulkCreate(SPL_CLUBS, { ignoreDuplicates: true });
  logger.info(`Seeded ${SPL_CLUBS.length} SPL clubs`);
}
