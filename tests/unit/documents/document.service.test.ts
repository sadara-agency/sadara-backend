/// <reference types="jest" />
import { mockDocument, mockModelInstance } from '../../setup/test-helpers';

const mockDocFindAndCountAll = jest.fn();
const mockDocFindByPk = jest.fn();
const mockDocCreate = jest.fn();

const mockPlayerFindByPk = jest.fn();
const mockContractFindByPk = jest.fn();
const mockMatchFindByPk = jest.fn();
const mockInjuryFindByPk = jest.fn();
const mockClubFindByPk = jest.fn();
const mockOfferFindByPk = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: { query: jest.fn(), authenticate: jest.fn() },
}));

jest.mock('../../../src/modules/documents/document.model', () => ({
  Document: {
    findAndCountAll: (...a: unknown[]) => mockDocFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockDocFindByPk(...a),
    create: (...a: unknown[]) => mockDocCreate(...a),
  },
  DocumentEntityType: {},
}));

jest.mock('../../../src/modules/players/player.model', () => ({
  Player: { findByPk: (...a: unknown[]) => mockPlayerFindByPk(...a), name: 'Player' },
}));
jest.mock('../../../src/modules/contracts/contract.model', () => ({
  Contract: { findByPk: (...a: unknown[]) => mockContractFindByPk(...a), name: 'Contract' },
}));
jest.mock('../../../src/modules/matches/match.model', () => ({
  Match: { findByPk: (...a: unknown[]) => mockMatchFindByPk(...a), name: 'Match' },
}));
jest.mock('../../../src/modules/injuries/injury.model', () => ({
  Injury: { findByPk: (...a: unknown[]) => mockInjuryFindByPk(...a), name: 'Injury' },
}));
jest.mock('../../../src/modules/clubs/club.model', () => ({
  Club: { findByPk: (...a: unknown[]) => mockClubFindByPk(...a), name: 'Club' },
}));
jest.mock('../../../src/modules/offers/offer.model', () => ({
  Offer: { findByPk: (...a: unknown[]) => mockOfferFindByPk(...a), name: 'Offer' },
}));
jest.mock('../../../src/modules/Users/user.model', () => ({
  User: { name: 'User' },
}));
jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/modules/permissions/permission.service', () => ({
  hasPermission: jest.fn().mockResolvedValue(true),
  loadPermissions: jest.fn(),
  getPermissions: jest.fn().mockResolvedValue({}),
}));

import * as docService from '../../../src/modules/documents/document.service';

