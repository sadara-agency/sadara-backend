// ─────────────────────────────────────────────────────────────
// csv-import/mappers/player.mapper.ts
// Maps the Notion "لاعبينــا Our Players" CSV to Player model.
//
// CSV columns (actual):
//   أسم الاعب, العمر, سنة الميلاد, النادي, المركز,
//   الحالة التعاقدية, الجنسية, الملاحظات, آخر تحديث, #,
//   Player Journey, الاجتماعات | Meetings, التذاكر | Tickets,
//   الجلسات | Sessions, العقود والرعايات, العميل | Client,
//   الفواتير والتكاليف, المهام | Tasks, سجلات المتابعة | Tracking Records
// ─────────────────────────────────────────────────────────────
import { Club } from "@modules/clubs/club.model";
import { User } from "@modules/users/user.model";

// Position mapping (Arabic → English)
const POSITION_MAP: Record<string, string> = {
  حارس: "Goalkeeper",
  "حارس مرمى": "Goalkeeper",
  مدافع: "Back",
  دفاع: "Back",
  "ظهير أيمن": "Back",
  "ظهير أيسر": "Back",
  "قلب دفاع": "Back",
  محور: "Midfielder",
  "لاعب وسط": "Midfielder",
  وسط: "Midfielder",
  جناح: "Winger",
  "جناح أيمن": "Winger",
  "جناح أيسر": "Winger",
  مهاجم: "Striker",
  هداف: "Striker",
};

// Nationality mapping (strip emoji flags)
const NATIONALITY_MAP: Record<string, string> = {
  السعودية: "Saudi Arabian",
  "🇸🇦 السعودية": "Saudi Arabian",
  مصر: "Egyptian",
  "🇪🇬 مصر": "Egyptian",
  اليمن: "Yemeni",
  "🇾🇪 اليمن": "Yemeni",
};

// Club name mapping (Arabic → match against seeded SPL clubs)
// Also includes non-SPL clubs the client may have
const CLUB_NAME_NORMALIZE: Record<string, string> = {
  الهلال: "Al Hilal",
  النصر: "Al Nassr",
  الأهلي: "Al Ahli",
  الاهلي: "Al Ahli",
  الاتحاد: "Al Ittihad",
  الشباب: "Al Shabab",
  الفتح: "Al Fateh",
  التعاون: "Al Taawoun",
  الرائد: "Al Raed",
  الاتفاق: "Al Ettifaq",
  الخليج: "Al Khaleej",
  الرياض: "Al Riyadh",
  الأخدود: "Al Akhdoud",
  الاخدود: "Al Akhdoud",
  الفيحاء: "Al Fayha",
  الوحدة: "Al Wehda",
  ضمك: "Damac",
  العروبة: "Al Orubah",
  القادسية: "Al Qadsiah",
  الخلود: "Al Kholood",
  // Non-SPL clubs — will be created if needed
  ابها: "Abha",
  "مجد القنفذة": "Majd Al Qunfudhah",
};

export interface MappedPlayer {
  data: Record<string, unknown>;
  warnings: string[];
  errors: string[];
  originalName: string;
}

/**
 * Map a single CSV row (from Notion Players export) to Player model attributes.
 */
