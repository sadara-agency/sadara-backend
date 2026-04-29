import nodemailer from "nodemailer";
import { env } from "@config/env";
import { logger } from "@config/logger";
import { getAppSetting } from "@shared/utils/appSettings";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ═══════════════════════════════════════════════════════════
// Port → Encryption mapping (shared with settings.service)
// ═══════════════════════════════════════════════════════════

/**
 * Port 465 uses implicit TLS (`secure: true`). Every other common SMTP port
 * (587, 25, 2525) starts plaintext and upgrades via STARTTLS. Passing
 * `secure: true` to port 587 is the cause of the classic
 * "ssl3_get_record:wrong version number" error.
 */
export function resolveSmtpSecurity(port: number): {
  secure: boolean;
  requireTLS: boolean;
} {
  if (port === 465) return { secure: true, requireTLS: false };
  return { secure: false, requireTLS: true };
}

// ═══════════════════════════════════════════════════════════
// Transporter (lazy-initialized singleton — DB config first, env fallback)
// ═══════════════════════════════════════════════════════════

interface ResolvedSmtp {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
  fromName: string;
}

let _transporter: nodemailer.Transporter | null = null;
let _resolvedFrom: { email: string; name: string } | null = null;

/**
 * Invalidate the cached transporter so the next send rebuilds it.
 * Called by settings.service.updateSmtpSettings() after an admin saves new SMTP config.
 */
export function resetTransporter(): void {
  if (_transporter) {
    try {
      _transporter.close();
    } catch {
      /* ignore */
    }
  }
  _transporter = null;
  _resolvedFrom = null;
}

async function resolveSmtpConfig(): Promise<ResolvedSmtp | null> {
  // 1. DB config (admin-saved via Settings → SMTP)
  try {
    const dbCfg = await getAppSetting("smtp_config");
    if (dbCfg?.host && dbCfg?.username && dbCfg?.password) {
      return {
        host: dbCfg.host,
        port: Number(dbCfg.port) || 587,
        user: dbCfg.username,
        password: dbCfg.password,
        from: dbCfg.fromEmail || dbCfg.username,
        fromName: dbCfg.fromName || "صدارة | Sadara",
      };
    }
  } catch (err: any) {
    logger.warn("Failed to load SMTP config from DB — falling back to env", {
      error: err?.message,
    });
  }

  // 2. Env fallback
  if (env.smtp.host && env.smtp.user) {
    return {
      host: env.smtp.host,
      port: env.smtp.port,
      user: env.smtp.user,
      password: env.smtp.password,
      from: env.smtp.from,
      fromName: "صدارة | Sadara",
    };
  }

  return null;
}

async function getTransporter(): Promise<nodemailer.Transporter | null> {
  if (_transporter) return _transporter;

  const cfg = await resolveSmtpConfig();
  if (!cfg) {
    logger.warn("SMTP not configured — emails will be logged to console");
    return null;
  }

  const { secure, requireTLS } = resolveSmtpSecurity(cfg.port);

  _transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure,
    requireTLS,
    auth: {
      user: cfg.user,
      pass: cfg.password,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });

  _resolvedFrom = { email: cfg.from, name: cfg.fromName };

  _transporter
    .verify()
    .then(() =>
      logger.info("SMTP connection verified", {
        host: cfg.host,
        port: cfg.port,
      }),
    )
    .catch((err) => {
      logger.error("SMTP connection failed", { error: err.message });
      resetTransporter();
    });

  return _transporter;
}

// ═══════════════════════════════════════════════════════════
// Generic send function
// ═══════════════════════════════════════════════════════════

interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string; // plain-text fallback
}

export async function sendMailDirect(options: MailOptions): Promise<boolean> {
  const transporter = await getTransporter();

  if (!transporter) {
    logger.info("Email (SMTP not configured)", {
      to: options.to,
      subject: options.subject,
      ...(options.text && { body: options.text }),
    });
    return false;
  }

  const fromName = _resolvedFrom?.name || "صدارة | Sadara";
  const fromEmail = _resolvedFrom?.email || env.smtp.from;

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    logger.info("Email sent", { to: options.to, messageId: info.messageId });
    return true;
  } catch (err: any) {
    logger.error("Failed to send email", {
      to: options.to,
      error: err.message,
    });
    return false;
  }
}

