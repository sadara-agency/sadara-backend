import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../shared/utils/apiResponse';

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
        console.log('❌ Zod errors:', JSON.stringify(errors));
        console.log('❌ Payload:', JSON.stringify(req[target]));
        sendError(res, 'Validation failed', 422, JSON.stringify(errors));
    } else {
      next(err);
    }
  }
};
}
