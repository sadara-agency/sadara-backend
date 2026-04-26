import path from "path";
import fs from "fs";
import { writeFile } from "fs/promises";
import {
  escHtml,
  fmtDate,
  calcAge,
  wrapHtml,
  makeSadaraHeader,
  renderPagesToBuffers,
  mergeWithBrandPages,
} from "@shared/utils/pdf";
import { renderCoverPageBuffer } from "@shared/utils/pdfCover";

const TMP = path.resolve(process.cwd(), "tmp");
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

// ── Helpers ──

function pct(a: number, b: number): string {
  if (!b) return "0%";
  return `${Math.round((a / b) * 100)}%`;
}

// ── CSS ──

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Tahoma,Arial,sans-serif;direction:rtl;color:#1a1a2e;background:#fff;width:595px;font-size:9pt;line-height:1.5}
.pg{width:595px;min-height:842px;position:relative;padding:20px 30px}
.hd{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f3460;padding-bottom:10px;margin-bottom:12px}
.hd-r{text-align:right}.hd-r .lt{font-size:13pt;font-weight:700;color:#0f3460}.hd-r .ls{font-size:7pt;color:#666}
.hd-l{text-align:left;direction:ltr;font-size:7pt;color:#666}
.title{text-align:center;font-size:16pt;font-weight:700;color:#0f3460;margin:8px 0 14px;letter-spacing:1px}
.sub{font-size:10pt;font-weight:700;background:#0f3460;color:#fff;display:inline-block;padding:2px 12px;margin:10px 0 6px;border-radius:2px}
.bio-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:8.5pt;margin-bottom:10px}
.bio-grid .label{color:#666;font-weight:600}.bio-grid .val{font-weight:700}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px}
.stat-card{background:#f0f4ff;border:1px solid #d0d8ef;border-radius:4px;padding:6px 8px;text-align:center}
.stat-card .num{font-size:16pt;font-weight:700;color:#0f3460}.stat-card .lbl{font-size:7pt;color:#666}
table{width:100%;border-collapse:collapse;font-size:7.5pt;margin-bottom:8px}
th{background:#0f3460;color:#fff;padding:4px 6px;text-align:right;font-weight:600}
td{border-bottom:1px solid #e0e0e0;padding:3px 6px}
tr:nth-child(even){background:#f8f9fc}
.inj-row{display:flex;gap:8px;font-size:8pt;padding:3px 0;border-bottom:1px solid #eee}
.inj-type{font-weight:700;min-width:100px}.inj-body{color:#666;min-width:80px}
.sev-Minor{color:#22c55e}.sev-Moderate{color:#f59e0b}.sev-Severe{color:#ef4444}.sev-Critical{color:#dc2626;font-weight:700}
.footer{text-align:center;font-size:7pt;color:#999;border-top:1px solid #ddd;padding-top:6px;margin-top:12px}
.note-box{background:#fffbe6;border:1px solid #fde68a;border-radius:4px;padding:6px 10px;font-size:8pt;margin-top:8px}
`;

const HD = () => makeSadaraHeader("Technical Player Report");

const FOOTER = `<div class="footer">شركة صدارة المواهب الرياضية المحدودة — تقرير فني سري — Sadara Sports Company — Confidential Technical Report</div>`;

// ── Page builders ──

function buildProfilePage(player: any, statsAgg: any): string {
  const name =
    player.first_name_ar && player.last_name_ar
      ? `${player.first_name_ar} ${player.last_name_ar}`
      : `${player.first_name} ${player.last_name}`;
  const nameEn = `${player.first_name || ""} ${player.last_name || ""}`.trim();
  const age = player.date_of_birth ? calcAge(player.date_of_birth) : "-";
  const passAccuracy = pct(
    statsAgg?.total_passes_completed || 0,
    statsAgg?.total_passes || 0,
  );
  const shotAccuracy = pct(
    statsAgg?.total_shots_on_target || 0,
    statsAgg?.total_shots || 0,
  );
  const dribbleSuccess = pct(
    statsAgg?.total_dribbles || 0,
    statsAgg?.total_dribbles_attempted || 0,
  );

  return `<div class="pg">${HD()}
    <div class="title">تقرير فني — ${escHtml(name)}</div>
    <div class="sub">بيانات اللاعب — Player Bio</div>
    <div class="bio-grid">
      <div><span class="label">الاسم:</span> <span class="val">${escHtml(name)}</span></div>
      <div><span class="label">Name:</span> <span class="val">${escHtml(nameEn)}</span></div>
      <div><span class="label">العمر:</span> <span class="val">${escHtml(age)}</span></div>
      <div><span class="label">الجنسية:</span> <span class="val">${escHtml(player.nationality || "-")}</span></div>
      <div><span class="label">المركز:</span> <span class="val">${escHtml(player.position || "-")}</span></div>
      <div><span class="label">النادي:</span> <span class="val">${escHtml(player.club_name_ar || player.club_name || "-")}</span></div>
      <div><span class="label">الطول:</span> <span class="val">${player.height_cm ? escHtml(player.height_cm) + " cm" : "-"}</span></div>
      <div><span class="label">الوزن:</span> <span class="val">${player.weight_kg ? escHtml(player.weight_kg) + " kg" : "-"}</span></div>
      <div><span class="label">القدم:</span> <span class="val">${escHtml(player.preferred_foot || "-")}</span></div>
      <div><span class="label">الرقم:</span> <span class="val">${escHtml(player.jersey_number || "-")}</span></div>
    </div>

    <div class="sub">ملخص الأداء — Performance Summary</div>
    <div class="stats-grid">
      <div class="stat-card"><div class="num">${statsAgg?.matches_played || 0}</div><div class="lbl">مباريات</div></div>
      <div class="stat-card"><div class="num">${statsAgg?.total_minutes || 0}</div><div class="lbl">دقائق</div></div>
      <div class="stat-card"><div class="num">${statsAgg?.total_goals || 0}</div><div class="lbl">أهداف</div></div>
      <div class="stat-card"><div class="num">${statsAgg?.total_assists || 0}</div><div class="lbl">تمريرات حاسمة</div></div>
      <div class="stat-card"><div class="num">${statsAgg?.avg_rating || "-"}</div><div class="lbl">متوسط التقييم</div></div>
      <div class="stat-card"><div class="num">${passAccuracy}</div><div class="lbl">دقة التمرير</div></div>
      <div class="stat-card"><div class="num">${shotAccuracy}</div><div class="lbl">دقة التسديد</div></div>
      <div class="stat-card"><div class="num">${dribbleSuccess}</div><div class="lbl">نجاح المراوغة</div></div>
    </div>

    <div class="stats-grid">
      <div class="stat-card"><div class="num">${statsAgg?.total_key_passes || 0}</div><div class="lbl">تمريرات مفتاحية</div></div>
      <div class="stat-card"><div class="num">${statsAgg?.total_tackles || 0}</div><div class="lbl">تدخلات</div></div>
      <div class="stat-card"><div class="num">${statsAgg?.total_interceptions || 0}</div><div class="lbl">اعتراضات</div></div>
      <div class="stat-card"><div class="num">${statsAgg?.total_yellow_cards || 0} / ${statsAgg?.total_red_cards || 0}</div><div class="lbl">بطاقات صفراء / حمراء</div></div>
    </div>
    ${FOOTER}
  </div>`;
}

function buildMatchListPage(matchList: any[]): string {
  const rows = matchList
    .map(
      (m) => `
    <tr>
      <td>${fmtDate(m.match_date)}</td>
      <td>${escHtml(m.home_club_ar || m.home_club || "-")}</td>
      <td style="text-align:center">${m.home_score ?? "-"} - ${m.away_score ?? "-"}</td>
      <td>${escHtml(m.away_club_ar || m.away_club || "-")}</td>
      <td style="text-align:center">${m.minutes_played || 0}'</td>
      <td style="text-align:center">${m.goals || 0}</td>
      <td style="text-align:center">${m.assists || 0}</td>
      <td style="text-align:center">${m.rating || "-"}</td>
      <td>${escHtml(m.position_in_match || "-")}</td>
    </tr>
  `,
    )
    .join("");

  return `<div class="pg">${HD()}
    <div class="sub">سجل المباريات — Match History</div>
    <table>
      <thead><tr>
        <th>التاريخ</th><th>المضيف</th><th>النتيجة</th><th>الضيف</th>
        <th>دقائق</th><th>أهداف</th><th>تمريرات</th><th>تقييم</th><th>مركز</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="9" style="text-align:center">لا توجد بيانات</td></tr>'}</tbody>
    </table>
    ${FOOTER}
  </div>`;
}

function buildInjuryPage(injuries: any[], notes?: string | null): string {
  const injRows = injuries.length
    ? injuries
        .map(
          (i) => `
      <div class="inj-row">
        <span class="inj-type">${escHtml(i.injury_type_ar || i.injury_type)}</span>
        <span class="inj-body">${escHtml(i.body_part_ar || i.body_part)}</span>
        <span class="sev-${escHtml(i.severity)}">${escHtml(i.severity)}</span>
        <span>${fmtDate(i.injury_date)}</span>
        <span>${i.days_out ? i.days_out + " يوم" : "-"}</span>
        <span>${i.is_surgery_required ? "جراحة" : "-"}</span>
        <span>${escHtml(i.status)}</span>
      </div>`,
        )
        .join("")
    : '<p style="color:#999;font-size:8.5pt">لا توجد إصابات مسجلة في هذه الفترة</p>';

  const noteSection = notes
    ? `<div class="note-box"><strong>ملاحظات:</strong> ${escHtml(notes)}</div>`
    : "";

  return `<div class="pg">${HD()}
    <div class="sub">سجل الإصابات — Injury Timeline</div>
    ${injRows}
    ${noteSection}
    ${FOOTER}
  </div>`;
}

// ── Main PDF generator ──

export async function generateReportPdf(
  reportId: string,
  player: any,
  data: { profile: any; statsAgg: any; matchList: any[]; injuries: any[] },
): Promise<string> {
  const pages = [
    wrapHtml(buildProfilePage(data.profile, data.statsAgg), CSS),
    wrapHtml(buildMatchListPage(data.matchList), CSS),
    wrapHtml(buildInjuryPage(data.injuries), CSS),
  ];

  const profile = data.profile ?? {};
  const subjectAr =
    profile.first_name_ar && profile.last_name_ar
      ? `${profile.first_name_ar} ${profile.last_name_ar}`
      : "";
  const subjectEn =
    `${profile.first_name ?? player?.first_name ?? ""} ${profile.last_name ?? player?.last_name ?? ""}`.trim();
  const clubAr = profile.club_name_ar || profile.club_name || "";
  const clubEn = profile.club_name || "";
  const season = profile.season || profile.report_season || "";
  const subtitleAr = [clubAr, season].filter(Boolean).join(" — ") || undefined;
  const subtitleEn = [clubEn, season].filter(Boolean).join(" — ") || undefined;

  const coverBuffer = await renderCoverPageBuffer({
    kind: "report",
    titleAr: "تقرير أداء اللاعب",
    titleEn: "Player Performance Report",
    subjectAr: subjectAr || undefined,
    subjectEn: subjectEn || undefined,
    subtitleAr,
    subtitleEn,
    meta: [
      { label: "Generated", value: new Date().toISOString().split("T")[0] },
      { label: "Report ID", value: reportId },
    ],
  });

  const contentBuffers = await renderPagesToBuffers(pages);
  const merged = await mergeWithBrandPages(contentBuffers, { coverBuffer });

  const fileName = `report_${reportId}.pdf`;
  const filePath = path.join(TMP, fileName);
  await writeFile(filePath, merged);

  // Clean up tmp file after 5 minutes
  setTimeout(
    () => {
      fs.unlink(filePath, () => {});
    },
    5 * 60 * 1000,
  ).unref();

  return filePath;
}