export async function sendMail(options: MailOptions): Promise<boolean> {
  if (env.queue.enabled) {
    const { enqueue, QueueName } = await import("@modules/queues/queues");
    await enqueue(QueueName.Email, "send-email", options);
    return true;
  }
  return sendMailDirect(options);
}

// ═══════════════════════════════════════════════════════════
// Branded HTML email wrapper
// ═══════════════════════════════════════════════════════════

/**
 * Sadara logo — base64 PNG (128×128, rounded blue background + white star).
 * Replaces inline SVG which Gmail and Outlook strip. PNG <img> works in all
 * major email clients.
 */
const SADARA_LOGO_PNG = `data:image/png;base64,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`;

function wrapInTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>صدارة | Sadara</title>
</head>
<body style="margin:0; padding:0; background-color:#0D0E18; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D0E18;">
    <tr>
      <td align="center" style="padding:48px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; margin:0 auto;">

          <!-- Brand header (centred mark + wordmark) -->
          <tr>
            <td align="center" style="padding-bottom:36px;">
              <img src="${SADARA_LOGO_PNG}" width="64" height="64" alt="Sadara" style="display:block; margin:0 auto 14px; border-radius:18px;" />
              <div style="font-size:22px; font-weight:700; color:#ffffff; letter-spacing:-0.4px; line-height:1;">SADARA</div>
              <div style="font-size:10px; color:rgba(228,229,243,0.45); letter-spacing:3px; text-transform:uppercase; margin-top:6px;">Sports Management</div>
            </td>
          </tr>

          <!-- Content card -->
          <tr>
            <td style="background-color:#11132B; border-radius:20px; padding:44px 36px; border:1px solid rgba(228,229,243,0.10); box-shadow:0 10px 40px rgba(0,0,0,0.25);">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <a href="${env.frontend.url}" style="display:inline-block; color:#3C3CFA; font-size:12px; font-weight:600; text-decoration:none; letter-spacing:0.3px; margin-bottom:12px;">
                sadara.app
              </a>
              <p style="color:rgba(228,229,243,0.30); font-size:11px; margin:0;">
                © ${new Date().getFullYear()} Sadara Sports Management — جميع الحقوق محفوظة
              </p>
              <p style="color:rgba(228,229,243,0.20); font-size:10px; margin:6px 0 0;">
                هذا البريد مُرسل تلقائياً — لا ترد على هذه الرسالة
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════
// Pre-built email templates
// ═══════════════════════════════════════════════════════════

/**
 * Send a password reset email with a branded template.
 */
export async function sendPasswordResetEmail(
  to: string,
  userName: string,
  resetUrl: string,
): Promise<boolean> {
  const content = `
    <!-- Icon -->
    <div style="text-align:center; margin-bottom:24px;">
      <div style="display:inline-block; width:56px; height:56px; border-radius:16px; background-color:rgba(60,60,250,0.1); line-height:56px; text-align:center;">
        <span style="font-size:28px;">🔑</span>
      </div>
    </div>

    <!-- Title -->
    <h1 style="color:#ffffff; font-size:22px; font-weight:bold; text-align:center; margin:0 0 8px;">
      إعادة تعيين كلمة المرور
    </h1>
    <p style="color:rgba(255,255,255,0.5); font-size:14px; text-align:center; margin:0 0 28px; line-height:1.6;">
      مرحباً ${escapeHtml(userName || "")}، تم طلب إعادة تعيين كلمة المرور لحسابك في صدارة.
    </p>

    <!-- Button -->
    <div style="text-align:center; margin-bottom:28px;">
      <a href="${resetUrl}" target="_blank"
         style="display:inline-block; background-color:#3C3CFA; color:#ffffff; font-size:14px; font-weight:600; text-decoration:none; padding:14px 40px; border-radius:12px; letter-spacing:0.3px;">
        إعادة تعيين كلمة المرور
      </a>
    </div>

    <!-- Info -->
    <div style="background-color:rgba(255,255,255,0.03); border-radius:10px; padding:16px; margin-bottom:20px; border:1px solid rgba(228,229,243,0.05);">
      <p style="color:rgba(255,255,255,0.4); font-size:12px; margin:0 0 8px; line-height:1.6;">
        ⏱️ هذا الرابط صالح لمدة <strong style="color:rgba(255,255,255,0.6);">ساعة واحدة</strong> فقط.
      </p>
      <p style="color:rgba(255,255,255,0.4); font-size:12px; margin:0; line-height:1.6;">
        🔒 إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد بأمان.
      </p>
    </div>

    <!-- Fallback URL -->
    <p style="color:rgba(255,255,255,0.25); font-size:10px; text-align:center; margin:0; word-break:break-all; direction:ltr;">
      إذا لم يعمل الزر، انسخ هذا الرابط في المتصفح:<br/>
      <a href="${resetUrl}" style="color:#3C3CFA; text-decoration:none;">${resetUrl}</a>
    </p>
  `;

  return sendMail({
    to,
    subject: "🔑 إعادة تعيين كلمة المرور — صدارة",
    html: wrapInTemplate(content),
    text: `مرحباً ${userName}، تم طلب إعادة تعيين كلمة المرور. اضغط على هذا الرابط: ${resetUrl} — صالح لمدة ساعة واحدة.`,
  });
}

