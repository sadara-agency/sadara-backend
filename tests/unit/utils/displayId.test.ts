jest.mock('@config/database', () => ({
  sequelize: { query: jest.fn() },
}));

import { sequelize } from '@config/database';
import { generateDisplayId } from '../../../src/shared/utils/displayId';

const mockQuery = (sequelize as any).query as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('generateDisplayId', () => {
  it('throws for an unknown entity', async () => {
    await expect(generateDisplayId('unknown_entity')).rejects.toThrow(
      'Unknown entity for display ID: unknown_entity',
    );
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns a correctly-formatted display ID for a known entity', async () => {
    mockQuery.mockResolvedValue([{ next_val: 42 }]);
    const id = await generateDisplayId('players');
    // Format: PREFIX-YY-NNNN
    expect(id).toMatch(/^P-\d{2}-\d{4}$/);
  });

  it('zero-pads the sequence number to 4 digits', async () => {
    mockQuery.mockResolvedValue([{ next_val: 1 }]);
    const id = await generateDisplayId('contracts');
    const parts = id.split('-');
    expect(parts[2]).toBe('0001');
  });

  it('does not pad a sequence number that already fills 4 digits', async () => {
    mockQuery.mockResolvedValue([{ next_val: 1234 }]);
    const id = await generateDisplayId('offers');
    const parts = id.split('-');
    expect(parts[2]).toBe('1234');
  });

  it('uses the correct prefix for each entity', async () => {
    mockQuery.mockResolvedValue([{ next_val: 1 }]);
    const cases: [string, string][] = [
      ['players', 'P'],
      ['contracts', 'CON'],
      ['offers', 'OFR'],
      ['matches', 'MTH'],
      ['referrals', 'TKT'],
      ['invoices', 'INV'],
      ['sessions', 'SES'],
      ['tickets', 'TCK'],
      ['tasks', 'TSK'],
      ['injuries', 'INJ'],
    ];
    for (const [entity, prefix] of cases) {
      const id = await generateDisplayId(entity);
      expect(id.startsWith(`${prefix}-`)).toBe(true);
    }
  });
});
