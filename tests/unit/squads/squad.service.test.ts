/// <reference types="jest" />
// ─────────────────────────────────────────────────────────────
// tests/unit/squads/squad.service.test.ts
// Unit tests for the squads module's service layer (Phase 2 of
// the SAFF Club/Squad refactor). Mocks Squad + Club Sequelize
// models — covers happy paths plus the 404 branch and the
// composeDisplayName logic for the senior/premier default case.
// ─────────────────────────────────────────────────────────────
import { mockClub, mockModelInstance } from '../../setup/test-helpers';

const mockSquadFindOne = jest.fn();
const mockSquadFindByPk = jest.fn();
const mockSquadFindAll = jest.fn();
const mockSquadFindAndCountAll = jest.fn();
const mockSquadCreate = jest.fn();
const mockClubFindByPk = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: {
    query: jest.fn().mockResolvedValue([]),
    authenticate: jest.fn(),
  },
}));

jest.mock('../../../src/modules/squads/squad.model', () => ({
  Squad: {
    findOne: (...a: unknown[]) => mockSquadFindOne(...a),
    findByPk: (...a: unknown[]) => mockSquadFindByPk(...a),
    findAll: (...a: unknown[]) => mockSquadFindAll(...a),
    findAndCountAll: (...a: unknown[]) => mockSquadFindAndCountAll(...a),
    create: (...a: unknown[]) => mockSquadCreate(...a),
  },
  SQUAD_AGE_CATEGORIES: [
    'senior', 'u23', 'u21', 'u20', 'u19', 'u17', 'u15', 'u13',
  ],
}));

