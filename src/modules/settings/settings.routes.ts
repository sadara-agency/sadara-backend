import { Router, Response } from "express";
import { asyncHandler, AppError } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { User } from "@modules/users/user.model";
import { AuthRequest } from "@shared/types";
import { sendSuccess, sendPaginated } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Op, QueryTypes } from "sequelize";
import { sequelize } from "@config/database";

const router = Router();
router.use(authenticate);

// ── Schemas ──

const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  fullNameAr: z.string().max(255).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const teamQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  search: z.string().optional(),
  role: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

const updateUserSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  fullNameAr: z.string().max(255).optional(),
  role: z
    .enum([
      "Admin",
      "Manager",
      "Analyst",
      "Scout",
      "Player",
      "Legal",
      "Finance",
      "Coach",
      "Media",
      "Executive",
    ])
    .optional(),
  isActive: z.boolean().optional(),
});

const notificationPrefsSchema = z.object({
  contracts: z.boolean().optional(),
  offers: z.boolean().optional(),
  matches: z.boolean().optional(),
  tasks: z.boolean().optional(),
  injuries: z.boolean().optional(),
  payments: z.boolean().optional(),
  documents: z.boolean().optional(),
  referrals: z.boolean().optional(),
  system: z.boolean().optional(),
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  sms: z.boolean().optional(),
});

const DEFAULT_NOTIFICATION_PREFS = {
  contracts: true,
  offers: true,
  matches: true,
  tasks: true,
  injuries: true,
  payments: true,
  documents: true,
  referrals: true,
  system: true,
  email: true,
  push: false,
  sms: false,
};

const SAFE_ATTRS = [
  "id",
  "email",
  "fullName",
  "fullNameAr",
  "role",
  "avatarUrl",
  "isActive",
  "lastLogin",
  "createdAt",
] as const;

// ══════════════════════════════════════════
// PROFILE (current user)
// ══════════════════════════════════════════

router.get(
  "/profile",
  authorizeModule("settings", "read"),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    let user = await User.findByPk(req.user!.id, {
      attributes: [...SAFE_ATTRS],
    });

    // If user was deleted/DB reseeded, return JWT payload as fallback
    if (!user) {
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

    const [tfRow] = (await sequelize.query(
      `SELECT two_factor_enabled FROM users WHERE id = $1`,
      { bind: [req.user!.id], type: QueryTypes.SELECT },
    )) as any[];

    const result = {
      ...user.toJSON(),
      twoFactorEnabled: tfRow?.two_factor_enabled ?? false,
    };
    sendSuccess(res, result);
  }),
);

router.patch(
  "/profile",
  authorizeModule("settings", "update"),
  validate(updateProfileSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await User.findByPk(req.user!.id);
    if (!user) throw new AppError("User not found", 404);
    await user.update(req.body);
    await logAudit(
      "UPDATE",
      "users",
      user.id,
      buildAuditContext(req.user!, req.ip),
      "Profile updated",
    );
    sendSuccess(res, user, "Profile updated");
  }),
);

router.post(
  "/change-password",
  authorizeModule("settings", "update"),
  validate(changePasswordSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await User.findByPk(req.user!.id);
    if (!user) throw new AppError("User not found", 404);

    const valid = await bcrypt.compare(
      req.body.currentPassword,
      user.passwordHash,
    );
    if (!valid) throw new AppError("Current password is incorrect", 401);

    const hash = await bcrypt.hash(req.body.newPassword, 12);
    await user.update({ passwordHash: hash } as any);
    await logAudit(
      "UPDATE",
      "users",
      user.id,
      buildAuditContext(req.user!, req.ip),
      "Password changed",
    );
    sendSuccess(res, null, "Password changed successfully");
  }),
);

// ══════════════════════════════════════════
// NOTIFICATION PREFERENCES
// ══════════════════════════════════════════

router.get(
  "/notifications",
  authorizeModule("settings", "read"),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await User.findByPk(req.user!.id, {
      attributes: ["id", "notificationPreferences"],
    });

    sendSuccess(
      res,
      user?.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFS,
    );
  }),
);

router.patch(
  "/notifications",
  authorizeModule("settings", "update"),
  validate(notificationPrefsSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await User.findByPk(req.user!.id);
    if (!user) throw new AppError("User not found", 404);

    const currentPrefs =
      user.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFS;
    const updatedPrefs = { ...currentPrefs, ...req.body };

    await user.update({ notificationPreferences: updatedPrefs });

    await logAudit(
      "UPDATE",
      "users",
      user.id,
      buildAuditContext(req.user!, req.ip),
      "Notification preferences updated",
    );

    sendSuccess(res, updatedPrefs, "Notification preferences updated");
  }),
);

