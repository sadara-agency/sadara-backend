import { AppError } from "@middleware/errorHandler";
import { logger } from "@config/logger";
import {
  hasPermission,
  getHiddenFields,
} from "@modules/permissions/permission.service";
import { Player } from "@modules/players/player.model";
import { Contract } from "@modules/contracts/contract.model";
import { Injury } from "@modules/injuries/injury.model";
import { Offer } from "@modules/offers/offer.model";
import { Session } from "@modules/sessions/session.model";
import {
  TrainingEnrollment,
  TrainingCourse,
} from "@modules/training/training.model";
import {
  WellnessProfile,
  WellnessCheckin,
  WellnessWeightLog,
} from "@modules/wellness/wellness.model";
import { TechnicalReport } from "@modules/reports/report.model";
import { Invoice, Payment, Valuation } from "@modules/finance/finance.model";
import { Document } from "@modules/documents/document.model";
import { Note } from "@modules/notes/note.model";
import { MatchPlayer } from "@modules/matches/matchPlayer.model";
import { PlayerMatchStats } from "@modules/matches/playerMatchStats.model";
import { User } from "@modules/users/user.model";
import type { AuthUser } from "@shared/types";
import { SectionKey } from "./player-export.validation";

/** Permission module each section is gated by. */
const SECTION_MODULE: Record<SectionKey, string> = {
  personal: "players",
  stats: "match-analytics",
  contracts: "contracts",
  injuries: "injuries",
  training: "training-plans",
  sessions: "session-feedback",
  wellness: "wellness",
  reports: "reports",
  finance: "finance",
  documents: "documents",
  notes: "notes",
  offers: "offers",
};

export interface SectionRows {
  rows: Record<string, unknown>[];
  note?: string;
}

export interface AggregatedPlayerExport {
  player: Record<string, unknown>;
  sections: Partial<Record<SectionKey, SectionRows>>;
  omitted: SectionKey[];
  generatedAt: string;
  locale: "en" | "ar";
}

// ── utils ──

async function resolveUserNames(
  ids: (string | null | undefined)[],
  locale: string,
): Promise<Map<string, string>> {
  const clean = ids.filter((id): id is string => !!id);
  if (!clean.length) return new Map();
  const users = await User.findAll({
    where: { id: clean },
    attributes: ["id", "fullName", "fullNameAr"],
  });
  return new Map(
    users.map((u) => [
      u.get("id") as string,
      ((locale === "ar" ? u.get("fullNameAr") : null) ??
        u.get("fullName")) as string,
    ]),
  );
}

function toPlain(row: unknown): Record<string, unknown> {
  if (row && typeof (row as { get?: unknown }).get === "function") {
    return (
      row as { get: (o: { plain: boolean }) => Record<string, unknown> }
    ).get({
      plain: true,
    });
  }
  return { ...(row as Record<string, unknown>) };
}

function stripFields(
  obj: Record<string, unknown>,
  hidden: string[],
): Record<string, unknown> {
  if (!hidden.length) return obj;
  const out = { ...obj };
  for (const f of hidden) delete out[f];
  return out;
}

async function stripAll(
  rows: unknown[],
  role: string,
  module: string,
  userId: string,
): Promise<Record<string, unknown>[]> {
  const hidden = await getHiddenFields(role, module, userId);
  return rows.map((r) => stripFields(toPlain(r), hidden));
}

// ── main aggregator ──

export async function aggregatePlayerData(
  playerId: string,
  sectionsRequested: SectionKey[],
  user: AuthUser,
  locale: "en" | "ar" = "en",
): Promise<AggregatedPlayerExport> {
  const player = await Player.findByPk(playerId);
  if (!player) throw new AppError("Player not found", 404);

  const role = user.role;
  const userId = user.id;

  const playerHidden = await getHiddenFields(role, "players", userId);
  const personalPlain = stripFields(toPlain(player), playerHidden);

  const sections: Partial<Record<SectionKey, SectionRows>> = {};
  const omitted: SectionKey[] = [];

  // Deduplicate & ensure personal always included
  const keys = Array.from(
    new Set<SectionKey>(["personal", ...sectionsRequested]),
  );

  for (const key of keys) {
    if (key === "personal") {
      sections.personal = { rows: [personalPlain] };
      continue;
    }

    const allowed = await hasPermission(
      role,
      SECTION_MODULE[key],
      "read",
      userId,
    );
    if (!allowed) {
      omitted.push(key);
      continue;
    }

    try {
      sections[key] = await loadSection(key, playerId, role, userId, locale);
    } catch (err) {
      logger.warn("player-export section load failed", {
        key,
        playerId,
        error: (err as Error).message,
      });
      sections[key] = { rows: [], note: "Failed to load." };
    }
  }

  return {
    player: personalPlain,
    sections,
    omitted,
    generatedAt: new Date().toISOString(),
    locale,
  };
}