/**
 * Send an email-verification link to a newly registered user.
 * Link expires after 24 hours (see auth.service.register).
 */
export async function sendEmailVerificationEmail(
  to: string,
  userName: string,
  verifyUrl: string,
): Promise<boolean> {
  const safeName = escapeHtml(userName || "");
  const content = `
    <!-- Icon -->
    <div style="text-align:center; margin-bottom:28px;">
      <div style="display:inline-block; width:64px; height:64px; border-radius:18px; background-color:rgba(60,60,250,0.12); border:1px solid rgba(60,60,250,0.25); line-height:64px; text-align:center;">
        <span style="font-size:30px; line-height:64px;">✉️</span>
      </div>
    </div>

    <!-- Title -->
    <h1 style="color:#ffffff; font-size:24px; font-weight:700; text-align:center; margin:0 0 10px; letter-spacing:-0.3px;">
      تأكيد البريد الإلكتروني
    </h1>
    <div style="height:1px; background:linear-gradient(90deg, transparent 0%, rgba(228,229,243,0.18) 50%, transparent 100%); margin:0 auto 18px; max-width:120px;"></div>
    <p style="color:rgba(228,229,243,0.65); font-size:14px; text-align:center; margin:0 0 32px; line-height:1.7;">
      مرحباً <bdi dir="auto" style="color:rgba(255,255,255,0.9); font-weight:600;">${safeName}</bdi>،<br/>
      اضغط الزر أدناه لتأكيد عنوان بريدك الإلكتروني وتفعيل حسابك في صدارة.
    </p>

    <!-- CTA -->
    <div style="text-align:center; margin-bottom:32px;">
      <a href="${verifyUrl}" target="_blank"
         style="display:inline-block; background:linear-gradient(135deg, #3C3CFA 0%, #5A5AFF 100%); color:#ffffff; font-size:15px; font-weight:600; text-decoration:none; padding:16px 44px; border-radius:14px; letter-spacing:0.3px; box-shadow:0 8px 24px rgba(60,60,250,0.40);">
        تأكيد البريد &nbsp;·&nbsp; Verify Email
      </a>
    </div>

    <!-- Info panel -->
    <div style="background-color:rgba(228,229,243,0.04); border-radius:12px; border:1px solid rgba(228,229,243,0.08); margin-bottom:24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:14px 18px; border-bottom:1px solid rgba(228,229,243,0.06);">
            <p style="color:rgba(228,229,243,0.55); font-size:12px; margin:0; line-height:1.6;">
              ⏱️ هذا الرابط صالح لمدة <strong style="color:rgba(255,255,255,0.85);">24 ساعة</strong>.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 18px;">
            <p style="color:rgba(228,229,243,0.55); font-size:12px; margin:0; line-height:1.6;">
              🔒 إذا لم تقم بإنشاء حساب في صدارة، يمكنك تجاهل هذا البريد بأمان.
            </p>
          </td>
        </tr>
      </table>
    </div>

    <!-- Fallback URL chip -->
    <p style="color:rgba(228,229,243,0.35); font-size:11px; text-align:center; margin:0 0 10px;">
      إذا لم يعمل الزر، انسخ هذا الرابط في المتصفح:
    </p>
    <div style="background-color:#0D0E18; border-radius:10px; padding:12px 14px; border:1px solid rgba(228,229,243,0.06); direction:ltr; text-align:center;">
      <a href="${verifyUrl}" style="color:#9B9BFF; font-family:'JetBrains Mono','SFMono-Regular',Consolas,Menlo,monospace; font-size:11px; text-decoration:none; word-break:break-all;">${verifyUrl}</a>
    </div>
  `;

  return sendMail({
    to,
    subject: "✉️ تأكيد البريد الإلكتروني — صدارة",
    html: wrapInTemplate(content),
    text: `مرحباً ${userName}، يرجى تأكيد بريدك الإلكتروني من خلال هذا الرابط: ${verifyUrl} — صالح لمدة 24 ساعة.`,
  });
}

