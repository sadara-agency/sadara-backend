import { z } from "zod";

// ── Profile ──

export const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  fullNameAr: z.string().max(255).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

// ── Team ──

export const teamQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(20),
  search: z.string().optional(),
  role: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const updateUserSchema = z.object({
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
      "SkillCoach",
      "TacticalCoach",
      "FitnessCoach",
      "NutritionSpecialist",
      "GymCoach",
      "Media",
      "Executive",
      "GoalkeeperCoach",
      "MentalCoach",
    ])
    .optional(),
  isActive: z.boolean().optional(),
});

// ── Notification Preferences ──

export const notificationPrefsSchema = z.object({
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

// ── SMTP ──
// Note: `secure` is accepted for backward compatibility but ignored by the
// server. The encryption mode is auto-derived from the port (465 → implicit
// SSL, otherwise STARTTLS) — see `resolveSmtpSecurity` in mail.ts.

export const smtpSettingsSchema = z.object({
  host: z.string().min(1).optional(),
  port: z.coerce.number().min(1).max(65535).optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  fromEmail: z.string().email().optional(),
  fromName: z.string().optional(),
  secure: z.boolean().optional(),
});

// ── Match Analysis ──

export const matchAnalysisSettingsSchema = z.object({
  provider: z.string().optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  enabled: z.boolean().optional(),
});

// ── Integrations ──

export const testConnectionSchema = z.object({
  provider: z.string().min(1),
});

// ── Sidebar ──

const sidebarNodeSchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    type: z.enum(["section", "item", "custom", "group"]),
    sourceKey: z.string().optional(),
    customHref: z.string().max(500).optional(),
    customIcon: z.string().max(100).optional(),
    customLabelEn: z.string().max(100).optional(),
    customLabelAr: z.string().max(100).optional(),
    customRoles: z.array(z.string()).optional(),
    sortOrder: z.number().int().min(0),
    children: z.array(sidebarNodeSchema).max(50).optional(),
    hidden: z.boolean().optional(),
  }),
);

export const sidebarConfigSchema = z.object({
  hiddenItems: z.array(z.string()).optional(),
  version: z.number().int().min(1).max(2).optional(),
  tree: z.array(sidebarNodeSchema).max(30).optional(),
  customLabels: z
    .record(
      z.object({
        en: z.string().max(100),
        ar: z.string().max(100),
      }),
    )
    .optional(),
});

// ── Inferred Types ──

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type TeamQuery = z.infer<typeof teamQuerySchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type NotificationPrefsInput = z.infer<typeof notificationPrefsSchema>;
export type SmtpSettingsInput = z.infer<typeof smtpSettingsSchema>;
export type MatchAnalysisSettingsInput = z.infer<
  typeof matchAnalysisSettingsSchema
>;
export type SidebarConfigInput = z.infer<typeof sidebarConfigSchema>;
