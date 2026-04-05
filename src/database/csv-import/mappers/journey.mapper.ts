// ─────────────────────────────────────────────────────────────
// csv-import/mappers/journey.mapper.ts
// Maps the Notion "Player Journey" CSV to Gate model records.
// The client uses "Player Journey" in Notion to track player
// development stages, which maps to the Gates pipeline (Gate 0-3).
//
// CSV columns:
//   اسم المرحلة | Stage Name,
//   تاريخ الانتهاء المتوقع | Expected End Date,
//   تاريخ البدء | Start Date, الحالة | Status,
//   اللاعب | Player, المرحلة | Stage,
//   الجهة المسؤولة | Responsible
// ─────────────────────────────────────────────────────────────

// Status mapping (Arabic → Gate enum)
const STATUS_MAP: Record<string, string> = {
  "لم تبدأ": "Pending",
  "قيد التنفيذ": "InProgress",
  مكتملة: "Completed",
  مكتمل: "Completed",
  معلقة: "Pending",
};

export interface MappedGate {
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

/**
 * Map a single Journey CSV row to Gate model attributes.
 * Gate number is assigned later by the orchestrator (sequential per player).
 */
export function mapGateRow(
  row: Record<string, string>,
  rowIndex: number,
): MappedGate {
  const data: Record<string, unknown> = {};
  const warnings: string[] = [];
  const errors: string[] = [];
  const prefix = `Row ${rowIndex}`;

  // ── Stage Name → notes ──
  const stageName = (row["اسم_المرحلة_stage_name"] || "").trim();
  if (!stageName) {
    errors.push(`${prefix}: Missing stage name`);
    return { data, warnings, errors, playerName: "" };
  }
  data.notes = stageName;

  // ── Status ──
  const statusRaw = (row["الحالة_status"] || "").trim();
  data.status = STATUS_MAP[statusRaw] || "Pending";
  if (statusRaw && !STATUS_MAP[statusRaw]) {
    warnings.push(`${prefix}: Unknown status "${statusRaw}", using "Pending"`);
  }

  // ── Start Date → startedAt ──
  const startDateRaw = (row["تاريخ_البدء_start_date"] || "").trim();
  if (startDateRaw) {
    const parsed = parseDate(startDateRaw);
    if (parsed) {
      // Set startedAt if gate is InProgress or Completed
      if (data.status === "InProgress" || data.status === "Completed") {
        data.startedAt = parsed;
      }
    } else {
      warnings.push(`${prefix}: Could not parse start date "${startDateRaw}"`);
    }
  }

  // ── Expected End Date → completedAt (if Completed) ──
  const endDateRaw = (
    row["تاريخ_الانتهاء_المتوقع_expected_end_date"] || ""
  ).trim();
  if (endDateRaw && data.status === "Completed") {
    const parsed = parseDate(endDateRaw);
    if (parsed) {
      data.completedAt = parsed;
    }
  }

  // ── Player ──
  const playerRaw = row["اللاعب_player"] || "";
  const playerName = extractName(playerRaw);

  // gateNumber will be assigned by the orchestrator (sequential per player)

  return { data, warnings, errors, playerName };
}
