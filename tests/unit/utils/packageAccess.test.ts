import {
  getPackageAccess,
  isModuleAllowed,
  getFullAccessMap,
} from '../../../src/shared/utils/packageAccess';

describe('Package Access', () => {
  describe('getPackageAccess', () => {
    it('should return FULL for Package A on any module', () => {
      const access = getPackageAccess('A', 'scouting');
      expect(access.canCreate).toBe(true);
      expect(access.canRead).toBe(true);
      expect(access.canUpdate).toBe(true);
      expect(access.canDelete).toBe(true);
    });

    it('should return FULL for Package A even on unknown modules', () => {
      const access = getPackageAccess('A', 'nonexistent_module');
      expect(access.canCreate).toBe(true);
    });

    it('should return configured access for Package B', () => {
      const sessions = getPackageAccess('B', 'sessions');
      expect(sessions.canCreate).toBe(true);
      expect(sessions.canRead).toBe(true);

      const contracts = getPackageAccess('B', 'contracts');
      expect(contracts.canCreate).toBe(false);
      expect(contracts.canRead).toBe(true);
    });

    it('should return NONE for Package B on unallowed modules', () => {
      const scouting = getPackageAccess('B', 'scouting');
      expect(scouting.canCreate).toBe(false);
      expect(scouting.canRead).toBe(false);
    });

    it('should return configured access for Package C', () => {
      const players = getPackageAccess('C', 'players');
      expect(players.canCreate).toBe(true);
      expect(players.canRead).toBe(true);

      const contracts = getPackageAccess('C', 'contracts');
      expect(contracts.canCreate).toBe(false);
      expect(contracts.canRead).toBe(true);
    });

    it('should return NONE for Package C on unallowed modules', () => {
      const sessions = getPackageAccess('C', 'sessions');
      expect(sessions.canCreate).toBe(false);
      expect(sessions.canRead).toBe(false);
    });
  });

  describe('isModuleAllowed', () => {
    it('should allow any action for Package A', () => {
      expect(isModuleAllowed('A', 'finance', 'create')).toBe(true);
      expect(isModuleAllowed('A', 'finance', 'read')).toBe(true);
      expect(isModuleAllowed('A', 'finance', 'delete')).toBe(true);
    });

    it('should allow read-only for Package C on contracts', () => {
      expect(isModuleAllowed('C', 'contracts', 'read')).toBe(true);
      expect(isModuleAllowed('C', 'contracts', 'create')).toBe(false);
      expect(isModuleAllowed('C', 'contracts', 'update')).toBe(false);
    });

    it('should deny Package C from sessions', () => {
      expect(isModuleAllowed('C', 'sessions', 'read')).toBe(false);
      expect(isModuleAllowed('C', 'sessions', 'create')).toBe(false);
    });

    it('should allow Package B to create sessions', () => {
      expect(isModuleAllowed('B', 'sessions', 'create')).toBe(true);
      expect(isModuleAllowed('B', 'sessions', 'read')).toBe(true);
    });

    it('should allow messaging for all packages', () => {
      expect(isModuleAllowed('A', 'messaging', 'create')).toBe(true);
      expect(isModuleAllowed('B', 'messaging', 'create')).toBe(true);
      expect(isModuleAllowed('C', 'messaging', 'create')).toBe(true);
    });
  });

  describe('getFullAccessMap', () => {
    it('should return all modules as FULL for Package A', () => {
      const map = getFullAccessMap('A');
      expect(Object.keys(map).length).toBeGreaterThan(10);
      for (const m of Object.values(map)) {
        expect(m.canCreate).toBe(true);
        expect(m.canRead).toBe(true);
      }
    });

    it('should return limited modules for Package C', () => {
      const map = getFullAccessMap('C');
      expect(map.players?.canRead).toBe(true);
      expect(map.sessions).toBeUndefined();
    });

    it('should return more modules for Package B than C', () => {
      const mapB = getFullAccessMap('B');
      const mapC = getFullAccessMap('C');
      expect(Object.keys(mapB).length).toBeGreaterThan(Object.keys(mapC).length);
    });
  });
});