export function mapPlayerRow(
  row: Record<string, string>,
  rowIndex: number,
): MappedPlayer {
  const data: Record<string, unknown> = {};
  const warnings: string[] = [];
  const errors: string[] = [];
  const prefix = `Row ${rowIndex}`;

  // ── Name (أسم الاعب) — split into first/last ──
  const fullName = (row["أسم_الاعب"] || row["أسم الاعب"] || "").trim();
  if (!fullName) {
    errors.push(`${prefix}: Missing player name (أسم الاعب)`);
    return { data, warnings, errors, originalName: "" };
  }

  const nameParts = fullName.split(/\s+/);
  if (nameParts.length >= 2) {
    data.firstName = nameParts[0];
    data.lastName = nameParts.slice(1).join(" ");
  } else {
    data.firstName = fullName;
    data.lastName = "";
    warnings.push(`${prefix}: "${fullName}" — single name, no last name`);
  }
  // Store Arabic name as well
  data.firstNameAr = data.firstName;
  data.lastNameAr = data.lastName;

  // ── Birth year (سنة الميلاد) — construct approximate DOB ──
  const birthYear = row["سنة_الميلاد"] || row["سنة الميلاد"] || "";
  if (birthYear) {
    const year = parseInt(birthYear, 10);
    if (!isNaN(year) && year > 1970 && year < 2015) {
      data.dateOfBirth = `${year}-01-01`; // Approximate — first of year
    } else {
      warnings.push(`${prefix}: Invalid birth year "${birthYear}"`);
    }
  }

  // ── Club (النادي) — store for later resolution ──
  const clubName = (row["النادي"] || "").trim();
  if (clubName) {
    data._clubName = clubName;
    data._clubNameEn = CLUB_NAME_NORMALIZE[clubName] || clubName;
  }

  // ── Position (المركز) → English ──
  const posAr = (row["المركز"] || "").trim();
  if (posAr) {
    data.position = POSITION_MAP[posAr] || posAr;
    if (!POSITION_MAP[posAr]) {
      warnings.push(`${prefix}: Unknown position "${posAr}", keeping as-is`);
    }
  }

  // ── Contract status (الحالة التعاقدية) → playerType ──
  const contractStatus = (
    row["الحالة_التعاقدية"] ||
    row["الحالة التعاقدية"] ||
    ""
  ).trim();
  if (contractStatus === "تمثيل") {
    // "Representation" — these are agency-represented players
    data.contractType = "Professional";
  }

  // ── Nationality (الجنسية) — strip emoji flags ──
  const natRaw = (row["الجنسية"] || "").trim();
  if (natRaw) {
    // Try direct lookup first, then strip flag emoji
    data.nationality = NATIONALITY_MAP[natRaw];
    if (!data.nationality) {
      // Strip emoji flags (flag emojis are regional indicator symbols)
      const stripped = natRaw.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "").trim();
      data.nationality = NATIONALITY_MAP[stripped] || stripped;
    }
  }

  // ── Grade/Notes (الملاحظات) → overallGrade ──
  const notes = (row["الملاحظات"] || "").trim();
  if (notes) {
    // Check if it's a grade (A, A-, B+, B, B-, C, etc.)
    const gradeMatch = notes.match(/^([ABC][+-]?)\b/);
    if (gradeMatch) {
      data.overallGrade = gradeMatch[1];
      // If there's text after the grade, store it as notes
      const extra = notes.replace(gradeMatch[0], "").trim();
      if (extra) {
        data.notes = extra;
      }
    } else {
      data.notes = notes;
    }
  }

  // ── Row number (#) ──
  const rowNum = row["#"] || "";
  if (rowNum) {
    const n = parseInt(rowNum, 10);
    if (!isNaN(n)) {
      data.jerseyNumber = n; // Use as jersey number if available
    }
  }

  // ── Defaults ──
  data.playerType = "Youth"; // Most players in Notion are youth
  data.playerPackage = "A"; // Full access — these are represented players
  data.status = "active";
  data.marketValueCurrency = "SAR";

  // Determine playerType from age
  if (data.dateOfBirth) {
    const birthYearNum = parseInt(String(data.dateOfBirth).slice(0, 4), 10);
    const age = new Date().getFullYear() - birthYearNum;
    if (age >= 21) {
      data.playerType = "Pro";
    } else {
      data.playerType = "Youth";
    }
  }

  return { data, warnings, errors, originalName: fullName };
}

/**
 * Resolve Arabic club names → club UUIDs from the DB.
 * Creates non-SPL clubs if they don't exist.
 */
export async function resolveClubIds(
  rows: MappedPlayer[],
): Promise<{ created: string[] }> {
  const clubs = await Club.findAll({ attributes: ["id", "name", "nameAr"] });
  const clubByName = new Map<string, string>();
  const clubByNameAr = new Map<string, string>();

  for (const club of clubs) {
    clubByName.set(club.name.toLowerCase(), club.id);
    if ((club as any).nameAr) {
      clubByNameAr.set((club as any).nameAr, club.id);
    }
  }

  const createdClubs: string[] = [];
  const missingClubs = new Set<string>();

  // First pass: identify missing clubs
  for (const row of rows) {
    const clubNameAr = row.data._clubName as string | undefined;
    const clubNameEn = row.data._clubNameEn as string | undefined;
    if (!clubNameAr) continue;

    const found =
      clubByNameAr.get(clubNameAr) ||
      (clubNameEn ? clubByName.get(clubNameEn.toLowerCase()) : undefined);

    if (!found) {
      missingClubs.add(clubNameAr);
    }
  }

  // Create missing clubs (non-SPL clubs like Abha, Majd Al Qunfudhah)
  for (const nameAr of missingClubs) {
    const nameEn = CLUB_NAME_NORMALIZE[nameAr] || nameAr;
    const club = await Club.create({
      name: nameEn,
      nameAr: nameAr,
      type: "Club",
      country: "Saudi Arabia",
      isActive: true,
    });
    clubByNameAr.set(nameAr, club.id);
    clubByName.set(nameEn.toLowerCase(), club.id);
    createdClubs.push(nameEn);
  }

  // Second pass: resolve all
  for (const row of rows) {
    const clubNameAr = row.data._clubName as string | undefined;
    const clubNameEn = row.data._clubNameEn as string | undefined;
    if (clubNameAr) {
      const clubId =
        clubByNameAr.get(clubNameAr) ||
        (clubNameEn ? clubByName.get(clubNameEn.toLowerCase()) : undefined);
      if (clubId) {
        row.data.currentClubId = clubId;
      } else {
        row.warnings.push(`Could not resolve club: "${clubNameAr}"`);
      }
    }
    delete row.data._clubName;
    delete row.data._clubNameEn;
  }

  return { created: createdClubs };
}

/**
 * Set createdBy to the admin user.
 */
export async function resolveCreatedBy(rows: MappedPlayer[]): Promise<void> {
  const admin = await User.findOne({ where: { role: "Admin" } });
  if (!admin) return;

  for (const row of rows) {
    row.data.createdBy = admin.id;
  }
}
