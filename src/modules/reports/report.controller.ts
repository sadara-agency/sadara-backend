import { Response } from "express";
import path from "path";
import fs from "fs";
import { AuthRequest } from "../../shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "../../shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "../../shared/utils/audit";
import * as svc from "./report.service";
import { generateReportXlsx } from "./report.xlsx";
import { generatePredefinedReportPdf } from "./report.predefined-pdf";

export async function list(req: AuthRequest, res: Response) {
  const result = await svc.listReports(req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function getById(req: AuthRequest, res: Response) {
  const report = await svc.getReportById(req.params.id);
  sendSuccess(res, report);
}

export async function create(req: AuthRequest, res: Response) {
  const report = await svc.createReport(req.body, req.user!.id);
  await logAudit(
    "CREATE",
    "technical_reports",
    report.id,
    buildAuditContext(req.user!, req.ip),
    `Technical report generated for player ${req.body.playerId}`,
  );
  sendCreated(res, report);
}

export async function remove(req: AuthRequest, res: Response) {
  const result = await svc.deleteReport(req.params.id);
  await logAudit(
    "DELETE",
    "technical_reports",
    result.id,
    buildAuditContext(req.user!, req.ip),
    "Technical report deleted",
  );
  sendSuccess(res, result, "Report deleted");
}

export async function download(req: AuthRequest, res: Response): Promise<void> {
  const report = await svc.getReportById(req.params.id);

  if (report.status !== "Generated" || !report.filePath) {
    res
      .status(400)
      .json({ success: false, message: "Report PDF not available" });
    return;
  }

  const filePath = path.resolve(report.filePath);
  if (!fs.existsSync(filePath)) {
    res
      .status(404)
      .json({ success: false, message: "Report file not found on disk" });
    return;
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
  const data = await svc.getPlayerPortfolioReport(req.query as any);
  sendSuccess(res, data);
}

export async function contractCommission(req: AuthRequest, res: Response) {
  const data = await svc.getContractCommissionReport(req.query as any);
  sendSuccess(res, data);
}

export async function injurySummary(req: AuthRequest, res: Response) {
  const data = await svc.getInjurySummaryReport(req.query as any);
  sendSuccess(res, data);
}

export async function matchTasks(req: AuthRequest, res: Response) {
  const data = await svc.getMatchTasksReport(req.query as any);
  sendSuccess(res, data);
}

export async function upcomingMatchesTasks(req: AuthRequest, res: Response) {
  const data = await svc.getUpcomingMatchesTasksReport(req.query as any);
  sendSuccess(res, data);
}

export async function financialSummary(req: AuthRequest, res: Response) {
  const data = await svc.getFinancialSummaryReport(req.query as any);
  sendSuccess(res, data);
}

export async function scoutingPipeline(req: AuthRequest, res: Response) {
  const data = await svc.getScoutingPipelineReport(req.query as any);
  sendSuccess(res, data);
}

export async function expiringContracts(req: AuthRequest, res: Response) {
  const data = await svc.getExpiringContractsReport(req.query as any);
  sendSuccess(res, data);
}

// ── Generic Export Dispatch ──

const REPORT_DATA_MAP: Record<string, {
  fetch: (f: any) => Promise<any>;
  title: string;
  extractSections: (d: any) => { sheetName: string; rows: any[] }[];
}> = {
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

export async function exportXlsx(req: AuthRequest, res: Response): Promise<void> {
  const { type } = req.params;
  const config = REPORT_DATA_MAP[type];
  if (!config) {
    res.status(400).json({ success: false, message: "Invalid report type" });
    return;
  }

  const data = await config.fetch(req.query as any);
  const summary = data.summary || data.overview;
  const buffer = await generateReportXlsx({
    reportTitle: config.title,
    summary,
    dataSections: config.extractSections(data),
  });

  const fileName = `sadara-${type}-${new Date().toISOString().split("T")[0]}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(buffer);
}

export async function exportPdf(req: AuthRequest, res: Response): Promise<void> {
  const { type } = req.params;
  const config = REPORT_DATA_MAP[type];
  if (!config) {
    res.status(400).json({ success: false, message: "Invalid report type" });
    return;
  }

  const data = await config.fetch(req.query as any);
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
