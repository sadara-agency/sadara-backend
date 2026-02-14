import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthRequest, AuthUser, UserRole } from '../shared/types';
import { sendUnauthorized, sendForbidden } from '../shared/utils/apiResponse';

// ── Verify JWT Token ──
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendUnauthorized(res, 'No token provided');
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.jwt.secret) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      sendUnauthorized(res, 'Token expired');
    } else {
      sendUnauthorized(res, 'Invalid token');
    }
  }
}

// ── Role-based Authorization ──
export function authorize(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendForbidden(res, `Role '${req.user.role}' does not have access to this resource`);
      return;
    }

    next();
  };
}

// ── Optional auth (doesn't fail if no token) ──
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      req.user = jwt.verify(token, env.jwt.secret) as AuthUser;
    } catch {
      // Ignore invalid tokens for optional auth
    }
  }

  next();
}
