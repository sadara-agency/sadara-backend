// ─────────────────────────────────────────────────────────────
// csv-import/mappers/journey.mapper.ts
// Maps the Notion "Player Journey" CSV export to PlayerJourney
// model records (player_journeys table).
//
// CSV columns (Notion bilingual underscore format):
//   اسم_المرحلة_stage_name
//   الجهة_المسؤولة_responsible
//   الحالة_status
//   المرحلة_stage  (stage type label in Arabic)
//   تاريخ_البدء_start_date
//   تاريخ_الانتهاء_المتوقع_expected_end_date
//   اللاعب_player
// ─────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, string> = {
  "لم تبدأ": "NotStarted",
  "قيد التنفيذ": "InProgress",
  منتهية: "Completed",
  مكتملة: "Completed",
  مكتمل: "Completed",
  معلقة: "OnHold",
};

const STAGE_TYPE_MAP: Record<string, string> = {
  "خطة تدريب بدني": "PhysicalTraining",
  "خطة تدريب تقني": "TechnicalTraining",
  "خطة تدريب تكتيكي": "TacticalTraining",
  تقييم: "Assessment",
  تعافي: "Recovery",
  "تطوير ذهني": "MentalDevelopment",
};

const OWNER_BY_TYPE: Record<string, string> = {
  PhysicalTraining: "FitnessCoach",
  TechnicalTraining: "Coach",
  TacticalTraining: "TacticalCoach",
  Assessment: "Analyst",
  Recovery: "FitnessCoach",
  MentalDevelopment: "MentalCoach",
  General: "Manager",
};

export interface MappedJourney {
  data: Record<string, unknown>;
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

/** @deprecated Use mapJourneyRow. Kept for CLI csv-import/index.ts compatibility. */
export const mapGateRow = (row: Record<string, string>, rowIndex: number) =>
  mapJourneyRow(row, rowIndex);

export function mapJourneyRow(
  row: Record<string, string>,
  rowIndex: number,
): MappedJourney {
  const data: Record<string, unknown> = {};
  const warnings: string[] = [];
  const errors: string[] = [];
  const prefix = `Row ${rowIndex}`;

  // ── Stage Name ──
  const stageName = (row["اسم_المرحلة_stage_name"] || "").trim();
  if (!stageName) {
    errors.push(`${prefix}: Missing stage name`);
    return { data, warnings, errors, playerName: "" };
  }
  data.stageName = stageName;
  data.stageNameAr = stageName;

  // ── Stage Type ──
  const stageTypeRaw = (row["المرحلة_stage"] || "").trim();
  const stageType = STAGE_TYPE_MAP[stageTypeRaw] ?? "General";
  if (stageTypeRaw && !STAGE_TYPE_MAP[stageTypeRaw]) {
    warnings.push(
      `${prefix}: Unknown stage type "${stageTypeRaw}", using "General"`,
    );
  }
  data.stageType = stageType;

  // ── Stage Owner (inferred from type) ──
  data.stageOwner = OWNER_BY_TYPE[stageType] ?? "Manager";

  // ── Status ──
  const statusRaw = (row["الحالة_status"] || "").trim();
  data.status = STATUS_MAP[statusRaw] ?? "NotStarted";
  if (statusRaw && !STATUS_MAP[statusRaw]) {
    warnings.push(
      `${prefix}: Unknown status "${statusRaw}", using "NotStarted"`,
    );
  }

  // ── Responsible Party ──
  const responsible = (row["الجهة_المسؤولة_responsible"] || "").trim();
  if (responsible) {
    data.responsibleParty = responsible;
    data.responsiblePartyAr = responsible;
  }

  // ── Start Date ──
  const startRaw = (row["تاريخ_البدء_start_date"] || "").trim();
  if (startRaw) {
    const parsed = parseDate(startRaw);
    if (parsed) {
      data.startDate = parsed;
    } else {
      warnings.push(`${prefix}: Could not parse start date "${startRaw}"`);
    }
  }

  // ── Expected End Date ──
  const endRaw = (row["تاريخ_الانتهاء_المتوقع_expected_end_date"] || "").trim();
  if (endRaw) {
    const parsed = parseDate(endRaw);
    if (parsed) {
      data.expectedEndDate = parsed;
    } else {
      warnings.push(`${prefix}: Could not parse end date "${endRaw}"`);
    }
  }

  // ── Player (resolved by orchestrator) ──
  const playerRaw = row["اللاعب_player"] || "";
  const playerName = extractName(playerRaw);

  return { data, warnings, errors, playerName };
}
