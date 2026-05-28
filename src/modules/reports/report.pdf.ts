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
import type {
  StructuredContent,
  ReportType,
  ReportVerdict,
} from "@modules/reports/report.model";

// ── Helpers ──────────────────────────────────────────────────────────────────

function pct(a: number, b: number): string {
  if (!b) return "0%";
  return `${Math.round((a / b) * 100)}%`;
}

function verdictColor(v: ReportVerdict | null | undefined): string {
  switch (v) {
    case "Primary":
      return "#3C3CFA";
    case "Promote":
      return "#34C759";
    case "Monitor":
      return "#D4A843";
    case "Hold":
      return "#888";
    case "Reject":
      return "#FF453A";
    default:
      return "#888";
  }
}

function verdictLabelAr(v: ReportVerdict | null | undefined): string {
  switch (v) {
    case "Primary":
      return "مرشّح أساسي";
    case "Promote":
      return "ترقية";
    case "Monitor":
      return "متابعة";
    case "Hold":
      return "تعليق";
    case "Reject":
      return "استبعاد";
    default:
      return "—";
  }
}

function reportTypeLabel(t: ReportType | null | undefined): string {
  switch (t) {
    case "PreSigning":
      return "ما قبل التعاقد";
    case "MidSeason":
      return "تقييم نصف موسمي";
    case "MatchReport":
      return "تقرير مباراة";
    case "Periodic":
      return "متابعة دورية";
    case "Scouting":
      return "تقرير استكشاف";
    default:
      return "";
  }
}

// ── Attribute translations ────────────────────────────────────────────────────

const ATTR_AR: Record<string, string> = {
  passing: "التمرير",
  ballControl: "التحكم بالكرة",
  shooting: "التسديد",
  dribbling: "المراوغة",
  crossing: "العرضيات",
  reading: "قراءة اللعب",
  positioning: "التمركز",
  decisionMaking: "اتخاذ القرار",
  defensiveDuty: "الواجب الدفاعي",
  speed: "السرعة",
  stamina: "التحمل",
  strength: "القوة",
  duels: "الالتحامات",
  composure: "الثبات",
  leadership: "القيادة",
  discipline: "الانضباط",
  workRate: "معدل العمل",
};

