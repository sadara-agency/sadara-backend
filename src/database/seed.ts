// ─────────────────────────────────────────────────────────────
// src/database/seed.ts
// Consolidated seed — seeds ALL data needed to test the full
// platform in a single idempotent run.
//
// ⚠️  DEVELOPMENT-ONLY FIXTURES ⚠️
// The user accounts seeded below use placeholder @sadara.com email
// addresses (admin@sadara.com, agent@sadara.com, etc.). They are NOT
// real accounts and must never exist in production. Production boots
// are protected by src/database/validate-production.ts which rejects
// any @sadara.com address, and seedDatabase() refuses to run when
// NODE_ENV === "production".
// ─────────────────────────────────────────────────────────────
import bcrypt from "bcryptjs";
import { sequelize } from "@config/database";
import { env } from "@config/env";
import { logger } from "@config/logger";
import { QueryTypes, Transaction } from "sequelize";

// Shared seed functions (permissions + approval chains + package configs)
import {
  seedPermissions,
  seedApprovalChains,
  seedPackageConfigs,
} from "./seed-shared";

// Models
import { User } from "@modules/users/user.model";
import { Club } from "@modules/clubs/club.model";
import { Player } from "@modules/players/player.model";
import { Contract } from "@modules/contracts/contract.model";
import { Match } from "@modules/matches/match.model";
import { MatchPlayer } from "@modules/matches/matchPlayer.model";
import { PlayerMatchStats } from "@modules/matches/playerMatchStats.model";
import { Offer } from "@modules/offers/offer.model";
import { Task } from "@modules/tasks/task.model";
import { Invoice, Payment, Valuation } from "@modules/finance/finance.model";
import { Document } from "@modules/documents/document.model";
import { Gate, GateChecklist } from "@modules/gates/gate.model";
import { Referral } from "@modules/referrals/referral.model";
import { Watchlist } from "@modules/scouting/scouting.model";
import { ApprovalRequest } from "@modules/approvals/approval.model";
import { ApprovalStep } from "@modules/approvals/approvalStep.model";
import { Injury } from "@modules/injuries/injury.model";
import { InjuryUpdate } from "@modules/injuries/injury.model";
import {
  TrainingCourse,
  TrainingEnrollment,
} from "@modules/training/training.model";
import {
  WellnessProfile,
  WellnessWeightLog,
  WellnessMealLog,
} from "@modules/wellness/wellness.model";

import { IDS } from "./ids";
import { seedNotionData } from "./seedNotionData";

// ── Helpers ──

const rand = (min: number, max: number) =>
  min + Math.floor(Math.random() * (max - min));

/** Relative date from today (negative = past, positive = future) */
function relDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// Permissions and approval chain data are in ./seed-shared.ts

/**
 * Seed all data inside a transaction for atomicity.
 */
