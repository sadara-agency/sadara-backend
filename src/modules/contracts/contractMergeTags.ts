import { fmtDate, escHtml } from "@shared/utils/pdf";

// ── Arabic date format matching the legacy PDF (e.g. "01 / 06 / 2026م") ──
function arDate(s: string | null | undefined): string {
  if (!s) return "";
  return fmtDate(s, { fallback: "", suffix: "م", separator: " / " });
}

// ── Contract duration in Arabic (mirrors the legacy calcDur) ──
function arDuration(start?: string | null, end?: string | null): string {
  if (!start || !end) return "";
  try {
    const s = new Date(start);
    const e = new Date(end);
    const m =
      (e.getFullYear() - s.getFullYear()) * 12 + e.getMonth() - s.getMonth();
    if (m === 24) return "سنتان (24 شهرًا)";
    if (m === 12) return "سنة واحدة (12 شهرًا)";
    return m > 0 ? `${m} شهرًا` : "";
  } catch {
    return "";
  }
}

export interface TagContextInput {
  player: {
    firstName?: string | null;
    lastName?: string | null;
    firstNameAr?: string | null;
    lastNameAr?: string | null;
    nationality?: string | null;
    nationalId?: string | null;
    phone?: string | null;
  };
  contract: {
    startDate?: string | null;
    endDate?: string | null;
    commissionPct?: number | string | null;
    displayId?: string | null;
    agentName?: string | null;
    agentLicense?: string | null;
  };
  today?: string | null;
}

export const MERGE_TAGS: ReadonlyArray<{
  key: string;
  labelAr: string;
  resolve: (c: TagContextInput) => string;
}> = [
  {
    key: "player.name",
    labelAr: "اسم اللاعب",
    resolve: (c) => {
      const ar =
        c.player.firstNameAr && c.player.lastNameAr
          ? `${c.player.firstNameAr} ${c.player.lastNameAr}`
          : "";
      const en =
        c.player.firstName && c.player.lastName
          ? `${c.player.firstName} ${c.player.lastName}`
          : "";
      return ar || en || "";
    },
  },
  {
    key: "player.nameEn",
    labelAr: "اسم اللاعب (إنجليزي)",
    resolve: (c) =>
      c.player.firstName && c.player.lastName
        ? `${c.player.firstName} ${c.player.lastName}`
        : "",
  },
  {
    key: "player.nationalId",
    labelAr: "رقم الهوية",
    resolve: (c) => c.player.nationalId ?? "",
  },
  {
    key: "player.nationality",
    labelAr: "الجنسية",
    resolve: (c) => c.player.nationality ?? "",
  },
  {
    key: "player.phone",
    labelAr: "الجوال",
    resolve: (c) => c.player.phone ?? "",
  },
  {
    key: "contract.startDate",
    labelAr: "تاريخ البداية",
    resolve: (c) => arDate(c.contract.startDate),
  },
  {
    key: "contract.endDate",
    labelAr: "تاريخ النهاية",
    resolve: (c) => arDate(c.contract.endDate),
  },
  {
    key: "contract.duration",
    labelAr: "مدة العقد",
    resolve: (c) => arDuration(c.contract.startDate, c.contract.endDate),
  },
  {
    key: "commission.pct",
    labelAr: "نسبة العمولة",
    resolve: (c) =>
      c.contract.commissionPct === null ||
      c.contract.commissionPct === undefined
        ? ""
        : String(c.contract.commissionPct),
  },
  {
    key: "contract.displayId",
    labelAr: "رقم العقد",
    resolve: (c) => c.contract.displayId ?? "",
  },
  {
    key: "agent.name",
    labelAr: "اسم الوكيل",
    resolve: (c) => c.contract.agentName ?? "",
  },
  {
    key: "agent.license",
    labelAr: "رخصة فيفا",
    resolve: (c) => c.contract.agentLicense ?? "",
  },
  {
    key: "today",
    labelAr: "تاريخ التحرير",
    resolve: (c) => arDate(c.today ?? null),
  },
] as const;

export function buildTagContext(
  input: TagContextInput,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const tag of MERGE_TAGS) {
    out[tag.key] = tag.resolve(input);
  }
  return out;
}

export function resolveMergeTags(
  html: string,
  data: Record<string, string>,
): string {
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key: string) => {
    const val = data[key];
    if (val === undefined) return match;
    return val === "" ? '<span class="blank"></span>' : escHtml(val);
  });
}
