const mockFindAll = jest.fn();
const mockFindOne = jest.fn();
const mockUpsert = jest.fn();
const mockMatchFindAll = jest.fn();

jest.mock('../../../src/modules/playerStats/playerStats.model', () => ({
  __esModule: true,
  default: {
    findAll: (...a: unknown[]) => mockFindAll(...a),
    findOne: (...a: unknown[]) => mockFindOne(...a),
    upsert: (...a: unknown[]) => mockUpsert(...a),
  },
}));
jest.mock('../../../src/modules/matches/playerMatchStats.model', () => ({
  PlayerMatchStats: {
    findAll: (...a: unknown[]) => mockMatchFindAll(...a),
  },
}));
jest.mock('../../../src/middleware/errorHandler', () => ({
  AppError: class AppError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

import {
  getAllPlayerSeasonStats,
  getPlayerSeasonStats,
  upsertPlayerSeasonStats,
  recomputeFromMatches,
} from '../../../src/modules/playerStats/playerStats.service';

describe('playerStats.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindAll.mockResolvedValue([]);
    mockFindOne.mockResolvedValue(null);
    mockUpsert.mockResolvedValue([{}, true]);
    mockMatchFindAll.mockResolvedValue([]);
  });

  describe('getAllPlayerSeasonStats', () => {
    it('returns all season stats for a player', async () => {
      const stats = [{ id: 's1', playerId: 'p1', season: '2024/25' }];
      mockFindAll.mockResolvedValue(stats);

      const result = await getAllPlayerSeasonStats('p1');

      expect(mockFindAll).toHaveBeenCalledWith({
        where: { playerId: 'p1' },
        order: [['season', 'DESC']],
      });
      expect(result).toEqual(stats);
    });

    it('returns empty array when player has no stats', async () => {
      mockFindAll.mockResolvedValue([]);

      const result = await getAllPlayerSeasonStats('p-none');

      expect(result).toEqual([]);
    });
  });

  describe('getPlayerSeasonStats', () => {
    it('returns stats for a specific season', async () => {
      const record = { id: 's1', playerId: 'p1', season: '2024/25', goals: 10 };
      mockFindOne.mockResolvedValue(record);

      const result = await getPlayerSeasonStats('p1', '2024/25');

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { playerId: 'p1', season: '2024/25' },
      });
      expect(result).toEqual(record);
    });

    it('throws 404 when season stats not found', async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(getPlayerSeasonStats('p1', '2020/21')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Season stats not found',
      });
    });
  });

  describe('upsertPlayerSeasonStats', () => {
    it('upserts player season stats', async () => {
      const upserted = { id: 's1', playerId: 'p1', season: '2024/25', goals: 5 };
      mockUpsert.mockResolvedValue([upserted, true]);

      const result = await upsertPlayerSeasonStats('p1', '2024/25', { goals: 5 } as never);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ playerId: 'p1', season: '2024/25', goals: 5, source: 'manual' }),
        { returning: true, conflictFields: ['player_id', 'season'] },
      );
      expect(result).toEqual(upserted);
    });
  });

  describe('recomputeFromMatches', () => {
    it('skips recompute when record source is manual', async () => {
      mockFindOne.mockResolvedValue({ source: 'manual' });

      await recomputeFromMatches('p1', '2024/25');

      expect(mockMatchFindAll).not.toHaveBeenCalled();
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('skips upsert when no match rows found', async () => {
      mockFindOne.mockResolvedValue(null);
      mockMatchFindAll.mockResolvedValue([]);

      await recomputeFromMatches('p1', '2024/25');

      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('upserts computed stats from match rows', async () => {
      mockFindOne.mockResolvedValue(null);
      const matchRows = [
        { playerId: 'p1', goals: 2, assists: 1, minutesPlayed: 90, yellowCards: 0, redCards: 0,
          passesTotal: 50, passesCompleted: 40, cleanSheet: 0, saves: 0, goalsConceded: 1,
          interceptions: 3, keyPasses: 2, shotsOnTarget: 3, shotsTotal: 5, penaltiesSaved: 0 },
        { playerId: 'p1', goals: 1, assists: 2, minutesPlayed: 75, yellowCards: 1, redCards: 0,
          passesTotal: 40, passesCompleted: 30, cleanSheet: 0, saves: 0, goalsConceded: 0,
          interceptions: 1, keyPasses: 1, shotsOnTarget: 2, shotsTotal: 3, penaltiesSaved: 0 },
      ];
      mockMatchFindAll.mockResolvedValue(matchRows);

      await recomputeFromMatches('p1', '2024/25');

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: 'p1',
          season: '2024/25',
          source: 'computed',
          matchesPlayed: 2,
          goals: 3,
          assists: 3,
        }),
      );
    });
  });
});