// ── CSS ───────────────────────────────────────────────────────────────────────

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
.footer{text-align:center;font-size:7pt;color:#999;border-top:1px solid #ddd;padding-top:6px;margin-top:12px}
.note-box{background:#fffbe6;border:1px solid #fde68a;border-radius:4px;padding:6px 10px;font-size:8pt;margin-top:8px}
.rating-bar{display:flex;align-items:center;gap:8px;margin-bottom:4px}
.rating-bar .attr-name{min-width:120px;font-size:8pt;color:#444}
.rating-track{flex:1;height:8px;background:#e8e8f0;border-radius:4px;overflow:hidden}
.rating-fill{height:100%;border-radius:4px;background:#3C3CFA;transition:width 0.3s}
.rating-num{min-width:20px;text-align:center;font-size:8pt;font-weight:700;color:#0f3460}
.cat-box{background:#f8f9fc;border:1px solid #e0e0f0;border-radius:4px;padding:8px 10px;margin-bottom:10px}
.cat-title{font-size:9pt;font-weight:700;color:#0f3460;margin-bottom:6px;border-bottom:1px solid #d0d8ef;padding-bottom:3px}
.cat-avg{float:left;direction:ltr;font-size:9pt;font-weight:700;padding:0 6px;border-radius:10px}
.ql-box{background:#fff;border:1px solid #e0e0f0;border-radius:4px;padding:8px 10px;margin-bottom:8px}
.ql-title{font-size:8.5pt;font-weight:700;color:#0f3460;margin-bottom:4px}
.ql-text{font-size:8pt;color:#333;line-height:1.6;white-space:pre-wrap}
.verdict-chip{display:inline-block;padding:4px 16px;border-radius:20px;font-size:12pt;font-weight:700;margin-bottom:10px}
.gauge-row{display:flex;gap:16px;margin-bottom:8px}
.gauge{text-align:center;flex:1}
.gauge-val{font-size:22pt;font-weight:700;color:#0f3460;line-height:1}
.gauge-lbl{font-size:8pt;color:#666;margin-top:2px}
`;

const HD = () => makeSadaraHeader("Technical Player Report");

const FOOTER = (id: string, page: number, total: number) =>
  `<div class="footer">Sadara Sports — Report ID: ${escHtml(id.slice(0, 8))} — صدارة الرياضية — ${new Date().toLocaleDateString("ar-SA")} — ${page}/${total}</div>`;

// ── Page 1: Player bio + legacy performance stats ─────────────────────────────

function buildProfilePage(
  reportId: string,
  player: any,
  statsAgg: any,
  reportType: ReportType | null | undefined,
  matchContext: string | null | undefined,
  overallScore: number | null | undefined,
  scoutName: string | undefined,
  reportDate: string | undefined,
): string {
  const name =
    player.first_name_ar && player.last_name_ar
      ? `${player.first_name_ar} ${player.last_name_ar}`
      : `${player.first_name} ${player.last_name}`;
  const nameEn = `${player.first_name || ""} ${player.last_name || ""}`.trim();
  const age = player.date_of_birth ? calcAge(player.date_of_birth) : "-";
  const passAcc = pct(
    statsAgg?.total_passes_completed || 0,
    statsAgg?.total_passes || 0,
  );
  const shotAcc = pct(
    statsAgg?.total_shots_on_target || 0,
    statsAgg?.total_shots || 0,
  );
  const typeLabel = reportTypeLabel(reportType);

  return `<div class="pg">${HD()}
    <div class="title">تقرير فني — ${escHtml(name)}</div>
    ${typeLabel ? `<div style="text-align:center;font-size:9pt;color:#555;margin-bottom:8px">${escHtml(typeLabel)}${matchContext ? ` — ${escHtml(matchContext)}` : ""}</div>` : ""}
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
      ${scoutName ? `<div><span class="label">المحلل:</span> <span class="val">${escHtml(scoutName)}</span></div>` : ""}
      ${reportDate ? `<div><span class="label">التاريخ:</span> <span class="val">${escHtml(reportDate)}</span></div>` : ""}
    </div>
    ${overallScore !== null && overallScore !== undefined ? `<div style="text-align:center;margin:8px 0"><span style="background:#f0f4ff;border:2px solid #3C3CFA;color:#3C3CFA;padding:4px 20px;border-radius:20px;font-size:14pt;font-weight:700">★ ${overallScore} / 10</span></div>` : ""}

    <div class="sub">ملخص الأداء — Performance Summary</div>
    <div class="stats-grid">
      <div class="stat-card"><div class="num">${statsAgg?.matches_played || 0}</div><div class="lbl">مباريات</div></div>
      <div class="stat-card"><div class="num">${statsAgg?.total_minutes || 0}</div><div class="lbl">دقائق</div></div>
      <div class="stat-card"><div class="num">${statsAgg?.total_goals || 0}</div><div class="lbl">أهداف</div></div>
      <div class="stat-card"><div class="num">${statsAgg?.total_assists || 0}</div><div class="lbl">تمريرات حاسمة</div></div>
      <div class="stat-card"><div class="num">${statsAgg?.avg_rating || "-"}</div><div class="lbl">متوسط التقييم</div></div>
      <div class="stat-card"><div class="num">${passAcc}</div><div class="lbl">دقة التمرير</div></div>
      <div class="stat-card"><div class="num">${shotAcc}</div><div class="lbl">دقة التسديد</div></div>
      <div class="stat-card"><div class="num">${statsAgg?.total_key_passes || 0}</div><div class="lbl">تمريرات مفتاحية</div></div>
    </div>
    ${FOOTER(reportId, 1, 4)}
  </div>`;
}

// ── Page 2: Attribute ratings (structured) ────────────────────────────────────

const CAT_AR: Record<string, string> = {
  technical: "الفنية",
  tactical: "التكتيكية",
  physical: "البدنية",
  mental: "الذهنية",
};

function buildRatingsPage(
  reportId: string,
  ratings: NonNullable<StructuredContent["ratings"]>,
): string {
  const cats = Object.entries(ratings);

  const catHtml = cats
    .map(([catKey, bucket]) => {
      if (!bucket) return "";
      const attrs = Object.entries(bucket);
      if (!attrs.length) return "";
      const avg =
        Math.round((attrs.reduce((s, [, v]) => s + v, 0) / attrs.length) * 10) /
        10;
      const avgColor = avg >= 8 ? "#34C759" : avg >= 6 ? "#FF9F0A" : "#FF453A";

      const rows = attrs
        .map(([attr, val]) => {
          const fillPct = ((val as number) / 10) * 100;
          return `<div class="rating-bar">
          <span class="attr-name">${escHtml(ATTR_AR[attr] ?? attr)}</span>
          <div class="rating-track"><div class="rating-fill" style="width:${fillPct}%"></div></div>
          <span class="rating-num">${val}</span>
        </div>`;
        })
        .join("");

      return `<div class="cat-box">
        <div class="cat-title">
          ${escHtml(CAT_AR[catKey] ?? catKey)}
          <span class="cat-avg" style="color:${avgColor};background:${avgColor}18">${avg}</span>
          <div style="clear:both"></div>
        </div>
        ${rows}
      </div>`;
    })
    .join("");

  return `<div class="pg">${HD()}
    <div class="sub">تقييم المهارات — Attribute Ratings</div>
    ${catHtml || '<p style="color:#999;font-size:8.5pt">لم يتم تقييم المهارات بعد</p>'}
    ${FOOTER(reportId, 2, 4)}
  </div>`;
}

// ── Page 3: Qualitative analysis ─────────────────────────────────────────────

function buildQualitativePage(
  reportId: string,
  qualitative: NonNullable<StructuredContent["qualitative"]>,
  legacyNotes?: string | null,
): string {
  const sections = [
    { key: "overview", labelAr: "نظرة عامة" },
    { key: "strengths", labelAr: "نقاط القوة" },
    { key: "improvements", labelAr: "نقاط تحتاج تطوير" },
    { key: "recommendation", labelAr: "التوصيات الفنية" },
  ] as const;

  const blocksHtml = sections
    .map((s) => {
      const text = qualitative[s.key as keyof typeof qualitative] ?? "";
      if (!text) return "";
      return `<div class="ql-box">
        <div class="ql-title">${s.labelAr}</div>
        <div class="ql-text">${escHtml(text)}</div>
      </div>`;
    })
    .join("");

  const notesHtml = legacyNotes
    ? `<div class="note-box"><strong>ملاحظات إضافية:</strong><br>${escHtml(legacyNotes)}</div>`
    : "";

  return `<div class="pg">${HD()}
    <div class="sub">التحليل — Qualitative Analysis</div>
    ${blocksHtml || '<p style="color:#999;font-size:8.5pt">لم يتم إدخال تحليل نصي بعد</p>'}
    ${notesHtml}
    ${FOOTER(reportId, 3, 4)}
  </div>`;
}

// ── Page 4: Verdict + KPIs + match list + injuries ───────────────────────────

function buildVerdictPage(
  reportId: string,
  verdict: ReportVerdict | null | undefined,
  readiness: number | null | undefined,
  potential: number | null | undefined,
  kpis: StructuredContent["kpis"],
  matchList: any[],
  injuries: any[],
): string {
  const vColor = verdictColor(verdict);
  const vLabel = verdictLabelAr(verdict);

  const matchRows = matchList
    .slice(0, 8)
    .map(
      (m) => `<tr>
      <td>${fmtDate(m.match_date)}</td>
      <td>${escHtml(m.home_club_ar || m.home_club || "-")}</td>
      <td style="text-align:center">${m.home_score ?? "-"} - ${m.away_score ?? "-"}</td>
      <td>${escHtml(m.away_club_ar || m.away_club || "-")}</td>
      <td style="text-align:center">${m.minutes_played || 0}'</td>
      <td style="text-align:center">${m.goals || 0}</td>
      <td style="text-align:center">${m.assists || 0}</td>
    </tr>`,
    )
    .join("");

  const injRows = injuries
    .slice(0, 5)
    .map(
      (i) => `<tr>
      <td>${escHtml(i.injury_type_ar || i.injury_type)}</td>
      <td>${escHtml(i.body_part_ar || i.body_part)}</td>
      <td>${escHtml(i.severity)}</td>
      <td>${fmtDate(i.injury_date)}</td>
      <td>${i.days_out ? i.days_out + " يوم" : "-"}</td>
    </tr>`,
    )
    .join("");

  const kpiHtml = kpis
    ? `<div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:10px">
        ${kpis.goals !== undefined ? `<div class="stat-card"><div class="num">${kpis.goals}</div><div class="lbl">أهداف</div></div>` : ""}
        ${kpis.assists !== undefined ? `<div class="stat-card"><div class="num">${kpis.assists}</div><div class="lbl">تمريرات حاسمة</div></div>` : ""}
        ${kpis.passAccuracy !== undefined ? `<div class="stat-card"><div class="num">${kpis.passAccuracy}%</div><div class="lbl">دقة التمرير</div></div>` : ""}
        ${kpis.minutesPlayed !== undefined ? `<div class="stat-card"><div class="num">${kpis.minutesPlayed}'</div><div class="lbl">دقائق</div></div>` : ""}
        ${kpis.keyPasses !== undefined ? `<div class="stat-card"><div class="num">${kpis.keyPasses}</div><div class="lbl">تمريرات مفتاحية</div></div>` : ""}
        ${kpis.tackles !== undefined ? `<div class="stat-card"><div class="num">${kpis.tackles}</div><div class="lbl">تدخلات</div></div>` : ""}
      </div>`
    : "";

  return `<div class="pg">${HD()}
    <div class="sub">الحكم النهائي — Verdict</div>
    ${verdict ? `<div style="text-align:center;margin:10px 0"><span class="verdict-chip" style="background:${vColor}18;color:${vColor};border:2px solid ${vColor}">${vLabel}</span></div>` : ""}
    ${
      readiness || potential
        ? `<div class="gauge-row">
      ${readiness ? `<div class="gauge"><div class="gauge-val" style="color:#3C3CFA">${readiness}/10</div><div class="gauge-lbl">الجاهزية</div></div>` : ""}
      ${potential ? `<div class="gauge"><div class="gauge-val" style="color:#34C759">${potential}/10</div><div class="gauge-lbl">الإمكانية</div></div>` : ""}
    </div>`
        : ""
    }
    ${kpiHtml}
    ${
      matchList.length
        ? `
    <div class="sub">سجل المباريات</div>
    <table>
      <thead><tr>
        <th>التاريخ</th><th>المضيف</th><th>النتيجة</th><th>الضيف</th>
        <th>دقائق</th><th>أهداف</th><th>تمريرات</th>
      </tr></thead>
      <tbody>${matchRows}</tbody>
    </table>`
        : ""
    }
    ${
      injuries.length
        ? `
    <div class="sub">سجل الإصابات</div>
    <table>
      <thead><tr><th>الإصابة</th><th>الجزء</th><th>الشدة</th><th>التاريخ</th><th>الغياب</th></tr></thead>
      <tbody>${injRows}</tbody>
    </table>`
        : ""
    }
    ${FOOTER(reportId, 4, 4)}
  </div>`;
}

// ── Legacy page (for reports with notes only) ─────────────────────────────────

function buildLegacyNotesPage(reportId: string, notes: string | null): string {
  return `<div class="pg">${HD()}
    <div class="sub">محتوى التقرير</div>
    <div class="ql-text" style="font-size:9pt;line-height:1.7;padding:8px">${escHtml(notes || "")}</div>
    ${FOOTER(reportId, 2, 2)}
  </div>`;
}

// ── Main PDF generator ────────────────────────────────────────────────────────

export async function generateReportPdf(
  reportId: string,
  player: any,
  data: { profile: any; statsAgg: any; matchList: any[]; injuries: any[] },
  structured?: {
    content: StructuredContent | null;
    reportType: ReportType | null | undefined;
    matchContext: string | null | undefined;
    overallScore: number | null | undefined;
    verdict: ReportVerdict | null | undefined;
    readiness: number | null | undefined;
    potential: number | null | undefined;
    notes: string | null;
  },
): Promise<Buffer> {
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
    titleAr: structured?.reportType
      ? reportTypeLabel(structured.reportType)
      : "تقرير أداء اللاعب",
    titleEn: "Player Performance Report",
    subjectAr: subjectAr || undefined,
    subjectEn: subjectEn || undefined,
    subtitleAr,
    subtitleEn,
    meta: [
      { label: "Generated", value: new Date().toISOString().split("T")[0] },
      { label: "Report ID", value: reportId },
      ...(structured?.overallScore !== null &&
      structured?.overallScore !== undefined
        ? [{ label: "Overall Score", value: String(structured.overallScore) }]
        : []),
    ],
  });

  const sc = structured?.content;

  // Use structured multi-page layout if we have any structured data;
  // fall back to legacy 2-page layout for old notes-only reports.
  const hasStructured =
    sc && (sc.ratings || sc.qualitative || sc.header || structured?.verdict);

  let pages: string[];

  if (hasStructured) {
    const scoutName = sc?.header?.scoutName;
    const reportDate = sc?.header?.date;
    pages = [
      wrapHtml(
        buildProfilePage(
          reportId,
          data.profile,
          data.statsAgg,
          structured?.reportType,
          structured?.matchContext,
          structured?.overallScore,
          scoutName,
          reportDate,
        ),
        CSS,
      ),
      wrapHtml(buildRatingsPage(reportId, sc?.ratings ?? {}), CSS),
      wrapHtml(
        buildQualitativePage(
          reportId,
          sc?.qualitative ?? {},
          structured?.notes,
        ),
        CSS,
      ),
      wrapHtml(
        buildVerdictPage(
          reportId,
          structured?.verdict,
          structured?.readiness,
          structured?.potential,
          sc?.kpis,
          data.matchList,
          data.injuries,
        ),
        CSS,
      ),
    ];
  } else {
    // Legacy: profile page + notes page
    pages = [
      wrapHtml(
        buildProfilePage(
          reportId,
          data.profile,
          data.statsAgg,
          null,
          null,
          null,
          undefined,
          undefined,
        ),
        CSS,
      ),
      wrapHtml(buildLegacyNotesPage(reportId, structured?.notes ?? null), CSS),
    ];
  }

  const contentBuffers = await renderPagesToBuffers(pages);
  return mergeWithBrandPages(contentBuffers, { coverBuffer });
}