// ══════════════════════════════════════════
// TEAM (users list — Admin/Manager only)
// ══════════════════════════════════════════

router.get(
  "/team",
  authorizeModule("settings", "read"),
  validate(teamQuerySchema, "query"),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { limit, offset, page } = parsePagination(
      req.query as any,
      "createdAt",
    );
    const where: any = {};
    if ((req.query as any).role) where.role = (req.query as any).role;
    if ((req.query as any).isActive !== undefined)
      where.isActive = (req.query as any).isActive;
    if ((req.query as any).search) {
      const s = (req.query as any).search;
      where[Op.or] = [
        { fullName: { [Op.iLike]: `%${s}%` } },
        { fullNameAr: { [Op.iLike]: `%${s}%` } },
        { email: { [Op.iLike]: `%${s}%` } },
      ];
    }
    const { count, rows } = await User.findAndCountAll({
      where,
      limit,
      offset,
      order: [["created_at", "DESC"]],
      attributes: [...SAFE_ATTRS],
    });
    sendPaginated(res, rows, buildMeta(count, page, limit));
  }),
);

router.patch(
  "/team/:id",
  authorizeModule("settings", "update"),
  validate(updateUserSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await User.findByPk(req.params.id);
    if (!user) throw new AppError("User not found", 404);
    await user.update(req.body);
    await logAudit(
      "UPDATE",
      "users",
      user.id,
      buildAuditContext(req.user!, req.ip),
      `Team member updated: ${user.fullName}`,
    );
    sendSuccess(res, user, "User updated");
  }),
);

// ══════════════════════════════════════════
// TASK AUTOMATION RULES (Admin only)
// ══════════════════════════════════════════

router.get(
  "/task-rules",
  authorizeModule("settings", "read"),
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const { getTaskRuleConfig } = await import("../matches/matchAutoTasks");
    sendSuccess(res, getTaskRuleConfig());
  }),
);

router.patch(
  "/task-rules",
  authorizeModule("settings", "update"),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { updateTaskRuleConfig, saveTaskRuleConfigToDB, getTaskRuleConfig } =
      await import("../matches/matchAutoTasks");
    updateTaskRuleConfig(req.body);
    await saveTaskRuleConfigToDB();
    await logAudit(
      "UPDATE",
      "settings",
      "task-rules",
      buildAuditContext(req.user!, req.ip),
      "Task automation rules updated",
    );
    sendSuccess(res, getTaskRuleConfig(), "Task rules updated");
  }),
);

// ══════════════════════════════════════════
// INTEGRATIONS (test connection — Admin only)
// ══════════════════════════════════════════

const testConnectionSchema = z.object({
  provider: z.string().min(1),
});

router.post(
  "/integrations/test-connection",
  authorizeModule("settings", "create"),
  validate(testConnectionSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { getProvider, listProviders } =
      await import("../integrations/matchAnalysis.service");
    const { provider: providerName } = req.body;
    const provider = getProvider(providerName);

    if (!provider) {
      sendSuccess(res, {
        connected: false,
        provider: providerName,
        message: `Provider "${providerName}" is not configured. Available: ${listProviders().join(", ") || "none"}`,
      });
      return;
    }

    try {
      const connected = await provider.testConnection();
      sendSuccess(res, {
        connected,
        provider: providerName,
        message: connected
          ? `${providerName} connection successful`
          : `${providerName} connection failed — check your API key`,
      });
    } catch (err: any) {
      sendSuccess(res, {
        connected: false,
        provider: providerName,
        message: err.message || "Connection test failed",
      });
    }
  }),
);

// ══════════════════════════════════════════
// SMTP SETTINGS (Admin only)
// ══════════════════════════════════════════

const smtpSettingsSchema = z.object({
  host: z.string().min(1).optional(),
  port: z.coerce.number().min(1).max(65535).optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  fromEmail: z.string().email().optional(),
  fromName: z.string().optional(),
  secure: z.boolean().optional(),
});

async function getAppSetting(key: string): Promise<any> {
  const [row] = (await sequelize.query(
    `SELECT value FROM app_settings WHERE key = $1 LIMIT 1`,
    { bind: [key], type: QueryTypes.SELECT },
  )) as any[];
  return row?.value ?? null;
}

