jest.mock('@config/database', () => ({
  sequelize: {
    query: jest.fn(),
  },
}));

jest.mock('@shared/utils/verifyRole', () => ({
  verifyUserRole: jest.fn(),
}));

import { sequelize } from '@config/database';
import {
  getAssignedPlayerIds,
  isBypassRole,
} from '../../../src/shared/utils/rowScope';

const mockQuery = (sequelize as any).query as jest.Mock;

describe('rowScope helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isBypassRole', () => {
    it('is true for Admin / Manager / Executive / SportingDirector', () => {
      for (const r of ['Admin', 'Manager', 'Executive', 'SportingDirector']) {
        expect(isBypassRole(r)).toBe(true);
      }
    });

    it('is false for ordinary staff roles', () => {
      for (const r of ['Coach', 'NutritionSpecialist', 'Analyst', 'Scout']) {
        expect(isBypassRole(r)).toBe(false);
      }
    });
  });

  describe('getAssignedPlayerIds', () => {
    it('returns working-group assignment player IDs for a coach', async () => {
      mockQuery.mockResolvedValueOnce([
        { player_id: 'p-1' },
        { player_id: 'p-2' },
      ]);

      const ids = await getAssignedPlayerIds({ id: 'coach-1', role: 'Coach' } as any);

      expect(ids.sort()).toEqual(['p-1', 'p-2']);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('unions analyst_id players for an Analyst', async () => {
      mockQuery
        .mockResolvedValueOnce([{ player_id: 'p-1' }]) // assignments
        .mockResolvedValueOnce([{ id: 'p-2' }, { id: 'p-1' }]); // analyst_id

      const ids = await getAssignedPlayerIds({ id: 'an-1', role: 'Analyst' } as any);

      expect(ids.sort()).toEqual(['p-1', 'p-2']);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('returns an empty array when the user has no assignments', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const ids = await getAssignedPlayerIds({ id: 'coach-2', role: 'GymCoach' } as any);

      expect(ids).toEqual([]);
    });
  });
});