async function seedAllData(tx: Transaction): Promise<void> {
  const opts = { ignoreDuplicates: true, transaction: tx } as const;
  const hash = await bcrypt.hash("Sadara2025!", env.bcrypt.saltRounds);

  // ── 1. Users (18) ──
  await User.bulkCreate(
    [
      {
        id: IDS.users.admin,
        email: "admin@sadara.com",
        passwordHash: hash,
        fullName: "Abdulaziz Al-Rashid",
        fullNameAr: "عبدالعزيز الراشد",
        role: "Admin",
        isActive: true,
      },
      {
        id: IDS.users.agent,
        email: "agent@sadara.com",
        passwordHash: hash,
        fullName: "Faisal Al-Dosari",
        fullNameAr: "فيصل الدوسري",
        role: "Manager",
        isActive: true,
      },
      {
        id: IDS.users.analyst,
        email: "analyst@sadara.com",
        passwordHash: hash,
        fullName: "Nora Al-Otaibi",
        fullNameAr: "نورة العتيبي",
        role: "Analyst",
        isActive: true,
      },
      {
        id: IDS.users.scout,
        email: "scout@sadara.com",
        passwordHash: hash,
        fullName: "Khalid Al-Ghamdi",
        fullNameAr: "خالد الغامدي",
        role: "Scout",
        isActive: true,
      },
      {
        id: IDS.users.player,
        email: "salem@sadara.com",
        passwordHash: hash,
        fullName: "Salem Al-Dawsari",
        fullNameAr: "سالم الدوسري",
        role: "Player",
        isActive: true,
        playerId: IDS.players[0],
      },
      {
        id: IDS.users.legal,
        email: "legal@sadara.com",
        passwordHash: hash,
        fullName: "Sara Al-Harbi",
        fullNameAr: "سارة الحربي",
        role: "Legal",
        isActive: true,
      },
      {
        id: IDS.users.finance,
        email: "finance@sadara.com",
        passwordHash: hash,
        fullName: "Mohammed Al-Shehri",
        fullNameAr: "محمد الشهري",
        role: "Finance",
        isActive: true,
      },
      {
        id: IDS.users.coach,
        email: "coach@sadara.com",
        passwordHash: hash,
        fullName: "Hassan Al-Mutairi",
        fullNameAr: "حسن المطيري",
        role: "Coach",
        isActive: true,
      },
      {
        id: IDS.users.media,
        email: "media@sadara.com",
        passwordHash: hash,
        fullName: "Reem Al-Qahtani",
        fullNameAr: "ريم القحطاني",
        role: "Media",
        isActive: true,
      },
      {
        id: IDS.users.executive,
        email: "executive@sadara.com",
        passwordHash: hash,
        fullName: "Turki Al-Faisal",
        fullNameAr: "تركي الفيصل",
        role: "Executive",
        isActive: true,
      },
      {
        id: IDS.users.agent2,
        email: "agent2@sadara.com",
        passwordHash: hash,
        fullName: "Salman Al-Subaie",
        fullNameAr: "سلمان السبيعي",
        role: "Manager",
        isActive: true,
      },
      {
        id: IDS.users.coach2,
        email: "coach2@sadara.com",
        passwordHash: hash,
        fullName: "Majed Al-Anazi",
        fullNameAr: "ماجد العنزي",
        role: "Coach",
        isActive: true,
      },
      {
        id: IDS.users.analyst2,
        email: "analyst2@sadara.com",
        passwordHash: hash,
        fullName: "Huda Al-Shamrani",
        fullNameAr: "هدى الشمراني",
        role: "Analyst",
        isActive: true,
      },
      {
        id: IDS.users.scout2,
        email: "scout2@sadara.com",
        passwordHash: hash,
        fullName: "Rashid Al-Dosari",
        fullNameAr: "راشد الدوسري",
        role: "Scout",
        isActive: true,
      },
      {
        id: IDS.users.legal2,
        email: "legal2@sadara.com",
        passwordHash: hash,
        fullName: "Lama Al-Otaibi",
        fullNameAr: "لمى العتيبي",
        role: "Legal",
        isActive: true,
      },
      {
        id: IDS.users.player2,
        email: "yasser@sadara.com",
        passwordHash: hash,
        fullName: "Yasser Al-Shahrani",
        fullNameAr: "ياسر الشهراني",
        role: "Player",
        isActive: true,
        playerId: IDS.players[1],
      },
      {
        id: IDS.users.player3,
        email: "firas@sadara.com",
        passwordHash: hash,
        fullName: "Firas Al-Buraikan",
        fullNameAr: "فراس البريكان",
        role: "Player",
        isActive: true,
        playerId: IDS.players[3],
      },
    ],
    opts,
  );
  console.log("  ✅ Users seeded (17 accounts)");

  // ── 2. Clubs (18 SPL) ──
  const SPL_CLUBS = [
    {
      id: IDS.clubs.alHilal,
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
      id: IDS.clubs.alNassr,
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
      id: IDS.clubs.alAhli,
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
      id: IDS.clubs.alIttihad,
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
      id: IDS.clubs.alShabab,
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
      id: IDS.clubs.alFateh,
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
      id: IDS.clubs.alTaawoun,
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
      id: IDS.clubs.alRaed,
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
      id: IDS.clubs.alEttifaq,
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
      id: IDS.clubs.alKhaleej,
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
      id: IDS.clubs.alRiyadh,
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
      id: IDS.clubs.alAkhdoud,
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
      id: IDS.clubs.alFayha,
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
      id: IDS.clubs.alWehda,
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
      id: IDS.clubs.damac,
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
      id: IDS.clubs.alOrubah,
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
      id: IDS.clubs.alQadsiah,
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
      id: IDS.clubs.alKholood,
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

  await Club.bulkCreate(SPL_CLUBS, opts);
  console.log("  ✅ Clubs seeded (18 SPL teams)");

  // ── 3. Players (20) ──
  const playerDefs = [
    {
      firstName: "Salem",
      lastName: "Al-Dawsari",
      firstNameAr: "سالم",
      lastNameAr: "الدوسري",
      dob: "1991-08-19",
      pos: "LW",
      type: "Pro" as const,
      clubId: IDS.clubs.alHilal,
      value: 12000000,
      email: "salem@sadara.com",
    },
    {
      firstName: "Yasser",
      lastName: "Al-Shahrani",
      firstNameAr: "ياسر",
      lastNameAr: "الشهراني",
      dob: "1992-05-25",
      pos: "LB",
      type: "Pro" as const,
      clubId: IDS.clubs.alHilal,
      value: 8000000,
    },
    {
      firstName: "Abdulrahman",
      lastName: "Ghareeb",
      firstNameAr: "عبدالرحمن",
      lastNameAr: "غريب",
      dob: "1997-03-11",
      pos: "RW",
      type: "Pro" as const,
      clubId: IDS.clubs.alAhli,
      value: 7000000,
    },
    {
      firstName: "Firas",
      lastName: "Al-Buraikan",
      firstNameAr: "فراس",
      lastNameAr: "البريكان",
      dob: "2000-05-14",
      pos: "ST",
      type: "Pro" as const,
      clubId: IDS.clubs.alAhli,
      value: 9500000,
    },
    {
      firstName: "Saud",
      lastName: "Abdulhamid",
      firstNameAr: "سعود",
      lastNameAr: "عبدالحميد",
      dob: "1999-07-18",
      pos: "RB",
      type: "Pro" as const,
      clubId: IDS.clubs.alHilal,
      value: 6500000,
    },
    {
      firstName: "Abdullah",
      lastName: "Al-Hamdan",
      firstNameAr: "عبدالله",
      lastNameAr: "الحمدان",
      dob: "1999-09-13",
      pos: "ST",
      type: "Pro" as const,
      clubId: IDS.clubs.alIttihad,
      value: 5500000,
    },
    {
      firstName: "Hassan",
      lastName: "Kadesh",
      firstNameAr: "حسن",
      lastNameAr: "كادش",
      dob: "1992-10-30",
      pos: "CM",
      type: "Pro" as const,
      clubId: IDS.clubs.alShabab,
      value: 3500000,
    },
    {
      firstName: "Nawaf",
      lastName: "Al-Abed",
      firstNameAr: "نواف",
      lastNameAr: "العابد",
      dob: "1990-01-26",
      pos: "AM",
      type: "Pro" as const,
      clubId: IDS.clubs.alHilal,
      value: 4000000,
    },
    {
      firstName: "Turki",
      lastName: "Al-Ammar",
      firstNameAr: "تركي",
      lastNameAr: "العمار",
      dob: "1997-06-20",
      pos: "CM",
      type: "Pro" as const,
      clubId: IDS.clubs.alNassr,
      value: 3000000,
    },
    {
      firstName: "Mohammed",
      lastName: "Kanno",
      firstNameAr: "محمد",
      lastNameAr: "كنو",
      dob: "1994-09-22",
      pos: "CM",
      type: "Pro" as const,
      clubId: IDS.clubs.alHilal,
      value: 7500000,
    },
    {
      firstName: "Musab",
      lastName: "Al-Juwayr",
      firstNameAr: "مصعب",
      lastNameAr: "الجويعر",
      dob: "2006-03-15",
      pos: "RW",
      type: "Youth" as const,
      clubId: IDS.clubs.alNassr,
      value: 500000,
    },
    {
      firstName: "Ali",
      lastName: "Al-Hassan",
      firstNameAr: "علي",
      lastNameAr: "الحسن",
      dob: "2007-07-20",
      pos: "CB",
      type: "Youth" as const,
      clubId: IDS.clubs.alAhli,
      value: 350000,
    },
    {
      firstName: "Omar",
      lastName: "Al-Ghamdi",
      firstNameAr: "عمر",
      lastNameAr: "الغامدي",
      dob: "2006-11-02",
      pos: "GK",
      type: "Youth" as const,
      clubId: IDS.clubs.alIttihad,
      value: 250000,
    },
    {
      firstName: "Rayan",
      lastName: "Al-Mutairi",
      firstNameAr: "ريان",
      lastNameAr: "المطيري",
      dob: "2005-08-09",
      pos: "ST",
      type: "Youth" as const,
      clubId: IDS.clubs.alShabab,
      value: 600000,
    },
    {
      firstName: "Fahad",
      lastName: "Al-Qahtani",
      firstNameAr: "فهد",
      lastNameAr: "القحطاني",
      dob: "2007-01-25",
      pos: "LB",
      type: "Youth" as const,
      clubId: IDS.clubs.alFateh,
      value: 200000,
    },
    {
      firstName: "Abdulaziz",
      lastName: "Al-Bishi",
      firstNameAr: "عبدالعزيز",
      lastNameAr: "البيشي",
      dob: "1996-04-10",
      pos: "CDM",
      type: "Pro" as const,
      clubId: IDS.clubs.alNassr,
      value: 5000000,
      agent: "agent2" as const,
    },
    {
      firstName: "Khalid",
      lastName: "Al-Ghannam",
      firstNameAr: "خالد",
      lastNameAr: "الغنام",
      dob: "1998-12-05",
      pos: "RW",
      type: "Pro" as const,
      clubId: IDS.clubs.alIttihad,
      value: 4500000,
      agent: "agent2" as const,
    },
    {
      firstName: "Saad",
      lastName: "Al-Shehri",
      firstNameAr: "سعد",
      lastNameAr: "الشهري",
      dob: "2000-02-18",
      pos: "ST",
      type: "Pro" as const,
      clubId: IDS.clubs.alTaawoun,
      value: 3000000,
    },
    {
      firstName: "Talal",
      lastName: "Al-Absi",
      firstNameAr: "طلال",
      lastNameAr: "العبسي",
      dob: "2005-06-30",
      pos: "CB",
      type: "Youth" as const,
      clubId: IDS.clubs.alHilal,
      value: 400000,
      agent: "agent2" as const,
    },
    {
      firstName: "Ziyad",
      lastName: "Al-Sahafi",
      firstNameAr: "زياد",
      lastNameAr: "الصحفي",
      dob: "2006-09-14",
      pos: "AM",
      type: "Youth" as const,
      clubId: IDS.clubs.alRaed,
      value: 300000,
    },
  ];

  await Player.bulkCreate(
    playerDefs.map((p, i) => ({
      id: IDS.players[i],
      firstName: p.firstName,
      lastName: p.lastName,
      firstNameAr: p.firstNameAr,
      lastNameAr: p.lastNameAr,
      email: (p as any).email ?? null,
      dateOfBirth: p.dob,
      nationality: "Saudi Arabia",
      playerType: p.type,
      position: p.pos,
      currentClubId: p.clubId,
      agentId:
        (p as any).agent === "agent2" ? IDS.users.agent2 : IDS.users.agent,
      coachId: i % 2 === 0 ? IDS.users.coach : IDS.users.coach2,
      analystId: i % 2 === 0 ? IDS.users.analyst : IDS.users.analyst2,
      marketValue: p.value,
      marketValueCurrency: "SAR" as const,
      heightCm: rand(170, 192),
      weightKg: rand(65, 90),
      status: "active" as const,
      speed: rand(50, 90),
      passing: rand(50, 90),
      shooting: rand(50, 90),
      defense: rand(50, 90),
      fitness: rand(60, 90),
      tactical: rand(50, 90),
      createdBy: IDS.users.admin,
    })),
    opts,
  );
  console.log("  ✅ Players seeded (12 Pro + 8 Youth)");

  // ── 4. Contracts (12) ──
  const contractDefs = [
    {
      pid: 0,
      club: "alHilal",
      type: "Representation",
      start: "2024-01-01",
      end: "2027-06-30",
      salary: 2500000,
      comm: 10,
      status: "Active",
    },
    {
      pid: 1,
      club: "alHilal",
      type: "Representation",
      start: "2024-06-01",
      end: "2026-05-31",
      salary: 1800000,
      comm: 8,
      status: "Active",
    },
    {
      pid: 2,
      club: "alAhli",
      type: "CareerManagement",
      start: "2023-07-01",
      end: "2026-06-30",
      salary: 1500000,
      comm: 12,
      status: "Active",
    },
    {
      pid: 3,
      club: "alAhli",
      type: "Representation",
      start: "2025-01-01",
      end: "2028-12-31",
      salary: 2200000,
      comm: 10,
      status: "Active",
    },
    {
      pid: 4,
      club: "alHilal",
      type: "Representation",
      start: "2024-03-01",
      end: "2026-04-15",
      salary: 1400000,
      comm: 8,
      status: "Expiring Soon",
    },
    {
      pid: 5,
      club: "alIttihad",
      type: "Representation",
      start: "2023-01-01",
      end: "2026-01-01",
      salary: 1200000,
      comm: 10,
      status: "Expired",
    },
    {
      pid: 6,
      club: "alShabab",
      type: "CareerManagement",
      start: "2025-02-01",
      end: "2028-01-31",
      salary: 900000,
      comm: 15,
      status: "Active",
    },
    {
      pid: 7,
      club: "alHilal",
      type: "Representation",
      start: "2024-07-01",
      end: "2026-06-30",
      salary: 1000000,
      comm: 8,
      status: "Active",
    },
    {
      pid: 8,
      club: "alNassr",
      type: "Transfer",
      start: "2025-01-15",
      end: "2027-01-14",
      salary: 800000,
      comm: 10,
      status: "Draft",
    },
    {
      pid: 9,
      club: "alHilal",
      type: "Representation",
      start: "2024-08-01",
      end: "2027-07-31",
      salary: 1700000,
      comm: 10,
      status: "Active",
    },
    {
      pid: 10,
      club: "alNassr",
      type: "Representation",
      start: "2025-01-01",
      end: "2029-12-31",
      salary: 200000,
      comm: 15,
      status: "Active",
    },
    {
      pid: 13,
      club: "alShabab",
      type: "CareerManagement",
      start: "2025-03-01",
      end: "2030-02-28",
      salary: 250000,
      comm: 15,
      status: "Active",
    },
  ];

  await Contract.bulkCreate(
    contractDefs.map((c, i) => ({
      id: IDS.contracts[i],
      playerId: IDS.players[c.pid],
      clubId: (IDS.clubs as any)[c.club],
      category: "Club" as const,
      contractType: c.type as any,
      status: c.status as any,
      title: `${c.type} Agreement`,
      startDate: c.start,
      endDate: c.end,
      baseSalary: c.salary,
      salaryCurrency: "SAR" as const,
      commissionPct: c.comm,
      totalCommission: Math.round(c.salary * (c.comm / 100)),
      signingBonus: Math.round(c.salary * 0.05),
      performanceBonus: Math.round(c.salary * 0.1),
      exclusivity: "Exclusive" as const,
      representationScope: "Both" as const,
      createdBy: IDS.users.admin,
    })),
    opts,
  );
  console.log("  ✅ Contracts seeded (12)");

  // ── 5. Matches (8) ──
  // Dates include kickoff times (stored in UTC; +3h = Saudi local time)
  const matchDefs = [
    {
      home: "alHilal",
      away: "alNassr",
      date: "2026-03-05T17:00:00Z",
      comp: "Saudi Pro League",
      status: "upcoming",
    },
    {
      home: "alAhli",
      away: "alIttihad",
      date: "2026-03-08T15:00:00Z",
      comp: "Saudi Pro League",
      status: "upcoming",
    },
    {
      home: "alShabab",
      away: "alFateh",
      date: "2026-03-12T16:30:00Z",
      comp: "Saudi Pro League",
      status: "upcoming",
    },
    {
      home: "alHilal",
      away: "alAhli",
      date: "2026-02-20T17:00:00Z",
      comp: "Saudi Pro League",
      status: "completed",
      hs: 2,
      as: 1,
    },
    {
      home: "alNassr",
      away: "alShabab",
      date: "2026-02-15T15:30:00Z",
      comp: "Saudi Pro League",
      status: "completed",
      hs: 3,
      as: 0,
    },
    {
      home: "alIttihad",
      away: "alTaawoun",
      date: "2026-02-10T14:00:00Z",
      comp: "Saudi Pro League",
      status: "completed",
      hs: 1,
      as: 1,
    },
    {
      home: "alHilal",
      away: "alIttihad",
      date: "2026-03-20T18:00:00Z",
      comp: "King's Cup",
      status: "upcoming",
    },
    {
      home: "alRaed",
      away: "alFateh",
      date: "2026-03-22T16:00:00Z",
      comp: "Saudi Pro League",
      status: "upcoming",
    },
  ];

  await Match.bulkCreate(
    matchDefs.map((m, i) => ({
      id: IDS.matches[i],
      homeClubId: (IDS.clubs as any)[m.home],
      awayClubId: (IDS.clubs as any)[m.away],
      matchDate: new Date(m.date),
      competition: m.comp,
      season: "2025-26",
      status: m.status as any,
      homeScore: (m as any).hs ?? null,
      awayScore: (m as any).as ?? null,
      venue: "TBD",
    })),
    opts,
  );
  console.log("  ✅ Matches seeded (8)");

  // ── 6. Offers (5) ──
  const offerDefs = [
    {
      pid: 0,
      from: "alNassr",
      to: "alHilal",
      fee: 15000000,
      status: "Under Review",
      type: "Transfer",
    },
    {
      pid: 3,
      from: "alIttihad",
      to: "alAhli",
      fee: 12000000,
      status: "Negotiation",
      type: "Transfer",
    },
    {
      pid: 6,
      from: "alHilal",
      to: "alShabab",
      fee: 4000000,
      status: "New",
      type: "Transfer",
    },
    {
      pid: 8,
      from: "alAhli",
      to: "alNassr",
      fee: 0,
      status: "New",
      type: "Loan",
    },
    {
      pid: 4,
      from: "alNassr",
      to: "alHilal",
      fee: 8000000,
      status: "Closed",
      type: "Transfer",
    },
  ];

  await Offer.bulkCreate(
    offerDefs.map((o, i) => ({
      id: IDS.offers[i],
      playerId: IDS.players[o.pid],
      fromClubId: (IDS.clubs as any)[o.from],
      toClubId: (IDS.clubs as any)[o.to],
      offerType: o.type as any,
      status: o.status as any,
      transferFee: o.fee,
      salaryOffered: Math.round(o.fee * 0.15),
      contractYears: 3,
      feeCurrency: "SAR",
      deadline: "2026-04-30",
      createdBy: IDS.users.agent,
    })),
    opts,
  );
  console.log("  ✅ Offers seeded (5)");

  // ── 7. Tasks (8) ──
  const taskDefs = [
    {
      title: "Renew Salem Al-Dawsari contract",
      titleAr: "تجديد عقد سالم الدوسري",
      type: "Contract",
      priority: "critical",
      status: "Open",
      pid: 0,
      due: "2026-03-15",
    },
    {
      title: "Medical checkup for Yasser Al-Shahrani",
      titleAr: "فحص طبي ياسر الشهراني",
      type: "Health",
      priority: "high",
      status: "InProgress",
      pid: 1,
      due: "2026-03-10",
    },
    {
      title: "Scouting report: Al Ahli midfield",
      titleAr: "تقرير استكشاف: وسط الأهلي",
      type: "Report",
      priority: "medium",
      status: "Open",
      pid: null,
      due: "2026-03-20",
    },
    {
      title: "Follow up on Al Nassr offer",
      titleAr: "متابعة عرض النصر",
      type: "Offer",
      priority: "high",
      status: "Open",
      pid: 0,
      due: "2026-03-05",
    },
    {
      title: "Prepare Firas Al-Buraikan highlight reel",
      titleAr: "إعداد فيديو فراس البريكان",
      type: "General",
      priority: "medium",
      status: "Completed",
      pid: 3,
      due: "2026-02-28",
    },
    {
      title: "Match preparation: Al Hilal vs Al Nassr",
      titleAr: "تحضير مباراة: الهلال ضد النصر",
      type: "Match",
      priority: "high",
      status: "Open",
      pid: null,
      due: "2026-03-04",
    },
    {
      title: "Commission payment follow-up",
      titleAr: "متابعة دفع العمولة",
      type: "General",
      priority: "medium",
      status: "Open",
      pid: null,
      due: "2026-03-25",
    },
    {
      title: "Youth player evaluation: Musab",
      titleAr: "تقييم لاعب شاب: مصعب",
      type: "Report",
      priority: "low",
      status: "Open",
      pid: 10,
      due: "2026-04-01",
    },
  ];

  await Task.bulkCreate(
    taskDefs.map((t, i) => ({
      id: IDS.tasks[i],
      title: t.title,
      titleAr: t.titleAr,
      type: t.type as any,
      priority: t.priority as any,
      status: t.status as any,
      playerId: t.pid !== null ? IDS.players[t.pid] : null,
      assignedTo: IDS.users.agent,
      assignedBy: IDS.users.admin,
      dueDate: t.due,
    })),
    opts,
  );
  console.log("  ✅ Tasks seeded (8)");

  // ── 8. Finance (invoices, payments, valuations) ──
  await Invoice.bulkCreate(
    [
      {
        id: IDS.invoices[0],
        invoiceNumber: "INV-2026-0001",
        playerId: IDS.players[0],
        clubId: IDS.clubs.alHilal,
        amount: 250000,
        taxAmount: 37500,
        totalAmount: 287500,
        currency: "SAR",
        status: "Paid" as any,
        issueDate: "2025-12-01",
        dueDate: "2026-01-01",
        paidDate: "2025-12-28",
        description: "Commission payment",
        createdBy: IDS.users.admin,
      },
      {
        id: IDS.invoices[1],
        invoiceNumber: "INV-2026-0002",
        playerId: IDS.players[2],
        clubId: IDS.clubs.alAhli,
        amount: 180000,
        taxAmount: 27000,
        totalAmount: 207000,
        currency: "SAR",
        status: "Expected" as any,
        issueDate: "2026-02-01",
        dueDate: "2026-03-01",
        paidDate: null,
        description: "Commission payment",
        createdBy: IDS.users.admin,
      },
      {
        id: IDS.invoices[2],
        invoiceNumber: "INV-2026-0003",
        playerId: IDS.players[3],
        clubId: IDS.clubs.alAhli,
        amount: 220000,
        taxAmount: 33000,
        totalAmount: 253000,
        currency: "SAR",
        status: "Overdue" as any,
        issueDate: "2025-11-01",
        dueDate: "2025-12-01",
        paidDate: null,
        description: "Commission payment",
        createdBy: IDS.users.admin,
      },
      {
        id: IDS.invoices[3],
        invoiceNumber: "INV-2026-0004",
        playerId: IDS.players[9],
        clubId: IDS.clubs.alHilal,
        amount: 170000,
        taxAmount: 25500,
        totalAmount: 195500,
        currency: "SAR",
        status: "Paid" as any,
        issueDate: "2026-01-15",
        dueDate: "2026-02-15",
        paidDate: "2026-02-10",
        description: "Commission payment",
        createdBy: IDS.users.admin,
      },
    ],
    opts,
  );

  await Payment.bulkCreate(
    [
      {
        id: IDS.payments[0],
        invoiceId: IDS.invoices[0],
        playerId: IDS.players[0],
        amount: 250000,
        currency: "SAR",
        paymentType: "Commission" as any,
        status: "Paid" as any,
        dueDate: "2026-01-01",
        paidDate: "2025-12-28",
      },
      {
        id: IDS.payments[1],
        invoiceId: IDS.invoices[1],
        playerId: IDS.players[0],
        amount: 50000,
        currency: "SAR",
        paymentType: "Bonus" as any,
        status: "Paid" as any,
        dueDate: "2025-12-15",
        paidDate: "2025-12-15",
      },
      {
        id: IDS.payments[2],
        invoiceId: IDS.invoices[2],
        playerId: IDS.players[9],
        amount: 170000,
        currency: "SAR",
        paymentType: "Commission" as any,
        status: "Paid" as any,
        dueDate: "2026-02-15",
        paidDate: "2026-02-10",
      },
      {
        id: IDS.payments[3],
        invoiceId: IDS.invoices[3],
        playerId: IDS.players[2],
        amount: 180000,
        currency: "SAR",
        paymentType: "Commission" as any,
        status: "Expected" as any,
        dueDate: "2026-03-01",
        paidDate: null,
      },
      {
        id: IDS.payments[4],
        invoiceId: null,
        playerId: IDS.players[3],
        amount: 220000,
        currency: "SAR",
        paymentType: "Commission" as any,
        status: "Overdue" as any,
        dueDate: "2025-12-01",
        paidDate: null,
      },
      {
        id: IDS.payments[5],
        invoiceId: null,
        playerId: IDS.players[6],
        amount: 135000,
        currency: "SAR",
        paymentType: "Commission" as any,
        status: "Paid" as any,
        dueDate: "2026-01-15",
        paidDate: "2026-01-14",
      },
    ],
    opts,
  );

  const trends = [
    "up",
    "stable",
    "up",
    "up",
    "stable",
    "down",
    "stable",
    "down",
    "up",
    "stable",
  ] as const;
  const values = [12e6, 8e6, 7e6, 9.5e6, 6.5e6, 5.5e6, 3.5e6, 4e6, 3e6, 7.5e6];
  await Valuation.bulkCreate(
    IDS.players.slice(0, 10).map((pid, i) => ({
      playerId: pid,
      value: values[i],
      currency: "SAR",
      source: "Internal Assessment",
      trend: trends[i],
      valuedAt: "2026-02-01",
    })),
    opts,
  );
  console.log("  ✅ Finance seeded (4 invoices, 6 payments, 10 valuations)");

  // ── 9. Documents (5) ──
  const docDefs = [
    {
      pid: 0,
      name: "Salem Al-Dawsari - Passport",
      type: "Passport",
      status: "Valid",
      expiry: "2029-05-15",
    },
    {
      pid: 0,
      name: "Salem Al-Dawsari - Representation Contract",
      type: "Contract",
      status: "Active",
      expiry: "2027-06-30",
    },
    {
      pid: 3,
      name: "Firas Al-Buraikan - Medical Report",
      type: "Medical",
      status: "Active",
      expiry: "2026-06-30",
    },
    {
      pid: 1,
      name: "Yasser Al-Shahrani - National ID",
      type: "ID",
      status: "Valid",
      expiry: "2030-01-01",
    },
    {
      pid: 10,
      name: "Musab Al-Juwayr - Youth Academy Agreement",
      type: "Agreement",
      status: "Pending",
      expiry: "2029-12-31",
    },
  ];

  await Document.bulkCreate(
    docDefs.map((d, i) => ({
      id: IDS.documents[i],
      playerId: IDS.players[d.pid],
      name: d.name,
      type: d.type as any,
      status: d.status as any,
      fileUrl: `/uploads/docs/${d.type.toLowerCase()}-${i + 1}.pdf`,
      fileSize: 1024000 + Math.floor(Math.random() * 5000000),
      mimeType: "application/pdf",
      expiryDate: d.expiry,
      uploadedBy: IDS.users.admin,
    })),
    opts,
  );
  console.log("  ✅ Documents seeded (5)");

  // ── 10. Gates + checklists ──
  await Gate.bulkCreate(
    [
      {
        id: IDS.gates[0],
        playerId: IDS.players[0],
        gateNumber: "0" as any,
        status: "Completed" as any,
        approvedBy: IDS.users.admin,
      },
      {
        id: IDS.gates[1],
        playerId: IDS.players[0],
        gateNumber: "1" as any,
        status: "Completed" as any,
        approvedBy: IDS.users.admin,
      },
      {
        id: IDS.gates[2],
        playerId: IDS.players[0],
        gateNumber: "2" as any,
        status: "InProgress" as any,
        approvedBy: null,
      },
      {
        id: IDS.gates[3],
        playerId: IDS.players[10],
        gateNumber: "0" as any,
        status: "Completed" as any,
        approvedBy: null,
      },
    ],
    opts,
  );

  await GateChecklist.bulkCreate(
    [
      {
        gateId: IDS.gates[0],
        item: "Collect player identification documents (ID / Passport)",
        isCompleted: true,
        isMandatory: true,
        sortOrder: 1,
      },
      {
        gateId: IDS.gates[0],
        item: "Obtain signed representation agreement",
        isCompleted: true,
        isMandatory: true,
        sortOrder: 2,
      },
      {
        gateId: IDS.gates[0],
        item: "Complete medical examination",
        isCompleted: true,
        isMandatory: true,
        sortOrder: 3,
      },
      {
        gateId: IDS.gates[0],
        item: "Upload player photo & profile data",
        isCompleted: true,
        isMandatory: false,
        sortOrder: 4,
      },
      {
        gateId: IDS.gates[1],
        item: "Complete initial performance assessment",
        isCompleted: true,
        isMandatory: true,
        sortOrder: 1,
      },
      {
        gateId: IDS.gates[1],
        item: "Create Individual Development Plan (IDP)",
        isCompleted: true,
        isMandatory: true,
        sortOrder: 2,
      },
      {
        gateId: IDS.gates[1],
        item: "Set short-term performance goals",
        isCompleted: true,
        isMandatory: true,
        sortOrder: 3,
      },
      {
        gateId: IDS.gates[1],
        item: "Record baseline statistics",
        isCompleted: true,
        isMandatory: false,
        sortOrder: 4,
      },
      {
        gateId: IDS.gates[2],
        item: "Mid-season performance review",
        isCompleted: true,
        isMandatory: true,
        sortOrder: 1,
      },
      {
        gateId: IDS.gates[2],
        item: "Update market valuation",
        isCompleted: true,
        isMandatory: true,
        sortOrder: 2,
      },
      {
        gateId: IDS.gates[2],
        item: "Review IDP progress & adjust goals",
        isCompleted: false,
        isMandatory: true,
        sortOrder: 3,
      },
      {
        gateId: IDS.gates[2],
        item: "Stakeholder feedback report",
        isCompleted: false,
        isMandatory: false,
        sortOrder: 4,
      },
      {
        gateId: IDS.gates[3],
        item: "Identity verification",
        isCompleted: true,
        isMandatory: true,
        sortOrder: 1,
      },
      {
        gateId: IDS.gates[3],
        item: "Medical clearance",
        isCompleted: true,
        isMandatory: true,
        sortOrder: 2,
      },
    ],
    opts,
  );
  console.log("  ✅ Gates seeded (4 gates + 14 checklist items)");

  // ── 11. Referrals (3) ──
  await Referral.bulkCreate(
    [
      {
        id: IDS.referrals[0],
        referralType: "Medical" as any,
        playerId: IDS.players[1],
        triggerDesc: "Recurring knee pain after training",
        status: "Open" as any,
        priority: "High" as any,
        assignedTo: IDS.users.analyst,
        createdBy: IDS.users.agent,
      },
      {
        id: IDS.referrals[1],
        referralType: "Performance" as any,
        playerId: IDS.players[6],
        triggerDesc: "Declining match performance over 3 games",
        status: "InProgress" as any,
        priority: "Medium" as any,
        assignedTo: IDS.users.analyst,
        createdBy: IDS.users.agent,
      },
      {
        id: IDS.referrals[2],
        referralType: "Mental" as any,
        playerId: IDS.players[3],
        triggerDesc: "Post-match anxiety, resolved with counseling",
        status: "Closed" as any,
        priority: "Low" as any,
        assignedTo: IDS.users.analyst,
        createdBy: IDS.users.agent,
      },
    ],
    opts,
  );
  console.log("  ✅ Referrals seeded (3)");

  // ── 12. Scouting (3 watchlist) ──
  const scoutDefs = [
    {
      name: "Ahmed Al-Zahrani",
      nameAr: "أحمد الزهراني",
      dob: "2005-04-12",
      pos: "CM",
      club: "Al Batin",
      prio: "High",
      tech: 78,
      phys: 82,
      mental: 75,
      pot: 85,
    },
    {
      name: "Saad Al-Otaibi",
      nameAr: "سعد العتيبي",
      dob: "2006-09-05",
      pos: "ST",
      club: "Al Wehda",
      prio: "Medium",
      tech: 72,
      phys: 80,
      mental: 70,
      pot: 80,
    },
    {
      name: "Majed Al-Harbi",
      nameAr: "ماجد الحربي",
      dob: "2005-01-22",
      pos: "LB",
      club: "Al Khaleej",
      prio: "High",
      tech: 70,
      phys: 85,
      mental: 72,
      pot: 82,
    },
  ];

  await Watchlist.bulkCreate(
    scoutDefs.map((p, i) => ({
      id: IDS.watchlists[i],
      prospectName: p.name,
      prospectNameAr: p.nameAr,
      dateOfBirth: p.dob,
      nationality: "Saudi Arabia",
      position: p.pos,
      currentClub: p.club,
      currentLeague: "Saudi First Division",
      status: "Active" as const,
      source: "Scout Network",
      scoutedBy: IDS.users.scout,
      priority: p.prio,
      technicalRating: p.tech,
      physicalRating: p.phys,
      mentalRating: p.mental,
      potentialRating: p.pot,
    })),
    opts,
  );
  console.log("  ✅ Scouting seeded (3 watchlist prospects)");

  // ── 13. Match players + stats ──
  const avail: Array<"starter" | "bench" | "injured"> = [
    "starter",
    "starter",
    "starter",
    "starter",
    "bench",
    "bench",
    "injured",
  ];
  const assignments = [
    { matchId: 3, players: [0, 1, 4, 7, 9, 2, 3] },
    { matchId: 4, players: [8, 6, 13] },
    { matchId: 5, players: [5] },
    { matchId: 0, players: [0, 1, 4, 9, 8] },
    { matchId: 1, players: [2, 3, 5] },
  ];

  const mpRecords: any[] = [];
  let mpIdx = 0;
  for (const a of assignments) {
    for (let i = 0; i < a.players.length; i++) {
      const av = avail[i % avail.length];
      mpRecords.push({
        id: IDS.matchPlayers[mpIdx++],
        matchId: IDS.matches[a.matchId],
        playerId: IDS.players[a.players[i]],
        availability: av,
        minutesPlayed:
          av === "starter"
            ? 60 + Math.floor(Math.random() * 30)
            : av === "bench"
              ? Math.floor(Math.random() * 30)
              : null,
        notes: av === "injured" ? "Hamstring strain" : null,
      });
    }
  }
  await MatchPlayer.bulkCreate(mpRecords, opts);

  const statGroups = [
    { matchId: 3, players: [0, 1, 4, 9, 2, 3] },
    { matchId: 4, players: [8, 6] },
    { matchId: 5, players: [5] },
  ];
  const msRecords: any[] = [];
  let msIdx = 0;
  for (const g of statGroups) {
    for (const pid of g.players) {
      const mins = 60 + Math.floor(Math.random() * 30);
      msRecords.push({
        id: IDS.matchStats[msIdx++],
        playerId: IDS.players[pid],
        matchId: IDS.matches[g.matchId],
        minutesPlayed: mins,
        goals: Math.random() > 0.65 ? Math.floor(Math.random() * 2) + 1 : 0,
        assists: Math.random() > 0.55 ? 1 : 0,
        shotsTotal: Math.floor(Math.random() * 5) + 1,
        shotsOnTarget: Math.floor(Math.random() * 3),
        passesTotal: 20 + Math.floor(Math.random() * 40),
        passesCompleted: 15 + Math.floor(Math.random() * 30),
        tacklesTotal: Math.floor(Math.random() * 5),
        interceptions: Math.floor(Math.random() * 4),
        duelsWon: Math.floor(Math.random() * 6),
        duelsTotal: 3 + Math.floor(Math.random() * 8),
        dribblesCompleted: Math.floor(Math.random() * 4),
        dribblesAttempted: 1 + Math.floor(Math.random() * 5),
        foulsCommitted: Math.floor(Math.random() * 3),
        foulsDrawn: Math.floor(Math.random() * 3),
        yellowCards: Math.random() > 0.8 ? 1 : 0,
        redCards: 0,
        rating: Number((6 + Math.random() * 3).toFixed(1)),
      });
    }
  }
  await PlayerMatchStats.bulkCreate(msRecords, opts);
  console.log(
    `  ✅ Match players (${mpRecords.length}) + stats (${msRecords.length}) seeded`,
  );

  // ── 14. Performances (raw SQL) ──
  const perfMatchIds = [IDS.matches[3], IDS.matches[4], IDS.matches[5]];
  const perfPlayerIds = IDS.players.slice(0, 10);
  for (const matchId of perfMatchIds) {
    for (let i = 0; i < 4; i++) {
      const pid =
        perfPlayerIds[Math.floor(Math.random() * perfPlayerIds.length)];
      await sequelize.query(
        `INSERT INTO performances (player_id, match_id, average_rating, goals, assists, key_passes, successful_dribbles, minutes)
         VALUES (:pid, :mid, :rating, :goals, :assists, :kp, :sd, :mins) ON CONFLICT DO NOTHING`,
        {
          replacements: {
            pid,
            mid: matchId,
            rating: (6 + Math.random() * 3).toFixed(1),
            goals: Math.random() > 0.7 ? Math.floor(Math.random() * 2) + 1 : 0,
            assists: Math.random() > 0.6 ? 1 : 0,
            kp: Math.floor(Math.random() * 5),
            sd: Math.floor(Math.random() * 4),
            mins: 60 + Math.floor(Math.random() * 30),
          },
          type: QueryTypes.INSERT,
          transaction: tx,
        },
      );
    }
  }
  console.log("  ✅ Performances seeded");

  // ── 15. Auto-task test data ──
  console.log("  🔧 Seeding auto-task test data...");

  // Auto-task contracts (4)
  await Contract.bulkCreate(
    [
      {
        id: IDS.seedContracts[0],
        playerId: IDS.players[2],
        clubId: IDS.clubs.alAhli,
        contractType: "Representation" as any,
        status: "Draft" as any,
        title: "[TEST] Draft contract for legal review",
        startDate: relDate(0),
        endDate: relDate(365),
        baseSalary: 1500000,
        commissionPct: 10,
        createdBy: IDS.users.agent,
      },
      {
        id: IDS.seedContracts[1],
        playerId: IDS.players[4],
        clubId: IDS.clubs.alNassr,
        contractType: "Transfer" as any,
        status: "Review" as any,
        title: "[TEST] Contract in Review status",
        startDate: relDate(-30),
        endDate: relDate(335),
        baseSalary: 2000000,
        commissionPct: 8,
        createdBy: IDS.users.agent,
      },
      {
        id: IDS.seedContracts[2],
        playerId: IDS.players[15],
        clubId: IDS.clubs.alNassr,
        contractType: "Renewal" as any,
        status: "Signing" as any,
        title: "[TEST] Contract awaiting signatures",
        startDate: relDate(-15),
        endDate: relDate(350),
        baseSalary: 1800000,
        commissionPct: 12,
        createdBy: IDS.users.agent2,
      },
      {
        id: IDS.seedContracts[3],
        playerId: IDS.players[16],
        clubId: IDS.clubs.alIttihad,
        contractType: "Representation" as any,
        status: "AwaitingPlayer" as any,
        title: "[TEST] Contract awaiting player response",
        startDate: relDate(-7),
        endDate: relDate(358),
        baseSalary: 1200000,
        commissionPct: 10,
        createdBy: IDS.users.agent2,
      },
    ],
    opts,
  );

  // Auto-task offers (4)
  await Offer.bulkCreate(
    [
      {
        id: IDS.seedOffers[0],
        playerId: IDS.players[1],
        fromClubId: IDS.clubs.alHilal,
        toClubId: IDS.clubs.alNassr,
        offerType: "Transfer" as any,
        status: "Under Review" as any,
        transferFee: 10000000,
        salaryOffered: 1500000,
        contractYears: 3,
        feeCurrency: "SAR",
        deadline: relDate(2),
        createdBy: IDS.users.agent,
      },
      {
        id: IDS.seedOffers[1],
        playerId: IDS.players[15],
        fromClubId: IDS.clubs.alAhli,
        toClubId: IDS.clubs.alIttihad,
        offerType: "Transfer" as any,
        status: "Negotiation" as any,
        transferFee: 8000000,
        salaryOffered: 1200000,
        contractYears: 2,
        feeCurrency: "SAR",
        deadline: relDate(30),
        submittedAt: new Date(Date.now() - 20 * 86400000),
        createdBy: IDS.users.agent2,
      },
      {
        id: IDS.seedOffers[2],
        playerId: IDS.players[6],
        fromClubId: IDS.clubs.alShabab,
        toClubId: IDS.clubs.alHilal,
        offerType: "Transfer" as any,
        status: "New" as any,
        transferFee: 5000000,
        salaryOffered: 800000,
        contractYears: 2,
        feeCurrency: "SAR",
        deadline: relDate(14),
        createdBy: IDS.users.agent,
      },
      {
        id: IDS.seedOffers[3],
        playerId: IDS.players[8],
        fromClubId: IDS.clubs.alNassr,
        toClubId: IDS.clubs.alAhli,
        offerType: "Transfer" as any,
        status: "Accepted" as any,
        transferFee: 12000000,
        salaryOffered: 2000000,
        contractYears: 4,
        feeCurrency: "SAR",
        deadline: relDate(7),
        createdBy: IDS.users.agent,
      },
    ],
    opts,
  );

  // Auto-task injuries (4)
  await Injury.bulkCreate(
    [
      {
        id: IDS.seedInjuries[0],
        playerId: IDS.players[0],
        injuryType: "ACL Tear",
        injuryTypeAr: "تمزق الرباط الصليبي",
        bodyPart: "Knee",
        bodyPartAr: "الركبة",
        severity: "Critical" as any,
        cause: "Match" as any,
        status: "UnderTreatment" as any,
        injuryDate: relDate(-2),
        expectedReturnDate: relDate(180),
        isSurgeryRequired: true,
        createdBy: IDS.users.coach,
      },
      {
        id: IDS.seedInjuries[1],
        playerId: IDS.players[2],
        injuryType: "Hamstring Strain",
        injuryTypeAr: "إصابة في أوتار الركبة",
        bodyPart: "Thigh",
        bodyPartAr: "الفخذ",
        severity: "Moderate" as any,
        cause: "Training" as any,
        status: "UnderTreatment" as any,
        injuryDate: relDate(-30),
        expectedReturnDate: relDate(-5),
        createdBy: IDS.users.coach,
      },
      {
        id: IDS.seedInjuries[2],
        playerId: IDS.players[16],
        injuryType: "Ankle Sprain",
        injuryTypeAr: "التواء الكاحل",
        bodyPart: "Ankle",
        bodyPartAr: "الكاحل",
        severity: "Moderate" as any,
        cause: "Match" as any,
        status: "UnderTreatment" as any,
        injuryDate: relDate(-25),
        expectedReturnDate: relDate(10),
        createdBy: IDS.users.coach2,
      },
      {
        id: IDS.seedInjuries[3],
        playerId: IDS.players[9],
        injuryType: "Meniscus Tear",
        injuryTypeAr: "تمزق الغضروف الهلالي",
        bodyPart: "Knee",
        bodyPartAr: "الركبة",
        severity: "Severe" as any,
        cause: "Match" as any,
        status: "UnderTreatment" as any,
        injuryDate: relDate(-1),
        expectedReturnDate: relDate(90),
        isSurgeryRequired: true,
        surgeryDate: relDate(3),
        createdBy: IDS.users.coach,
      },
    ],
    opts,
  );

  try {
    await InjuryUpdate.bulkCreate(
      [
        {
          injuryId: IDS.seedInjuries[2],
          updateDate: relDate(-20),
          status: "UnderTreatment" as any,
          notes: "Patient doing physiotherapy, slow progress",
          updatedBy: IDS.users.coach,
        },
      ],
      {
        fields: ["injuryId", "updateDate", "status", "notes", "updatedBy"],
        ignoreDuplicates: true,
        transaction: tx,
      },
    );
  } catch {
    // InjuryUpdate table may not exist yet
  }

  // Auto-task training (2 courses + 2 enrollments)
  await TrainingCourse.bulkCreate(
    [
      {
        id: IDS.seedTrainingCourses[0],
        title: "[TEST] Tactical Awareness Fundamentals",
        titleAr: "أساسيات الوعي التكتيكي",
        contentType: "Video" as any,
        difficulty: "Intermediate" as any,
        durationHours: 8,
        isActive: true,
        createdBy: IDS.users.coach,
      },
      {
        id: IDS.seedTrainingCourses[1],
        title: "[TEST] Fitness Recovery Protocols",
        titleAr: "بروتوكولات استعادة اللياقة",
        contentType: "PDF" as any,
        difficulty: "Beginner" as any,
        durationHours: 4,
        isActive: true,
        createdBy: IDS.users.coach,
      },
    ],
    opts,
  );

  await TrainingEnrollment.bulkCreate(
    [
      {
        id: IDS.seedTrainingEnrollments[0],
        courseId: IDS.seedTrainingCourses[0],
        playerId: IDS.players[2],
        status: "Completed" as any,
        progressPct: 100,
        completedAt: new Date(Date.now() - 2 * 86400000),
        assignedBy: IDS.users.coach,
      },
      {
        id: IDS.seedTrainingEnrollments[1],
        courseId: IDS.seedTrainingCourses[1],
        playerId: IDS.players[5],
        status: "InProgress" as any,
        progressPct: 45,
        assignedBy: IDS.users.coach,
      },
    ],
    opts,
  );

  // Auto-task approvals (2 requests + 3 steps)
  await ApprovalRequest.bulkCreate(
    [
      {
        id: IDS.seedApprovals[0],
        entityType: "contract",
        entityId: IDS.seedContracts[0],
        entityTitle: "[TEST] Contract approval - overdue step",
        action: "approve_contract",
        status: "Pending" as any,
        priority: "high",
        requestedBy: IDS.users.agent,
        assignedTo: IDS.users.legal,
        assignedRole: "Legal",
        currentStep: 1,
        totalSteps: 2,
        dueDate: relDate(-3),
      },
      {
        id: IDS.seedApprovals[1],
        entityType: "offer",
        entityId: IDS.seedOffers[2],
        entityTitle: "[TEST] Offer approval - rejected",
        action: "approve_offer",
        status: "Rejected" as any,
        priority: "normal",
        requestedBy: IDS.users.agent,
        assignedTo: IDS.users.admin,
        assignedRole: "Admin",
        currentStep: 1,
        totalSteps: 1,
        dueDate: relDate(-1),
        resolvedBy: IDS.users.admin,
        resolvedAt: new Date(Date.now() - 86400000),
      },
    ],
    opts,
  );

  await ApprovalStep.bulkCreate(
    [
      {
        id: IDS.seedApprovalSteps[0],
        approvalRequestId: IDS.seedApprovals[0],
        stepNumber: 1,
        approverRole: "Legal",
        approverUserId: IDS.users.legal,
        status: "Active",
        label: "Legal Review",
        labelAr: "مراجعة قانونية",
        dueDate: relDate(-3),
      },
      {
        id: IDS.seedApprovalSteps[1],
        approvalRequestId: IDS.seedApprovals[0],
        stepNumber: 2,
        approverRole: "Manager",
        status: "Pending",
        label: "Manager Sign-off",
        labelAr: "موافقة المدير",
        dueDate: relDate(3),
      },
      {
        id: IDS.seedApprovalSteps[2],
        approvalRequestId: IDS.seedApprovals[1],
        stepNumber: 1,
        approverRole: "Admin",
        approverUserId: IDS.users.admin,
        status: "Rejected",
        label: "Admin Approval",
        labelAr: "موافقة المشرف",
        comment: "Offer terms not acceptable",
        dueDate: relDate(-1),
        resolvedBy: IDS.users.admin,
        resolvedAt: new Date(Date.now() - 86400000),
      },
    ],
    opts,
  );

  // Auto-task documents (6)
  await Document.bulkCreate(
    [
      {
        id: IDS.seedDocuments[0],
        entityType: "Player" as any,
        entityId: IDS.players[3],
        entityLabel: "Firas Al-Buraikan",
        name: "[TEST] Firas - Passport (expiring soon)",
        type: "Passport" as any,
        status: "Valid" as any,
        fileUrl: "/uploads/docs/test-passport-expiring.pdf",
        fileSize: 2048000,
        mimeType: "application/pdf",
        issueDate: relDate(-335),
        expiryDate: relDate(25),
        uploadedBy: IDS.users.agent,
      },
      {
        id: IDS.seedDocuments[1],
        entityType: "Player" as any,
        entityId: IDS.players[5],
        entityLabel: "Mohammed Al-Burayk",
        name: "[TEST] Mohammed - Medical (expiring in 5 days)",
        type: "Medical" as any,
        status: "Valid" as any,
        fileUrl: "/uploads/docs/test-medical-expiring.pdf",
        fileSize: 1536000,
        mimeType: "application/pdf",
        issueDate: relDate(-360),
        expiryDate: relDate(5),
        uploadedBy: IDS.users.agent,
      },
      {
        id: IDS.seedDocuments[2],
        entityType: "Player" as any,
        entityId: IDS.players[7],
        entityLabel: "Sultan Al-Ghannam",
        name: "[TEST] Sultan - National ID (expiring in 3 days)",
        type: "ID" as any,
        status: "Valid" as any,
        fileUrl: "/uploads/docs/test-id-expiring.pdf",
        fileSize: 1024000,
        mimeType: "application/pdf",
        issueDate: relDate(-362),
        expiryDate: relDate(3),
        uploadedBy: IDS.users.agent,
      },
      {
        id: IDS.seedDocuments[3],
        entityType: "Player" as any,
        entityId: IDS.players[0],
        entityLabel: "Salem Al-Dawsari",
        name: "[TEST] Salem - Agreement (valid)",
        type: "Agreement" as any,
        status: "Active" as any,
        fileUrl: "/uploads/docs/test-agreement-valid.pdf",
        fileSize: 3072000,
        mimeType: "application/pdf",
        expiryDate: relDate(365),
        uploadedBy: IDS.users.agent,
      },
      {
        id: IDS.seedDocuments[4],
        entityType: "Player" as any,
        entityId: IDS.players[8],
        entityLabel: "Abdulrahman Ghareeb",
        name: "[TEST] Abdulrahman - Expired Passport",
        type: "Passport" as any,
        status: "Expired" as any,
        fileUrl: "/uploads/docs/test-passport-expired.pdf",
        fileSize: 2048000,
        mimeType: "application/pdf",
        expiryDate: relDate(-10),
        uploadedBy: IDS.users.agent,
      },
      {
        id: IDS.seedDocuments[5],
        entityType: "Player" as any,
        entityId: IDS.players[9],
        entityLabel: "Ali Al-Hassan",
        name: "[TEST] Ali - Sponsorship Agreement only",
        type: "Agreement" as any,
        status: "Active" as any,
        fileUrl: "/uploads/docs/test-agreement-only.pdf",
        fileSize: 1024000,
        mimeType: "application/pdf",
        expiryDate: relDate(200),
        uploadedBy: IDS.users.agent,
      },
    ],
    opts,
  );

  // Auto-task referrals (3)
  await Referral.bulkCreate(
    [
      {
        id: IDS.seedReferrals[0],
        referralType: "Medical" as any,
        playerId: IDS.players[0],
        triggerDesc:
          "[TEST] Critical knee injury requiring immediate specialist referral",
        status: "Open" as any,
        priority: "Critical" as any,
        assignedTo: IDS.users.analyst,
        dueDate: relDate(3),
        createdBy: IDS.users.coach,
      },
      {
        id: IDS.seedReferrals[1],
        referralType: "Performance" as any,
        playerId: IDS.players[16],
        triggerDesc: "[TEST] Declining performance — needs coaching review",
        status: "Open" as any,
        priority: "High" as any,
        assignedTo: IDS.users.analyst2,
        dueDate: relDate(-5),
        createdBy: IDS.users.agent2,
      },
      {
        id: IDS.seedReferrals[2],
        referralType: "Mental" as any,
        playerId: IDS.players[17],
        triggerDesc: "[TEST] Anxiety management — follow-up overdue",
        status: "InProgress" as any,
        priority: "Medium" as any,
        assignedTo: IDS.users.coach2,
        dueDate: relDate(-3),
        isRestricted: true,
        createdBy: IDS.users.agent,
      },
    ],
    opts,
  );

  // Auto-task wellness (3 profiles + 5 weight logs + 4 meal logs)
  await WellnessProfile.bulkCreate(
    [
      {
        id: IDS.seedWellnessProfiles[0],
        playerId: IDS.players[0],
        sex: "male",
        activityLevel: 1.725,
        goal: "maintenance",
        targetCalories: 2800,
        targetProteinG: 170,
        targetFatG: 70,
        targetCarbsG: 350,
        createdBy: IDS.users.coach,
      },
      {
        id: IDS.seedWellnessProfiles[1],
        playerId: IDS.players[2],
        sex: "male",
        activityLevel: 1.55,
        goal: "cut",
        targetCalories: 2200,
        targetProteinG: 180,
        targetFatG: 55,
        targetCarbsG: 250,
        createdBy: IDS.users.coach,
      },
      {
        id: IDS.seedWellnessProfiles[2],
        playerId: IDS.players[5],
        sex: "male",
        activityLevel: 1.375,
        goal: "bulk",
        targetCalories: 3200,
        targetProteinG: 160,
        targetFatG: 80,
        targetCarbsG: 420,
        createdBy: IDS.users.coach,
      },
    ],
    opts,
  );

  await WellnessWeightLog.bulkCreate(
    [
      {
        id: IDS.seedWeightLogs[0],
        playerId: IDS.players[0],
        weightKg: 78.5,
        bodyFatPct: 12.5,
        loggedAt: relDate(-1),
      },
      {
        id: IDS.seedWeightLogs[1],
        playerId: IDS.players[0],
        weightKg: 78.2,
        bodyFatPct: 12.3,
        loggedAt: relDate(-8),
      },
      {
        id: IDS.seedWeightLogs[2],
        playerId: IDS.players[2],
        weightKg: 82.0,
        bodyFatPct: 15.0,
        loggedAt: relDate(-8),
      },
      {
        id: IDS.seedWeightLogs[3],
        playerId: IDS.players[5],
        weightKg: 75.0,
        loggedAt: relDate(-2),
      },
      {
        id: IDS.seedWeightLogs[4],
        playerId: IDS.players[5],
        weightKg: 72.0,
        loggedAt: relDate(-9),
      },
    ],
    opts,
  );

  await WellnessMealLog.bulkCreate(
    [
      {
        id: IDS.seedMealLogs[0],
        playerId: IDS.players[2],
        mealType: "breakfast",
        customName: "[TEST] Small breakfast",
        servings: 1,
        calories: 300,
        proteinG: 15,
        carbsG: 40,
        fatG: 10,
        loggedDate: relDate(-1),
      },
      {
        id: IDS.seedMealLogs[1],
        playerId: IDS.players[2],
        mealType: "lunch",
        customName: "[TEST] Light lunch",
        servings: 1,
        calories: 400,
        proteinG: 25,
        carbsG: 50,
        fatG: 12,
        loggedDate: relDate(-1),
      },
      {
        id: IDS.seedMealLogs[2],
        playerId: IDS.players[0],
        mealType: "breakfast",
        customName: "[TEST] Full breakfast",
        servings: 1,
        calories: 800,
        proteinG: 45,
        carbsG: 90,
        fatG: 25,
        loggedDate: relDate(0),
      },
      {
        id: IDS.seedMealLogs[3],
        playerId: IDS.players[0],
        mealType: "lunch",
        customName: "[TEST] Chicken & rice",
        servings: 1,
        calories: 950,
        proteinG: 60,
        carbsG: 110,
        fatG: 22,
        loggedDate: relDate(0),
      },
    ],
    opts,
  );

  console.log(
    "  ✅ Auto-task test data seeded (contracts, offers, injuries, training, approvals, documents, referrals, wellness)",
  );
}

// ═════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═════════════════════════════════════════════════════════════

export async function seedDatabase(): Promise<void> {
  // Hard-block in production: this seed creates fake @sadara.com users.
  if (env.nodeEnv === "production") {
    logger.warn(
      "seedDatabase() called in production — refusing to run (dev-only fixtures)",
    );
    return;
  }

  // 1. Permissions — idempotent, outside transaction
  try {
    await seedPermissions();
  } catch (err) {
    console.error("❌ Permissions seed failed:", (err as Error).message);
  }

  // 2. Approval chains — idempotent, outside transaction
  try {
    await seedApprovalChains();
  } catch (err) {
    console.error("❌ Approval chains seed failed:", (err as Error).message);
  }

  // 2b. Package configs — idempotent, outside transaction
  try {
    await seedPackageConfigs();
  } catch (err) {
    console.error("❌ Package configs seed failed:", (err as Error).message);
  }

  // 3. Check if already seeded
  const existingAdmin = await User.findOne({
    where: { email: "admin@sadara.com" },
  });
  if (existingAdmin) {
    // Validate role
    if ((existingAdmin as any).role !== "Admin") {
      logger.warn(
        `User admin@sadara.com exists with role "${(existingAdmin as any).role}" — updating to Admin`,
      );
      await (existingAdmin as any).update({ role: "Admin" });
    }
    console.log("⏭️  Database already seeded (admin user exists)");
    return;
  }

  // 4. Seed all data in a transaction
  console.log("🌱 Seeding database...");
  const transaction = await sequelize.transaction();
  try {
    await seedAllData(transaction);
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    console.error("❌ Seed failed, rolled back:", (err as Error).message);
    console.error((err as Error).stack);
    throw err;
  }

  // 5. Notion operational data — idempotent, outside main transaction
  try {
    await seedNotionData();
  } catch (err) {
    console.error("❌ Notion data seed failed:", (err as Error).message);
  }

  console.log("");
  console.log("🎉 Seed complete!");
  console.log("   📧 admin@sadara.com   / Sadara2025!");
  console.log("   📧 agent@sadara.com   / Sadara2025!");
  console.log("   📧 analyst@sadara.com / Sadara2025!");
  console.log("   📧 scout@sadara.com   / Sadara2025!");
  console.log("   📧 salem@sadara.com   / Sadara2025! (Player)");
}
