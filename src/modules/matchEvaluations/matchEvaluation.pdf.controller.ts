import type { Response } from "express";
import type { AuthRequest } from "@shared/types";
import { AppError } from "@middleware/errorHandler";
import { logger } from "@config/logger";
import { wrapHtml, renderPagesToBuffers } from "@shared/utils/pdf";
import { getEvaluationById } from "./matchEvaluation.service";
import type { MatchEvaluation } from "./matchEvaluation.model";
import type { RatedItem } from "./matchEvaluation.model";

// ─── CSS ──────────────────────────────────────────────────────

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Tahoma,Arial,sans-serif;direction:rtl;color:#11132B;background:#fff;width:595px;font-size:8pt;line-height:1.45}
.pg{width:595px;min-height:842px;padding:20px 28px;position:relative}
.hd{display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:2px solid #3C3CFA;margin-bottom:14px}
.brand{font-size:13pt;font-weight:700;color:#11132B}.brand-sub{font-size:7pt;letter-spacing:1px;color:#666}
.badge{background:#3C3CFA;color:#fff;padding:2px 10px;border-radius:3px;font-size:7.5pt;font-weight:600}
.section{margin-bottom:12px}
.section-title{background:#11132B;color:#fff;padding:3px 10px;font-weight:700;font-size:8.5pt;margin-bottom:6px;border-radius:2px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px}
.info-row{display:flex;gap:6px;font-size:7.5pt;padding:1px 0}
.info-label{color:#666;min-width:80px;flex-shrink:0}
.info-value{font-weight:600}
.rating-badge{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;color:#fff;font-weight:700;font-size:8pt}
.r1{background:#FF453A}.r2{background:#FF9F0A}.r3{background:#D4A843}.r4{background:#34C759}.r5{background:#3C3CFA}
.items-grid{display:grid;grid-template-columns:1fr 1fr;gap:3px 12px}
.item-row{display:flex;align-items:center;gap:5px;font-size:7.5pt;padding:1px 0}
.item-label{flex:1}
.overall-box{text-align:center;padding:8px;border:2px solid #3C3CFA;border-radius:6px;display:inline-block;min-width:80px}
.overall-num{font-size:22pt;font-weight:700;color:#3C3CFA;line-height:1}
.overall-label{font-size:7pt;color:#666;margin-top:2px}
.summary-block{background:#F8F8FF;border-right:3px solid #3C3CFA;padding:6px 10px;font-size:7.5pt;line-height:1.5}
.text-label{font-weight:700;font-size:7.5pt;margin-bottom:3px;color:#11132B}
.status-pill{display:inline-block;padding:2px 8px;border-radius:10px;font-size:7pt;font-weight:600}
.s-approved{background:#34C759;color:#fff}.s-pending{background:#FF9F0A;color:#fff}.s-draft{background:#8E8E93;color:#fff}.s-revision{background:#FF453A;color:#fff}
.divider{height:1px;background:#E4E5F3;margin:8px 0}
.footer{margin-top:16px;padding-top:8px;border-top:1px solid #E4E5F3;font-size:6.5pt;color:#999;display:flex;justify-content:space-between}
`;

// ─── Helpers ──────────────────────────────────────────────────

const LOGO_SVG = `<svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M50 0C50 0 62 38 100 50C62 62 50 100 50 100C50 100 38 62 0 50C38 38 50 0 50 0Z" fill="#3C3CFA"/></svg>`;

function ratingClass(r: number) {
  return `r${Math.max(1, Math.min(5, r))}`;
}

function ratingLabel(r: number): string {
  const labels: Record<number, string> = {
    1: "ضعيف",
    2: "مقبول",
    3: "جيد",
    4: "جيد جداً",
    5: "ممتاز",
  };
  return labels[r] ?? String(r);
}

function statusPill(status: string): string {
  const map: Record<string, string> = {
    Approved: "s-approved",
    PendingReview: "s-pending",
    Draft: "s-draft",
    NeedsRevision: "s-revision",
  };
  const labels: Record<string, string> = {
    Approved: "معتمد",
    PendingReview: "قيد المراجعة",
    Draft: "مسودة",
    NeedsRevision: "يحتاج تعديل",
  };
  return `<span class="status-pill ${map[status] ?? "s-draft"}">${labels[status] ?? status}</span>`;
}

function itemsSection(
  title: string,
  items: Record<string, RatedItem>,
  labelMap: Record<string, string>,
): string {
  const rows = Object.entries(items)
    .map(([key, item]) => {
      const label = labelMap[key] ?? key;
      return `<div class="item-row">
        <span class="item-label">${label}</span>
        <span class="rating-badge ${ratingClass(item.rating)}">${item.rating}</span>
        <span style="font-size:6.5pt;color:#666">${ratingLabel(item.rating)}</span>
      </div>`;
    })
    .join("");

  return `<div class="section">
    <div class="section-title">${title}</div>
    <div class="items-grid">${rows}</div>
  </div>`;
}

const FITNESS_LABELS: Record<string, string> = {
  strength: "القوة",
  speed: "السرعة",
  agility: "الرشاقة",
  flexibility: "المرونة",
  endurance: "التحمل",
};

const TECHNICAL_LABELS: Record<string, string> = {
  dribbling: "المراوغة",
  passing: "التمرير",
  insideKick: "الركل بباطن القدم",
  outsideKick: "الركل بوجه القدم",
  trappingAndReceiving: "التغطية والاستلام",
  heading: "ركل ضربات الرأس",
  chestControl: "الاستلام بالصدر",
  thighControl: "استلام الفخذ",
  ballAbsorption: "امتصاص الكرة",
  technicalAssimilation: "الاستيعاب المهاري",
  concentration: "التركيز",
  quickThinking: "سرعة البديهة",
  technicalCoordination: "التوافق المهاري",
  reactionSpeed: "سرعة رد الفعل",
};

const TACTICAL_LABELS: Record<string, string> = {
  attacking: "الهجوم",
  defending: "الدفاع",
  positioning: "التمركز",
  movement: "التحرك",
  tactics: "التكتيك",
  tacticalAssimilation: "الاستيعاب الخططي",
};

const CONTRIBUTION_LABELS: Record<string, string> = {
  offensivePerformance: "الأداء الهجومي",
  defensivePerformance: "الأداء الدفاعي",
  crosses: "العرضيات",
  successfulDribbles: "المراوغات الناجحة",
  keyPasses: "التمريرات المؤثرة",
  shots: "التسديدات",
  tackles: "الالتحامات",
  ballRecovery: "استعادة الكرة",
  ballLoss: "فقدان الكرة",
  decisionMaking: "اتخاذ القرار",
  tacticalDiscipline: "الانضباط التكتيكي",
};

// ─── Page builder ─────────────────────────────────────────────

function buildPage(ev: MatchEvaluation): string {
  const player = (ev as any).player;
  const analyst = (ev as any).analyst;
  const playerName = player
    ? `${player.firstNameAr || player.firstName} ${player.lastNameAr || player.lastName}`.trim()
    : "—";
  const analystName = analyst?.fullNameAr || analyst?.fullName || "—";
  const evalDate = new Date(ev.createdAt).toLocaleDateString("ar-SA");

  const html = `<div class="pg">
    <!-- Header -->
    <div class="hd">
      <div style="display:flex;align-items:center;gap:8px">
        ${LOGO_SVG}
        <div><div class="brand">صـدارة الريـاضـيـة</div><div class="brand-sub">SADARA SPORTS</div></div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700;font-size:11pt">تقرير تقييم اللاعب للمباراة</div>
        <div style="font-size:7pt;color:#666;margin-top:2px">Player Match Evaluation Report</div>
      </div>
      <div class="badge">تقرير رسمي</div>
    </div>

    <!-- Info Section -->
    <div class="section">
      <div class="section-title">بيانات التقرير</div>
      <div class="info-grid">
        <div class="info-row"><span class="info-label">اللاعب:</span><span class="info-value">${playerName}</span></div>
        <div class="info-row"><span class="info-label">محلل الأداء:</span><span class="info-value">${analystName}</span></div>
        <div class="info-row"><span class="info-label">تاريخ التقرير:</span><span class="info-value">${evalDate}</span></div>
        <div class="info-row"><span class="info-label">حالة التقرير:</span><span class="info-value">${statusPill(ev.status)}</span></div>
      </div>
    </div>

    <!-- Overall Rating -->
    <div class="section" style="display:flex;align-items:center;gap:16px">
      <div class="overall-box">
        <div class="overall-num">${ev.overallRating}</div>
        <div class="overall-label">/ 10 — التقييم العام</div>
      </div>
      ${
        ev.summary
          ? `<div style="flex:1">
              <div class="text-label">ملخص الأداء</div>
              <div class="summary-block">${ev.summary}</div>
            </div>`
          : ""
      }
    </div>

    <div class="divider"></div>

    <!-- Fitness -->
    ${itemsSection("اللياقة — Fitness", ev.fitnessScores as any, FITNESS_LABELS)}

    <!-- Technical -->
    ${itemsSection("المهارة — Technical", ev.technicalScores as any, TECHNICAL_LABELS)}

    <!-- Tactical -->
    ${itemsSection("الأداء الخططي / التكتيكي — Tactical", ev.tacticalScores as any, TACTICAL_LABELS)}

    <!-- Contribution -->
    ${itemsSection("مساهمة اللاعب في المباراة — Match Contribution", ev.contributionScores as any, CONTRIBUTION_LABELS)}

    <div class="divider"></div>

    <!-- Summary text blocks -->
    <div class="section">
      <div class="section-title">الملخص والتوصيات</div>
      ${ev.strengths ? `<div class="text-label">نقاط القوة</div><div class="summary-block" style="margin-bottom:6px">${ev.strengths}</div>` : ""}
      ${ev.weaknesses ? `<div class="text-label">نقاط الضعف</div><div class="summary-block" style="margin-bottom:6px">${ev.weaknesses}</div>` : ""}
      ${ev.highlights ? `<div class="text-label">أبرز الإنجازات</div><div class="summary-block" style="margin-bottom:6px">${ev.highlights}</div>` : ""}
      ${ev.mistakes ? `<div class="text-label">أبرز الأخطاء</div><div class="summary-block" style="margin-bottom:6px">${ev.mistakes}</div>` : ""}
      ${ev.recommendation ? `<div class="text-label">توصية محلل الأداء</div><div class="summary-block">${ev.recommendation}</div>` : ""}
    </div>

    <!-- Footer -->
    <div class="footer">
      <span>صدارة الرياضية — منصة إدارة اللاعبين</span>
      <span>تاريخ الطباعة: ${new Date().toLocaleDateString("ar-SA")}</span>
    </div>
  </div>`;

  return wrapHtml(html, CSS);
}

// ─── Exported endpoint ────────────────────────────────────────

export async function generateEvaluationPdf(req: AuthRequest, res: Response) {
  const evaluation = await getEvaluationById(req.params.id, req.user);

  try {
    const buffers = await renderPagesToBuffers([buildPage(evaluation)], {
      settleMs: 400,
    });

    const buffer = buffers[0];
    const playerName =
      (evaluation as any).player?.firstNameAr ||
      (evaluation as any).player?.firstName ||
      "player";
    const filename = `تقرير_تقييم_${playerName}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    res.end(buffer);
  } catch (err: any) {
    logger.error("Evaluation PDF generation error", { error: err.message });
    throw new AppError("PDF generation failed. Please try again.", 500);
  }
}
