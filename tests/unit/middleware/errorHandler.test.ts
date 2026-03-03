import { Request, Response, NextFunction } from 'express';
import { AppError, errorHandler, asyncHandler } from '../../../src/middleware/errorHandler';

function createMocks() {
  const req = { path: '/test', method: 'GET', body: {} } as unknown as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  const next: NextFunction = jest.fn();
  return { req, res, next };
}

describe('AppError', () => {
  it('should create an operational error with status code', () => {
    const err = new AppError('Not found', 404);
    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
    expect(err.isOperational).toBe(true);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('should default to 400 and operational', () => {
    const err = new AppError('Bad');
    expect(err.statusCode).toBe(400);
    expect(err.isOperational).toBe(true);
  });
});

describe('errorHandler', () => {
  it('should handle AppError with its status code', () => {
    const { req, res, next } = createMocks();
    const err = new AppError('Forbidden', 403);
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Forbidden' });
  });

  it('should handle generic Error with 500', () => {
    const { req, res, next } = createMocks();
    errorHandler(new Error('unexpected'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Internal server error' }),
    );
  });
});

describe('asyncHandler', () => {
  it('should call the wrapped function', async () => {
    const fn = jest.fn().mockResolvedValue(undefined);
    const { req, res, next } = createMocks();
    const handler = asyncHandler(fn);
    await handler(req, res, next);
    expect(fn).toHaveBeenCalledWith(req, res, next);
  });

  it('should pass rejected errors to next', async () => {
    const error = new Error('async fail');
    const fn = jest.fn().mockRejectedValue(error);
    const { req, res, next } = createMocks();
    const handler = asyncHandler(fn);
    await handler(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});