/**
 * Send a welcome/activation email to newly registered users.
 */
export async function sendWelcomeEmail(
  to: string,
  userName: string,
): Promise<boolean> {
  const content = `
    <div style="text-align:center; margin-bottom:24px;">
      <div style="display:inline-block; width:56px; height:56px; border-radius:16px; background-color:rgba(60,60,250,0.1); line-height:56px; text-align:center;">
        <span style="font-size:28px;">👋</span>
      </div>
    </div>

    <h1 style="color:#ffffff; font-size:22px; font-weight:bold; text-align:center; margin:0 0 8px;">
      مرحباً بك في صدارة!
    </h1>
    <p style="color:rgba(255,255,255,0.5); font-size:14px; text-align:center; margin:0 0 28px; line-height:1.6;">
      مرحباً ${escapeHtml(userName)}، تم تسجيل حسابك بنجاح. سيقوم المسؤول بتفعيل حسابك قريباً وستتمكن من الوصول إلى المنصة.
    </p>

    <div style="background-color:rgba(60,60,250,0.05); border-radius:10px; padding:16px; border:1px solid rgba(60,60,250,0.1);">
      <p style="color:rgba(255,255,255,0.5); font-size:13px; margin:0; text-align:center; line-height:1.6;">
        ستصلك رسالة أخرى عند تفعيل حسابك ✅
      </p>
    </div>
  `;

  return sendMail({
    to,
    subject: "👋 مرحباً بك في صدارة — Sadara",
    html: wrapInTemplate(content),
    text: `مرحباً ${userName}، تم تسجيل حسابك في صدارة بنجاح. سيقوم المسؤول بتفعيل حسابك قريباً.`,
  });
}

/**
 * Send a password changed confirmation email.
 */
export async function sendPasswordChangedEmail(
  to: string,
  userName: string,
): Promise<boolean> {
  const loginUrl = `${env.frontend.url}/login`;

  const content = `
    <div style="text-align:center; margin-bottom:24px;">
      <div style="display:inline-block; width:56px; height:56px; border-radius:16px; background-color:rgba(34,197,94,0.1); line-height:56px; text-align:center;">
        <span style="font-size:28px;">✅</span>
      </div>
    </div>

    <h1 style="color:#ffffff; font-size:22px; font-weight:bold; text-align:center; margin:0 0 8px;">
      تم تغيير كلمة المرور
    </h1>
    <p style="color:rgba(255,255,255,0.5); font-size:14px; text-align:center; margin:0 0 28px; line-height:1.6;">
      مرحباً ${escapeHtml(userName)}، تم تغيير كلمة المرور الخاصة بحسابك في صدارة بنجاح.
    </p>

    <div style="background-color:rgba(239,68,68,0.05); border-radius:10px; padding:16px; margin-bottom:20px; border:1px solid rgba(239,68,68,0.1);">
      <p style="color:rgba(255,255,255,0.5); font-size:12px; margin:0; line-height:1.6;">
        ⚠️ إذا لم تقم بهذا التغيير، يرجى <a href="${loginUrl}" style="color:#3C3CFA; text-decoration:none;">تسجيل الدخول</a> فوراً وتغيير كلمة المرور أو التواصل مع المسؤول.
      </p>
    </div>
  `;

  return sendMail({
    to,
    subject: "✅ تم تغيير كلمة المرور — صدارة",
    html: wrapInTemplate(content),
    text: `مرحباً ${userName}، تم تغيير كلمة المرور بنجاح. إذا لم تقم بهذا التغيير، تواصل مع المسؤول فوراً.`,
  });
}

