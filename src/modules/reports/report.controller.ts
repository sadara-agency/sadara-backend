import { Response } from "express";
import path from "path";
import fs from "fs";
import { AuthRequest } from "@shared/types";
import { AppError } from "@middleware/errorHandler";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";
import * as svc from "@modules/reports/report.service";
import type {
  ReportQuery,
  ReportFilters,
  PublishReportInput,
} from "@modules/reports/report.validation";
import { generateReportXlsx } from "@modules/reports/report.xlsx";
import { generatePredefinedReportPdf } from "@modules/reports/report.predefined-pdf";

export async function list(req: AuthRequest, res: Response) {
  // req.query validated by reportQuerySchema middleware before reaching here
  const result = await svc.listReports(req.query as unknown as ReportQuery);
  sendPaginated(res, result.data, result.meta);
}

export async function getById(req: AuthRequest, res: Response) {
  const report = await svc.getReportById(req.params.id);
  sendSuccess(res, report);
}

export async function create(req: AuthRequest, res: Response) {
  const report = await svc.createReport(req.body, req.user!.id);
  Promise.all([
    invalidateMultiple([CachePrefix.REPORTS]),
    logAudit(
      "CREATE",
      "technical_reports",
      report.id,
      buildAuditContext(req.user!, req.ip),
      `Technical report generated for player ${req.body.playerId}`,
    ),
  ]).catch(() => {});
  sendCreated(res, report);
}

export async function remove(req: AuthRequest, res: Response) {
  const result = await svc.deleteReport(req.params.id);
  Promise.all([
    invalidateMultiple([CachePrefix.REPORTS]),
    logAudit(
      "DELETE",
      "technical_reports",
      result.id,
      buildAuditContext(req.user!, req.ip),
      "Technical report deleted",
    ),
  ]).catch(() => {});
  sendSuccess(res, result, "Report deleted");
}

