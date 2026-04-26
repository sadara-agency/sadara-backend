import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess, sendPaginated } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { AppError } from "@middleware/errorHandler";
import * as settingsService from "./settings.service";

// ── Profile ──

export async function getProfile(req: AuthRequest, res: Response) {
  const profile = await settingsService.getProfile(req.user!.id);
  if (!profile) {
    sendSuccess(res, {
      id: req.user!.id,
      email: req.user!.email,
      fullName: req.user!.fullName,
      fullNameAr: null,
      role: req.user!.role,
      avatarUrl: null,
      isActive: true,
      twoFactorEnabled: false,
    });
    return;
  }
  sendSuccess(res, profile);
}

export async function updateProfile(req: AuthRequest, res: Response) {
  const user = await settingsService.updateProfile(req.user!.id, req.body);
  await logAudit(
    "UPDATE",
    "users",
    user.id,
    buildAuditContext(req.user!, req.ip),
    "Profile updated",
  );
  sendSuccess(res, user, "Profile updated");
}

export async function changePassword(req: AuthRequest, res: Response) {
  await settingsService.changePassword(req.user!.id, req.body);
  await logAudit(
    "UPDATE",
    "users",
    req.user!.id,
    buildAuditContext(req.user!, req.ip),
    "Password changed",
  );
  sendSuccess(res, null, "Password changed successfully");
}

// ── Notification Preferences ──

export async function getNotificationPrefs(req: AuthRequest, res: Response) {
  const prefs = await settingsService.getNotificationPrefs(req.user!.id);
  sendSuccess(res, prefs);
}

export async function updateNotificationPrefs(req: AuthRequest, res: Response) {
  const prefs = await settingsService.updateNotificationPrefs(
    req.user!.id,
    req.body,
  );
  await logAudit(
    "UPDATE",
    "users",
    req.user!.id,
    buildAuditContext(req.user!, req.ip),
    "Notification preferences updated",
  );
  sendSuccess(res, prefs, "Notification preferences updated");
}

// ── Team ──

export async function listTeam(req: AuthRequest, res: Response) {
  const { data, meta } = await settingsService.listTeam(req.query as any);
  sendPaginated(res, data, meta);
}

export async function updateTeamMember(req: AuthRequest, res: Response) {
  const user = await settingsService.updateTeamMember(req.params.id, req.body);
  await logAudit(
    "UPDATE",
    "users",
    user.id,
    buildAuditContext(req.user!, req.ip),
    `Team member updated: ${user.fullName}`,
  );
  sendSuccess(res, user, "User updated");
}

// ── Task Rules ──

export async function getTaskRules(_req: AuthRequest, res: Response) {
  const rules = await settingsService.getTaskRules();
  sendSuccess(res, rules);
}

export async function updateTaskRules(req: AuthRequest, res: Response) {
  const rules = await settingsService.updateTaskRules(req.body);
  await logAudit(
    "UPDATE",
    "settings",
    "task-rules",
    buildAuditContext(req.user!, req.ip),
    "Task automation rules updated",
  );
  sendSuccess(res, rules, "Task rules updated");
}

// ── Integrations ──

export async function testConnection(req: AuthRequest, res: Response) {
  const result = await settingsService.testIntegrationConnection(
    req.body.provider,
  );
  sendSuccess(res, result);
}

// ── SMTP ──

export async function getSmtpSettings(_req: AuthRequest, res: Response) {
  const settings = await settingsService.getSmtpSettings();
  sendSuccess(res, settings);
}

export async function updateSmtpSettings(req: AuthRequest, res: Response) {
  const settings = await settingsService.updateSmtpSettings(req.body);
  await logAudit(
    "UPDATE",
    "settings",
    "smtp",
    buildAuditContext(req.user!, req.ip),
    "SMTP settings updated",
  );
  sendSuccess(res, settings, "SMTP settings updated");
}

export async function testSmtpConnection(req: AuthRequest, res: Response) {
  const result = await settingsService.testSmtpConnection();
  sendSuccess(res, result);
}

// ── Match Analysis ──

export async function getMatchAnalysisSettings(
  _req: AuthRequest,
  res: Response,
) {
  const settings = await settingsService.getMatchAnalysisSettings();
  sendSuccess(res, settings);
}

export async function updateMatchAnalysisSettings(
  req: AuthRequest,
  res: Response,
) {
  const settings = await settingsService.updateMatchAnalysisSettings(req.body);
  await logAudit(
    "UPDATE",
    "settings",
    "match-analysis",
    buildAuditContext(req.user!, req.ip),
    "Match analysis settings updated",
  );
  sendSuccess(res, settings, "Match analysis settings updated");
}

export async function testMatchAnalysisConnection(
  req: AuthRequest,
  res: Response,
) {
  const result = await settingsService.testMatchAnalysisConnection();
  sendSuccess(res, result);
}

// ── Sidebar ──

export async function getSidebarConfig(req: AuthRequest, res: Response) {
  const requestedRole = req.query.role as string | undefined;
  // Admin can fetch any role's config; others always get their own
  const role =
    requestedRole && req.user!.role === "Admin"
      ? requestedRole
      : req.user!.role;
  const config = await settingsService.getSidebarConfig(role);
  sendSuccess(res, config);
}

export async function updateSidebarConfig(req: AuthRequest, res: Response) {
  const { role, config } = req.body as {
    role: string;
    config: Record<string, unknown>;
  };
  const saved = await settingsService.updateSidebarConfig(role, config);
  await logAudit(
    "UPDATE",
    "settings",
    null,
    buildAuditContext(req.user!, req.ip),
    `Updated sidebar navigation for role: ${role}`,
  );
  sendSuccess(res, saved, "Sidebar configuration updated");
}

export async function resetSidebarConfig(req: AuthRequest, res: Response) {
  const role = (req.body as { role?: string } | undefined)?.role;
  const config = await settingsService.resetSidebarConfig(role);
  await logAudit(
    "UPDATE",
    "settings",
    null,
    buildAuditContext(req.user!, req.ip),
    `Reset sidebar navigation for role: ${role ?? "all"}`,
  );
  sendSuccess(res, config, "Sidebar reset to defaults");
}

// ── CSV Import ──

export async function importCsv(req: AuthRequest, res: Response) {
  const files = (req as any).files as Express.Multer.File[];
  const mode = (req.query.mode as string) || "import";

  if (!files || files.length === 0) {
    throw new AppError("No CSV files uploaded", 400);
  }

  const results = await settingsService.importCsv(files, mode, req.user!.id);

  sendSuccess(
    res,
    results,
    mode === "preview" ? "CSV preview" : "CSV import completed",
  );
}