// ═══════════════════════════════════════════════════════════
// Admin invite email
// ═══════════════════════════════════════════════════════════

/**
 * Send an invitation email when an admin creates a new staff user.
 * Includes the assigned role and a login link.
 */
export async function sendInviteEmail(
  to: string,
  userName: string,
  role: string,
  loginUrl: string,
): Promise<boolean> {
  const content = `
    <div style="text-align:center; margin-bottom:24px;">
      <div style="display:inline-block; width:56px; height:56px; border-radius:16px; background-color:rgba(60,60,250,0.1); line-height:56px; text-align:center;">
        <span style="font-size:28px;">🎉</span>
      </div>
    </div>

    <h1 style="color:#ffffff; font-size:22px; font-weight:bold; text-align:center; margin:0 0 8px;">
      تمت دعوتك إلى صدارة
    </h1>
    <p style="color:rgba(255,255,255,0.5); font-size:14px; text-align:center; margin:0 0 28px; line-height:1.6;">
      مرحباً ${escapeHtml(userName)}، تم إنشاء حسابك في منصة صدارة بصلاحية <strong style="color:rgba(255,255,255,0.7);">${escapeHtml(role)}</strong>.
    </p>

    <div style="background-color:rgba(255,255,255,0.03); border-radius:10px; padding:16px; margin-bottom:20px; border:1px solid rgba(228,229,243,0.05);">
      <p style="color:rgba(255,255,255,0.4); font-size:12px; margin:0 0 8px; line-height:1.6;">
        📧 البريد الإلكتروني: <strong style="color:rgba(255,255,255,0.6);">${escapeHtml(to)}</strong>
      </p>
      <p style="color:rgba(255,255,255,0.4); font-size:12px; margin:0; line-height:1.6;">
        🔒 كلمة المرور تم تعيينها من قبل المسؤول — يرجى تغييرها بعد تسجيل الدخول الأول.
      </p>
    </div>

    <div style="text-align:center; margin-bottom:28px;">
      <a href="${loginUrl}" target="_blank"
         style="display:inline-block; background-color:#3C3CFA; color:#ffffff; font-size:14px; font-weight:600; text-decoration:none; padding:14px 40px; border-radius:12px; letter-spacing:0.3px;">
        تسجيل الدخول / Login
      </a>
    </div>

    <p style="color:rgba(255,255,255,0.25); font-size:10px; text-align:center; margin:0; word-break:break-all; direction:ltr;">
      <a href="${loginUrl}" style="color:#3C3CFA; text-decoration:none;">${loginUrl}</a>
    </p>
  `;

  return sendMail({
    to,
    subject: "🎉 تمت دعوتك إلى صدارة — Sadara",
    html: wrapInTemplate(content),
    text: `مرحباً ${userName}، تم إنشاء حسابك في صدارة بصلاحية ${role}. سجل دخولك من هنا: ${loginUrl}`,
  });
}

// ═══════════════════════════════════════════════════════════
// E-Signature email templates
// ═══════════════════════════════════════════════════════════

/**
 * Send a signature request email to a signer.
 */
