import { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";
import { env } from "@config/env";
import { logger } from "@config/logger";
import { translateKey } from "@config/i18n";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  /** Optional structured error detail (e.g. field-level validation errors) */
  errorDetail?: string | { field: string; message: string }[];
  /** Optional stable error code clients can branch on (e.g. "EMAIL_NOT_VERIFIED") */
  code?: string;
  /** i18n key for bilingual error responses (e.g. "errors:notFound") */
  i18nKey?: string;
  /** Interpolation params for the i18n key (e.g. { entity: "Player" }) */
  i18nParams?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode = 400,
    isOperational = true,
    code?: string,
    i18nKey?: string,
    i18nParams?: Record<string, unknown>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.i18nKey = i18nKey;
    this.i18nParams = i18nParams;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /** Factory for errors with a bilingual i18n key. */
  static localized(
    message: string,
    statusCode: number,
    i18nKey: string,
    i18nParams?: Record<string, unknown>,
  ): AppError {
    return new AppError(
      message,
      statusCode,
      true,
      undefined,
      i18nKey,
      i18nParams,
    );
  }

  /** Create a validation error with field-level detail matching Zod middleware format */
  static validation(
    fieldErrors: { field: string; message: string }[],
  ): AppError {
    const err = new AppError("Validation failed", 422);
    err.errorDetail = fieldErrors;
    return err;
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Guard against double-sends: if a response was already committed, log and abort.
  if (res.headersSent) {
    logger.error("Error after response already sent", {
      message: err.message,
      path: req.path,
      method: req.method,
    });
    return;
  }

  if (err instanceof AppError) {
    // Operational errors — expected, log at warn level
    logger.warn("Operational error", {
      status: err.statusCode,
      message: err.message,
      path: req.path,
      method: req.method,
    });

    // Include Arabic translation when client requests AR and the error has an i18n key
    const reqLocale = (req as any).locale as string | undefined;
    const messageAr =
      err.i18nKey && reqLocale === "ar"
        ? translateKey(err.i18nKey, "ar", err.i18nParams)
        : undefined;

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(messageAr && { messageAr }),
      ...(err.code && { code: err.code }),
      ...(err.errorDetail && { error: err.errorDetail }),
    });
    return;
  }

  // Unexpected errors — log full stack at error level
  logger.error("Unexpected error", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: env.nodeEnv === "development" ? req.body : undefined,
  });

  Sentry.captureException(err, {
    extra: { path: req.path, method: req.method },
  });

  res.status(500).json({
    success: false,
    message: "Internal server error",
    // Only expose details in development
    ...(env.nodeEnv === "development" && {
      error: err.message,
      stack: err.stack,
    }),
  });
}

// Catch async errors automatically
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
