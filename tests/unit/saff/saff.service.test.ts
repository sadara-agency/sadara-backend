/// <reference types="jest" />

const mockTournamentFindOrCreate = jest.fn();
const mockTournamentFindAndCountAll = jest.fn();
const mockTournamentFindAll = jest.fn();
const mockTournamentCount = jest.fn();

const mockStandingFindAndCountAll = jest.fn();
const mockStandingDestroy = jest.fn();
const mockStandingBulkCreate = jest.fn();
const mockStandingUpdate = jest.fn();
const mockStandingCount = jest.fn();

const mockFixtureFindAndCountAll = jest.fn();
const mockFixtureDestroy = jest.fn();
const mockFixtureBulkCreate = jest.fn();
const mockFixtureUpdate = jest.fn();
const mockFixtureCount = jest.fn();

const mockTeamMapFindAndCountAll = jest.fn();
const mockTeamMapFindOrCreate = jest.fn();
const mockTeamMapFindAll = jest.fn();
const mockTeamMapFindOne = jest.fn();
const mockTeamMapCount = jest.fn();

const mockClubFindByPk = jest.fn();
const mockClubFindOrCreate = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: {
    query: jest.fn(),
    authenticate: jest.fn(),
    transaction: jest.fn().mockResolvedValue({ commit: jest.fn(), rollback: jest.fn() }),
  },
}));

jest.mock('../../../src/modules/saff/saff.model', () => ({
  SaffTournament: {
    findOrCreate: (...a: unknown[]) => mockTournamentFindOrCreate(...a),
    findAndCountAll: (...a: unknown[]) => mockTournamentFindAndCountAll(...a),
    findAll: (...a: unknown[]) => mockTournamentFindAll(...a),
    count: (...a: unknown[]) => mockTournamentCount(...a),
  },
  SaffStanding: {
    findAndCountAll: (...a: unknown[]) => mockStandingFindAndCountAll(...a),
    destroy: (...a: unknown[]) => mockStandingDestroy(...a),
    bulkCreate: (...a: unknown[]) => mockStandingBulkCreate(...a),
    update: (...a: unknown[]) => mockStandingUpdate(...a),
    count: (...a: unknown[]) => mockStandingCount(...a),
  },
  SaffFixture: {
    findAndCountAll: (...a: unknown[]) => mockFixtureFindAndCountAll(...a),
    destroy: (...a: unknown[]) => mockFixtureDestroy(...a),
    bulkCreate: (...a: unknown[]) => mockFixtureBulkCreate(...a),
    update: (...a: unknown[]) => mockFixtureUpdate(...a),
    count: (...a: unknown[]) => mockFixtureCount(...a),
  },
  SaffTeamMap: {
    findAndCountAll: (...a: unknown[]) => mockTeamMapFindAndCountAll(...a),
    findOrCreate: (...a: unknown[]) => mockTeamMapFindOrCreate(...a),
    findAll: (...a: unknown[]) => mockTeamMapFindAll(...a),
    findOne: (...a: unknown[]) => mockTeamMapFindOne(...a),
    count: (...a: unknown[]) => mockTeamMapCount(...a),
  },
}));

