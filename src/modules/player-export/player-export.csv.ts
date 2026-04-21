import { stringify } from "csv-stringify/sync";
import type { AggregatedPlayerExport } from "./player-export.service";
import type { SectionKey } from "./player-export.validation";

const SECTION_HEADER: Record<SectionKey, string> = {
  personal: "PERSONAL",
  stats: "CAREER STATS",
  contracts: "CONTRACTS",
  injuries: "INJURIES",
  training: "TRAINING",
  sessions: "SESSIONS",
  wellness: "WELLNESS",
  reports: "REPORTS",
  finance: "FINANCE",
  documents: "DOCUMENTS",
  notes: "NOTES",
  offers: "OFFERS",
};

/**
 * Multi-section CSV layout:
 *   # SECTION — Name
 *   col1,col2,col3
 *   v1,v2,v3
 *   (blank row)
 *   # SECTION — Next
 *   ...
 */
export function renderCsvBuffer(data: AggregatedPlayerExport): Buffer {
  const chunks: string[] = [];

  chunks.push(`# Sadara Sports — Player Profile Export`);
  chunks.push(
    `# Generated: ${new Date(data.generatedAt).toISOString().split("T")[0]}`,
  );
  chunks.push(
    `# Player: ${String(data.player.firstName ?? "")} ${String(data.player.lastName ?? "")}`.trim(),
  );
  if (data.omitted.length) {
    chunks.push(`# Omitted (permission): ${data.omitted.join(", ")}`);
  }
  chunks.push("");

  for (const key of Object.keys(data.sections) as SectionKey[]) {
    const rows = data.sections[key]?.rows ?? [];
    chunks.push(`# SECTION — ${SECTION_HEADER[key]}`);
    if (!rows.length) {
      chunks.push("(no records)");
      chunks.push("");
      continue;
    }
    const cols = Array.from(
      new Set(rows.flatMap((r) => Object.keys(r))),
    ).filter(
      (k) =>
        !["createdAt", "updatedAt", "deletedAt"].includes(k) &&
        !k.endsWith("Url"),
    );
    const normalized = rows.map((r) => {
      const out: Record<string, string> = {};
      for (const c of cols) out[c] = stringify1(r[c]);
      return out;
    });
    const body = stringify(normalized, { header: true, columns: cols });
    chunks.push(body.trimEnd());
    chunks.push("");
  }

  return Buffer.from(chunks.join("\n"), "utf-8");
}

function stringify1(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
