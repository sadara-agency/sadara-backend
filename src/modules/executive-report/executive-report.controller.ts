import { Response } from "express";
import { sendSuccess } from "@shared/utils/apiResponse";
import type { AuthRequest } from "@shared/types";
import {
  getExecutiveReport,
  generateExecutiveReportPdfBuffer,
} from "@modules/executive-report/executive-report.service";
import type { ReportLocale } from "@modules/executive-report/executive-report.types";

/** GET /executive-reports/:playerId — JSON payload for on-screen render. */
export async function getReport(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const { playerId } = req.params;
  const locale = (req.query.locale as ReportLocale) ?? "ar";
  const report = await getExecutiveReport(playerId, locale);
  sendSuccess(res, report);
}

/** GET /executive-reports/:playerId/pdf — branded PDF download. */
export async function downloadPdf(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const { playerId } = req.params;
  const locale = (req.query.locale as ReportLocale) ?? "ar";

  const { buffer, playerName } = await generateExecutiveReportPdfBuffer(
    playerId,
    locale,
  );

  const fileLabel = locale === "ar" ? "تقرير_قيادي" : "Executive_Report";
  const name = `${fileLabel}_${playerName}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Length", buffer.length);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
  );
  res.end(buffer);
}
