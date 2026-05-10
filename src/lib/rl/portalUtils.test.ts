import { describe, it, expect } from 'vitest';
import {
  findPortals,
  teleportThroughPortal,
  getPortalKey,
  decrementPortalCooldowns,
  withPortalCooldowns,
  isPortalOnCooldown,
} from './portalUtils';
import { createEmptyGrid } from './gridUtils';

describe('portalUtils', () => {
  describe('findPortals', () => {
    it('should find all portal positions', () => {
      const grid = createEmptyGrid(5);
      grid[0][0].type = 'portal';
      grid[2][2].type = 'portal';
      grid[4][4].type = 'portal';

      const portals = findPortals(grid);

      expect(portals).toHaveLength(3);
      expect(portals).toContainEqual({ x: 0, y: 0 });
      expect(portals).toContainEqual({ x: 2, y: 2 });
      expect(portals).toContainEqual({ x: 4, y: 4 });
    });

    it('should return empty array when no portals', () => {
      const grid = createEmptyGrid(5);

      const portals = findPortals(grid);

      expect(portals).toEqual([]);
    });

    it('should not find non-portal tiles', () => {
      const grid = createEmptyGrid(5);
      grid[0][0].type = 'reward';
      grid[1][1].type = 'obstacle';
      grid[2][2].type = 'punishment';

      const portals = findPortals(grid);

      expect(portals).toEqual([]);
    });
  });

  describe('teleportThroughPortal', () => {
    it('should teleport to another portal', () => {
      const grid = createEmptyGrid(5);
      grid[0][0].type = 'portal';
      grid[4][4].type = 'portal';

      const currentPos = { x: 0, y: 0 };
      const newPos = teleportThroughPortal(grid, currentPos);

      expect(newPos).not.toEqual(currentPos);
      expect(newPos).toEqual({ x: 4, y: 4 });
    });

    it('should stay at current position when less than 2 portals', () => {
      const grid = createEmptyGrid(5);
      grid[0][0].type = 'portal';

      const currentPos = { x: 0, y: 0 };
      const newPos = teleportThroughPortal(grid, currentPos);

      expect(newPos).toEqual(currentPos);
    });

    it('should stay at current position when no portals', () => {
      const grid = createEmptyGrid(5);

      const currentPos = { x: 2, y: 2 };
      const newPos = teleportThroughPortal(grid, currentPos);

      expect(newPos).toEqual(currentPos);
    });

    it('should not teleport to self', () => {
      const grid = createEmptyGrid(5);
      grid[0][0].type = 'portal';
      grid[2][2].type = 'portal';
      grid[4][4].type = 'portal';

      const currentPos = { x: 0, y: 0 };
      const newPos = teleportThroughPortal(grid, currentPos);

      expect(newPos).not.toEqual(currentPos);
      // Should be one of the other two portals
      expect(
        (newPos.x === 2 && newPos.y === 2) || (newPos.x === 4 && newPos.y === 4)
      ).toBe(true);
    });

    it('should randomly select from multiple portals', () => {
      const grid = createEmptyGrid(5);
      grid[0][0].type = 'portal';
      grid[2][2].type = 'portal';
      grid[4][4].type = 'portal';

      const currentPos = { x: 0, y: 0 };
      const positions = new Set<string>();

      // Run multiple times to check randomness
      for (let i = 0; i < 50; i++) {
        const newPos = teleportThroughPortal(grid, currentPos);
        positions.add(`${newPos.x},${newPos.y}`);
      }

      // Should visit both possible destinations
      expect(positions.size).toBeGreaterThan(1);
    });
  });

  describe('getPortalKey', () => {
    it('should generate correct key format', () => {
      const pos = { x: 3, y: 7 };
      const key = getPortalKey(pos);

      expect(key).toBe('3,7');
    });

    it('should generate unique keys for different positions', () => {
      const pos1 = { x: 0, y: 1 };
      const pos2 = { x: 1, y: 0 };

      const key1 = getPortalKey(pos1);
      const key2 = getPortalKey(pos2);

      expect(key1).not.toBe(key2);
    });

    it('should generate same key for same position', () => {
      const pos = { x: 5, y: 5 };

      const key1 = getPortalKey(pos);
      const key2 = getPortalKey(pos);

      expect(key1).toBe(key2);
    });
  });

  describe('decrementPortalCooldowns', () => {
    it('should decrement all cooldowns by 1', () => {
      const cooldowns = {
        '0,0': 3,
        '1,1': 2,
        '2,2': 5,
      };

      const result = decrementPortalCooldowns(cooldowns);

      expect(result['0,0']).toBe(2);
      expect(result['1,1']).toBe(1);
      expect(result['2,2']).toBe(4);
    });

    it('should remove cooldowns that reach 0 or below', () => {
      const cooldowns = {
        '0,0': 1,
        '1,1': 2,
      };

      const result = decrementPortalCooldowns(cooldowns);

      expect(result['0,0']).toBeUndefined();
      expect(result['1,1']).toBe(1);
    });

    it('should handle empty cooldowns object', () => {
      const result = decrementPortalCooldowns({});

      expect(result).toEqual({});
    });
  });

  describe('withPortalCooldowns', () => {
    it('should add cooldowns for provided positions', () => {
      const cooldowns = {};
      const positions = [{ x: 0, y: 0 }, { x: 1, y: 1 }];

      const result = withPortalCooldowns(cooldowns, positions, 4);

      expect(result['0,0']).toBe(4);
      expect(result['1,1']).toBe(4);
    });

    it('should use default duration when not specified', () => {
      const cooldowns = {};
      const positions = [{ x: 0, y: 0 }];

      const result = withPortalCooldowns(cooldowns, positions);

      expect(result['0,0']).toBe(4); // PORTAL_COOLDOWN_STEPS
    });

    it('should override existing cooldowns', () => {
      const cooldowns = { '0,0': 1 };
      const positions = [{ x: 0, y: 0 }];

      const result = withPortalCooldowns(cooldowns, positions, 5);

      expect(result['0,0']).toBe(5);
    });

    it('should preserve existing cooldowns for other positions', () => {
      const cooldowns = { '2,2': 3 };
      const positions = [{ x: 0, y: 0 }];

      const result = withPortalCooldowns(cooldowns, positions, 4);

      expect(result['0,0']).toBe(4);
      expect(result['2,2']).toBe(3);
    });

    it('should handle empty positions array', () => {
      const cooldowns = { '0,0': 3 };
      const result = withPortalCooldowns(cooldowns, []);

      expect(result).toEqual(cooldowns);
    });
  });

  describe('isPortalOnCooldown', () => {
    it('should return true when portal has cooldown', () => {
      const cooldowns = { '0,0': 3 };
      const pos = { x: 0, y: 0 };

      const result = isPortalOnCooldown(cooldowns, pos);

      expect(result).toBe(true);
    });

    it('should return false when portal has no cooldown', () => {
      const cooldowns = { '1,1': 3 };
      const pos = { x: 0, y: 0 };

      const result = isPortalOnCooldown(cooldowns, pos);

      expect(result).toBe(false);
    });

    it('should return false when cooldown is 0', () => {
      const cooldowns = { '0,0': 0 };
      const pos = { x: 0, y: 0 };

      const result = isPortalOnCooldown(cooldowns, pos);

      expect(result).toBe(false);
    });

    it('should return false when cooldowns object is empty', () => {
      const pos = { x: 0, y: 0 };

      const result = isPortalOnCooldown({}, pos);

      expect(result).toBe(false);
    });

    it('should handle negative cooldown values', () => {
      const cooldowns = { '0,0': -1 };
      const pos = { x: 0, y: 0 };

      const result = isPortalOnCooldown(cooldowns, pos);

      expect(result).toBe(false);
    });
  });
});
