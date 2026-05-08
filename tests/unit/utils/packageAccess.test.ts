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

    it('should return FULL for Package A+ on any module', () => {
      const access = getPackageAccess('A+', 'scouting');
      expect(access.canCreate).toBe(true);
      expect(access.canRead).toBe(true);
      expect(access.canUpdate).toBe(true);
      expect(access.canDelete).toBe(true);
    });

    it('should return FULL for Package A even on unknown modules', () => {
      const access = getPackageAccess('A', 'nonexistent_module');
      expect(access.canCreate).toBe(true);
    });

    it('should return configured access for Package B+', () => {
      const sessions = getPackageAccess('B+', 'sessions');
      expect(sessions.canCreate).toBe(true);
      expect(sessions.canRead).toBe(true);

      const contracts = getPackageAccess('B+', 'contracts');
      expect(contracts.canCreate).toBe(false);
      expect(contracts.canRead).toBe(true);
    });

    it('should return NONE for Package B on sessions (foundational floor)', () => {
      const sessions = getPackageAccess('B', 'sessions');
      expect(sessions.canCreate).toBe(false);
      expect(sessions.canRead).toBe(false);
    });

    it('should return configured access for Package B', () => {
      const players = getPackageAccess('B', 'players');
      expect(players.canCreate).toBe(true);
      expect(players.canRead).toBe(true);

      const contracts = getPackageAccess('B', 'contracts');
      expect(contracts.canCreate).toBe(false);
      expect(contracts.canRead).toBe(true);
    });
  });

  describe('isModuleAllowed', () => {
    it('should allow any action for Package A', () => {
      expect(isModuleAllowed('A', 'finance', 'create')).toBe(true);
      expect(isModuleAllowed('A', 'finance', 'read')).toBe(true);
      expect(isModuleAllowed('A', 'finance', 'delete')).toBe(true);
    });

    it('should allow any action for Package A+', () => {
      expect(isModuleAllowed('A+', 'finance', 'create')).toBe(true);
      expect(isModuleAllowed('A+', 'scouting', 'delete')).toBe(true);
    });

    it('should allow read-only for Package B on contracts', () => {
      expect(isModuleAllowed('B', 'contracts', 'read')).toBe(true);
      expect(isModuleAllowed('B', 'contracts', 'create')).toBe(false);
      expect(isModuleAllowed('B', 'contracts', 'update')).toBe(false);
    });

    it('should deny Package B from sessions', () => {
      expect(isModuleAllowed('B', 'sessions', 'read')).toBe(false);
      expect(isModuleAllowed('B', 'sessions', 'create')).toBe(false);
    });

    it('should allow Package B+ to create sessions', () => {
      expect(isModuleAllowed('B+', 'sessions', 'create')).toBe(true);
      expect(isModuleAllowed('B+', 'sessions', 'read')).toBe(true);
    });

    it('should allow messaging for all packages', () => {
      expect(isModuleAllowed('A', 'messaging', 'create')).toBe(true);
      expect(isModuleAllowed('B+', 'messaging', 'create')).toBe(true);
      expect(isModuleAllowed('B', 'messaging', 'create')).toBe(true);
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

    it('should return limited modules for Package B (foundational floor)', () => {
      const map = getFullAccessMap('B');
      expect(map.players?.canRead).toBe(true);
      expect(map.sessions).toBeUndefined();
    });

    it('should return more modules for Package B+ than B', () => {
      const mapBPlus = getFullAccessMap('B+');
      const mapB = getFullAccessMap('B');
      expect(Object.keys(mapBPlus).length).toBeGreaterThan(Object.keys(mapB).length);
    });
  });
});