export async function sendSignatureRequestEmail(
  to: string,
  signerName: string,
  documentName: string,
  requestorName: string,
  message?: string,
  signingUrl?: string,
): Promise<boolean> {
  const messageBlock = message
    ? `
    <div style="background-color:rgba(255,255,255,0.03); border-radius:10px; padding:16px; margin-bottom:20px; border:1px solid rgba(228,229,243,0.05);">
      <p style="color:rgba(255,255,255,0.5); font-size:13px; margin:0; line-height:1.6;">
        "${escapeHtml(message)}"
      </p>
      <p style="color:rgba(255,255,255,0.3); font-size:11px; margin:8px 0 0;">
        — ${escapeHtml(requestorName)}
      </p>
    </div>`
    : "";

  const content = `
    <div style="text-align:center; margin-bottom:24px;">
      <div style="display:inline-block; width:56px; height:56px; border-radius:16px; background-color:rgba(60,60,250,0.1); line-height:56px; text-align:center;">
        <span style="font-size:28px;">✍️</span>
      </div>
    </div>

    <h1 style="color:#ffffff; font-size:22px; font-weight:bold; text-align:center; margin:0 0 8px;">
      طلب توقيع / Signature Requested
    </h1>
    <p style="color:rgba(255,255,255,0.5); font-size:14px; text-align:center; margin:0 0 28px; line-height:1.6;">
      مرحباً ${escapeHtml(signerName)}، يرجى توقيع المستند التالي:<br/>
      <strong style="color:rgba(255,255,255,0.7);">${escapeHtml(documentName)}</strong>
    </p>

    ${messageBlock}

    <div style="text-align:center; margin-bottom:28px;">
      <a href="${signingUrl || "#"}" target="_blank"
         style="display:inline-block; background-color:#3C3CFA; color:#ffffff; font-size:14px; font-weight:600; text-decoration:none; padding:14px 40px; border-radius:12px; letter-spacing:0.3px;">
        توقيع الآن / Sign Now
      </a>
    </div>

    <div style="background-color:rgba(255,255,255,0.03); border-radius:10px; padding:16px; border:1px solid rgba(228,229,243,0.05);">
      <p style="color:rgba(255,255,255,0.4); font-size:12px; margin:0; line-height:1.6;">
        ⏱️ رابط التوقيع صالح لمدة <strong style="color:rgba(255,255,255,0.6);">7 أيام</strong>.
      </p>
    </div>

    <p style="color:rgba(255,255,255,0.25); font-size:10px; text-align:center; margin:16px 0 0; word-break:break-all; direction:ltr;">
      <a href="${signingUrl || "#"}" style="color:#3C3CFA; text-decoration:none;">${signingUrl || ""}</a>
    </p>
  `;

  return sendMail({
    to,
    subject: `✍️ طلب توقيع: ${documentName} — صدارة`,
    html: wrapInTemplate(content),
    text: `مرحباً ${signerName}، يرجى توقيع المستند "${documentName}". رابط التوقيع: ${signingUrl}`,
  });
}

/**
 * Notify all parties when a document is fully signed.
 */
export async function sendSignatureCompletedEmail(
  to: string,
  recipientName: string,
  documentName: string,
): Promise<boolean> {
  const content = `
    <div style="text-align:center; margin-bottom:24px;">
      <div style="display:inline-block; width:56px; height:56px; border-radius:16px; background-color:rgba(34,197,94,0.1); line-height:56px; text-align:center;">
        <span style="font-size:28px;">✅</span>
      </div>
    </div>

    <h1 style="color:#ffffff; font-size:22px; font-weight:bold; text-align:center; margin:0 0 8px;">
      تم التوقيع بالكامل / Fully Signed
    </h1>
    <p style="color:rgba(255,255,255,0.5); font-size:14px; text-align:center; margin:0 0 28px; line-height:1.6;">
      مرحباً ${escapeHtml(recipientName)}، تم جمع جميع التوقيعات على المستند:<br/>
      <strong style="color:rgba(255,255,255,0.7);">${escapeHtml(documentName)}</strong>
    </p>

    <div style="background-color:rgba(34,197,94,0.05); border-radius:10px; padding:16px; border:1px solid rgba(34,197,94,0.1);">
      <p style="color:rgba(255,255,255,0.5); font-size:13px; margin:0; text-align:center; line-height:1.6;">
        يمكنك تحميل المستند الموقّع من لوحة التحكم 📄
      </p>
    </div>
  `;

  return sendMail({
    to,
    subject: `✅ تم التوقيع: ${documentName} — صدارة`,
    html: wrapInTemplate(content),
    text: `مرحباً ${recipientName}، تم جمع جميع التوقيعات على "${documentName}".`,
  });
}

/**
 * Notify the creator when a signer declines.
 */
