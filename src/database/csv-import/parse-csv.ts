// ─────────────────────────────────────────────────────────────
// csv-import/parse-csv.ts
// Generic CSV parser with header normalization for Notion exports.
// ─────────────────────────────────────────────────────────────
import fs from "fs";
import path from "path";

/**
 * Parse a CSV file into an array of records.
 * Handles: quoted fields, commas inside quotes, newlines inside quotes,
 * BOM characters, and trailing CRLFs.
 */
export function parseCsvFile(filePath: string): Record<string, string>[] {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`CSV file not found: ${absPath}`);
  }

  let raw = fs.readFileSync(absPath, "utf-8");

  // Strip BOM
  if (raw.charCodeAt(0) === 0xfeff) {
    raw = raw.slice(1);
  }

  const rows = parseCsvRows(raw);
  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map(normalizeHeader);
  const records: Record<string, string>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Skip empty rows
    if (row.length === 1 && row[0].trim() === "") continue;

    const record: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = (row[j] ?? "").trim();
    }
    records.push(record);
  }

  return records;
}

/**
 * Normalize a CSV header to a consistent camelCase key.
 * Handles Arabic headers, spaces, special characters.
 */
export function normalizeHeader(header: string): string {
  return header
    .trim()
    .replace(/[\r\n]/g, "")
    .replace(/[^\w\s\u0600-\u06FF]/g, "") // Keep word chars, spaces, Arabic
    .replace(/\s+/g, "_")
    .toLowerCase();
}

/**
 * RFC 4180-compliant CSV row parser.
 * Supports quoted fields with embedded commas, quotes, and newlines.
 */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;

  while (i < text.length) {
    const { row, nextIndex } = parseRow(text, i);
    rows.push(row);
    i = nextIndex;
  }

  return rows;
}

function parseRow(
  text: string,
  start: number,
): { row: string[]; nextIndex: number } {
  const fields: string[] = [];
  let i = start;

  while (i < text.length) {
    if (text[i] === '"') {
      // Quoted field
      const { value, nextIndex } = parseQuotedField(text, i);
      fields.push(value);
      i = nextIndex;
    } else {
      // Unquoted field
      let end = i;
      while (
        end < text.length &&
        text[end] !== "," &&
        text[end] !== "\n" &&
        text[end] !== "\r"
      ) {
        end++;
      }
      fields.push(text.slice(i, end));
      i = end;
    }

    if (i < text.length && text[i] === ",") {
      i++; // skip comma
      continue;
    }

    // End of row
    if (i < text.length && text[i] === "\r") i++;
    if (i < text.length && text[i] === "\n") i++;
    break;
  }

  return { row: fields, nextIndex: i };
}

function parseQuotedField(
  text: string,
  start: number,
): { value: string; nextIndex: number } {
  let i = start + 1; // skip opening quote
  let value = "";

  while (i < text.length) {
    if (text[i] === '"') {
      if (i + 1 < text.length && text[i + 1] === '"') {
        value += '"';
        i += 2; // escaped quote
      } else {
        i++; // closing quote
        break;
      }
    } else {
      value += text[i];
      i++;
    }
  }

  return { value, nextIndex: i };
}

/**
 * List available CSV files in the data directory.
 */
export function listCsvFiles(dataDir: string): string[] {
  if (!fs.existsSync(dataDir)) return [];
  return fs
    .readdirSync(dataDir)
    .filter((f) => f.endsWith(".csv"))
    .map((f) => path.join(dataDir, f));
}
