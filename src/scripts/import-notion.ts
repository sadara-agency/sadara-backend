// ─────────────────────────────────────────────────────────────────────────────
// scripts/import-notion.ts
//
// Notion → Sadara bulk import.
//
// Parses the four Notion HTML database exports (Players, Sessions, Tickets,
// Player Journey) and upserts them into the Sadara DB, using externalRef to
// store the Notion page ID so re-runs are idempotent.
//
// Usage:
//   npx ts-node -r tsconfig-paths/register src/scripts/import-notion.ts \
//     --players  <players.html>  \
//     --sessions <sessions.html> \
//     --tickets  <tickets.html>  \
//     --journey  <journey.html>  \
//     [--dry-run]                \
//     [--admin-email admin@sadara.com]
//
// Counts at end of run:
//   Players   created / skipped (already in DB by externalRef)
//   Sessions  created / skipped
//   Tickets   created / skipped  (imported as Player Care referrals)
//   Journey   created / skipped
// ─────────────────────────────────────────────────────────────────────────────

import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { sequelize } from "@config/database";
import { setupAssociations } from "../models/associations";
import { Player } from "@modules/players/player.model";
import { Club } from "@modules/clubs/club.model";
import { User } from "@modules/users/user.model";
import { Session } from "@modules/sessions/session.model";
import { Referral } from "@modules/referrals/referral.model";
import { Journey } from "@modules/journey/journey.model";
import type { ProgramOwner } from "@modules/sessions/session.model";
import type {
  JourneyStageType,
  JourneyStageOwner,
} from "@modules/journey/journey.model";
import { logger } from "@config/logger";

// ── CLI args ──────────────────────────────────────────────────────────────────

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

const DRY_RUN = process.argv.includes("--dry-run");
const PLAYERS_FILE = arg("players");
const SESSIONS_FILE = arg("sessions");
const TICKETS_FILE = arg("tickets");
const JOURNEY_FILE = arg("journey");
const ADMIN_EMAIL = arg("admin-email");

// ── HTML → table rows ─────────────────────────────────────────────────────────

interface Row {
  [header: string]: string;
}

function parseNotionHtml(filePath: string): Row[] {
  const html = fs.readFileSync(filePath, "utf-8");
  const $ = cheerio.load(html);
  const rows: Row[] = [];

  // Notion exports database views as <table> elements with thead/tbody.
  // Try collection-content table first, then any table.
  let $table = $("table.collection-content");
  if (!$table.length) $table = $("table").first();
  if (!$table.length) {
    logger.warn(`No table found in ${filePath}`);
    return rows;
  }

  // Headers
  const headers: string[] = [];
  $table.find("thead tr th").each((_, th) => {
    headers.push($(th).text().trim());
  });
  if (!headers.length) {
    // Some exports use the first tbody row as headers
    $table
      .find("tbody tr")
      .first()
      .find("td, th")
      .each((_, cell) => {
        headers.push($(cell).text().trim());
      });
  }
  if (!headers.length) {
    logger.warn(`No headers found in ${filePath}`);
    return rows;
  }

  // Data rows — skip first row if it was consumed as headers above
  const startIndex = headers.length > 0 ? 0 : 1;
  $table.find("tbody tr").each((rowIdx, tr) => {
    if (rowIdx < startIndex && startIndex > 0) return;
    const row: Row = {};
    $(tr)
      .find("td")
      .each((colIdx, td) => {
        const header = headers[colIdx];
        if (header) row[header] = $(td).text().trim();
      });
    // Notion page ID: stored in the first <a> href inside the title cell
    const titleLink = $(tr).find("td a[href]").first().attr("href");
    if (titleLink) {
      // href looks like: ./Some%20Page%2033f7d31d1537803c....html
      const match = titleLink.match(/([a-f0-9]{32})\/?\.html/i);
      if (match) row["__notionId"] = match[1];
    }
    if (Object.keys(row).length > 0) rows.push(row);
  });

  return rows;
}

// ── Field normalization helpers ───────────────────────────────────────────────

function pick(row: Row, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k]?.trim();
    if (v) return v;
  }
  return "";
}

