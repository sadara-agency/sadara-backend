import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../../../src/middleware/validate';

function createMocks(data: { body?: any; query?: any; params?: any } = {}) {
  const req = {
    body: data.body ?? {},
    query: data.query ?? {},
    params: data.params ?? {},
    path: '/test',
  } as unknown as Request;

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  const next: NextFunction = jest.fn();
  return { req, res, next };
}

const schema = z.object({ name: z.string().min(1) });

describe('validate middleware', () => {
  it('should call next on valid body', () => {
    const { req, res, next } = createMocks({ body: { name: 'Test' } });
    validate(schema)(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ name: 'Test' });
  });

  it('should return 422 on invalid body', () => {
    const { req, res, next } = createMocks({ body: { name: '' } });
    validate(schema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });

  it('should validate query when target is query', () => {
    const { req, res, next } = createMocks({ query: { name: 'OK' } });
    validate(schema, 'query')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should call next(err) for non-Zod errors', () => {
    const badSchema = { parse: () => { throw new Error('boom'); } } as any;
    const { req, res, next } = createMocks({ body: {} });
    validate(badSchema)(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