// ── section loaders ──

async function loadSection(
  key: SectionKey,
  playerId: string,
  role: string,
  userId: string,
  locale: "en" | "ar",
): Promise<SectionRows> {
  switch (key) {
    case "contracts":
      return loadContracts(playerId, role, userId);
    case "injuries":
      return loadInjuries(playerId, role, userId);
    case "offers":
      return loadOffers(playerId, role, userId);
    case "sessions":
      return loadSessions(playerId, role, userId);
    case "training":
      return loadTraining(playerId, role, userId, locale);
    case "wellness":
      return loadWellness(playerId, role, userId);
    case "reports":
      return loadReports(playerId, role, userId);
    case "finance":
      return loadFinance(playerId, role, userId);
    case "documents":
      return loadDocuments(playerId, role, userId, locale);
    case "notes":
      return loadNotes(playerId, role, userId, locale);
    case "stats":
      return loadStats(playerId, role, userId);
    default:
      return { rows: [] };
  }
}

async function loadContracts(
  playerId: string,
  role: string,
  userId: string,
): Promise<SectionRows> {
  const rows = await Contract.findAll({
    where: { playerId },
    order: [["startDate", "DESC"]],
  });
  return { rows: await stripAll(rows, role, "contracts", userId) };
}

async function loadInjuries(
  playerId: string,
  role: string,
  userId: string,
): Promise<SectionRows> {
  const rows = await Injury.findAll({
    where: { playerId },
    order: [["injuryDate", "DESC"]],
  });
  return { rows: await stripAll(rows, role, "injuries", userId) };
}

async function loadOffers(
  playerId: string,
  role: string,
  userId: string,
): Promise<SectionRows> {
  const rows = await Offer.findAll({
    where: { playerId },
    order: [["submittedAt", "DESC"]],
  });
  return { rows: await stripAll(rows, role, "offers", userId) };
}

async function loadSessions(
  playerId: string,
  role: string,
  userId: string,
): Promise<SectionRows> {
  const rows = await Session.findAll({
    where: { playerId },
    order: [["sessionDate", "DESC"]],
    limit: 100,
  });
  return { rows: await stripAll(rows, role, "session-feedback", userId) };
}

async function loadTraining(
  playerId: string,
  role: string,
  userId: string,
  locale: "en" | "ar",
): Promise<SectionRows> {
  const enrollments = await TrainingEnrollment.findAll({
    where: { playerId },
    order: [["createdAt", "DESC"]],
  });
  if (!enrollments.length) return { rows: [] };

  const courseIds = Array.from(
    new Set(enrollments.map((e) => e.get("courseId") as string)),
  );
  const courses = await TrainingCourse.findAll({ where: { id: courseIds } });
  const courseMap = new Map(courses.map((c) => [c.get("id") as string, c]));

  const hidden = await getHiddenFields(role, "training-plans", userId);
  const plains = enrollments.map((e) => {
    const plain = toPlain(e);
    const course = courseMap.get(plain.courseId as string);
    if (course) {
      const cp = toPlain(course);
      plain.courseTitle = cp.title;
      plain.courseTitleAr = cp.titleAr;
      plain.courseCategory = cp.category;
    }
    return stripFields(plain, hidden);
  });

  const userNames = await resolveUserNames(
    plains.map((r) => r.assignedBy as string | null),
    locale,
  );
  const rows = plains.map((r) => ({
    ...r,
    assignedBy: userNames.get(r.assignedBy as string) ?? r.assignedBy,
  }));
  return { rows };
}

async function loadWellness(
  playerId: string,
  role: string,
  userId: string,
): Promise<SectionRows> {
  const [profile, checkins, weights] = await Promise.all([
    WellnessProfile.findOne({ where: { playerId } }),
    WellnessCheckin.findAll({
      where: { playerId },
      order: [["checkinDate", "DESC"]],
      limit: 14,
    }),
    WellnessWeightLog.findAll({
      where: { playerId },
      order: [["loggedDate", "DESC"]],
      limit: 10,
    }),
  ]);
  const hidden = await getHiddenFields(role, "wellness", userId);
  const rows: Record<string, unknown>[] = [];
  if (profile) {
    rows.push({ kind: "profile", ...stripFields(toPlain(profile), hidden) });
  }
  for (const c of checkins) {
    rows.push({ kind: "checkin", ...stripFields(toPlain(c), hidden) });
  }
  for (const w of weights) {
    rows.push({ kind: "weight", ...stripFields(toPlain(w), hidden) });
  }
  return { rows };
}