function normalizeStatus(raw: string): string {
  const s = raw.trim();
  if (["مكتمل", "مكتملة", "Completed", "completed"].includes(s))
    return "Completed";
  if (["مجدول", "Scheduled", "scheduled"].includes(s)) return "Scheduled";
  if (["ملغاة", "ملغي", "Cancelled", "cancelled"].includes(s))
    return "Cancelled";
  return "Scheduled";
}

function normalizeReferralStatus(raw: string): string {
  const s = raw.trim();
  if (["مفتوحة", "مفتوح", "Open", "open"].includes(s)) return "Open";
  if (["قيد التنفيذ", "InProgress", "In Progress"].includes(s))
    return "InProgress";
  if (["بانتظار اللاعب", "Waiting", "waiting"].includes(s)) return "Waiting";
  if (["مكتمل", "مكتملة", "Closed", "closed", "Completed"].includes(s))
    return "Closed";
  return "Open";
}

function normalizePriority(
  raw: string,
): "Critical" | "High" | "Medium" | "Low" {
  const s = raw.trim();
  if (["عاجلة", "عاجل", "Critical", "Urgent", "urgent"].includes(s))
    return "Critical";
  if (["عالية", "عالي", "High", "high"].includes(s)) return "High";
  if (["متوسطة", "متوسط", "Medium", "medium"].includes(s)) return "Medium";
  return "Low";
}

function normalizeReferralType(
  raw: string,
):
  | "SportDecision"
  | "Physical"
  | "Mental"
  | "Administrative"
  | "Medical"
  | "Tactical"
  | "Skill"
  | "Nutrition" {
  const s = raw.trim();
  if (["قرار رياضي", "SportDecision", "Sport Decision"].includes(s))
    return "SportDecision";
  if (["بدني", "Physical", "physical"].includes(s)) return "Physical";
  if (["ذهني", "نفسي", "Mental", "mental"].includes(s)) return "Mental";
  if (["إداري", "Administrative"].includes(s)) return "Administrative";
  if (["طبي", "Medical"].includes(s)) return "Medical";
  if (["تكتيكي", "Tactical"].includes(s)) return "Tactical";
  if (["مهاري", "Skill"].includes(s)) return "Skill";
  if (["تغذية", "Nutrition"].includes(s)) return "Nutrition";
  return "Administrative";
}

function normalizeReceivingParty(raw: string): string | null {
  const s = raw.trim();
  if (["إدارة الوكالة", "AgencyManagement", "Agency Management"].includes(s))
    return "AgencyManagement";
  if (["أخصائي ذهني", "MentalSpecialist", "Mental Specialist"].includes(s))
    return "MentalSpecialist";
  if (["أخصائي بدني", "PhysicalSpecialist", "Physical Specialist"].includes(s))
    return "PhysicalSpecialist";
  if (["مدرب خارجي", "ExternalCoach", "External Coach"].includes(s))
    return "ExternalCoach";
  if (["قانونية", "Legal"].includes(s)) return "Legal";
  if (["مالية", "Finance"].includes(s)) return "Finance";
  if (["محلل أداء", "PerformanceAnalyst", "Performance Analyst"].includes(s))
    return "PerformanceAnalyst";
  return null;
}

function normalizeProgramOwner(raw: string): ProgramOwner {
  const s = raw.trim();
  if (["محلل أداء", "Analyst", "analyst"].includes(s)) return "Analyst";
  if (["معد بدني", "FitnessCoach", "Fitness Coach"].includes(s))
    return "FitnessCoach";
  if (["مدرب", "Coach", "coach"].includes(s)) return "Coach";
  if (["مدرب مهاري", "SkillCoach"].includes(s)) return "SkillCoach";
  if (["مدرب تكتيكي", "TacticalCoach"].includes(s)) return "TacticalCoach";
  if (["حارس", "GoalkeeperCoach"].includes(s)) return "GoalkeeperCoach";
  if (["أخصائي تغذية", "NutritionSpecialist"].includes(s))
    return "NutritionSpecialist";
  if (["أخصائي نفسي", "أخصائي ذهني", "MentalCoach"].includes(s))
    return "MentalCoach";
  return "Analyst";
}

