import ExcelJS from "exceljs";
import type { AggregatedPlayerExport } from "./player-export.service";
import type { SectionKey } from "./player-export.validation";

const HEADER_BG = "0F3460";
const HEADER_FG = "FFFFFF";

const SHEET_NAME: Record<SectionKey, string> = {
  personal: "Personal",
  stats: "Stats",
  contracts: "Contracts",
  injuries: "Injuries",
  training: "Training",
  sessions: "Sessions",
  wellness: "Wellness",
  reports: "Reports",
  finance: "Finance",
  documents: "Documents",
  notes: "Notes",
  offers: "Offers",
};

export async function renderXlsxBuffer(
  data: AggregatedPlayerExport,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sadara Sports Company";
  wb.created = new Date();

  // Summary sheet
  const summary = wb.addWorksheet("Summary");
  summary.addRow(["Sadara Sports — Player Profile Export"]).font = {
    bold: true,
    size: 14,
    color: { argb: HEADER_BG },
  };
  summary.mergeCells("A1:B1");
  summary.addRow([
    "Generated",
    new Date(data.generatedAt).toISOString().split("T")[0],
  ]);
  summary.addRow([
    "Player",
    `${data.player.firstName ?? ""} ${data.player.lastName ?? ""}`.trim(),
  ]);
  summary.addRow(["Sections", Object.keys(data.sections).join(", ")]);
  if (data.omitted.length) {
    summary.addRow(["Omitted (permission)", data.omitted.join(", ")]);
  }
  autoFit(summary);

  // One sheet per section
  for (const key of Object.keys(data.sections) as SectionKey[]) {
    const rows = data.sections[key]?.rows ?? [];
    if (!rows.length) continue;
    const sheet = wb.addWorksheet(SHEET_NAME[key]);

    const cols = Array.from(
      new Set(rows.flatMap((r) => Object.keys(r))),
    ).filter(
      (k) =>
        !["createdAt", "updatedAt", "deletedAt"].includes(k) &&
        !k.endsWith("Url"),
    );

    const headerRow = sheet.addRow(cols.map(labelize));
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: HEADER_BG },
      };
      cell.font = { bold: true, color: { argb: HEADER_FG }, size: 10 };
      cell.border = { bottom: { style: "thin" } };
    });

    for (const r of rows) {
      sheet.addRow(cols.map((c) => fmtCell(r[c])));
    }
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    autoFit(sheet);
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}

function labelize(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/;

function fmtCell(v: unknown): string | number {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? "✓" : "✗";
  if (typeof v === "string") {
    if (ISO_DATE_RE.test(v)) {
      const d = new Date(v);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-GB", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
    }
    return v;
  }
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function autoFit(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((col) => {
    let maxLen = 12;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > maxLen) maxLen = Math.min(len, 50);
    });
    col.width = maxLen + 2;
  });
}