export async function sendSignatureDeclinedEmail(
  to: string,
  recipientName: string,
  documentName: string,
  declinedByName: string,
  reason?: string,
): Promise<boolean> {
  const reasonBlock = reason
    ? `<p style="color:rgba(255,255,255,0.4); font-size:12px; margin:8px 0 0; line-height:1.6;">السبب: ${escapeHtml(reason)}</p>`
    : "";

  const content = `
    <div style="text-align:center; margin-bottom:24px;">
      <div style="display:inline-block; width:56px; height:56px; border-radius:16px; background-color:rgba(239,68,68,0.1); line-height:56px; text-align:center;">
        <span style="font-size:28px;">❌</span>
      </div>
    </div>

    <h1 style="color:#ffffff; font-size:22px; font-weight:bold; text-align:center; margin:0 0 8px;">
      تم رفض التوقيع / Signature Declined
    </h1>
    <p style="color:rgba(255,255,255,0.5); font-size:14px; text-align:center; margin:0 0 28px; line-height:1.6;">
      مرحباً ${escapeHtml(recipientName)}، قام <strong style="color:rgba(255,255,255,0.7);">${escapeHtml(declinedByName)}</strong> برفض التوقيع على:<br/>
      <strong style="color:rgba(255,255,255,0.7);">${escapeHtml(documentName)}</strong>
    </p>

    <div style="background-color:rgba(239,68,68,0.05); border-radius:10px; padding:16px; border:1px solid rgba(239,68,68,0.1);">
      <p style="color:rgba(255,255,255,0.5); font-size:12px; margin:0; line-height:1.6;">
        تم إلغاء طلب التوقيع تلقائياً.
      </p>
      ${reasonBlock}
    </div>
  `;

  return sendMail({
    to,
    subject: `❌ تم رفض التوقيع: ${documentName} — صدارة`,
    html: wrapInTemplate(content),
    text: `مرحباً ${recipientName}، قام ${declinedByName} برفض التوقيع على "${documentName}".${reason ? ` السبب: ${reason}` : ""}`,
  });
}

/**
 * Reminder email for a pending signer.
 */
export async function sendSignatureReminderEmail(
  to: string,
  signerName: string,
  documentName: string,
  signingUrl: string,
  dueDate?: string | null,
): Promise<boolean> {
  const dueLine = dueDate
    ? `<p style="color:rgba(255,159,10,0.8); font-size:12px; margin:8px 0 0;">⏰ الموعد النهائي: ${dueDate}</p>`
    : "";

  const content = `
    <div style="text-align:center; margin-bottom:24px;">
      <div style="display:inline-block; width:56px; height:56px; border-radius:16px; background-color:rgba(255,159,10,0.1); line-height:56px; text-align:center;">
        <span style="font-size:28px;">🔔</span>
      </div>
    </div>

    <h1 style="color:#ffffff; font-size:22px; font-weight:bold; text-align:center; margin:0 0 8px;">
      تذكير بالتوقيع / Signature Reminder
    </h1>
    <p style="color:rgba(255,255,255,0.5); font-size:14px; text-align:center; margin:0 0 28px; line-height:1.6;">
      مرحباً ${escapeHtml(signerName)}، لا يزال توقيعك مطلوباً على:<br/>
      <strong style="color:rgba(255,255,255,0.7);">${escapeHtml(documentName)}</strong>
    </p>

    <div style="text-align:center; margin-bottom:28px;">
      <a href="${signingUrl}" target="_blank"
         style="display:inline-block; background-color:#FF9F0A; color:#000000; font-size:14px; font-weight:600; text-decoration:none; padding:14px 40px; border-radius:12px; letter-spacing:0.3px;">
        توقيع الآن / Sign Now
      </a>
    </div>

    <div style="background-color:rgba(255,255,255,0.03); border-radius:10px; padding:16px; border:1px solid rgba(228,229,243,0.05);">
      ${dueLine}
    </div>
  `;

  return sendMail({
    to,
    subject: `🔔 تذكير بالتوقيع: ${documentName} — صدارة`,
    html: wrapInTemplate(content),
    text: `مرحباً ${signerName}، لا يزال توقيعك مطلوباً على "${documentName}". رابط التوقيع: ${signingUrl}`,
  });
}
