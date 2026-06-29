/**
 * Rule-based bilingual narrative engine for the Executive Player Report.
 *
 * NO AI. A deterministic decision matrix picks the recommendation; slot-filled
 * sentence templates render the prose in Arabic (RTL) or English (LTR). Sentences
 * whose data is missing are OMITTED, never fabricated.
 *
 * Pure functions, no I/O — fully unit-testable. To upgrade to AI prose later,
 * swap `buildNarrative`'s body for a `callLlm()` call fed the same data; the
 * decision matrix stays as the deterministic guardrail.
 */
import { fmtDate } from "@shared/utils/pdf";
import type {
  ExecutiveReportData,
  ExecutiveNarrative,
  RecommendationKey,
  ReportLocale,
} from "@modules/executive-report/executive-report.types";

// ── Contract-clock thresholds (months) ──
const URGENT_MONTHS = 12;
const COMFORTABLE_MONTHS = 24;

// ── Improvement-metric labels (bilingual) ──
const METRIC_LABELS: Record<string, { ar: string; en: string }> = {
  goals: { ar: "التهديف", en: "goalscoring" },
  assists: { ar: "صناعة الأهداف", en: "assists" },
  keyPasses: { ar: "صناعة الفرص", en: "chance creation" },
  chancesCreated: { ar: "صناعة الفرص", en: "chance creation" },
  shotsOnTarget: { ar: "التسديد على المرمى", en: "shots on target" },
  interceptions: { ar: "قطع الكرات", en: "interceptions" },
  tacklesMade: { ar: "الالتحامات الدفاعية", en: "tackling" },
  passingAccuracy: { ar: "دقة التمرير", en: "passing accuracy" },
  savesMade: { ar: "التصديات", en: "saves" },
};

function metricLabel(metric: string, locale: ReportLocale): string {
  const entry = METRIC_LABELS[metric];
  if (!entry) return metric;
  return locale === "ar" ? entry.ar : entry.en;
}

/**
 * Deterministic decision matrix. Order matters — first matching row wins.
 * Mirrors the leadership logic: contract clock dominates, then market interest,
 * then performance risk.
 */
export function decideRecommendation(
  data: ExecutiveReportData,
): RecommendationKey {
  const months = data.contract.monthsRemaining;
  const hasOffers = data.offers.activeCount > 0;
  const valueRising = data.valuation.direction === "up";
  const performanceRisk =
    data.season.ratingDeclining || data.player.injuredFlag;

  // Performance risk gates any renewal push — assess first.
  if (performanceRisk && months !== null && months <= COMFORTABLE_MONTHS) {
    return "REVIEW_PERFORMANCE_FIRST";
  }

  if (months !== null && months <= URGENT_MONTHS) {
    return hasOffers ? "RENEW_URGENT_WITH_OFFERS" : "RENEW_EARLY_SECURE";
  }

  if (
    months !== null &&
    months >= COMFORTABLE_MONTHS &&
    (valueRising || hasOffers)
  ) {
    return "HOLD_AND_MONITOR";
  }

  return "MONITOR";
}

/** Days to the decisive call, scaled to urgency. */
function decisionWindowDays(key: RecommendationKey): number {
  switch (key) {
    case "RENEW_URGENT_WITH_OFFERS":
      return 60;
    case "RENEW_EARLY_SECURE":
      return 90;
    case "REVIEW_PERFORMANCE_FIRST":
      return 45;
    default:
      return 120;
  }
}

// ── Recommendation templates ──────────────────────────────────────────────────

function recommendationText(
  key: RecommendationKey,
  days: number,
  locale: ReportLocale,
): string {
  if (locale === "ar") {
    switch (key) {
      case "RENEW_URGENT_WITH_OFFERS":
        return `فتح محادثات تجديد فورية مع النادي قبل دخول العقد آخر 12 شهراً، مع التحضير لسيناريوهات الانتقال في حال تعذّر التجديد. القرار الحاسم خلال ${days} يوماً.`;
      case "RENEW_EARLY_SECURE":
        return `بدء تجديد مبكر لتأمين اللاعب كأصل قبل تصاعد المنافسة على خدماته. القرار الحاسم خلال ${days} يوماً.`;
      case "HOLD_AND_MONITOR":
        return `الاحتفاظ باللاعب ومتابعة السوق دون ضغط زمني — الوضع التعاقدي مريح والقيمة في صالحنا. مراجعة الموقف خلال ${days} يوماً.`;
      case "REVIEW_PERFORMANCE_FIRST":
        return `مراجعة الأداء والوضع البدني قبل اتخاذ أي قرار تجديد أو بيع. إعادة التقييم خلال ${days} يوماً.`;
      default:
        return `متابعة دورية للاعب دون إجراء عاجل في الوقت الراهن. مراجعة الموقف خلال ${days} يوماً.`;
    }
  }
  switch (key) {
    case "RENEW_URGENT_WITH_OFFERS":
      return `Open renewal talks immediately before the contract enters its final 12 months, while preparing transfer scenarios if renewal stalls. Decisive call within ${days} days.`;
    case "RENEW_EARLY_SECURE":
      return `Begin an early renewal to secure the player as an asset before competition for his services intensifies. Decisive call within ${days} days.`;
    case "HOLD_AND_MONITOR":
      return `Retain the player and monitor the market with no time pressure — the contract position is comfortable and value is trending in our favour. Review within ${days} days.`;
    case "REVIEW_PERFORMANCE_FIRST":
      return `Review performance and physical status before any renew-or-sell decision. Re-assess within ${days} days.`;
    default:
      return `Routine monitoring with no urgent action required at this time. Review within ${days} days.`;
  }
}

