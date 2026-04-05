#!/usr/bin/env ts-node
// ─────────────────────────────────────────────────────────────
// csv-import/index.ts
// CLI tool to import data from Notion CSV exports into the
// Sadara platform database.
//
// Usage:
//   npx ts-node -r tsconfig-paths/register src/database/csv-import/index.ts [options]
//
// Options:
//   --entity=players|sessions|training|journeys|all
//   --dry-run                Preview without writing to DB
//   --data-dir=<path>        CSV directory (default: ./data/)
// ─────────────────────────────────────────────────────────────
import path from "path";
import fs from "fs";
import { sequelize } from "@config/database";
import { setupAssociations } from "../../models/associations";
import { Player } from "@modules/players/player.model";
import { Referral } from "@modules/referrals/referral.model";
import { Session } from "@modules/sessions/session.model";
import { Gate } from "@modules/gates/gate.model";
import { User } from "@modules/users/user.model";
import { parseCsvFile, listCsvFiles } from "./parse-csv";
import {
  mapPlayerRow,
  resolveClubIds,
  resolveCreatedBy,
} from "./mappers/player.mapper";
import { mapSessionRow } from "./mappers/session.mapper";
import { mapTrainingSessionRow } from "./mappers/ticket.mapper";
import { mapGateRow } from "./mappers/journey.mapper";

// ── CLI Args ──
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const entityArg =
  args.find((a) => a.startsWith("--entity="))?.split("=")[1] ?? "all";
const dataDirArg =
  args.find((a) => a.startsWith("--data-dir="))?.split("=")[1] ??
  path.join(__dirname, "data");

type ImportResult = {
  entity: string;
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
  warnings: string[];
};

// ── File discovery ──
function findCsvByKeyword(dataDir: string, keyword: string): string | null {
  if (!fs.existsSync(dataDir)) return null;
  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith(".csv"));
  const exact = files.find(
    (f) => f.toLowerCase() === `${keyword.toLowerCase()}.csv`,
  );
  if (exact) return path.join(dataDir, exact);
  const match = files.find((f) =>
    f.toLowerCase().includes(keyword.toLowerCase()),
  );
  return match ? path.join(dataDir, match) : null;
}

// ── Player name → ID lookup ──
let playerNameMap: Map<string, string> = new Map();

async function buildPlayerNameMap(): Promise<void> {
  const players = await Player.findAll({
    attributes: ["id", "firstName", "lastName", "firstNameAr", "lastNameAr"],
  });
  playerNameMap = new Map();
  for (const p of players) {
    const fullAr =
      `${p.firstNameAr ?? p.firstName} ${p.lastNameAr ?? p.lastName}`.trim();
    const fullEn = `${p.firstName} ${p.lastName}`.trim();
    if (fullAr) playerNameMap.set(fullAr, p.id);
    if (fullEn && fullEn !== fullAr) playerNameMap.set(fullEn, p.id);
    if (p.firstNameAr) playerNameMap.set(p.firstNameAr, p.id);
  }
}

