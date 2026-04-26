import { MediaKitGeneration } from "./mediaKit.model";
import { Player } from "@modules/players/player.model";
import { Club } from "@modules/clubs/club.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { logger } from "@config/logger";
import {
  escHtml,
  fmtDate,
  calcAge,
  wrapHtml,
  makeSadaraHeader,
  renderPagesToBuffers,
  mergeWithBrandPages,
} from "@shared/utils/pdf";
import { renderCoverPageBuffer, type CoverOpts } from "@shared/utils/pdfCover";
import { uploadFile } from "@shared/utils/storage";
import { resolveFileUrl } from "@shared/utils/storage";

// ── Includes ──

const INCLUDES = [
  {
    model: Player,
    as: "player",
    attributes: ["id", "firstName", "lastName", "photoUrl", "position"],
    required: false,
  },
  {
    model: Club,
    as: "club",
    attributes: ["id", "name", "nameAr", "logoUrl"],
    required: false,
  },
  {
    model: User,
    as: "generator",
    attributes: ["id", "fullName"],
    required: false,
  },
];

// ── PDF Styles ──

const KIT_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Tahoma,Arial,sans-serif;color:#1a1a2e;background:#fff;width:595px;font-size:9pt;line-height:1.5}
.pg{width:595px;min-height:842px;position:relative;padding:24px 30px}
.hd{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #11132B;padding-bottom:10px;margin-bottom:14px}
.hd-r{text-align:right}.hd-r .lt{font-size:13pt;font-weight:700;color:#11132B}.hd-r .ls{font-size:7pt;color:#666}
.hd-l{text-align:left;direction:ltr;font-size:7pt;color:#666}
.title{text-align:center;font-size:16pt;font-weight:700;color:#11132B;margin:8px 0 14px;letter-spacing:1px}
.sub{font-size:10pt;font-weight:700;background:#11132B;color:#fff;display:inline-block;padding:3px 14px;margin:12px 0 8px;border-radius:3px}
.sub-accent{background:#3C3CFA}
.profile-header{display:flex;gap:20px;align-items:flex-start;margin-bottom:16px}
.player-photo{width:140px;height:170px;object-fit:cover;border-radius:6px;border:2px solid #E4E5F3;background:#f0f0f0}
.player-photo-placeholder{width:140px;height:170px;border-radius:6px;border:2px solid #E4E5F3;background:#E4E5F3;display:flex;align-items:center;justify-content:center;color:#999;font-size:8pt}
.player-info{flex:1}
.player-name{font-size:18pt;font-weight:700;color:#11132B;margin-bottom:2px}
.player-name-secondary{font-size:11pt;color:#666;margin-bottom:8px}
.bio-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:8.5pt;margin-bottom:10px}
.bio-grid .label{color:#666;font-weight:600}.bio-grid .val{font-weight:700}
.stats-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:14px}
.stat-card{background:#f0f4ff;border:1px solid #d0d8ef;border-radius:4px;padding:8px 6px;text-align:center}
.stat-card .num{font-size:18pt;font-weight:700;color:#3C3CFA}.stat-card .lbl{font-size:7pt;color:#666;margin-top:2px}
.stat-bar{margin-bottom:6px}.stat-bar .bar-label{display:flex;justify-content:space-between;font-size:8pt;margin-bottom:2px}
.stat-bar .bar-track{height:8px;background:#E4E5F3;border-radius:4px;overflow:hidden}.stat-bar .bar-fill{height:100%;background:linear-gradient(90deg,#3C3CFA,#6B6BFF);border-radius:4px}
.market-badge{display:inline-block;background:#D4A843;color:#fff;padding:4px 14px;border-radius:4px;font-size:10pt;font-weight:700;margin-bottom:8px}
table{width:100%;border-collapse:collapse;font-size:8pt;margin-bottom:10px}
th{background:#11132B;color:#fff;padding:5px 8px;text-align:right;font-weight:600}
td{border-bottom:1px solid #e0e0e0;padding:4px 8px}
tr:nth-child(even){background:#f8f9fc}
.footer{text-align:center;font-size:7pt;color:#999;border-top:1px solid #ddd;padding-top:6px;margin-top:auto;position:absolute;bottom:20px;left:30px;right:30px}
.status-active{color:#34C759;font-weight:700}.status-injured{color:#FF453A;font-weight:700}.status-inactive{color:#FF9F0A;font-weight:700}
`;

const KIT_FOOTER = `<div class="footer">شركة صدارة المواهب الرياضية المحدودة — Media Kit — Sadara Sports Company — Confidential</div>`;

// ── HTML Builders ──

function buildPlayerProfilePage(
  player: Player,
  language: "en" | "ar" | "both",
): string {
  const club = (player as any).club;
  const nameAr =
    player.firstNameAr && player.lastNameAr
      ? `${player.firstNameAr} ${player.lastNameAr}`
      : null;
  const nameEn = `${player.firstName} ${player.lastName}`;
  const age = player.dateOfBirth ? calcAge(player.dateOfBirth) : null;

  const isRtl = language === "ar";
  const dir = isRtl ? "rtl" : "ltr";

  const primaryName = isRtl && nameAr ? nameAr : nameEn;
  const secondaryName = isRtl ? nameEn : nameAr;

  const photoHtml = player.photoUrl
    ? `<img class="player-photo" src="${escHtml(player.photoUrl)}" alt="${escHtml(nameEn)}" />`
    : `<div class="player-photo-placeholder">No Photo</div>`;

  const labels = {
    age: isRtl ? "العمر" : "Age",
    nationality: isRtl ? "الجنسية" : "Nationality",
    position: isRtl ? "المركز" : "Position",
    secondaryPosition: isRtl ? "المركز الثانوي" : "Secondary Position",
    club: isRtl ? "النادي" : "Club",
    height: isRtl ? "الطول" : "Height",
    weight: isRtl ? "الوزن" : "Weight",
    foot: isRtl ? "القدم المفضلة" : "Preferred Foot",
    jersey: isRtl ? "رقم القميص" : "Jersey Number",
    type: isRtl ? "التصنيف" : "Player Type",
    status: isRtl ? "الحالة" : "Status",
    marketValue: isRtl ? "القيمة السوقية" : "Market Value",
    physicalAttributes: isRtl ? "الصفات البدنية" : "Physical Attributes",
    playerProfile: isRtl ? "ملف اللاعب" : "Player Profile",
    playerBio: isRtl ? "بيانات اللاعب" : "Player Bio",
  };

  const clubName = club
    ? isRtl && club.nameAr
      ? club.nameAr
      : club.name
    : "-";

  const marketValueStr = player.marketValue
    ? `${Number(player.marketValue).toLocaleString()} ${player.marketValueCurrency}`
    : null;

  const statusClass = `status-${player.status}`;

  // Physical attribute bars (0–100 scale)
  const attrs = [
    { label: isRtl ? "السرعة" : "Pace", value: player.pace || 0 },
    { label: isRtl ? "التحمل" : "Stamina", value: player.stamina || 0 },
    { label: isRtl ? "القوة" : "Strength", value: player.strength || 0 },
    { label: isRtl ? "الرشاقة" : "Agility", value: player.agility || 0 },
    { label: isRtl ? "القفز" : "Jumping", value: player.jumping || 0 },
  ];

  const attrBars = attrs
    .map(
      (a) => `<div class="stat-bar">
        <div class="bar-label"><span>${escHtml(a.label)}</span><span>${a.value}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.min(a.value, 100)}%"></div></div>
      </div>`,
    )
    .join("");

  return `<div class="pg" style="direction:${dir}">
    ${makeSadaraHeader(labels.playerProfile)}

    <div class="profile-header">
      ${photoHtml}
      <div class="player-info">
        <div class="player-name">${escHtml(primaryName)}</div>
        ${secondaryName ? `<div class="player-name-secondary">${escHtml(secondaryName)}</div>` : ""}
        ${marketValueStr ? `<div class="market-badge">${escHtml(marketValueStr)}</div>` : ""}
        <div class="bio-grid">
          <div><span class="label">${labels.position}:</span> <span class="val">${escHtml(player.position || "-")}</span></div>
          <div><span class="label">${labels.club}:</span> <span class="val">${escHtml(clubName)}</span></div>
          <div><span class="label">${labels.age}:</span> <span class="val">${age ?? "-"}</span></div>
          <div><span class="label">${labels.nationality}:</span> <span class="val">${escHtml(player.nationality || "-")}</span></div>
          <div><span class="label">${labels.jersey}:</span> <span class="val">${escHtml(player.jerseyNumber ?? "-")}</span></div>
          <div><span class="label">${labels.status}:</span> <span class="val ${statusClass}">${escHtml(player.status)}</span></div>
        </div>
      </div>
    </div>

    <div class="sub">${labels.playerBio}</div>
    <div class="bio-grid">
      <div><span class="label">${labels.height}:</span> <span class="val">${player.heightCm ? player.heightCm + " cm" : "-"}</span></div>
      <div><span class="label">${labels.weight}:</span> <span class="val">${player.weightKg ? player.weightKg + " kg" : "-"}</span></div>
      <div><span class="label">${labels.foot}:</span> <span class="val">${escHtml(player.preferredFoot || "-")}</span></div>
      <div><span class="label">${labels.secondaryPosition}:</span> <span class="val">${escHtml(player.secondaryPosition || "-")}</span></div>
      <div><span class="label">${labels.type}:</span> <span class="val">${escHtml(player.playerType)}</span></div>
      ${player.secondaryNationality ? `<div><span class="label">${isRtl ? "الجنسية الثانوية" : "2nd Nationality"}:</span> <span class="val">${escHtml(player.secondaryNationality)}</span></div>` : ""}
    </div>

    <div class="sub sub-accent">${labels.physicalAttributes}</div>
    ${attrBars}

    ${KIT_FOOTER}
  </div>`;
}

function buildSquadRosterPage(
  club: Club,
  players: Player[],
  language: "en" | "ar" | "both",
  pageNum: number,
  totalPages: number,
): string {
  const isRtl = language === "ar";
  const dir = isRtl ? "rtl" : "ltr";
  const clubName = isRtl && club.nameAr ? club.nameAr : club.name;

  const labels = {
    squadRoster: isRtl ? "قائمة الفريق" : "Squad Roster",
    name: isRtl ? "الاسم" : "Name",
    position: isRtl ? "المركز" : "Position",
    age: isRtl ? "العمر" : "Age",
    nationality: isRtl ? "الجنسية" : "Nationality",
    jersey: isRtl ? "الرقم" : "#",
    foot: isRtl ? "القدم" : "Foot",
    status: isRtl ? "الحالة" : "Status",
    height: isRtl ? "الطول" : "Height",
    page: isRtl ? "صفحة" : "Page",
  };

  const rows = players
    .map((p) => {
      const name =
        isRtl && p.firstNameAr && p.lastNameAr
          ? `${p.firstNameAr} ${p.lastNameAr}`
          : `${p.firstName} ${p.lastName}`;
      const age = p.dateOfBirth ? calcAge(p.dateOfBirth) : "-";
      const statusClass = `status-${p.status}`;
      return `<tr>
        <td>${escHtml(p.jerseyNumber ?? "-")}</td>
        <td><strong>${escHtml(name)}</strong></td>
        <td>${escHtml(p.position || "-")}</td>
        <td>${escHtml(age)}</td>
        <td>${escHtml(p.nationality || "-")}</td>
        <td>${escHtml(p.preferredFoot || "-")}</td>
        <td>${p.heightCm ? p.heightCm + "cm" : "-"}</td>
        <td class="${statusClass}">${escHtml(p.status)}</td>
      </tr>`;
    })
    .join("");

  return `<div class="pg" style="direction:${dir}">
    ${makeSadaraHeader(labels.squadRoster)}
    <div class="title">${escHtml(clubName)} — ${labels.squadRoster}</div>
    ${club.league ? `<div style="text-align:center;font-size:9pt;color:#666;margin-bottom:12px">${escHtml(club.league)}</div>` : ""}
    <table>
      <thead><tr>
        <th>${labels.jersey}</th>
        <th>${labels.name}</th>
        <th>${labels.position}</th>
        <th>${labels.age}</th>
        <th>${labels.nationality}</th>
        <th>${labels.foot}</th>
        <th>${labels.height}</th>
        <th>${labels.status}</th>
      </tr></thead>
      <tbody>${rows || `<tr><td colspan="8" style="text-align:center;color:#999">${isRtl ? "لا يوجد لاعبون" : "No players found"}</td></tr>`}</tbody>
    </table>
    ${totalPages > 1 ? `<div style="text-align:center;font-size:7pt;color:#999;margin-top:8px">${labels.page} ${pageNum} / ${totalPages}</div>` : ""}
    ${KIT_FOOTER}
  </div>`;
}

// ── PDF Generation Pipeline ──

async function generatePdf(
  htmlPages: string[],
  cover: Omit<CoverOpts, "kind"> & { kind?: CoverOpts["kind"] },
): Promise<{ buffer: Buffer; size: number }> {
  const coverBuffer = await renderCoverPageBuffer({
    kind: cover.kind ?? "mediakit",
    ...cover,
  });
  const contentBuffers = await renderPagesToBuffers(htmlPages);
  const merged = await mergeWithBrandPages(contentBuffers, { coverBuffer });
  return { buffer: merged, size: merged.length };
}

// ── Generate Player Profile Kit ──

export async function generatePlayerKit(
  playerId: string,
  language: "en" | "ar" | "both",
  userId: string,
) {
  const player = await Player.findByPk(playerId, {
    include: [
      {
        model: Club,
        as: "club",
        attributes: ["id", "name", "nameAr", "logoUrl", "league"],
      },
    ],
  });
  if (!player) throw new AppError("Player not found", 404);

  logger.info("Generating player profile media kit PDF", {
    templateType: "player_profile",
    playerId,
    language,
    userId,
  });

  // Build HTML pages (for "both" language, generate two pages)
  const pages: string[] = [];
  if (language === "en" || language === "both") {
    pages.push(wrapHtml(buildPlayerProfilePage(player, "en"), KIT_CSS));
  }
  if (language === "ar" || language === "both") {
    pages.push(wrapHtml(buildPlayerProfilePage(player, "ar"), KIT_CSS));
  }

  // Render PDF
  const playerNameAr =
    player.firstNameAr && player.lastNameAr
      ? `${player.firstNameAr} ${player.lastNameAr}`
      : "";
  const playerNameEn =
    `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim();
  const club = (
    player as unknown as { club?: { name?: string; nameAr?: string } }
  ).club;
  const { buffer, size } = await generatePdf(pages, {
    kind: "mediakit",
    titleAr: "ملف اللاعب الإعلامي",
    titleEn: "Player Media Kit",
    subjectAr: playerNameAr || undefined,
    subjectEn: playerNameEn || undefined,
    subtitleAr: club?.nameAr || undefined,
    subtitleEn: club?.name || undefined,
    meta: [
      { label: "Generated", value: new Date().toISOString().split("T")[0] },
    ],
  });

  // Upload to storage
  const nameSlug = `${player.firstName}_${player.lastName}`
    .replace(/\s+/g, "_")
    .toLowerCase();
  const uploaded = await uploadFile({
    folder: "documents",
    originalName: `media_kit_${nameSlug}.pdf`,
    mimeType: "application/pdf",
    buffer,
    generateThumbnail: false,
  });

  // Create record with file info
  const generation = await MediaKitGeneration.create({
    templateType: "player_profile",
    language,
    playerId,
    generatedBy: userId,
    fileUrl: uploaded.url,
    fileSize: size,
  });

  return generation;
}

// ── Generate Squad Roster Kit ──

export async function generateSquadKit(
  clubId: string,
  language: "en" | "ar" | "both",
  userId: string,
) {
  const club = await Club.findByPk(clubId);
  if (!club) throw new AppError("Club not found", 404);

  // Fetch all players for this club
  const players = await Player.findAll({
    where: { currentClubId: clubId },
    order: [
      ["position", "ASC"],
      ["jerseyNumber", "ASC"],
      ["firstName", "ASC"],
    ],
  });

  logger.info("Generating squad roster media kit PDF", {
    templateType: "squad_roster",
    clubId,
    language,
    userId,
    playerCount: players.length,
  });

  // Paginate players — max 18 per page to fit A4
  const PLAYERS_PER_PAGE = 18;
  const pages: string[] = [];

  const buildLangPages = (lang: "en" | "ar") => {
    const totalPages = Math.max(
      1,
      Math.ceil(players.length / PLAYERS_PER_PAGE),
    );
    for (let i = 0; i < totalPages; i++) {
      const chunk = players.slice(
        i * PLAYERS_PER_PAGE,
        (i + 1) * PLAYERS_PER_PAGE,
      );
      pages.push(
        wrapHtml(
          buildSquadRosterPage(club, chunk, lang, i + 1, totalPages),
          KIT_CSS,
        ),
      );
    }
  };

  if (language === "en" || language === "both") buildLangPages("en");
  if (language === "ar" || language === "both") buildLangPages("ar");

  // Render PDF
  const { buffer, size } = await generatePdf(pages, {
    kind: "mediakit",
    titleAr: "كشف الفريق",
    titleEn: "Squad Roster",
    subjectAr: club.nameAr || undefined,
    subjectEn: club.name || undefined,
    meta: [
      { label: "Generated", value: new Date().toISOString().split("T")[0] },
      { label: "Players", value: String(players.length) },
    ],
  });

  // Upload to storage
  const clubSlug = club.name.replace(/\s+/g, "_").toLowerCase();
  const uploaded = await uploadFile({
    folder: "documents",
    originalName: `squad_roster_${clubSlug}.pdf`,
    mimeType: "application/pdf",
    buffer,
    generateThumbnail: false,
  });

  const generation = await MediaKitGeneration.create({
    templateType: "squad_roster",
    language,
    clubId,
    generatedBy: userId,
    fileUrl: uploaded.url,
    fileSize: size,
  });

  return generation;
}

// ── Get Download URL ──

export async function getDownloadUrl(id: string): Promise<string> {
  const generation = await MediaKitGeneration.findByPk(id);
  if (!generation) throw new AppError("Media kit generation not found", 404);
  if (!generation.fileUrl)
    throw new AppError("PDF not yet generated for this media kit", 404);

  return resolveFileUrl(generation.fileUrl, 60);
}

// ── List Generation History ──

export async function listGenerationHistory(
  queryParams: Record<string, unknown>,
) {
  const { limit, offset, page, sort, order } = parsePagination(
    queryParams,
    "created_at",
  );

  const where: Record<string, unknown> = {};

  if (queryParams.templateType) where.templateType = queryParams.templateType;
  if (queryParams.playerId) where.playerId = queryParams.playerId;
  if (queryParams.clubId) where.clubId = queryParams.clubId;

  const { count, rows } = await MediaKitGeneration.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    include: INCLUDES,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Get by ID ──

export async function getGenerationById(id: string) {
  const generation = await MediaKitGeneration.findByPk(id, {
    include: INCLUDES,
  });
  if (!generation) throw new AppError("Media kit generation not found", 404);
  return generation;
}