async function loadReports(
  playerId: string,
  role: string,
  userId: string,
): Promise<SectionRows> {
  const rows = await TechnicalReport.findAll({
    where: { playerId },
    order: [["createdAt", "DESC"]],
  });
  return { rows: await stripAll(rows, role, "reports", userId) };
}

async function loadFinance(
  playerId: string,
  role: string,
  userId: string,
): Promise<SectionRows> {
  const [invoices, payments, valuations] = await Promise.all([
    Invoice.findAll({
      where: { playerId },
      order: [["issueDate", "DESC"]],
      limit: 200,
    }),
    Payment.findAll({
      where: { playerId },
      order: [["dueDate", "DESC"]],
      limit: 200,
    }),
    Valuation.findAll({
      where: { playerId },
      order: [["valuedAt", "DESC"]],
      limit: 50,
    }),
  ]);
  const hidden = await getHiddenFields(role, "finance", userId);
  const rows: Record<string, unknown>[] = [];
  for (const i of invoices) {
    rows.push({ kind: "invoice", ...stripFields(toPlain(i), hidden) });
  }
  for (const p of payments) {
    rows.push({ kind: "payment", ...stripFields(toPlain(p), hidden) });
  }
  for (const v of valuations) {
    rows.push({ kind: "valuation", ...stripFields(toPlain(v), hidden) });
  }
  return { rows };
}

async function loadDocuments(
  playerId: string,
  role: string,
  userId: string,
  locale: "en" | "ar",
): Promise<SectionRows> {
  const docs = await Document.findAll({
    where: { entityType: "Player", entityId: playerId },
    order: [["createdAt", "DESC"]],
  });
  const plains = await stripAll(docs, role, "documents", userId);
  const userNames = await resolveUserNames(
    plains.map((r) => r.uploadedBy as string | null),
    locale,
  );
  const rows = plains.map((r) => ({
    ...r,
    uploadedBy: userNames.get(r.uploadedBy as string) ?? r.uploadedBy,
  }));
  return { rows };
}

async function loadNotes(
  playerId: string,
  role: string,
  userId: string,
  locale: "en" | "ar",
): Promise<SectionRows> {
  const notes = await Note.findAll({
    where: { ownerType: "Player", ownerId: playerId },
    order: [["createdAt", "DESC"]],
  });
  const plains = await stripAll(notes, role, "notes", userId);
  const userNames = await resolveUserNames(
    plains.map((r) => r.createdBy as string | null),
    locale,
  );
  const rows = plains.map((r) => ({
    ...r,
    createdBy: userNames.get(r.createdBy as string) ?? r.createdBy,
  }));
  return { rows };
}

async function loadStats(
  playerId: string,
  role: string,
  userId: string,
): Promise<SectionRows> {
  const [appearances, matchStats] = await Promise.all([
    MatchPlayer.findAll({
      where: { playerId },
      order: [["createdAt", "DESC"]],
      limit: 100,
    }),
    PlayerMatchStats.findAll({
      where: { playerId },
      order: [["createdAt", "DESC"]],
      limit: 50,
    }),
  ]);
  const hidden = await getHiddenFields(role, "match-analytics", userId);

  // Aggregate totals from full match-stats set (capped by query)
  const totals: Record<string, number> = {};
  for (const s of matchStats) {
    const p = toPlain(s);
    for (const k of [
      "goals",
      "assists",
      "shotsTotal",
      "shotsOnTarget",
      "tacklesTotal",
      "interceptions",
      "duelsWon",
      "dribblesCompleted",
      "yellowCards",
      "redCards",
      "minutesPlayed",
    ]) {
      if (typeof p[k] === "number") {
        totals[k] = (totals[k] ?? 0) + (p[k] as number);
      }
    }
  }
  totals.matchesTracked = matchStats.length;

  const rows: Record<string, unknown>[] = [];
  rows.push({ kind: "totals", ...totals });
  for (const a of appearances) {
    rows.push({ kind: "appearance", ...stripFields(toPlain(a), hidden) });
  }
  for (const s of matchStats) {
    rows.push({ kind: "matchStat", ...stripFields(toPlain(s), hidden) });
  }
  return { rows };
}