function resolvePlayerId(name: string): string | null {
  if (!name) return null;
  const cleaned = name.trim().replace(/\s+/g, " ");
  if (playerNameMap.has(cleaned)) return playerNameMap.get(cleaned)!;
  for (const [key, id] of playerNameMap) {
    if (key.includes(cleaned) || cleaned.includes(key)) return id;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
// IMPORTERS
// ═══════════════════════════════════════════════════════════

async function importPlayers(dataDir: string): Promise<ImportResult> {
  const result: ImportResult = {
    entity: "players",
    total: 0,
    imported: 0,
    skipped: 0,
    errors: [],
    warnings: [],
  };

  const csvPath = findCsvByKeyword(dataDir, "Players");
  if (!csvPath) {
    result.errors.push("No Players CSV found in data directory");
    return result;
  }

  console.log(`  File: ${path.basename(csvPath)}`);
  let rows: Record<string, string>[];
  try {
    rows = parseCsvFile(csvPath);
  } catch (err) {
    result.errors.push(`Failed to read CSV: ${(err as Error).message}`);
    return result;
  }

  rows = rows.filter((r) => {
    const name = r["أسم_الاعب"] || r["أسم الاعب"] || "";
    return name.trim() !== "";
  });
  result.total = rows.length;
  console.log(`  Found ${rows.length} player rows`);

  const mapped = rows.map((row, i) => mapPlayerRow(row, i + 2));

  const { created } = await resolveClubIds(mapped);
  if (created.length > 0) {
    console.log(
      `  Created ${created.length} non-SPL clubs: ${created.join(", ")}`,
    );
  }
  await resolveCreatedBy(mapped);

  for (const m of mapped) {
    result.warnings.push(...m.warnings);
    result.errors.push(...m.errors);
  }

  const valid = mapped.filter((m) => m.errors.length === 0);
  const invalid = mapped.filter((m) => m.errors.length > 0);
  result.skipped = invalid.length;

  if (dryRun) {
    console.log(`  [DRY RUN] Would import ${valid.length} players:`);
    for (const m of valid) {
      console.log(
        `    - ${m.originalName} → ${m.data.firstName} ${m.data.lastName} (${m.data.playerType}, ${m.data.position || "?"})`,
      );
    }
    result.imported = valid.length;
    return result;
  }

  const tx = await sequelize.transaction();
  try {
    for (const m of valid) {
      const [, created] = await Player.findOrCreate({
        where: {
          firstName: m.data.firstName as string,
          lastName: m.data.lastName as string,
        },
        defaults: m.data as any,
        transaction: tx,
      });
      if (created) result.imported++;
      else result.skipped++;
    }
    await tx.commit();
    console.log(`  Imported ${result.imported} players`);
  } catch (err) {
    await tx.rollback();
    result.errors.push(`Transaction failed: ${(err as Error).message}`);
  }

  return result;
}

/**
 * Import Sessions CSV → Referral + Session records.
 * Each row creates one Referral and one Session linked to it.
 */
async function importSessions(dataDir: string): Promise<ImportResult> {
  const result: ImportResult = {
    entity: "sessions (match analysis)",
    total: 0,
    imported: 0,
    skipped: 0,
    errors: [],
    warnings: [],
  };

  const csvPath = findCsvByKeyword(dataDir, "Sessions");
  if (!csvPath) {
    result.errors.push("No Sessions CSV found");
    return result;
  }

  console.log(`  File: ${path.basename(csvPath)}`);
  let rows: Record<string, string>[];
  try {
    rows = parseCsvFile(csvPath);
  } catch (err) {
    result.errors.push(`Failed to read CSV: ${(err as Error).message}`);
    return result;
  }

  rows = rows.filter((r) => {
    const title = r["عنوان_الجلسة_session_title"] || "";
    return title.trim() !== "";
  });
  result.total = rows.length;
  console.log(`  Found ${rows.length} session rows`);

  await buildPlayerNameMap();
  const admin = await User.findOne({ where: { role: "Admin" } });

  const mapped = rows.map((row, i) => mapSessionRow(row, i + 2));

  // Resolve player IDs
  for (const m of mapped) {
    if (m.playerName) {
      const playerId = resolvePlayerId(m.playerName);
      if (playerId) {
        m.referralData.playerId = playerId;
        m.sessionData.playerId = playerId;
      } else {
        m.warnings.push(`Could not resolve player: "${m.playerName}"`);
      }
    }
    if (admin) {
      m.referralData.createdBy = admin.id;
      m.sessionData.createdBy = admin.id;
    }
    delete m.sessionData._resultingTicketName;
  }

  for (const m of mapped) {
    result.warnings.push(...m.warnings);
    result.errors.push(...m.errors);
  }

  const valid = mapped.filter(
    (m) => m.errors.length === 0 && m.referralData.playerId,
  );
  result.skipped = mapped.length - valid.length;

  if (dryRun) {
    console.log(
      `  [DRY RUN] Would import ${valid.length} sessions (Referral + Session each):`,
    );
    for (const m of valid.slice(0, 10)) {
      console.log(
        `    - "${m.sessionData.title}" [${m.sessionData.completionStatus}] → ${m.playerName}`,
      );
    }
    if (valid.length > 10) console.log(`    ... and ${valid.length - 10} more`);
    result.imported = valid.length;
    return result;
  }

  const tx = await sequelize.transaction();
  try {
    for (const m of valid) {
      // 1. Create Referral
      const [referral] = await Referral.findOrCreate({
        where: {
          triggerDesc: m.referralData.triggerDesc as string,
          playerId: m.referralData.playerId as string,
          referralType: m.referralData.referralType as string,
        },
        defaults: m.referralData as any,
        transaction: tx,
      });

      // 2. Create Session linked to referral
      m.sessionData.referralId = referral.id;
      const [, sessionCreated] = await Session.findOrCreate({
        where: {
          title: m.sessionData.title as string,
          playerId: m.sessionData.playerId as string,
          referralId: referral.id,
        },
        defaults: m.sessionData as any,
        transaction: tx,
      });

      if (sessionCreated) result.imported++;
      else result.skipped++;
    }
    await tx.commit();
    console.log(`  Imported ${result.imported} sessions`);
  } catch (err) {
    await tx.rollback();
    result.errors.push(`Transaction failed: ${(err as Error).message}`);
    console.error(`  Import failed: ${(err as Error).message}`);
  }

  return result;
}

/**
 * Import Tickets CSV → Referral + Session records (training sessions).
 * Despite the CSV name, these are training sessions, not tickets.
 */
async function importTrainingSessions(dataDir: string): Promise<ImportResult> {
  const result: ImportResult = {
    entity: "training sessions (from Tickets CSV)",
    total: 0,
    imported: 0,
    skipped: 0,
    errors: [],
    warnings: [],
  };

  const csvPath = findCsvByKeyword(dataDir, "Tickets");
  if (!csvPath) {
    result.errors.push("No Tickets CSV found");
    return result;
  }

  console.log(`  File: ${path.basename(csvPath)}`);
  let rows: Record<string, string>[];
  try {
    rows = parseCsvFile(csvPath);
  } catch (err) {
    result.errors.push(`Failed to read CSV: ${(err as Error).message}`);
    return result;
  }

  rows = rows.filter((r) => {
    const title = r["عنوان_التذكرة_ticket_title"] || "";
    return title.trim() !== "";
  });
  result.total = rows.length;
  console.log(`  Found ${rows.length} training session rows`);

  await buildPlayerNameMap();
  const admin = await User.findOne({ where: { role: "Admin" } });

  const mapped = rows.map((row, i) => mapTrainingSessionRow(row, i + 2));

  // Resolve player IDs
  for (const m of mapped) {
    if (m.playerName) {
      const playerId = resolvePlayerId(m.playerName);
      if (playerId) {
        m.referralData.playerId = playerId;
        m.sessionData.playerId = playerId;
      } else {
        m.warnings.push(`Could not resolve player: "${m.playerName}"`);
      }
    }
    if (admin) {
      m.referralData.createdBy = admin.id;
      m.sessionData.createdBy = admin.id;
    }
  }

  for (const m of mapped) {
    result.warnings.push(...m.warnings);
    result.errors.push(...m.errors);
  }

  const valid = mapped.filter(
    (m) => m.errors.length === 0 && m.referralData.playerId,
  );
  result.skipped = mapped.length - valid.length;

  if (dryRun) {
    console.log(
      `  [DRY RUN] Would import ${valid.length} training sessions (Referral + Session each):`,
    );
    for (const m of valid) {
      console.log(
        `    - "${m.sessionData.title}" [${m.sessionData.completionStatus}/${m.sessionData.sessionType}] → ${m.playerName}`,
      );
    }
    result.imported = valid.length;
    return result;
  }

  const tx = await sequelize.transaction();
  try {
    for (const m of valid) {
      // 1. Create Referral
      const [referral] = await Referral.findOrCreate({
        where: {
          triggerDesc: m.referralData.triggerDesc as string,
          playerId: m.referralData.playerId as string,
          referralType: m.referralData.referralType as string,
        },
        defaults: m.referralData as any,
        transaction: tx,
      });

      // 2. Create Session linked to referral
      m.sessionData.referralId = referral.id;
      const [, sessionCreated] = await Session.findOrCreate({
        where: {
          title: m.sessionData.title as string,
          playerId: m.sessionData.playerId as string,
          referralId: referral.id,
        },
        defaults: m.sessionData as any,
        transaction: tx,
      });

      if (sessionCreated) result.imported++;
      else result.skipped++;
    }
    await tx.commit();
    console.log(`  Imported ${result.imported} training sessions`);
  } catch (err) {
    await tx.rollback();
    result.errors.push(`Transaction failed: ${(err as Error).message}`);
    console.error(`  Import failed: ${(err as Error).message}`);
  }

  return result;
}

async function importGates(dataDir: string): Promise<ImportResult> {
  const result: ImportResult = {
    entity: "gates (from Journey CSV)",
    total: 0,
    imported: 0,
    skipped: 0,
    errors: [],
    warnings: [],
  };

  const csvPath = findCsvByKeyword(dataDir, "Journey");
  if (!csvPath) {
    result.errors.push("No Journey CSV found");
    return result;
  }

  console.log(`  File: ${path.basename(csvPath)}`);
  let rows: Record<string, string>[];
  try {
    rows = parseCsvFile(csvPath);
  } catch (err) {
    result.errors.push(`Failed to read CSV: ${(err as Error).message}`);
    return result;
  }

  rows = rows.filter((r) => {
    const name = r["اسم_المرحلة_stage_name"] || "";
    return name.trim() !== "";
  });
  result.total = rows.length;
  console.log(`  Found ${rows.length} gate rows`);

  await buildPlayerNameMap();

  const mapped = rows.map((row, i) => mapGateRow(row, i + 2));

  // Resolve player IDs
  for (const m of mapped) {
    if (m.playerName) {
      const playerId = resolvePlayerId(m.playerName);
      if (playerId) {
        m.data.playerId = playerId;
      } else {
        m.errors.push(`Could not resolve player: "${m.playerName}"`);
      }
    } else {
      m.errors.push("Missing player name");
    }
  }

  for (const m of mapped) {
    result.warnings.push(...m.warnings);
    result.errors.push(...m.errors);
  }

  const valid = mapped.filter((m) => m.errors.length === 0 && m.data.playerId);
  result.skipped = mapped.length - valid.length;

  // Assign gate numbers sequentially per player
  const playerGateCount = new Map<string, number>();
  for (const m of valid) {
    const pid = m.data.playerId as string;
    const gateNum = playerGateCount.get(pid) ?? 0;
    m.data.gateNumber = String(gateNum);
    playerGateCount.set(pid, gateNum + 1);
  }

  if (dryRun) {
    console.log(`  [DRY RUN] Would import ${valid.length} gates:`);
    for (const m of valid) {
      console.log(
        `    - Gate ${m.data.gateNumber} [${m.data.status}] → ${m.playerName} ("${m.data.notes}")`,
      );
    }
    result.imported = valid.length;
    return result;
  }

  const tx = await sequelize.transaction();
  try {
    for (const m of valid) {
      const [, created] = await Gate.findOrCreate({
        where: {
          playerId: m.data.playerId as string,
          gateNumber: m.data.gateNumber as string,
        },
        defaults: m.data as any,
        transaction: tx,
      });
      if (created) result.imported++;
      else result.skipped++;
    }
    await tx.commit();
    console.log(`  Imported ${result.imported} gates`);
  } catch (err) {
    await tx.rollback();
    result.errors.push(`Transaction failed: ${(err as Error).message}`);
    console.error(`  Import failed: ${(err as Error).message}`);
  }

  return result;
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   SADARA — CSV Data Import Tool              ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log();

  if (dryRun) console.log("[DRY RUN] No changes will be made.\n");

  const csvFiles = listCsvFiles(dataDirArg);
  if (csvFiles.length === 0) {
    console.error(`No CSV files found in ${dataDirArg}`);
    process.exit(1);
  }

  console.log("Available CSV files:");
  csvFiles.forEach((f) => console.log(`  - ${path.basename(f)}`));
  console.log();

  try {
    await sequelize.authenticate();
    setupAssociations();
    console.log("Database connection OK\n");
  } catch (err) {
    console.error("Failed to connect:", (err as Error).message);
    process.exit(1);
  }

  const results: ImportResult[] = [];

  // 1. Players first
  if (entityArg === "all" || entityArg === "players") {
    console.log("━━━ Importing Players ━━━");
    results.push(await importPlayers(dataDirArg));
    console.log();
  }

  // Rebuild player map for dependent entities
  await buildPlayerNameMap();
  console.log(`  Player name map: ${playerNameMap.size} entries\n`);

  // 2. Sessions CSV → Referral + Session (match analysis)
  if (entityArg === "all" || entityArg === "sessions") {
    console.log("━━━ Importing Sessions (→ Referral + Session) ━━━");
    results.push(await importSessions(dataDirArg));
    console.log();
  }

  // 3. Tickets CSV → Referral + Session (training sessions)
  if (entityArg === "all" || entityArg === "training") {
    console.log(
      "━━━ Importing Training Sessions (from Tickets CSV → Referral + Session) ━━━",
    );
    results.push(await importTrainingSessions(dataDirArg));
    console.log();
  }

  // 4. Gates (from Journey CSV)
  if (entityArg === "all" || entityArg === "gates") {
    console.log("━━━ Importing Gates (from Journey CSV) ━━━");
    results.push(await importGates(dataDirArg));
    console.log();
  }

  // ── Summary ──
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   IMPORT SUMMARY                             ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  let hasErrors = false;
  for (const r of results) {
    const status = r.errors.length > 0 ? "✗" : "✓";
    console.log(`${status} ${r.entity}:`);
    console.log(`  Total:    ${r.total}`);
    console.log(`  Imported: ${r.imported}`);
    console.log(`  Skipped:  ${r.skipped}`);
    if (r.warnings.length > 0) {
      console.log(`  Warnings (${r.warnings.length}):`);
      r.warnings.slice(0, 10).forEach((w) => console.log(`    ⚠ ${w}`));
      if (r.warnings.length > 10)
        console.log(`    ... and ${r.warnings.length - 10} more`);
    }
    if (r.errors.length > 0) {
      hasErrors = true;
      console.log(`  Errors (${r.errors.length}):`);
      r.errors.slice(0, 10).forEach((e) => console.log(`    ✗ ${e}`));
      if (r.errors.length > 10)
        console.log(`    ... and ${r.errors.length - 10} more`);
    }
    console.log();
  }

  await sequelize.close();
  process.exit(hasErrors ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
