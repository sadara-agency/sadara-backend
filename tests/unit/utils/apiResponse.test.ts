import { Response } from 'express';
import {
  sendSuccess,
  sendPaginated,
  sendCreated,
  sendError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
} from '../../../src/shared/utils/apiResponse';

function mockRes(): Response {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as Response;
}

describe('apiResponse utilities', () => {
  describe('sendSuccess', () => {
    it('should send 200 with data', () => {
      const res = mockRes();
      sendSuccess(res, { id: 1 }, 'OK');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1 }, message: 'OK' });
    });

    it('should use custom status code', () => {
      const res = mockRes();
      sendSuccess(res, null, undefined, 202);
      expect(res.status).toHaveBeenCalledWith(202);
    });
  });

  describe('sendPaginated', () => {
    it('should send paginated response with meta', () => {
      const res = mockRes();
      const meta = { page: 1, limit: 10, total: 50, totalPages: 5 };
      sendPaginated(res, [1, 2, 3], meta, 'Listed');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [1, 2, 3],
        meta,
        message: 'Listed',
      });
    });
  });

  describe('sendCreated', () => {
    it('should send 201 with default message', () => {
      const res = mockRes();
      sendCreated(res, { id: 'new' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: 'Created successfully' }),
      );
    });
  });

  describe('sendError', () => {
    it('should send error with custom status', () => {
      const res = mockRes();
      sendError(res, 'Bad request', 422, 'details');
      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Bad request',
        error: 'details',
      });
    });
  });

  describe('sendNotFound', () => {
    it('should send 404 with entity name', () => {
      const res = mockRes();
      sendNotFound(res, 'Player');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Player not found' }),
      );
    });

    it('should default to Resource', () => {
      const res = mockRes();
      sendNotFound(res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Resource not found' }),
      );
    });
  });

  describe('sendUnauthorized', () => {
    it('should send 401', () => {
      const res = mockRes();
      sendUnauthorized(res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Unauthorized' }),
      );
    });
  });

  describe('sendForbidden', () => {
    it('should send 403', () => {
      const res = mockRes();
      sendForbidden(res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Forbidden' }),
      );
    });
  });
});