// ── Sentence builders (omit on missing data) ──────────────────────────────────

function seasonSummary(
  data: ExecutiveReportData,
  locale: ReportLocale,
): string {
  const s = data.season;
  const name =
    locale === "ar"
      ? (data.player.nameAr ?? data.player.nameEn)
      : data.player.nameEn;
  const parts: string[] = [];

  if (locale === "ar") {
    if (s.matchesPlayed !== null) {
      let sentence = `أنهى ${name} الموسم بمشاركة في ${s.matchesPlayed} مباراة`;
      if (s.goals !== null || s.assists !== null) {
        const g = s.goals ?? 0;
        const a = s.assists ?? 0;
        sentence += ` وتسجيل ${g} هدفاً و${a} تمريرة حاسمة`;
      }
      if (s.rating !== null)
        sentence += `، بتقييم فني إجمالي ${s.rating} من 10`;
      sentence += ".";
      parts.push(sentence);
    } else if (s.rating !== null) {
      parts.push(
        `بلغ التقييم الفني الإجمالي لـ${name} ${s.rating} من 10 هذا الموسم.`,
      );
    }
    if (s.biggestImprovement) {
      parts.push(
        `التحسن الأبرز في ${metricLabel(s.biggestImprovement.metric, locale)} (+${s.biggestImprovement.deltaPct}% عن الموسم الماضي).`,
      );
    }
    if (parts.length === 0) {
      parts.push(`لا تتوفر بيانات أداء كافية لـ${name} لهذا الموسم.`);
    }
    return parts.join(" ");
  }

  // English (LTR)
  if (s.matchesPlayed !== null) {
    let sentence = `${name} finished the season with ${s.matchesPlayed} appearances`;
    if (s.goals !== null || s.assists !== null) {
      sentence += `, ${s.goals ?? 0} goals and ${s.assists ?? 0} assists`;
    }
    if (s.rating !== null)
      sentence += `, at an overall technical rating of ${s.rating}/10`;
    sentence += ".";
    parts.push(sentence);
  } else if (s.rating !== null) {
    parts.push(
      `${name}'s overall technical rating this season is ${s.rating}/10.`,
    );
  }
  if (s.biggestImprovement) {
    parts.push(
      `The standout improvement is in ${metricLabel(s.biggestImprovement.metric, locale)} (+${s.biggestImprovement.deltaPct}% vs last season).`,
    );
  }
  if (parts.length === 0) {
    parts.push(`Insufficient performance data for ${name} this season.`);
  }
  return parts.join(" ");
}

function currentSituation(
  data: ExecutiveReportData,
  locale: ReportLocale,
): string {
  const parts: string[] = [];
  const months = data.contract.monthsRemaining;
  const endDate = data.contract.endDate;
  const offers = data.offers;
  const val = data.valuation;

  if (locale === "ar") {
    if (endDate && months !== null) {
      parts.push(
        `العقد الحالي ينتهي في ${fmtDate(endDate)} — أي بقي ${months} شهراً.`,
      );
    } else if (endDate) {
      parts.push(`العقد الحالي ينتهي في ${fmtDate(endDate)}.`);
    }
    if (offers.activeCount > 0) {
      const clubs = offers.interestedClubsAr.length
        ? ` (${offers.interestedClubsAr.join("، ")})`
        : "";
      parts.push(
        `تلقت إدارة صدارة ${offers.activeCount} عرضاً قائماً${clubs}.`,
      );
    }
    if (val.changePct !== null) {
      const verb = val.changePct >= 0 ? "ارتفعت" : "انخفضت";
      parts.push(
        `القيمة السوقية المقدّرة ${verb} ${Math.abs(val.changePct)}% منذ بداية الفترة.`,
      );
    }
    if (parts.length === 0)
      parts.push("لا توجد تطورات تعاقدية أو سوقية مسجّلة حالياً.");
    return parts.join(" ");
  }

  // English
  if (endDate && months !== null) {
    parts.push(
      `The current contract ends on ${fmtDate(endDate)} — ${months} months remaining.`,
    );
  } else if (endDate) {
    parts.push(`The current contract ends on ${fmtDate(endDate)}.`);
  }
  if (offers.activeCount > 0) {
    const clubs = offers.interestedClubsEn.length
      ? ` (${offers.interestedClubsEn.join(", ")})`
      : "";
    parts.push(
      `Sadara has received ${offers.activeCount} active offer(s)${clubs}.`,
    );
  }
  if (val.changePct !== null) {
    const verb = val.changePct >= 0 ? "risen" : "fallen";
    parts.push(
      `Estimated market value has ${verb} ${Math.abs(val.changePct)}% since the start of the period.`,
    );
  }
  if (parts.length === 0)
    parts.push("No contractual or market developments on record at this time.");
  return parts.join(" ");
}

/** Assemble the full bilingual narrative + structured recommendation. */
export function buildNarrative(
  data: ExecutiveReportData,
  locale: ReportLocale,
): ExecutiveNarrative {
  const recommendationKey = decideRecommendation(data);
  const days = decisionWindowDays(recommendationKey);
  return {
    recommendationKey,
    decisionWindowDays: days,
    seasonSummary: seasonSummary(data, locale),
    currentSituation: currentSituation(data, locale),
    recommendation: recommendationText(recommendationKey, days, locale),
  };
}
