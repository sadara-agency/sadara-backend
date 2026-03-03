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

export async function financialSummary(req: AuthRequest, res: Response) {
  const data = await svc.getFinancialSummaryReport(req.query as any);
  sendSuccess(res, data);
}
