import { Response } from "express";
import { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { AppError } from "@middleware/errorHandler";
import * as svc from "./medicalReports.service";
import type {
  ListQuery,
  UpdateReportInput,
  UpdateLabResultsInput,
} from "./medicalReports.validation";

// GET /medical-reports?playerId=X
export async function list(req: AuthRequest, res: Response) {
  const r = await svc.listReports(req.query as unknown as ListQuery);
  sendPaginated(res, r.data, r.meta);
}

// GET /medical-reports/:id
export async function getById(req: AuthRequest, res: Response) {
  const report = await svc.getReport(req.params.id);
  sendSuccess(res, report);
}

// POST /medical-reports/upload (multipart/form-data)
export async function upload(req: AuthRequest, res: Response) {
  if (!req.file) throw new AppError("No file uploaded", 400);
  if (req.file.mimetype !== "application/pdf") {
    throw new AppError("Only PDF files are supported for medical reports", 400);
  }

  const {
    playerId,
    provider,
    reportType,
    reportDate,
    collectedDate,
    summaryNotes,
  } = req.body;
  if (!playerId) throw new AppError("playerId is required", 400);

  const report = await svc.uploadReport(
    req.file,
    {
      playerId,
      provider,
      reportType,
      reportDate,
      collectedDate,
      summaryNotes,
    },
    req.user!.id,
  );

  await logAudit(
    "CREATE",
    "medical-reports",
    report!.id,
    buildAuditContext(req.user!, req.ip),
    `Uploaded medical report (${req.file.originalname}, ${(req.file.size / 1024).toFixed(0)} KB, parse=${report!.parseStatus})`,
  );

  sendCreated(res, report);
}

// PATCH /medical-reports/:id
export async function update(req: AuthRequest, res: Response) {
  const report = await svc.updateReport(
    req.params.id,
    req.body as UpdateReportInput,
  );
  await logAudit(
    "UPDATE",
    "medical-reports",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Updated metadata`,
  );
  sendSuccess(res, report, "Medical report updated");
}

// PATCH /medical-reports/:id/lab-results
export async function updateLabResults(req: AuthRequest, res: Response) {
  const body = req.body as UpdateLabResultsInput;
  const report = await svc.updateLabResults(req.params.id, body.labResults);
  await logAudit(
    "UPDATE",
    "medical-reports",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Updated ${body.labResults.length} lab results (manual)`,
  );
  sendSuccess(res, report, "Lab results updated");
}

// DELETE /medical-reports/:id
export async function remove(req: AuthRequest, res: Response) {
  const out = await svc.deleteReport(req.params.id);
  await logAudit(
    "DELETE",
    "medical-reports",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Deleted medical report`,
  );
  sendSuccess(res, out, "Medical report deleted");
}
