// ─────────────────────────────────────────────────────────────
// csv-import/mappers/session.mapper.ts
// Maps the Notion "Sessions" CSV to BOTH:
//   1. Referral record (the player care case)
//   2. Session record (the actual session, linked to the referral)
//
// CSV columns:
//   عنوان الجلسة | Session Title, المختص | Specialist,
//   التاريخ | Date, الحالة | Status, اللاعب | Player,
//   ملخص | Summary, نوع الجلسة | Session Type,
//   Program Owner | مالك البرنامج, Responsible | المسؤول,
//   توصية ناتجة | Resulting Recommendation
// ─────────────────────────────────────────────────────────────

// Completion status mapping (Arabic → Session enum)
const COMPLETION_MAP: Record<string, string> = {
  مكتمل: "Completed",
  مكتملة: "Completed",
  مجدول: "Scheduled",
  مجدولة: "Scheduled",
  "قيد التنفيذ": "Scheduled",
  مفتوح: "Scheduled",
  مفتوحة: "Scheduled",
  ملغى: "Cancelled",
  ملغاة: "Cancelled",
};

// Referral status mapping
const REFERRAL_STATUS_MAP: Record<string, string> = {
  مكتمل: "Closed",
  مكتملة: "Closed",
  مجدول: "Open",
  مجدولة: "Open",
  "قيد التنفيذ": "InProgress",
  مفتوح: "Open",
  مفتوحة: "Open",
};

// Session type mapping (Arabic → Session enum)
const SESSION_TYPE_MAP: Record<string, string> = {
  "تحليل أداء": "PerformanceAssessment",
  "تحليل اداء": "PerformanceAssessment",
  "تدريب بدني": "Physical",
  "تدريب فني": "Skill",
  "تدريب تكتيكي": "Tactical",
  "تقييم نفسي": "Mental",
  تغذية: "Nutrition",
};

// Referral type mapping (from session type)
const REFERRAL_TYPE_MAP: Record<string, string> = {
  PerformanceAssessment: "Performance",
  Physical: "Physical",
  Skill: "Skill",
  Tactical: "Tactical",
  Mental: "Mental",
  Nutrition: "Nutrition",
};

// Program owner mapping (Arabic → Session enum)
const PROGRAM_OWNER_MAP: Record<string, string> = {
  "محلل أداء": "Analyst",
  "محلل الأداء": "Analyst",
  "مدرب بدني": "FitnessCoach",
  مدرب: "Coach",
  "أخصائي تغذية": "NutritionSpecialist",
  "أخصائي بدني": "FitnessCoach",
  "مدرب مهارات": "SkillCoach",
  "مدرب تكتيكي": "TacticalCoach",
};

export interface MappedSessionRow {
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
 * Map a single Sessions CSV row to both Referral + Session attributes.
 */
export function mapSessionRow(
  row: Record<string, string>,
  rowIndex: number,
): MappedSessionRow {
  const referralData: Record<string, unknown> = {};
  const sessionData: Record<string, unknown> = {};
  const warnings: string[] = [];
  const errors: string[] = [];
  const prefix = `Row ${rowIndex}`;

  // ── Title ──
  const title = (row["عنوان_الجلسة_session_title"] || "").trim();
  if (!title) {
    errors.push(`${prefix}: Missing session title`);
    return { referralData, sessionData, warnings, errors, playerName: "" };
  }

  // Referral: use title as trigger description
  referralData.triggerDesc = title;

  // Session: set title
  sessionData.titleAr = title;
  sessionData.title = title;

  // ── Session Type → both referralType and sessionType ──
  const typeRaw = (row["نوع_الجلسة_session_type"] || "").trim();
  const sessionType = SESSION_TYPE_MAP[typeRaw] || "PerformanceAssessment";
  sessionData.sessionType = sessionType;
  referralData.referralType = REFERRAL_TYPE_MAP[sessionType] || "Performance";

  if (typeRaw && !SESSION_TYPE_MAP[typeRaw]) {
    warnings.push(
      `${prefix}: Unknown session type "${typeRaw}", using "PerformanceAssessment"`,
    );
  }

  // ── Status → completion status for session, status for referral ──
  const statusRaw = (row["الحالة_status"] || "").trim();
  sessionData.completionStatus = COMPLETION_MAP[statusRaw] || "Scheduled";
  referralData.status = REFERRAL_STATUS_MAP[statusRaw] || "Open";

  // ── Date → sessionDate + referral dates ──
  const dateRaw = (row["التاريخ_date"] || "").trim();
  if (dateRaw) {
    const parsed = parseDate(dateRaw);
    if (parsed) {
      sessionData.sessionDate = parsed;
      referralData.assignedAt = parsed;
      if (referralData.status === "Closed") {
        referralData.closedAt = parsed;
      }
    } else {
      warnings.push(`${prefix}: Could not parse date "${dateRaw}"`);
      // Default to today
      sessionData.sessionDate = new Date().toISOString().split("T")[0];
    }
  } else {
    sessionData.sessionDate = new Date().toISOString().split("T")[0];
  }

  // ── Player (resolved later) ──
  const playerRaw = row["اللاعب_player"] || "";
  const playerName = extractName(playerRaw);

  // ── Summary ──
  const summary = (row["ملخص_summary"] || "").trim();
  if (summary) {
    sessionData.summaryAr = summary;
    sessionData.summary = summary;
    referralData.notes = summary;
  }

  // ── Specialist → programOwner ──
  const specialist = (row["المختص_specialist"] || "").trim();
  sessionData.programOwner = PROGRAM_OWNER_MAP[specialist] || "Analyst";

  // ── Referral target (same as program owner)
  referralData.referralTarget = sessionData.programOwner;

  // ── Resulting Recommendation → stored for later ticket linking ──
  const recommendation = (
    row["توصية_ناتجة_resulting_recommendation"] || ""
  ).trim();
  if (recommendation) {
    const ticketName = extractName(recommendation);
    if (ticketName) {
      sessionData._resultingTicketName = ticketName;
    }
  }

  // ── Referral defaults ──
  referralData.priority = "Medium";
  referralData.isAutoGenerated = false;
  referralData.sessionCount = 1;

  return { referralData, sessionData, warnings, errors, playerName };
}