jest.mock('../../../src/modules/clubs/club.model', () => ({
  Club: {
    findByPk: (...a: unknown[]) => mockClubFindByPk(...a),
  },
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as squadService from '../../../src/modules/squads/squad.service';
import { AppError } from '../../../src/middleware/errorHandler';

const sampleSquad = {
  id: 'squad-001',
  clubId: 'club-001',
  ageCategory: 'senior' as const,
  division: 'premier',
  displayName: 'Al-Hilal',
  displayNameAr: 'الهلال',
  isActive: true,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ════════════════════════════════════════════════════════
// findOrCreateSquad
// ════════════════════════════════════════════════════════
describe('findOrCreateSquad', () => {
  it('returns the existing squad without creating when one matches', async () => {
    const existing = mockModelInstance(sampleSquad);
    mockSquadFindOne.mockResolvedValue(existing);

    const [result, wasCreated] = await squadService.findOrCreateSquad('club-001', {
      ageCategory: 'senior',
      division: 'premier',
    });

    expect(result).toBe(existing);
    expect(wasCreated).toBe(false);
    expect(mockSquadCreate).not.toHaveBeenCalled();
    expect(mockClubFindByPk).not.toHaveBeenCalled();
  });

  it('creates a new squad with the club name as default display name', async () => {
    mockSquadFindOne.mockResolvedValue(null);
    mockClubFindByPk.mockResolvedValue(mockModelInstance(mockClub()));
    mockSquadCreate.mockImplementation(async (data: Record<string, unknown>) =>
      mockModelInstance({ id: 'new-id', ...data }),
    );

    const [result, wasCreated] = await squadService.findOrCreateSquad('club-001', {
      ageCategory: 'senior',
      division: 'premier',
    });

    expect(wasCreated).toBe(true);
    expect(mockSquadCreate).toHaveBeenCalledTimes(1);
    const payload = mockSquadCreate.mock.calls[0][0];
    expect(payload).toMatchObject({
      clubId: 'club-001',
      ageCategory: 'senior',
      division: 'premier',
      displayName: 'Al-Hilal',
      displayNameAr: 'الهلال',
      isActive: true,
    });
    expect(result.id).toBe('new-id');
  });

  it('appends category + division qualifiers for non-default squads', async () => {
    mockSquadFindOne.mockResolvedValue(null);
    mockClubFindByPk.mockResolvedValue(mockModelInstance(mockClub()));
    mockSquadCreate.mockImplementation(async (data: Record<string, unknown>) =>
      mockModelInstance({ id: 'new-id', ...data }),
    );

    const [, ] = await squadService.findOrCreateSquad('club-001', {
      ageCategory: 'u17',
      division: '1st-division',
    });

    const payload = mockSquadCreate.mock.calls[0][0];
    expect(payload.displayName).toBe('Al-Hilal U-17 1st Division');
    expect(payload.displayNameAr).toBe('الهلال تحت 17 الدرجة الأولى');
  });

  it('throws 404 when the parent club does not exist', async () => {
    mockSquadFindOne.mockResolvedValue(null);
    mockClubFindByPk.mockResolvedValue(null);

    await expect(
      squadService.findOrCreateSquad('club-missing', {
        ageCategory: 'senior',
        division: 'premier',
      }),
    ).rejects.toBeInstanceOf(AppError);
    expect(mockSquadCreate).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════
// getByContext
// ════════════════════════════════════════════════════════
describe('getByContext', () => {
  it('returns the squad when one matches', async () => {
    const squad = mockModelInstance(sampleSquad);
    mockSquadFindOne.mockResolvedValue(squad);

    const result = await squadService.getByContext('club-001', {
      ageCategory: 'senior',
      division: 'premier',
    });

    expect(result).toBe(squad);
  });

  it('throws 404 when no squad matches the context', async () => {
    mockSquadFindOne.mockResolvedValue(null);

    await expect(
      squadService.getByContext('club-001', {
        ageCategory: 'u17',
        division: '1st-division',
      }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

// ════════════════════════════════════════════════════════
// getSquadById
// ════════════════════════════════════════════════════════
describe('getSquadById', () => {
  it('returns the squad when found', async () => {
    const squad = mockModelInstance(sampleSquad);
    mockSquadFindByPk.mockResolvedValue(squad);

    const result = await squadService.getSquadById('squad-001');
    expect(result).toBe(squad);
  });

  it('throws 404 when not found', async () => {
    mockSquadFindByPk.mockResolvedValue(null);
    await expect(squadService.getSquadById('squad-missing')).rejects.toBeInstanceOf(
      AppError,
    );
  });
});

// ════════════════════════════════════════════════════════
// listByClub
// ════════════════════════════════════════════════════════
describe('listByClub', () => {
  it('queries squads scoped to the given club, ordered by category then division', async () => {
    const rows = [mockModelInstance(sampleSquad)];
    mockSquadFindAll.mockResolvedValue(rows);

    const result = await squadService.listByClub('club-001');

    expect(result).toBe(rows);
    expect(mockSquadFindAll).toHaveBeenCalledWith({
      where: { clubId: 'club-001' },
      order: [
        ['ageCategory', 'ASC'],
        ['division', 'ASC'],
      ],
    });
  });
});

// ════════════════════════════════════════════════════════
// listSquads
// ════════════════════════════════════════════════════════
describe('listSquads', () => {
  it('returns paginated rows with meta', async () => {
    mockSquadFindAndCountAll.mockResolvedValue({
      count: 1,
      rows: [mockModelInstance(sampleSquad)],
    });

    const result = await squadService.listSquads({
      page: 1,
      limit: 10,
      sort: 'display_name',
      order: 'asc',
    } as never);

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.meta.totalPages).toBe(1);
  });

  it('applies clubId and ageCategory filters', async () => {
    mockSquadFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await squadService.listSquads({
      page: 1,
      limit: 10,
      sort: 'display_name',
      order: 'asc',
      clubId: 'club-001',
      ageCategory: 'u17',
    } as never);

    expect(mockSquadFindAndCountAll).toHaveBeenCalledTimes(1);
    const args = mockSquadFindAndCountAll.mock.calls[0][0];
    expect(args.where).toMatchObject({ clubId: 'club-001', ageCategory: 'u17' });
  });
});
