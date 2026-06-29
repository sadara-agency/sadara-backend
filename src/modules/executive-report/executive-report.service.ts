/**
 * Executive Player Report service — orchestrates aggregation + narrative into the
 * API payload, and produces the downloadable PDF. No persistence: the report is
 * computed live on request (aggregation is a handful of indexed reads).
 */
import { aggregateExecutiveReportData } from "@modules/executive-report/executive-report.aggregator";
import { buildNarrative } from "@modules/executive-report/executive-report.narrative";
import { generateExecutiveReportPdf } from "@modules/executive-report/executive-report.pdf";
import type {
  ExecutiveReport,
  ReportLocale,
} from "@modules/executive-report/executive-report.types";

/** Build the full executive report payload (data + bilingual narrative). */
export async function getExecutiveReport(
  playerId: string,
  locale: ReportLocale,
): Promise<ExecutiveReport> {
  const data = await aggregateExecutiveReportData(playerId);
  const narrative = buildNarrative(data, locale);
  return {
    locale,
    generatedAt: new Date().toISOString(),
    data,
    narrative,
  };
}

/** Generate the branded PDF for the executive report. */
export async function generateExecutiveReportPdfBuffer(
  playerId: string,
  locale: ReportLocale,
): Promise<{ buffer: Buffer; playerName: string }> {
  const report = await getExecutiveReport(playerId, locale);
  return generateExecutiveReportPdf(report);
}