function normalizeJourneyStatus(
  raw: string,
): "NotStarted" | "InProgress" | "Completed" | "OnHold" {
  const s = raw.trim();
  if (["Completed", "مكتمل", "مكتملة"].includes(s)) return "Completed";
  if (["In Progress", "InProgress", "قيد التنفيذ"].includes(s))
    return "InProgress";
  if (["On Hold", "OnHold"].includes(s)) return "OnHold";
  return "NotStarted";
}

function normalizeStageType(raw: string): JourneyStageType {
  const s = raw.trim().toLowerCase();
  if (s.includes("physical") || s.includes("بدني")) return "PhysicalTraining";
  if (s.includes("technical") || s.includes("مهاري"))
    return "TechnicalTraining";
  if (s.includes("tactical") || s.includes("تكتيكي")) return "TacticalTraining";
  if (s.includes("assessment") || s.includes("تقييم")) return "Assessment";
  if (s.includes("recover") || s.includes("تعاف")) return "Recovery";
  if (s.includes("mental") || s.includes("ذهني") || s.includes("نفسي"))
    return "MentalDevelopment";
  return "General";
}

function normalizeStageOwner(raw: string): JourneyStageOwner {
  const s = raw.trim();
  if (["FitnessCoach", "معد بدني", "Fitness Coach"].includes(s))
    return "FitnessCoach";
  if (["Coach", "مدرب"].includes(s)) return "Coach";
  if (["SkillCoach", "مدرب مهاري"].includes(s)) return "SkillCoach";
  if (["TacticalCoach", "مدرب تكتيكي"].includes(s)) return "TacticalCoach";
  if (["Analyst", "محلل أداء"].includes(s)) return "Analyst";
  if (["NutritionSpecialist", "أخصائي تغذية"].includes(s))
    return "NutritionSpecialist";
  if (["MentalCoach", "أخصائي نفسي", "أخصائي ذهني"].includes(s))
    return "MentalCoach";
  if (["Manager", "مدير"].includes(s)) return "Manager";
  return "Coach";
}

function splitArabicName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: parts[0] };
  const last = parts.pop()!;
  return { first: parts.join(" "), last };
}

// ── Player lookup cache ────────────────────────────────────────────────────────

const playerCache = new Map<string, Player>(); // key: normalized Arabic name

function cacheKey(nameAr: string): string {
  return nameAr.trim().replace(/\s+/g, " ").toLowerCase();
}

async function findPlayerByArabicName(nameAr: string): Promise<Player | null> {
  const k = cacheKey(nameAr);
  if (playerCache.has(k)) return playerCache.get(k)!;
  const player = await Player.findOne({
    where: sequelize.where(
      sequelize.fn(
        "CONCAT",
        sequelize.col("first_name_ar"),
        " ",
        sequelize.col("last_name_ar"),
      ),
      nameAr.trim(),
    ),
  });
  if (player) playerCache.set(k, player);
  return player;
}

// ── Summary counters ──────────────────────────────────────────────────────────

const counts = {
  players: { created: 0, skipped: 0, errors: 0 },
  sessions: { created: 0, skipped: 0, errors: 0 },
  tickets: { created: 0, skipped: 0, errors: 0 },
  journey: { created: 0, skipped: 0, errors: 0 },
};

// ── Import functions ──────────────────────────────────────────────────────────