describe('Document Service', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('listDocuments', () => {
    it('should return paginated documents', async () => {
      mockDocFindAndCountAll.mockResolvedValue({ count: 1, rows: [mockModelInstance(mockDocument())] });
      const result = await docService.listDocuments({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by type', async () => {
      mockDocFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await docService.listDocuments({ type: 'Contract', page: 1, limit: 10 });
      expect(mockDocFindAndCountAll).toHaveBeenCalled();
    });

    it('should filter by entityType and entityId', async () => {
      mockDocFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await docService.listDocuments({ entityType: 'Player', entityId: 'player-001', page: 1, limit: 10 });
      expect(mockDocFindAndCountAll).toHaveBeenCalled();
    });

    it('should apply search', async () => {
      mockDocFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await docService.listDocuments({ search: 'passport', page: 1, limit: 10 });
      expect(mockDocFindAndCountAll).toHaveBeenCalled();
    });
  });

  describe('getDocumentById', () => {
    it('should return document', async () => {
      mockDocFindByPk.mockResolvedValue(mockModelInstance(mockDocument()));
      const result = await docService.getDocumentById('doc-001');
      expect(result).toBeDefined();
    });

    it('should throw 404 if not found', async () => {
      mockDocFindByPk.mockResolvedValue(null);
      await expect(docService.getDocumentById('bad')).rejects.toThrow('Document not found');
    });
  });

  describe('resolveEntityLabel', () => {
    it('should resolve Player label', async () => {
      mockPlayerFindByPk.mockResolvedValue({ getDataValue: (k: string) => k === 'firstName' ? 'Ahmed' : 'Ali' });
      const label = await docService.resolveEntityLabel('Player' as any, 'player-001');
      expect(label).toBe('Ahmed Ali');
    });

    it('should resolve Club label', async () => {
      mockClubFindByPk.mockResolvedValue({ getDataValue: () => 'Al Hilal' });
      const label = await docService.resolveEntityLabel('Club' as any, 'club-001');
      expect(label).toBe('Al Hilal');
    });

    it('should return null if entity not found', async () => {
      mockPlayerFindByPk.mockResolvedValue(null);
      const label = await docService.resolveEntityLabel('Player' as any, 'bad');
      expect(label).toBeNull();
    });

    it('should resolve Contract label', async () => {
      mockContractFindByPk.mockResolvedValue({ getDataValue: (k: string) => k === 'contractType' ? 'Professional' : 'contract-001' });
      const label = await docService.resolveEntityLabel('Contract' as any, 'contract-001');
      expect(label).toContain('Professional');
    });

    it('should resolve Injury label', async () => {
      mockInjuryFindByPk.mockResolvedValue({ getDataValue: (k: string) => k === 'injuryType' ? 'ACL Tear' : 'Knee' });
      const label = await docService.resolveEntityLabel('Injury' as any, 'inj-001');
      expect(label).toBe('ACL Tear - Knee');
    });

    it('should resolve Offer label', async () => {
      mockOfferFindByPk.mockResolvedValue({ getDataValue: (k: string) => k === 'offerType' ? 'Transfer' : 'offer-001' });
      const label = await docService.resolveEntityLabel('Offer' as any, 'offer-001');
      expect(label).toContain('Transfer Offer');
    });
  });

  describe('createDocument', () => {
    it('should create document without entity link', async () => {
      const created = mockModelInstance(mockDocument());
      mockDocCreate.mockResolvedValue(created);
      mockDocFindByPk.mockResolvedValue(created);
      const result = await docService.createDocument({ name: 'Test Doc', type: 'Other' }, 'user-001');
      expect(result).toBeDefined();
      expect(mockDocCreate).toHaveBeenCalled();
    });

    it('should create document with entity link and resolve label', async () => {
      const created = mockModelInstance(mockDocument());
      mockDocCreate.mockResolvedValue(created);
      mockDocFindByPk.mockResolvedValue(created);
      mockPlayerFindByPk.mockResolvedValue({ getDataValue: (k: string) => k === 'firstName' ? 'Ahmed' : 'Ali', id: 'player-001' });
      const result = await docService.createDocument({ name: 'Passport', type: 'ID', entityType: 'Player', entityId: 'player-001' }, 'user-001');
      expect(result).toBeDefined();
    });

    it('should throw 404 if linked entity not found', async () => {
      mockPlayerFindByPk.mockResolvedValue(null);
      await expect(docService.createDocument({ name: 'Doc', entityType: 'Player', entityId: 'bad' }, 'user-001')).rejects.toThrow('Player not found');
    });
  });

  describe('updateDocument', () => {
    it('should update document', async () => {
      const doc = mockModelInstance(mockDocument());
      mockDocFindByPk.mockResolvedValue(doc);
      await docService.updateDocument('doc-001', { name: 'Updated' });
      expect(doc.update).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockDocFindByPk.mockResolvedValue(null);
      await expect(docService.updateDocument('bad', { name: 'x' })).rejects.toThrow('Document not found');
    });

    it('should validate entity on link change', async () => {
      const doc = mockModelInstance(mockDocument());
      mockDocFindByPk.mockResolvedValue(doc);
      mockPlayerFindByPk.mockResolvedValue(null);
      await expect(docService.updateDocument('doc-001', { entityType: 'Player', entityId: 'bad' })).rejects.toThrow('Player not found');
    });
  });

  describe('deleteDocument', () => {
    it('should delete document', async () => {
      const doc = mockModelInstance(mockDocument());
      mockDocFindByPk.mockResolvedValue(doc);
      const result = await docService.deleteDocument('doc-001');
      expect(doc.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'doc-001' });
    });

    it('should throw 404 if not found', async () => {
      mockDocFindByPk.mockResolvedValue(null);
      await expect(docService.deleteDocument('bad')).rejects.toThrow('Document not found');
    });
  });
});
