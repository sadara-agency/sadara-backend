import { Response, NextFunction } from 'express';
import { authorizePlayerPackage } from '../../../src/middleware/packageAccess';

// Mock dependencies
jest.mock('../../../src/modules/players/player.model', () => ({
  Player: {
    findByPk: jest.fn(),
  },
}));

jest.mock('../../../src/shared/utils/cache', () => ({
  cacheOrFetch: jest.fn((_key: string, fn: () => Promise<unknown>) => fn()),
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

import { Player } from '../../../src/modules/players/player.model';

const mockRes = () => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis() as any,
    json: jest.fn().mockReturnThis() as any,
  };
  return res as Response;
};

describe('authorizePlayerPackage middleware', () => {
  const next: NextFunction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call next() when no playerId in request', async () => {
    const req = { params: {}, body: {}, user: {} } as any;
    const res = mockRes();
    const mw = authorizePlayerPackage('sessions', 'create');
    await mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should call next() when player not found', async () => {
    (Player.findByPk as jest.Mock).mockResolvedValue(null);
    const req = { params: { playerId: 'abc' }, body: {}, user: {} } as any;
    const res = mockRes();
    const mw = authorizePlayerPackage('sessions', 'create');
    await mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should allow Package A on any module', async () => {
    (Player.findByPk as jest.Mock).mockResolvedValue({ playerPackage: 'A' });
    const req = { params: { playerId: 'abc' }, body: {}, user: {} } as any;
    const res = mockRes();
    const mw = authorizePlayerPackage('scouting', 'create');
    await mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should deny Package C from sessions', async () => {
    (Player.findByPk as jest.Mock).mockResolvedValue({ playerPackage: 'C' });
    const req = { params: { playerId: 'abc' }, body: {}, user: {} } as any;
    const res = mockRes();
    const mw = authorizePlayerPackage('sessions', 'create');
    await mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should extract playerId from body', async () => {
    (Player.findByPk as jest.Mock).mockResolvedValue({ playerPackage: 'A' });
    const req = { params: {}, body: { playerId: 'xyz' }, user: {} } as any;
    const res = mockRes();
    const mw = authorizePlayerPackage('sessions', 'create');
    await mw(req, res, next);
    expect(Player.findByPk).toHaveBeenCalledWith('xyz', expect.anything());
    expect(next).toHaveBeenCalled();
  });

  it('should allow Package B to read wellness', async () => {
    (Player.findByPk as jest.Mock).mockResolvedValue({ playerPackage: 'B' });
    const req = { params: { playerId: 'abc' }, body: {}, user: {} } as any;
    const res = mockRes();
    const mw = authorizePlayerPackage('wellness', 'read');
    await mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