async function importPlayers(
  rows: Row[],
  adminId: string,
  clubs: Map<string, Club>,
) {
  for (const row of rows) {
    const notionId = row["__notionId"] || "";
    const nameAr =
      pick(row, "الاسم", "Name", "الاسم الكامل") ||
      pick(row, "الاسم الأول", "اسم اللاعب");
    if (!nameAr) {
      counts.players.errors++;
      continue;
    }

    // Dedup by externalRef (Notion ID) first, then by Arabic name
    if (notionId) {
      const existing = await Player.findOne({
        where: { externalRef: notionId },
      });
      if (existing) {
        playerCache.set(cacheKey(nameAr), existing);
        counts.players.skipped++;
        continue;
      }
    } else {
      const existing = await findPlayerByArabicName(nameAr);
      if (existing) {
        counts.players.skipped++;
        continue;
      }
    }

    const { first: firstAr, last: lastAr } = splitArabicName(nameAr);
    // Use transliteration fallback for English name (required by schema)
    const firstName = pick(row, "First Name", "الاسم الإنجليزي") || firstAr;
    const lastName = pick(row, "Last Name", "اسم العائلة الإنجليزي") || lastAr;

    const grade = pick(row, "الدرجة", "Grade", "Package") || "C";
    const position =
      pick(row, "المركز", "Position", "المركز الرئيسي") || "Midfielder";
    const nationality = pick(row, "الجنسية", "Nationality") || "Saudi";
    const jerseyRaw = pick(row, "رقم القميص", "Jersey", "Jersey #");
    const jerseyNumber = jerseyRaw
      ? parseInt(jerseyRaw, 10) || undefined
      : undefined;
    const phone = pick(row, "الهاتف", "Phone");
    const email = pick(row, "البريد", "Email");

    // Club lookup by Arabic or English name
    const clubNameRaw = pick(row, "النادي", "Club");
    let currentClubId: string | undefined;
    if (clubNameRaw) {
      const club = clubs.get(clubNameRaw.toLowerCase());
      if (club) currentClubId = club.id;
    }

    if (DRY_RUN) {
      logger.info(`[DRY-RUN] Would create player: ${nameAr}`);
      counts.players.created++;
      continue;
    }

    try {
      const player = await Player.create({
        firstName: firstName.slice(0, 100),
        lastName: lastName.slice(0, 100),
        firstNameAr: firstAr.slice(0, 100),
        lastNameAr: lastAr.slice(0, 100),
        position,
        nationality,
        jerseyNumber,
        phone: phone || undefined,
        email: email || undefined,
        playerPackage: grade,
        currentClubId,
        externalRef: notionId || null,
        createdBy: adminId,
        // Required schema defaults
        playerType: "Pro",
        contractType: "Professional",
        status: "active",
        marketValueCurrency: "SAR",
        preferredFoot: "Right",
        heightCm: 175,
        weightKg: 70,
        dateOfBirth: null,
      } as any);
      playerCache.set(cacheKey(nameAr), player);
      counts.players.created++;
      logger.info(`  ✓ Player: ${nameAr}`);
    } catch (err) {
      counts.players.errors++;
      logger.error(
        `  ✗ Player ${nameAr}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

async function importSessions(rows: Row[], adminId: string) {
  for (const row of rows) {
    const notionId = row["__notionId"] || "";
    const title = pick(row, "الاسم", "Name", "Title", "العنوان");
    if (!title) {
      counts.sessions.errors++;
      continue;
    }

    if (notionId) {
      const existing = await Session.findOne({
        where: { externalRef: notionId },
      });
      if (existing) {
        counts.sessions.skipped++;
        continue;
      }
    }

    const playerNameRaw = pick(row, "اللاعب", "Player", "الاعب");
    let playerId: string | undefined;
    if (playerNameRaw) {
      const player = await findPlayerByArabicName(playerNameRaw);
      if (player) playerId = player.id;
    }
    if (!playerId) {
      counts.sessions.errors++;
      logger.warn(
        `  ✗ Session "${title}": player "${playerNameRaw}" not found`,
      );
      continue;
    }

    const specialistRaw = pick(row, "المتخصص", "Specialist", "المتخصص المنفذ");
    const programOwner = normalizeProgramOwner(specialistRaw || "Analyst");

    const dateRaw = pick(row, "التاريخ", "Date", "تاريخ الجلسة");
    const sessionDate = dateRaw || new Date().toISOString().split("T")[0];

    const statusRaw = pick(row, "الحالة", "Status", "حالة الجلسة");
    const completionStatus = normalizeStatus(statusRaw) as any;

    const summaryRaw = pick(row, "الملخص", "Summary", "ملخص الجلسة", "الوصف");

    if (DRY_RUN) {
      logger.info(`[DRY-RUN] Would create session: ${title}`);
      counts.sessions.created++;
      continue;
    }

    try {
      await Session.create({
        playerId,
        sessionType: "PerformanceAssessment",
        programOwner,
        sessionDate,
        titleAr: title,
        title: title,
        summaryAr: summaryRaw || null,
        completionStatus,
        externalRef: notionId || null,
        createdBy: adminId,
      });
      counts.sessions.created++;
      logger.info(`  ✓ Session: ${title}`);
    } catch (err) {
      counts.sessions.errors++;
      logger.error(
        `  ✗ Session "${title}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

async function importTickets(rows: Row[], adminId: string) {
  for (const row of rows) {
    const notionId = row["__notionId"] || "";
    const title = pick(row, "الاسم", "Name", "Title", "العنوان");
    if (!title) {
      counts.tickets.errors++;
      continue;
    }

    if (notionId) {
      const existing = await Referral.findOne({
        where: { externalRef: notionId },
      });
      if (existing) {
        counts.tickets.skipped++;
        continue;
      }
    }

    const playerNameRaw = pick(row, "اللاعب", "Player", "الاعب");
    let playerId: string | undefined;
    if (playerNameRaw) {
      const player = await findPlayerByArabicName(playerNameRaw);
      if (player) playerId = player.id;
    }
    if (!playerId) {
      counts.tickets.errors++;
      logger.warn(`  ✗ Ticket "${title}": player "${playerNameRaw}" not found`);
      continue;
    }

    const statusRaw = pick(row, "الحالة", "Status");
    const status = normalizeReferralStatus(statusRaw) as any;

    const priorityRaw = pick(row, "الأولوية", "Priority");
    const priority = normalizePriority(priorityRaw);

    const typeRaw = pick(row, "النوع", "Type", "نوع التذكرة");
    const referralType = normalizeReferralType(typeRaw) as any;

    const partyRaw = pick(
      row,
      "الجهة المستلمة",
      "Receiving Party",
      "جهة الاستلام",
    );
    const receivingParty = normalizeReceivingParty(partyRaw) as any;

    if (DRY_RUN) {
      logger.info(`[DRY-RUN] Would create ticket/referral: ${title}`);
      counts.tickets.created++;
      continue;
    }

    try {
      await Referral.create({
        playerId,
        referralType,
        triggerDesc: title,
        status,
        priority,
        receivingParty: receivingParty || null,
        assignedTo: adminId,
        isAutoGenerated: false,
        isRestricted: false,
        evidenceCount: 0,
        externalRef: notionId || null,
        createdBy: adminId,
      });
      counts.tickets.created++;
      logger.info(`  ✓ Ticket/case: ${title}`);
    } catch (err) {
      counts.tickets.errors++;
      logger.error(
        `  ✗ Ticket "${title}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

async function importJourney(rows: Row[], adminId: string) {
  for (const row of rows) {
    const notionId = row["__notionId"] || "";
    const stageName = pick(row, "الاسم", "Name", "المرحلة", "Stage");
    if (!stageName) {
      counts.journey.errors++;
      continue;
    }

    if (notionId) {
      const existing = await Journey.findOne({
        where: { externalRef: notionId },
      });
      if (existing) {
        counts.journey.skipped++;
        continue;
      }
    }

    const playerNameRaw = pick(row, "اللاعب", "Player");
    let playerId: string | undefined;
    if (playerNameRaw) {
      const player = await findPlayerByArabicName(playerNameRaw);
      if (player) playerId = player.id;
    }
    if (!playerId) {
      counts.journey.errors++;
      logger.warn(
        `  ✗ Journey "${stageName}": player "${playerNameRaw}" not found`,
      );
      continue;
    }

    const statusRaw = pick(row, "الحالة", "Status");
    const status = normalizeJourneyStatus(statusRaw);

    const typeRaw = pick(row, "النوع", "Type", "نوع المرحلة");
    const stageType = normalizeStageType(typeRaw || stageName);

    const ownerRaw = pick(row, "المسؤول", "Responsible", "المتخصص");
    const stageOwner = normalizeStageOwner(ownerRaw);

    if (DRY_RUN) {
      logger.info(`[DRY-RUN] Would create journey stage: ${stageName}`);
      counts.journey.created++;
      continue;
    }

    try {
      // stageOrder: derive from position in the rows array (1-indexed)
      const stageOrder = rows.indexOf(row) + 1;
      await Journey.create({
        playerId,
        stageName,
        stageNameAr: stageName,
        stageOrder,
        status,
        stageType,
        stageOwner,
        health: "OnTrack",
        externalRef: notionId || null,
        createdBy: adminId,
      });
      counts.journey.created++;
      logger.info(`  ✓ Journey stage: ${stageName}`);
    } catch (err) {
      counts.journey.errors++;
      logger.error(
        `  ✗ Journey "${stageName}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!PLAYERS_FILE && !SESSIONS_FILE && !TICKETS_FILE && !JOURNEY_FILE) {
    console.error(
      "Error: provide at least one --players / --sessions / --tickets / --journey <file>",
    );
    console.error(
      "Usage: npx ts-node -r tsconfig-paths/register src/scripts/import-notion.ts --players <file.html> [--dry-run]",
    );
    process.exit(1);
  }

  await sequelize.authenticate();
  setupAssociations();

  // Resolve admin user (createdBy)
  let admin: User | null = null;
  if (ADMIN_EMAIL) {
    admin = await User.findOne({ where: { email: ADMIN_EMAIL } });
  }
  if (!admin) {
    // Fall back to first admin/manager user
    admin = await User.findOne({
      where: sequelize.where(sequelize.col("role"), {
        [require("sequelize").Op.in]: ["Admin", "Manager"],
      }),
    });
  }
  if (!admin) {
    console.error(
      "No admin/manager user found. Create one first or pass --admin-email.",
    );
    process.exit(1);
  }
  const adminId = admin.id;
  logger.info(`Using admin user: ${admin.get("email") || adminId}`);

  // Pre-load clubs into a lookup map (name → Club)
  const allClubs = await Club.findAll({ attributes: ["id", "name"] });
  const clubs = new Map<string, Club>();
  for (const c of allClubs) {
    clubs.set(c.name.toLowerCase(), c);
  }

  if (DRY_RUN) logger.info("── DRY-RUN mode: no records will be written ──");

  // 1. Players (must run first so subsequent imports can resolve player IDs)
  if (PLAYERS_FILE) {
    logger.info(`\nImporting players from: ${path.basename(PLAYERS_FILE)}`);
    const rows = parseNotionHtml(PLAYERS_FILE);
    logger.info(`  Found ${rows.length} rows`);
    await importPlayers(rows, adminId, clubs);
  }

  // 2. Sessions
  if (SESSIONS_FILE) {
    logger.info(`\nImporting sessions from: ${path.basename(SESSIONS_FILE)}`);
    const rows = parseNotionHtml(SESSIONS_FILE);
    logger.info(`  Found ${rows.length} rows`);
    await importSessions(rows, adminId);
  }

  // 3. Tickets (→ Player Care referrals)
  if (TICKETS_FILE) {
    logger.info(`\nImporting tickets from: ${path.basename(TICKETS_FILE)}`);
    const rows = parseNotionHtml(TICKETS_FILE);
    logger.info(`  Found ${rows.length} rows`);
    await importTickets(rows, adminId);
  }

  // 4. Player Journey
  if (JOURNEY_FILE) {
    logger.info(
      `\nImporting journey stages from: ${path.basename(JOURNEY_FILE)}`,
    );
    const rows = parseNotionHtml(JOURNEY_FILE);
    logger.info(`  Found ${rows.length} rows`);
    await importJourney(rows, adminId);
  }

  // ── Summary ──
  console.log("\n══════════════════════════════════════");
  console.log(" Notion Import Summary");
  console.log("══════════════════════════════════════");
  for (const [key, c] of Object.entries(counts)) {
    if (c.created + c.skipped + c.errors > 0) {
      console.log(
        `  ${key.padEnd(10)}: ${c.created} created, ${c.skipped} skipped, ${c.errors} errors`,
      );
    }
  }
  if (DRY_RUN) console.log("\n  (DRY-RUN — nothing was written)");
  console.log("══════════════════════════════════════\n");

  await sequelize.close();
}

main().catch((err) => {
  logger.error("Import failed:", err);
  process.exit(1);
});