async function setAppSetting(key: string, value: any): Promise<void> {
  await sequelize.query(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`,
    { bind: [key, JSON.stringify(value)] },
  );
}

router.get(
  "/smtp",
  authorizeModule("settings", "read"),
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const settings = await getAppSetting("smtp_config");
    // Mask password in response
    if (settings?.password) {
      settings.password = "••••••••";
    }
    sendSuccess(
      res,
      settings || {
        host: "",
        port: 587,
        username: "",
        password: "",
        fromEmail: "",
        fromName: "",
        secure: true,
      },
    );
  }),
);

router.patch(
  "/smtp",
  authorizeModule("settings", "update"),
  validate(smtpSettingsSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const current = (await getAppSetting("smtp_config")) || {};
    const updated = { ...current, ...req.body };
    // If password is masked, keep the old one
    if (req.body.password === "••••••••") {
      updated.password = current.password;
    }
    await setAppSetting("smtp_config", updated);
    await logAudit(
      "UPDATE",
      "settings",
      "smtp",
      buildAuditContext(req.user!, req.ip),
      "SMTP settings updated",
    );
    // Return with masked password
    const response = {
      ...updated,
      password: updated.password ? "••••••••" : "",
    };
    sendSuccess(res, response, "SMTP settings updated");
  }),
);

router.post(
  "/smtp/test",
  authorizeModule("settings", "create"),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const settings = await getAppSetting("smtp_config");
    if (!settings?.host) {
      sendSuccess(res, { success: false, message: "SMTP not configured" });
      return;
    }
    try {
      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({
        host: settings.host,
        port: settings.port || 587,
        secure: settings.secure ?? true,
        auth: { user: settings.username, pass: settings.password },
      });
      await transporter.verify();
      sendSuccess(res, {
        success: true,
        message: "SMTP connection successful",
      });
    } catch (err: any) {
      sendSuccess(res, {
        success: false,
        message: err.message || "Connection failed",
      });
    }
  }),
);

// ══════════════════════════════════════════
// MATCH ANALYSIS PROVIDER SETTINGS (Admin only)
// ══════════════════════════════════════════

const matchAnalysisSettingsSchema = z.object({
  provider: z.string().optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  enabled: z.boolean().optional(),
});

router.get(
  "/match-analysis",
  authorizeModule("settings", "read"),
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const settings = await getAppSetting("match_analysis_config");
    // Mask API key
    if (settings?.apiKey) {
      settings.apiKey = settings.apiKey.substring(0, 4) + "••••••••";
    }
    sendSuccess(
      res,
      settings || {
        provider: "Wyscout",
        apiKey: "",
        baseUrl: "",
        enabled: false,
      },
    );
  }),
);

router.patch(
  "/match-analysis",
  authorizeModule("settings", "update"),
  validate(matchAnalysisSettingsSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const current = (await getAppSetting("match_analysis_config")) || {};
    const updated = { ...current, ...req.body };
    // If apiKey is masked, keep the old one
    if (req.body.apiKey && req.body.apiKey.includes("••••••••")) {
      updated.apiKey = current.apiKey;
    }
    await setAppSetting("match_analysis_config", updated);
    await logAudit(
      "UPDATE",
      "settings",
      "match-analysis",
      buildAuditContext(req.user!, req.ip),
      "Match analysis settings updated",
    );
    const response = { ...updated };
    if (response.apiKey)
      response.apiKey = response.apiKey.substring(0, 4) + "••••••••";
    sendSuccess(res, response, "Match analysis settings updated");
  }),
);

router.post(
  "/match-analysis/test",
  authorizeModule("settings", "create"),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const settings = await getAppSetting("match_analysis_config");
    if (!settings?.apiKey || !settings?.provider) {
      sendSuccess(res, {
        connected: false,
        message: "Provider not configured",
      });
      return;
    }
    const { getProvider } =
      await import("../integrations/matchAnalysis.service");
    const provider = getProvider(settings.provider);
    if (!provider) {
      sendSuccess(res, {
        connected: false,
        message: `Provider "${settings.provider}" not available`,
      });
      return;
    }
    try {
      const connected = await provider.testConnection();
      sendSuccess(res, {
        connected,
        message: connected ? "Connection successful" : "Connection failed",
      });
    } catch (err: any) {
      sendSuccess(res, {
        connected: false,
        message: err.message || "Connection test failed",
      });
    }
  }),
);

// ══════════════════════════════════════════════════════════
// Sidebar Configuration (Admin controls which nav items appear)
// ══════════════════════════════════════════════════════════

const sidebarConfigSchema = z.object({
  hiddenItems: z.array(z.string()),
});

router.get(
  "/sidebar",
  authorizeModule("settings", "read"),
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const config = await getAppSetting("sidebar_config");
    sendSuccess(res, config ?? { hiddenItems: [] });
  }),
);

router.patch(
  "/sidebar",
  authorizeModule("settings", "update"),
  validate(sidebarConfigSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const config = req.body;
    await setAppSetting("sidebar_config", config);

    await logAudit(
      "UPDATE",
      "settings",
      "sidebar_config",
      buildAuditContext(req.user!, req.ip),
      "Updated sidebar navigation configuration",
    );

    sendSuccess(res, config, "Sidebar configuration updated");
  }),
);

export default router;
