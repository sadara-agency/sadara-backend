import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../shared/utils/apiResponse';
import { logger } from '../config/logger'; 

type ValidationTarget = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = schema.parse(req[target]);

      (req as any)[target] = data;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));

        logger.warn('Validation failed', {
          target,
          path: req.path,
          errors,
        });

        sendError(res, 'Validation failed', 422, JSON.stringify(errors));
        return;
      }

      // Non-Zod errors bubble up to the global error handler
      next(err);
    }
  };
}
