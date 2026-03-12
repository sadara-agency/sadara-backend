import { Request, Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess, sendCreated } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import {
  COOKIE_NAME,
  COOKIE_OPTIONS,
  CLEAR_COOKIE_OPTIONS,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_OPTIONS,
  CLEAR_REFRESH_COOKIE_OPTIONS,
} from "@shared/utils/cookie";
import * as authService from "@modules/auth/auth.service";

// ── Public Register (no token returned, account inactive) ──
export async function register(req: Request, res: Response) {
  const result = await authService.register(req.body);

  await logAudit("REGISTER", "users", result.user.id, {
    userId: result.user.id,
    userName: result.user.fullName ?? result.user.fullNameAr,
    userRole: result.user.role as any,
    ip: req.ip,
  });

  sendCreated(
    res,
    { user: { id: result.user.id, email: result.user.email } },
    "Registration successful. Please check your email for verification.",
  );
}

// ── Admin Invite (creates active user with assigned role) ──
export async function invite(req: AuthRequest, res: Response) {
  const result = await authService.invite(req.body);

  await logAudit(
    "INVITE",
    "users",
    result.user.id,
    buildAuditContext(req.user!, req.ip),
    `Invited ${result.user.email} as ${result.user.role}`,
  );

  sendCreated(res, result, "User invited successfully");
}

// ── Login ──
export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body);

  await logAudit("LOGIN", "users", result.user.id, {
    userId: result.user.id,
    userName: result.user.fullName ?? result.user.fullNameAr,
    userRole: result.user.role as any,
    ip: req.ip,
  });

  // Set httpOnly cookies for browser clients
  res.cookie(COOKIE_NAME, result.token, COOKIE_OPTIONS);
  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);

  // Still return token in body for non-browser clients (mobile, API)
  sendSuccess(
    res,
    { user: result.user, token: result.token },
    "Login successful",
  );
}

// ── Refresh — rotate refresh token, issue new access token ──
export async function refresh(req: Request, res: Response) {
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!rawToken) {
    res.status(401).json({ success: false, message: "No refresh token" });
    return;
  }

  const result = await authService.refreshSession(rawToken);

  // Set new cookies (rotation)
  res.cookie(COOKIE_NAME, result.token, COOKIE_OPTIONS);
  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);

  sendSuccess(res, { token: result.token }, "Token refreshed");
}

// ── Profile ──
export async function getProfile(req: AuthRequest, res: Response) {
  const user = await authService.getProfile(req.user!.id);
  sendSuccess(res, user);
}

export async function updateProfile(req: AuthRequest, res: Response) {
  const user = await authService.updateProfile(req.user!.id, req.body);
  await logAudit(
    "UPDATE",
    "users",
    req.user!.id,
    buildAuditContext(req.user!, req.ip),
    "Profile updated",
  );
  sendSuccess(res, user, "Profile updated");
}

export async function changePassword(req: AuthRequest, res: Response) {
  const result = await authService.changePassword(
    req.user!.id,
    req.body.currentPassword,
    req.body.newPassword,
  );
  await logAudit(
    "UPDATE",
    "users",
    req.user!.id,
    buildAuditContext(req.user!, req.ip),
    "Password changed",
  );

  // Clear refresh cookie — user must re-login on other devices
  res.clearCookie(REFRESH_COOKIE_NAME, CLEAR_REFRESH_COOKIE_OPTIONS);
  sendSuccess(res, result);
}

// ── Forgot Password (public — request reset link) ──
export async function forgotPassword(req: Request, res: Response) {
  const result = await authService.forgotPassword(req.body.email);
  sendSuccess(res, result);
}

// ── Reset Password (public — set new password with token) ──
export async function resetPassword(req: Request, res: Response) {
  const result = await authService.resetPassword(
    req.body.token,
    req.body.newPassword,
  );
  sendSuccess(res, result);
}

// ── Logout (clears httpOnly cookies + revokes refresh tokens) ──
export async function logout(req: AuthRequest, res: Response) {
  // Revoke the refresh token if present
  const rawRefresh = req.cookies?.[REFRESH_COOKIE_NAME];
  if (rawRefresh) {
    try {
      // Use a one-off revocation for the current token
      const crypto = await import("crypto");
      const tokenHash = crypto
        .createHash("sha256")
        .update(rawRefresh)
        .digest("hex");
      const { sequelize } = await import("../../config/database");
      await sequelize.query(
        `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = :tokenHash AND revoked_at IS NULL`,
        { replacements: { tokenHash } },
      );
    } catch {
      // Best-effort — still clear cookies
    }
  }

  res.clearCookie(COOKIE_NAME, CLEAR_COOKIE_OPTIONS);
  res.clearCookie(REFRESH_COOKIE_NAME, CLEAR_REFRESH_COOKIE_OPTIONS);

  if (req.user) {
    await logAudit("LOGOUT", "users", req.user.id, {
      userId: req.user.id,
      userName: req.user.fullName,
      userRole: req.user.role as any,
      ip: req.ip,
    });
  }

  sendSuccess(res, null, "Logged out successfully");
}
