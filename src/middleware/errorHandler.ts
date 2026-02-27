import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { logger } from '../config/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode = 400, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    // Operational errors — expected, log at warn level
    logger.warn('Operational error', {
      status: err.statusCode,
      message: err.message,
      path: req.path,
      method: req.method,
    });

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Unexpected errors — log full stack at error level
  logger.error('Unexpected error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: env.nodeEnv === 'development' ? req.body : undefined,
  });

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    // Only expose details in development
    ...(env.nodeEnv === 'development' && {
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
