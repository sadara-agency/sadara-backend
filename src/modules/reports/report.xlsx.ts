import ExcelJS from "exceljs";

const HEADER_BG = "0F3460";
const HEADER_FG = "FFFFFF";

interface XlsxSection {
  sheetName: string;
  rows: Record<string, unknown>[];
}

interface XlsxOptions {
  reportTitle: string;
  summary: Record<string, unknown>;
  dataSections: XlsxSection[];
}

export async function generateReportXlsx(options: XlsxOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sadara Sports Company";
  workbook.created = new Date();

  // ── Summary sheet ──
  const summarySheet = workbook.addWorksheet("Summary");
  const titleRow = summarySheet.addRow([options.reportTitle]);
  titleRow.font = { bold: true, size: 14, color: { argb: HEADER_BG } };
  summarySheet.mergeCells("A1:B1");
  summarySheet.addRow([`Generated: ${new Date().toISOString().split("T")[0]}`]);
  summarySheet.addRow([]);

  if (options.summary) {
    for (const [key, val] of Object.entries(options.summary)) {
      const row = summarySheet.addRow([formatLabel(key), val]);
      row.getCell(1).font = { bold: true, color: { argb: "555555" } };
    }
  }
  autoFitColumns(summarySheet);

  // ── Data sheets ──
  for (const section of options.dataSections) {
    if (!section.rows?.length) continue;
    const sheet = workbook.addWorksheet(section.sheetName);
    const cols = Object.keys(section.rows[0]).filter(
      (k) => !k.endsWith("_id") && k !== "id" && !k.endsWith("_url"),
    );

    // Header row
    const headerRow = sheet.addRow(cols.map(formatLabel));
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: HEADER_BG },
      };
      cell.font = { bold: true, color: { argb: HEADER_FG }, size: 10 };
      cell.border = { bottom: { style: "thin" } };
    });

    // Data rows
    for (const row of section.rows) {
      sheet.addRow(cols.map((c) => row[c] ?? ""));
    }

    // Freeze header
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    autoFitColumns(sheet);
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function autoFitColumns(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((col) => {
    let maxLen = 12;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value || "").length;
      if (len > maxLen) maxLen = Math.min(len, 50);
    });
    col.width = maxLen + 2;
  });
}