export async function download(req: AuthRequest, res: Response): Promise<void> {
  const report = await svc.getReportById(req.params.id);

  if (report.status !== "Generated" || !report.filePath) {
    throw new AppError("Report PDF not available", 400);
  }

  const filePath = path.resolve(report.filePath);
  if (!fs.existsSync(filePath)) {
    throw new AppError("Report file not found on disk", 404);
  }

  const fileName = `${report.title.replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, "_")}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  );
  res.sendFile(filePath);
}

// ── Predefined Reports ──

export async function playerPortfolio(req: AuthRequest, res: Response) {
  const data = await svc.getPlayerPortfolioReport(
    req.query as unknown as ReportFilters,
  );
  sendSuccess(res, data);
}

export async function contractCommission(req: AuthRequest, res: Response) {
  const data = await svc.getContractCommissionReport(
    req.query as unknown as ReportFilters,
  );
  sendSuccess(res, data);
}

export async function injurySummary(req: AuthRequest, res: Response) {
  const data = await svc.getInjurySummaryReport(
    req.query as unknown as ReportFilters,
  );
  sendSuccess(res, data);
}

export async function matchTasks(req: AuthRequest, res: Response) {
  const data = await svc.getMatchTasksReport(
    req.query as unknown as ReportFilters,
  );
  sendSuccess(res, data);
}

export async function upcomingMatchesTasks(req: AuthRequest, res: Response) {
  const data = await svc.getUpcomingMatchesTasksReport(
    req.query as unknown as ReportFilters,
  );
  sendSuccess(res, data);
}

export async function financialSummary(req: AuthRequest, res: Response) {
  const data = await svc.getFinancialSummaryReport(
    req.query as unknown as ReportFilters,
  );
  sendSuccess(res, data);
}

export async function scoutingPipeline(req: AuthRequest, res: Response) {
  const data = await svc.getScoutingPipelineReport(
    req.query as unknown as ReportFilters,
  );
  sendSuccess(res, data);
}

export async function expiringContracts(req: AuthRequest, res: Response) {
  const data = await svc.getExpiringContractsReport(
    req.query as unknown as ReportFilters,
  );
  sendSuccess(res, data);
}

// ── Generic Export Dispatch ──

const REPORT_DATA_MAP: Record<
  string,
  {
    fetch: (f: any) => Promise<any>;
    title: string;
    extractSections: (d: any) => { sheetName: string; rows: any[] }[];
  }
> = {
  "player-portfolio": {
    fetch: svc.getPlayerPortfolioReport,
    title: "Player Portfolio Report",
    extractSections: (d) => [{ sheetName: "Players", rows: d.players }],
  },
  "contract-commission": {
    fetch: svc.getContractCommissionReport,
    title: "Contract & Commission Report",
    extractSections: (d) => [{ sheetName: "Contracts", rows: d.contracts }],
  },
  "injury-summary": {
    fetch: svc.getInjurySummaryReport,
    title: "Injury Summary Report",
    extractSections: (d) => [
      { sheetName: "By Body Part", rows: d.byBodyPart },
      { sheetName: "By Severity", rows: d.bySeverity },
    ],
  },
  "match-tasks": {
    fetch: svc.getMatchTasksReport,
    title: "Match & Tasks Report",
    extractSections: (d) => [{ sheetName: "Matches", rows: d.matches }],
  },
  "financial-summary": {
    fetch: svc.getFinancialSummaryReport,
    title: "Financial Summary Report",
    extractSections: (d) => [{ sheetName: "Top Players", rows: d.topPlayers }],
  },
  "scouting-pipeline": {
    fetch: svc.getScoutingPipelineReport,
    title: "Scouting Pipeline Report",
    extractSections: (d) => [{ sheetName: "Prospects", rows: d.prospects }],
  },
  "upcoming-matches-tasks": {
    fetch: svc.getUpcomingMatchesTasksReport,
    title: "Upcoming Matches & Tasks Report",
    extractSections: (d) => [
      { sheetName: "Matches", rows: d.matches },
      { sheetName: "Tasks", rows: d.tasks },
    ],
  },
  "expiring-contracts": {
    fetch: svc.getExpiringContractsReport,
    title: "Expiring Contracts Report",
    extractSections: (d) => [{ sheetName: "Contracts", rows: d.contracts }],
  },
};

export async function exportXlsx(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const { type } = req.params;
  const config = REPORT_DATA_MAP[type];
  if (!config) {
    throw new AppError("Invalid report type", 400);
  }

  const data = await config.fetch(req.query as unknown as ReportFilters);
  const summary = data.summary || data.overview;
  const buffer = await generateReportXlsx({
    reportTitle: config.title,
    summary,
    dataSections: config.extractSections(data),
  });

  const fileName = `sadara-${type}-${new Date().toISOString().split("T")[0]}.xlsx`;
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(buffer);
}

export async function generateSummary(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const report = await svc.generateAiSummary(req.params.id, req.user!);
  Promise.all([
    invalidateMultiple([CachePrefix.REPORTS]),
    logAudit(
      "UPDATE",
      "technical_reports",
      report.id,
      buildAuditContext(req.user!, req.ip),
      "AI summary generated",
    ),
  ]).catch(() => {});
  sendSuccess(res, report, "AI summary generated");
}

export async function publishReport(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const { editedContent } = req.body as PublishReportInput;
  const report = await svc.publishReport(
    req.params.id,
    editedContent,
    req.user!,
  );
  Promise.all([
    invalidateMultiple([CachePrefix.REPORTS]),
    logAudit(
      "UPDATE",
      "technical_reports",
      report.id,
      buildAuditContext(req.user!, req.ip),
      "Report published",
    ),
  ]).catch(() => {});
  sendSuccess(res, report, "Report published");
}

export async function exportPdf(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const { type } = req.params;
  const config = REPORT_DATA_MAP[type];
  if (!config) {
    throw new AppError("Invalid report type", 400);
  }

  const data = await config.fetch(req.query as unknown as ReportFilters);
  const summary = data.summary || data.overview;
  const buffer = await generatePredefinedReportPdf({
    reportTitle: config.title,
    summary,
    dataSections: config.extractSections(data).map((s) => ({
      sectionTitle: s.sheetName,
      rows: s.rows,
    })),
  });

  const fileName = `sadara-${type}-${new Date().toISOString().split("T")[0]}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(buffer);
}