jest.mock('../../../src/modules/clubs/club.model', () => ({
  Club: {
    findByPk: (...a: unknown[]) => mockClubFindByPk(...a),
    findOrCreate: (...a: unknown[]) => mockClubFindOrCreate(...a),
    name: 'Club',
  },
}));
jest.mock('../../../src/modules/matches/match.model', () => ({
  Match: { findOne: jest.fn(), create: jest.fn(), name: 'Match' },
}));
jest.mock('../../../src/modules/matches/matchPlayer.model', () => ({
  MatchPlayer: { findOrCreate: jest.fn(), findAll: jest.fn(), name: 'MatchPlayer' },
}));
jest.mock('../../../src/modules/players/player.model', () => ({
  Player: { findAll: jest.fn(), name: 'Player' },
}));
jest.mock('../../../src/modules/contracts/contract.model', () => ({
  Contract: { findAll: jest.fn(), name: 'Contract' },
}));
jest.mock('../../../src/modules/competitions/competition.model', () => ({
  Competition: { findOne: jest.fn(), create: jest.fn(), findOrCreate: jest.fn(), name: 'Competition' },
  ClubCompetition: { findOrCreate: jest.fn(), name: 'ClubCompetition' },
}));
jest.mock('../../../src/modules/scouting/scouting.model', () => ({
  Watchlist: { findAll: jest.fn(), name: 'Watchlist' },
}));
jest.mock('../../../src/modules/saff/saff.scraper', () => ({
  scrapeBatch: jest.fn(),
  scrapeTeamLogos: jest.fn(),
}));
jest.mock('../../../src/modules/saff/seasonSync.model', () => ({
  SeasonSync: { create: jest.fn(), findOne: jest.fn(), name: 'SeasonSync' },
}));
jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/modules/squads/squad.model', () => ({
  Squad: { findOne: jest.fn(), findAll: jest.fn(), create: jest.fn(), name: 'Squad' },
}));
jest.mock('../../../src/modules/squads/squadMembership.model', () => ({
  SquadMembership: { findOne: jest.fn(), findOrCreate: jest.fn(), create: jest.fn(), name: 'SquadMembership' },
}));
jest.mock('../../../src/modules/squads/squad.service', () => ({
  findOrCreateSquad: jest.fn().mockResolvedValue([{ id: 'squad-1', displayName: 'Al Hilal' }, true]),
  getByContext: jest.fn(),
}));
jest.mock('../../../src/modules/saffplus/playerReview.service', () => ({
  upsertPendingReview: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../../src/modules/matches/matchEvent.model', () => ({
  MatchEvent: { findAll: jest.fn(), bulkCreate: jest.fn(), destroy: jest.fn(), name: 'MatchEvent' },
}));
jest.mock('../../../src/modules/matches/matchMedia.model', () => ({
  MatchMedia: { findOrCreate: jest.fn(), findAll: jest.fn(), name: 'MatchMedia' },
}));
jest.mock('../../../src/modules/players/externalProvider.model', () => ({
  ExternalProviderMapping: { upsert: jest.fn(), findOne: jest.fn(), findAll: jest.fn(), name: 'ExternalProviderMapping' },
}));
jest.mock('../../../src/modules/players/playerClubHistory.model', () => ({
  PlayerClubHistory: { findOne: jest.fn(), create: jest.fn(), name: 'PlayerClubHistory' },
}));
jest.mock('../../../src/modules/player-coach-assignments/playerCoachAssignment.model', () => ({
  PlayerCoachAssignment: { findAll: jest.fn(), name: 'PlayerCoachAssignment' },
  default: { findAll: jest.fn(), name: 'PlayerCoachAssignment' },
}));
jest.mock('../../../src/modules/notifications/notification.service', () => ({
  notifyUser: jest.fn().mockResolvedValue(null),
  notifyByRole: jest.fn().mockResolvedValue(0),
  createNotification: jest.fn().mockResolvedValue(null),
}));

import * as saffService from '../../../src/modules/saff/saff.service';

