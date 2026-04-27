// ─────────────────────────────────────────────────────────────
// csv-import/mappers/ticket.mapper.ts
// Maps the Notion "Tickets" CSV to BOTH:
//   1. Referral record (player care case, type: Physical)
//   2. Session record (the training session, linked to referral)
//
// These are training sessions (تمرين), NOT tickets.
// A session may later create a ticket as an action item.
//
// CSV columns:
//   عنوان التذكرة | Ticket Title, الأولوية | Priority,
//   نوع التذكرة | Ticket Type, الحالة | Status,
//   اللاعب | Player, المسؤول | Responsible,
//   الجهة المستلمة | Receiving Party,
//   تاريخ الإغلاق | Closure Date
// ─────────────────────────────────────────────────────────────

// Session type mapping (Arabic ticket type → Session enum)
const SESSION_TYPE_MAP: Record<string, string> = {
  بدني: "Physical",
  فني: "Skill",
  تكتيكي: "Tactical",
  طبي: "Physical", // Medical → Physical for session context
  نفسي: "Mental",
  إداري: "Physical",
  عام: "Physical",
};

// Referral type mapping
const REFERRAL_TYPE_MAP: Record<string, string> = {
  Physical: "Physical",
  Skill: "Skill",
  Tactical: "Tactical",
  Mental: "Mental",
};

// Completion status mapping (Arabic → Session enum)
const COMPLETION_MAP: Record<string, string> = {
  مفتوحة: "Scheduled",
  "قيد التنفيذ": "Scheduled",
  "بانتظار اللاعب": "Scheduled",
  مكتملة: "Completed",
  ملغاة: "Cancelled",
};

// Referral status mapping
const REFERRAL_STATUS_MAP: Record<string, string> = {
  مفتوحة: "Open",
  "قيد التنفيذ": "InProgress",
  "بانتظار اللاعب": "Waiting",
  مكتملة: "Closed",
  ملغاة: "Closed",
};

// Priority mapping (Arabic → Referral enum)
const PRIORITY_MAP: Record<string, string> = {
  عاجلة: "High",
  عاجل: "High",
  عالية: "High",
  متوسطة: "Medium",
  منخفضة: "Low",
};

// Program owner mapping from receiving party
const PROGRAM_OWNER_MAP: Record<string, string> = {
  "أخصائي بدني": "FitnessCoach",
  "مدرب خارجي": "Coach",
  "محلل الأداء": "Analyst",
  "محلل أداء": "Analyst",
  "أخصائي تغذية": "NutritionSpecialist",
  مدرب: "Coach",
};

export interface MappedTrainingSession {
  referralData: Record<string, unknown>;
  sessionData: Record<string, unknown>;
  warnings: string[];
  errors: string[];
  playerName: string;
}

function extractName(value: string): string {
  if (!value) return "";
  return value.replace(/\s*\(https?:\/\/[^)]+\)/g, "").trim();
}

function parseDate(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return null;
}

/**
 * Map a single Tickets CSV row to Referral + Session attributes.
 */
export function mapTrainingSessionRow(
  row: Record<string, string>,
  rowIndex: number,
): MappedTrainingSession {
  const referralData: Record<string, unknown> = {};
  const sessionData: Record<string, unknown> = {};
  const warnings: string[] = [];
  const errors: string[] = [];
  const prefix = `Row ${rowIndex}`;

  // ── Title ──
  const title = (row["عنوان_التذكرة_ticket_title"] || "").trim();
  if (!title) {
    errors.push(`${prefix}: Missing title`);
    return { referralData, sessionData, warnings, errors, playerName: "" };
  }

  referralData.triggerDesc = title;
  sessionData.titleAr = title;
  sessionData.title = title;

  // ── Type → sessionType + referralType ──
  const typeRaw = (row["نوع_التذكرة_ticket_type"] || "").trim();
  const sessionType = SESSION_TYPE_MAP[typeRaw] || "Physical";
  sessionData.sessionType = sessionType;
  referralData.referralType = REFERRAL_TYPE_MAP[sessionType] || "Physical";

  // ── Priority ──
  const priorityRaw = (row["الأولوية_priority"] || "").trim();
  referralData.priority = PRIORITY_MAP[priorityRaw] || "Medium";

  // ── Status → completionStatus + referral status ──
  const statusRaw = (row["الحالة_status"] || "").trim();
  sessionData.completionStatus = COMPLETION_MAP[statusRaw] || "Scheduled";
  referralData.status = REFERRAL_STATUS_MAP[statusRaw] || "Open";

  // ── Player ──
  const playerRaw = row["اللاعب_player"] || "";
  const playerName = extractName(playerRaw);

  // ── Receiving Party → programOwner ──
  const receivingParty = (row["الجهة_المستلمة_receiving_party"] || "").trim();
  sessionData.programOwner =
    PROGRAM_OWNER_MAP[receivingParty] || "FitnessCoach";
  referralData.referralTarget = sessionData.programOwner;

  // ── Responsible → notes ──
  const responsible = (row["المسؤول_responsible"] || "").trim();
  if (responsible) {
    sessionData.notesAr = `المسؤول: ${responsible}`;
    if (receivingParty) {
      sessionData.notesAr += ` | الجهة المستلمة: ${receivingParty}`;
    }
  }

  // ── Closure Date → sessionDate ──
  const closureDateRaw = (row["تاريخ_الإغلاق_closure_date"] || "").trim();
  if (closureDateRaw) {
    const parsed = parseDate(closureDateRaw);
    if (parsed) {
      sessionData.sessionDate = parsed;
      referralData.dueDate = parsed;
    } else {
      warnings.push(`${prefix}: Could not parse date "${closureDateRaw}"`);
      sessionData.sessionDate = new Date().toISOString().split("T")[0];
    }
  } else {
    sessionData.sessionDate = new Date().toISOString().split("T")[0];
  }

  // ── Defaults ──
  referralData.isAutoGenerated = false;

  return { referralData, sessionData, warnings, errors, playerName };
}
