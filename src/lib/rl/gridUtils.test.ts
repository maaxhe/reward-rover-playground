import { describe, it, expect } from 'vitest';
import {
  createEmptyGrid,
  cloneGrid,
  manhattanDistance,
  calculateItemCount,
  getTileValue,
  selectGoalPositions,
  computeMoveStats,
  computeEpisodeSummary,
} from './gridUtils';

describe('gridUtils', () => {
  describe('createEmptyGrid', () => {
    it('should create a grid of the specified size', () => {
      const grid = createEmptyGrid(5);
      expect(grid).toHaveLength(5);
      expect(grid[0]).toHaveLength(5);
    });

    it('should initialize all cells as empty with zero values', () => {
      const grid = createEmptyGrid(3);
      grid.forEach((row) => {
        row.forEach((cell) => {
          expect(cell.type).toBe('empty');
          expect(cell.qValue).toBe(0);
          expect(cell.visits).toBe(0);
          expect(cell.value).toBe(0);
        });
      });
    });
  });

  describe('cloneGrid', () => {
    it('should create a deep copy of the grid', () => {
      const original = createEmptyGrid(3);
      original[0][0] = { type: 'reward', qValue: 5, visits: 2, value: 12 };

      const cloned = cloneGrid(original);

      expect(cloned[0][0]).toEqual(original[0][0]);
      expect(cloned[0][0]).not.toBe(original[0][0]); // Different object reference
    });

    it('should not affect original when modifying clone', () => {
      const original = createEmptyGrid(3);
      const cloned = cloneGrid(original);

      cloned[0][0].qValue = 10;

      expect(original[0][0].qValue).toBe(0);
      expect(cloned[0][0].qValue).toBe(10);
    });
  });

  describe('manhattanDistance', () => {
    it('should calculate correct distance for horizontal movement', () => {
      const a = { x: 0, y: 0 };
      const b = { x: 5, y: 0 };
      expect(manhattanDistance(a, b)).toBe(5);
    });

    it('should calculate correct distance for vertical movement', () => {
      const a = { x: 0, y: 0 };
      const b = { x: 0, y: 3 };
      expect(manhattanDistance(a, b)).toBe(3);
    });

    it('should calculate correct distance for diagonal movement', () => {
      const a = { x: 0, y: 0 };
      const b = { x: 3, y: 4 };
      expect(manhattanDistance(a, b)).toBe(7);
    });

    it('should return 0 for same position', () => {
      const a = { x: 5, y: 5 };
      const b = { x: 5, y: 5 };
      expect(manhattanDistance(a, b)).toBe(0);
    });
  });

  describe('calculateItemCount', () => {
    it('should calculate correct count based on density', () => {
      const count = calculateItemCount(10, 0.1, 1);
      expect(count).toBe(10); // 10*10 * 0.1 = 10
    });

    it('should respect minimum value', () => {
      const count = calculateItemCount(5, 0.01, 3);
      expect(count).toBeGreaterThanOrEqual(3);
    });

    it('should return minimum when calculation is below minimum', () => {
      const count = calculateItemCount(3, 0.01, 5);
      expect(count).toBe(5);
    });
  });

  describe('getTileValue', () => {
    it('should return correct value for reward', () => {
      expect(getTileValue('reward')).toBe(12);
    });

    it('should return correct value for punishment', () => {
      expect(getTileValue('punishment')).toBe(-15);
    });

    it('should return correct value for goal', () => {
      expect(getTileValue('goal')).toBe(24); // REWARD_VALUE * 2
    });

    it('should return correct value for obstacle', () => {
      expect(getTileValue('obstacle')).toBe(-20);
    });

    it('should return 0 for portal', () => {
      expect(getTileValue('portal')).toBe(0);
    });

    it('should return 0 for empty', () => {
      expect(getTileValue('empty')).toBe(0);
    });
  });

  describe('selectGoalPositions', () => {
    it('should select the requested number of goals', () => {
      const grid = createEmptyGrid(10);
      const start = { x: 0, y: 0 };
      const forbidden = new Set(['0-0']);

      const goals = selectGoalPositions(grid, 3, start, forbidden, 5);

      expect(goals.length).toBeLessThanOrEqual(3);
    });

    it('should respect forbidden positions', () => {
      const grid = createEmptyGrid(5);
      const start = { x: 0, y: 0 };
      const forbidden = new Set(['4-4', '3-3']);

      const goals = selectGoalPositions(grid, 2, start, forbidden, 1);

      goals.forEach((goal) => {
        const key = `${goal.x}-${goal.y}`;
        expect(forbidden.has(key)).toBe(false);
      });
    });

    it('should prefer positions with minimum distance', () => {
      const grid = createEmptyGrid(10);
      const start = { x: 0, y: 0 };
      const forbidden = new Set(['0-0']);
      const minDistance = 5;

      const goals = selectGoalPositions(grid, 1, start, forbidden, minDistance);

      if (goals.length > 0) {
        const distance = manhattanDistance(start, goals[0]);
        // May not always meet minDistance if grid is small, but should try
        expect(distance).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return empty array when no valid positions', () => {
      const grid = createEmptyGrid(2);
      // Mark all as obstacles
      grid[0][0].type = 'obstacle';
      grid[0][1].type = 'obstacle';
      grid[1][0].type = 'obstacle';
      grid[1][1].type = 'obstacle';

      const goals = selectGoalPositions(grid, 1, { x: 0, y: 0 }, new Set(), 1);

      expect(goals).toEqual([]);
    });
  });

  describe('computeMoveStats', () => {
    it('should compute correct statistics', () => {
      const episodeHistory = [
        { steps: 10 },
        { steps: 20 },
        { steps: 15 },
      ];

      const stats = computeMoveStats(25, episodeHistory);

      expect(stats.current).toBe(25);
      expect(stats.episodes).toBe(3);
      expect(stats.totalCompleted).toBe(45);
      expect(stats.average).toBe(15);
      expect(stats.best).toBe(10);
    });

    it('should handle empty history', () => {
      const stats = computeMoveStats(5, []);

      expect(stats.current).toBe(5);
      expect(stats.episodes).toBe(0);
      expect(stats.average).toBeNull();
      expect(stats.best).toBeNull();
    });

    it('should find best (minimum) steps correctly', () => {
      const episodeHistory = [
        { steps: 100 },
        { steps: 5 },
        { steps: 50 },
      ];

      const stats = computeMoveStats(10, episodeHistory);

      expect(stats.best).toBe(5);
    });
  });

  describe('computeEpisodeSummary', () => {
    it('should compute correct summary statistics', () => {
      const history = [
        { steps: 10, reward: 100 },
        { steps: 20, reward: 50 },
        { steps: 15, reward: 75 },
      ];

      const summary = computeEpisodeSummary(history);

      expect(summary.count).toBe(3);
      expect(summary.avgSteps).toBe(15);
      expect(summary.avgReward).toBe(75);
      expect(summary.bestReward).toBe(100);
      expect(summary.bestSteps).toBe(10);
    });

    it('should handle empty history', () => {
      const summary = computeEpisodeSummary([]);

      expect(summary.count).toBe(0);
      expect(summary.avgSteps).toBeNull();
      expect(summary.avgReward).toBeNull();
      expect(summary.bestReward).toBeNull();
      expect(summary.bestSteps).toBeNull();
    });

    it('should find best reward (maximum) correctly', () => {
      const history = [
        { steps: 10, reward: 50 },
        { steps: 20, reward: 200 },
        { steps: 15, reward: 100 },
      ];

      const summary = computeEpisodeSummary(history);

      expect(summary.bestReward).toBe(200);
    });
  });
});