describe('SAFF Service', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('seedTournaments', () => {
    it('should seed tournaments', async () => {
      mockTournamentFindOrCreate.mockResolvedValue([{}, true]);
      const count = await saffService.seedTournaments();
      expect(count).toBeGreaterThan(0);
    });

    it('should skip existing tournaments', async () => {
      // Existing-row update path was added in Phase 1 of the Club/Squad
      // refactor (backfills age_category/division/competition_type when the
      // curated JSON has stricter values than the column defaults). The mock
      // therefore needs `update`; defaults set to neutrals so the patch is
      // empty for most rows but valid for the few where curated values differ.
      mockTournamentFindOrCreate.mockResolvedValue([
        { ageCategory: 'senior', division: null, competitionType: 'league', isSupported: true, update: jest.fn() },
        false,
      ]);
      const count = await saffService.seedTournaments();
      expect(count).toBe(0);
    });
  });

  describe('listTournaments', () => {
    it('should return paginated tournaments', async () => {
      mockTournamentFindAndCountAll.mockResolvedValue({ count: 1, rows: [{ id: 't1', name: 'SPL' }] });
      const result = await saffService.listTournaments({ page: 1, limit: 10 } as any);
      expect(result.data).toHaveLength(1);
    });

    it('should filter by category', async () => {
      mockTournamentFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await saffService.listTournaments({ category: 'pro', page: 1, limit: 10 } as any);
      expect(mockTournamentFindAndCountAll).toHaveBeenCalled();
    });

    it('should apply search', async () => {
      mockTournamentFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await saffService.listTournaments({ search: 'Roshn', page: 1, limit: 10 } as any);
      expect(mockTournamentFindAndCountAll).toHaveBeenCalled();
    });
  });

  describe('listStandings', () => {
    it('should return paginated standings', async () => {
      mockStandingFindAndCountAll.mockResolvedValue({ count: 1, rows: [{ position: 1, teamNameEn: 'Al Hilal' }] });
      const result = await saffService.listStandings({ page: 1, limit: 20 } as any);
      expect(result.data).toHaveLength(1);
    });

    it('should filter by tournamentId', async () => {
      mockStandingFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await saffService.listStandings({ tournamentId: 't1', page: 1, limit: 20 } as any);
      expect(mockStandingFindAndCountAll).toHaveBeenCalled();
    });
  });

  describe('listFixtures', () => {
    it('should return paginated fixtures', async () => {
      mockFixtureFindAndCountAll.mockResolvedValue({ count: 1, rows: [{ matchDate: '2024-01-01' }] });
      const result = await saffService.listFixtures({ page: 1, limit: 20 } as any);
      expect(result.data).toHaveLength(1);
    });

    it('should filter by status', async () => {
      mockFixtureFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await saffService.listFixtures({ status: 'completed', page: 1, limit: 20 } as any);
      expect(mockFixtureFindAndCountAll).toHaveBeenCalled();
    });
  });

  describe('listTeamMaps', () => {
    it('should return team maps', async () => {
      mockTeamMapFindAndCountAll.mockResolvedValue({ count: 1, rows: [{ saffTeamId: 1 }] });
      const result = await saffService.listTeamMaps({ page: 1, limit: 20 } as any);
      expect(result.data).toHaveLength(1);
    });

    it('should filter unmapped only', async () => {
      mockTeamMapFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await saffService.listTeamMaps({ unmappedOnly: true, page: 1, limit: 20 } as any);
      expect(mockTeamMapFindAndCountAll).toHaveBeenCalled();
    });
  });

  describe('mapTeamToClub', () => {
    it('should map a SAFF team to a Sadara club', async () => {
      const club = { id: 'club-001', name: 'Al Hilal', nameAr: 'الهلال', saffTeamId: null, update: jest.fn().mockResolvedValue({}) };
      mockClubFindByPk.mockResolvedValue(club);
      const teamMap = { id: 'tm-001', update: jest.fn().mockResolvedValue({}) };
      mockTeamMapFindOrCreate.mockResolvedValue([teamMap, false]);
      mockStandingUpdate.mockResolvedValue([1]);
      mockFixtureUpdate.mockResolvedValue([1]);
      const result = await saffService.mapTeamToClub({ saffTeamId: 123, season: '2024-2025', clubId: 'club-001' } as any);
      expect(teamMap.update).toHaveBeenCalledWith({ clubId: 'club-001' }, expect.objectContaining({ transaction: expect.anything() }));
    });

    it('should throw 404 if club not found', async () => {
      mockClubFindByPk.mockResolvedValue(null);
      await expect(saffService.mapTeamToClub({ saffTeamId: 123, season: '2024-2025', clubId: 'bad' } as any)).rejects.toThrow('Club not found');
    });
  });

  describe('getStats', () => {
    it('should return stats summary', async () => {
      mockTournamentCount.mockResolvedValue(10);
      mockStandingCount.mockResolvedValue(100);
      mockFixtureCount.mockResolvedValue(200);
      mockTeamMapCount
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(5);
      const result = await saffService.getStats();
      expect(result).toHaveProperty('tournaments', 10);
      expect(result).toHaveProperty('standings', 100);
      expect(result).toHaveProperty('unmappedTeams', 5);
    });
  });
});
