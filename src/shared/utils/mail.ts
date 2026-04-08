import nodemailer from "nodemailer";
import { env } from "@config/env";
import { logger } from "@config/logger";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ═══════════════════════════════════════════════════════════
// Transporter (lazy-initialized singleton)
// ═══════════════════════════════════════════════════════════

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (_transporter) return _transporter;

  // If SMTP is not configured, return null (will fall back to console)
  if (!env.smtp.host || !env.smtp.user) {
    logger.warn("SMTP not configured — emails will be logged to console");
    return null;
  }

  _transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure, // true for 465, false for 587
    auth: {
      user: env.smtp.user,
      pass: env.smtp.password,
    },
    // Pool connections for better performance
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    // Timeouts
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });

  // Verify connection on first use
  _transporter
    .verify()
    .then(() => logger.info("SMTP connection verified"))
    .catch((err) => {
      logger.error("SMTP connection failed", { error: err.message });
      _transporter = null;
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

export async function sendMail(options: MailOptions): Promise<boolean> {
  const transporter = getTransporter();

  if (!transporter) {
    // Fallback: log via logger in dev mode
    logger.info("Email (SMTP not configured)", {
      to: options.to,
      subject: options.subject,
      ...(options.text && { body: options.text }),
    });
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"صدارة | Sadara" <${env.smtp.from}>`,
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

// ═══════════════════════════════════════════════════════════
// Branded HTML email wrapper
// ═══════════════════════════════════════════════════════════

function wrapInTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>صدارة | Sadara</title>
</head>
<body style="margin:0; padding:0; background-color:#0D0E18; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D0E18; min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; margin:0 auto;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#3C3CFA; width:40px; height:40px; border-radius:12px; text-align:center; vertical-align:middle;">
                    <span style="color:#ffffff; font-weight:bold; font-size:18px; line-height:40px;">S</span>
                  </td>
                  <td style="padding-right:12px;">
                    <div style="font-size:20px; font-weight:bold; color:#ffffff; letter-spacing:-0.5px;">SADARA</div>
                    <div style="font-size:9px; color:rgba(255,255,255,0.4); letter-spacing:2px; text-transform:uppercase;">Sports Management</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Card -->
          <tr>
            <td style="background-color:#11132B; border-radius:16px; padding:40px 32px; border:1px solid rgba(228,229,243,0.08);">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="color:rgba(255,255,255,0.2); font-size:11px; margin:0;">
                © ${new Date().getFullYear()} Sadara Sports Management — جميع الحقوق محفوظة
              </p>
              <p style="color:rgba(255,255,255,0.15); font-size:10px; margin:6px 0 0;">
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
