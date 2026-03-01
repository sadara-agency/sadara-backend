"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = sendMail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
exports.sendWelcomeEmail = sendWelcomeEmail;
exports.sendPasswordChangedEmail = sendPasswordChangedEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../../config/env");
// ═══════════════════════════════════════════════════════════
// Transporter (lazy-initialized singleton)
// ═══════════════════════════════════════════════════════════
let _transporter = null;
function getTransporter() {
    if (_transporter)
        return _transporter;
    // If SMTP is not configured, return null (will fall back to console)
    if (!env_1.env.smtp.host || !env_1.env.smtp.user) {
        console.warn('⚠️  SMTP not configured — emails will be logged to console');
        return null;
    }
    _transporter = nodemailer_1.default.createTransport({
        host: env_1.env.smtp.host,
        port: env_1.env.smtp.port,
        secure: env_1.env.smtp.secure, // true for 465, false for 587
        auth: {
            user: env_1.env.smtp.user,
            pass: env_1.env.smtp.password,
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
    _transporter.verify()
        .then(() => console.log('✅ SMTP connection verified'))
        .catch((err) => {
        console.error('❌ SMTP connection failed:', err.message);
        _transporter = null;
    });
    return _transporter;
}
async function sendMail(options) {
    const transporter = getTransporter();
    if (!transporter) {
        // Fallback: log to console in dev mode
        console.log('═══════════════════════════════════════════════');
        console.log('📧 EMAIL (SMTP not configured — logged to console)');
        console.log(`   To:      ${options.to}`);
        console.log(`   Subject: ${options.subject}`);
        if (options.text)
            console.log(`   Body:    ${options.text}`);
        console.log('═══════════════════════════════════════════════');
        return false;
    }
    try {
        const info = await transporter.sendMail({
            from: `"صدارة | Sadara" <${env_1.env.smtp.from}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
        });
        console.log(`✅ Email sent to ${options.to} — messageId: ${info.messageId}`);
        return true;
    }
    catch (err) {
        console.error(`❌ Failed to send email to ${options.to}:`, err.message);
        return false;
    }
}
// ═══════════════════════════════════════════════════════════
// Branded HTML email wrapper
// ═══════════════════════════════════════════════════════════
function wrapInTemplate(content) {
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
async function sendPasswordResetEmail(to, userName, resetUrl) {
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
      مرحباً ${userName || ''}، تم طلب إعادة تعيين كلمة المرور لحسابك في صدارة.
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
        subject: '🔑 إعادة تعيين كلمة المرور — صدارة',
        html: wrapInTemplate(content),
        text: `مرحباً ${userName}، تم طلب إعادة تعيين كلمة المرور. اضغط على هذا الرابط: ${resetUrl} — صالح لمدة ساعة واحدة.`,
    });
}
/**
 * Send a welcome/activation email to newly registered users.
 */
async function sendWelcomeEmail(to, userName) {
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
      مرحباً ${userName}، تم تسجيل حسابك بنجاح. سيقوم المسؤول بتفعيل حسابك قريباً وستتمكن من الوصول إلى المنصة.
    </p>

    <div style="background-color:rgba(60,60,250,0.05); border-radius:10px; padding:16px; border:1px solid rgba(60,60,250,0.1);">
      <p style="color:rgba(255,255,255,0.5); font-size:13px; margin:0; text-align:center; line-height:1.6;">
        ستصلك رسالة أخرى عند تفعيل حسابك ✅
      </p>
    </div>
  `;
    return sendMail({
        to,
        subject: '👋 مرحباً بك في صدارة — Sadara',
        html: wrapInTemplate(content),
        text: `مرحباً ${userName}، تم تسجيل حسابك في صدارة بنجاح. سيقوم المسؤول بتفعيل حسابك قريباً.`,
    });
}
/**
 * Send a password changed confirmation email.
 */
async function sendPasswordChangedEmail(to, userName) {
    const loginUrl = `${env_1.env.frontend.url}/login`;
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
      مرحباً ${userName}، تم تغيير كلمة المرور الخاصة بحسابك في صدارة بنجاح.
    </p>

    <div style="background-color:rgba(239,68,68,0.05); border-radius:10px; padding:16px; margin-bottom:20px; border:1px solid rgba(239,68,68,0.1);">
      <p style="color:rgba(255,255,255,0.5); font-size:12px; margin:0; line-height:1.6;">
        ⚠️ إذا لم تقم بهذا التغيير، يرجى <a href="${loginUrl}" style="color:#3C3CFA; text-decoration:none;">تسجيل الدخول</a> فوراً وتغيير كلمة المرور أو التواصل مع المسؤول.
      </p>
    </div>
  `;
    return sendMail({
        to,
        subject: '✅ تم تغيير كلمة المرور — صدارة',
        html: wrapInTemplate(content),
        text: `مرحباً ${userName}، تم تغيير كلمة المرور بنجاح. إذا لم تقم بهذا التغيير، تواصل مع المسؤول فوراً.`,
    });
}
//# sourceMappingURL=mail.js.map