import { describe, it, expect } from 'vitest';
import {
  getPossibleActions,
  chooseAction,
  getBestActionDirection,
  getTileReward,
  updateQValue,
  getMaxQValue,
  type QTable,
} from './qLearning';
import { createEmptyGrid } from './gridUtils';
import type { Position } from './types';

const emptyQTable = (): QTable => ({});
const qTableWith = (entries: Record<string, [number, number, number, number]>): QTable => entries;

describe('qLearning', () => {
  describe('getPossibleActions', () => {
    it('should return all 4 directions when no obstacles', () => {
      const grid = createEmptyGrid(5);
      const pos = { x: 2, y: 2 };

      const actions = getPossibleActions(grid, pos);

      expect(actions).toHaveLength(4);
    });

    it('should exclude obstacles from possible actions', () => {
      const grid = createEmptyGrid(5);
      const pos = { x: 2, y: 2 };

      // Place obstacles around position
      grid[1][2].type = 'obstacle'; // up
      grid[2][1].type = 'obstacle'; // left

      const actions = getPossibleActions(grid, pos);

      expect(actions).toHaveLength(2); // only down and right
      expect(actions).toContainEqual({ x: 2, y: 3 }); // down
      expect(actions).toContainEqual({ x: 3, y: 2 }); // right
    });

    it('should exclude out-of-bounds positions', () => {
      const grid = createEmptyGrid(5);
      const pos = { x: 0, y: 0 }; // top-left corner

      const actions = getPossibleActions(grid, pos);

      expect(actions).toHaveLength(2); // only down and right
      expect(actions).toContainEqual({ x: 1, y: 0 }); // right
      expect(actions).toContainEqual({ x: 0, y: 1 }); // down
    });

    it('should return current position when completely surrounded', () => {
      const grid = createEmptyGrid(5);
      const pos = { x: 2, y: 2 };

      // Surround with obstacles
      grid[1][2].type = 'obstacle';
      grid[3][2].type = 'obstacle';
      grid[2][1].type = 'obstacle';
      grid[2][3].type = 'obstacle';

      const actions = getPossibleActions(grid, pos);

      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual(pos);
    });

    it('should allow movement through portals', () => {
      const grid = createEmptyGrid(5);
      const pos = { x: 2, y: 2 };
      grid[1][2].type = 'portal';

      const actions = getPossibleActions(grid, pos);

      expect(actions).toHaveLength(4);
      expect(actions).toContainEqual({ x: 2, y: 1 }); // can move to portal
    });
  });

  describe('chooseAction', () => {
    it('should choose random action with 100% exploration rate', () => {
      const grid = createEmptyGrid(5);
      const pos = { x: 2, y: 2 };
      const explorationRate = 1.0;

      const actions = new Set();
      for (let i = 0; i < 50; i++) {
        const action = chooseAction(grid, pos, emptyQTable(), explorationRate);
        actions.add(`${action.x},${action.y}`);
      }

      expect(actions.size).toBeGreaterThan(1);
    });

    it('should choose best Q(s,a) action with 0% exploration rate', () => {
      const grid = createEmptyGrid(5);
      const pos = { x: 2, y: 2 };

      // Q(pos, action): up=5, down=20 (best), left=3, right=10
      // ACTION_DIRS: 0=up, 1=down, 2=left, 3=right
      const qTable = qTableWith({ '2,2': [5, 20, 3, 10] });

      const action = chooseAction(grid, pos, qTable, 0.0);

      expect(action).toEqual({ x: 2, y: 3 }); // down (action index 1)
    });

    it('should respect bias direction when provided', () => {
      const grid = createEmptyGrid(5);
      const pos = { x: 2, y: 2 };
      const biasDirection = { x: 1, y: 0 }; // bias right

      let biasChosen = false;
      for (let i = 0; i < 20; i++) {
        const action = chooseAction(grid, pos, emptyQTable(), 0.5, biasDirection);
        if (action.x === 3 && action.y === 2) {
          biasChosen = true;
          break;
        }
      }

      expect(biasChosen).toBe(true);
    });
  });

  describe('getBestActionDirection', () => {
    it('should return correct direction for best Q(s,a)', () => {
      const grid = createEmptyGrid(5);
      const pos = { x: 2, y: 2 };
      // ACTION_DIRS: 0=up, 1=down, 2=left, 3=right
      const qTable = qTableWith({ '2,2': [100, 5, 5, 5] }); // up is best

      expect(getBestActionDirection(grid, pos, qTable)).toBe('up');
    });

    it('should return "down" for best Q(s,a)', () => {
      const grid = createEmptyGrid(5);
      const pos = { x: 2, y: 2 };
      const qTable = qTableWith({ '2,2': [0, 100, 0, 0] });

      expect(getBestActionDirection(grid, pos, qTable)).toBe('down');
    });

    it('should return "left" for best Q(s,a)', () => {
      const grid = createEmptyGrid(5);
      const pos = { x: 2, y: 2 };
      const qTable = qTableWith({ '2,2': [0, 0, 100, 0] });

      expect(getBestActionDirection(grid, pos, qTable)).toBe('left');
    });

    it('should return "right" for best Q(s,a)', () => {
      const grid = createEmptyGrid(5);
      const pos = { x: 2, y: 2 };
      const qTable = qTableWith({ '2,2': [0, 0, 0, 100] });

      expect(getBestActionDirection(grid, pos, qTable)).toBe('right');
    });

    it('should return undefined when no valid actions', () => {
      const grid = createEmptyGrid(3);
      const pos = { x: 1, y: 1 };

      grid[0][1].type = 'obstacle';
      grid[2][1].type = 'obstacle';
      grid[1][0].type = 'obstacle';
      grid[1][2].type = 'obstacle';

      expect(getBestActionDirection(grid, pos, emptyQTable())).toBeUndefined();
    });
  });

  describe('getTileReward', () => {
    it('should return goal reward when position is goal', () => {
      const grid = createEmptyGrid(5);
      const goals: Position[] = [{ x: 3, y: 3 }];
      const pos = { x: 3, y: 3 };

      const reward = getTileReward(grid, goals, pos);

      expect(reward).toBe(24); // GOAL_REWARD
    });

    it('should return reward value for reward tile', () => {
      const grid = createEmptyGrid(5);
      grid[2][2].type = 'reward';
      const pos = { x: 2, y: 2 };

      const reward = getTileReward(grid, [], pos);

      expect(reward).toBe(12); // REWARD_VALUE
    });

    it('should return punishment value for punishment tile', () => {
      const grid = createEmptyGrid(5);
      grid[2][2].type = 'punishment';
      const pos = { x: 2, y: 2 };

      const reward = getTileReward(grid, [], pos);

      expect(reward).toBe(-15); // PUNISHMENT_VALUE
    });

    it('should return obstacle penalty for obstacle', () => {
      const grid = createEmptyGrid(5);
      grid[2][2].type = 'obstacle';
      const pos = { x: 2, y: 2 };

      const reward = getTileReward(grid, [], pos);

      expect(reward).toBe(-20); // OBSTACLE_PENALTY
    });

    it('should return 0 for portal', () => {
      const grid = createEmptyGrid(5);
      grid[2][2].type = 'portal';
      const pos = { x: 2, y: 2 };

      const reward = getTileReward(grid, [], pos);

      expect(reward).toBe(0);
    });

    it('should return step penalty for empty tile', () => {
      const grid = createEmptyGrid(5);
      const pos = { x: 2, y: 2 };

      const reward = getTileReward(grid, [], pos);

      expect(reward).toBe(-1); // STEP_PENALTY
    });
  });

  describe('updateQValue', () => {
    it('should update Q-value correctly', () => {
      const currentQ = 10;
      const reward = 5;
      const maxNextQ = 15;
      const alpha = 0.1;
      const gamma = 0.9;

      const newQ = updateQValue(currentQ, reward, maxNextQ, alpha, gamma);

      // Q(s,a) ← Q(s,a) + α[r + γ * max Q(s',a') - Q(s,a)]
      // = 10 + 0.1 * [5 + 0.9 * 15 - 10]
      // = 10 + 0.1 * [5 + 13.5 - 10]
      // = 10 + 0.1 * 8.5
      // = 10.85
      expect(newQ).toBeCloseTo(10.85, 5);
    });

    it('should increase Q-value for positive reward', () => {
      const currentQ = 0;
      const reward = 10;
      const maxNextQ = 0;
      const alpha = 0.5;
      const gamma = 0.9;

      const newQ = updateQValue(currentQ, reward, maxNextQ, alpha, gamma);

      expect(newQ).toBeGreaterThan(currentQ);
    });

    it('should decrease Q-value for negative reward', () => {
      const currentQ = 10;
      const reward = -20;
      const maxNextQ = 5;
      const alpha = 0.5;
      const gamma = 0.9;

      const newQ = updateQValue(currentQ, reward, maxNextQ, alpha, gamma);

      expect(newQ).toBeLessThan(currentQ);
    });

    it('should converge to reward when maxNextQ is 0', () => {
      let q = 0;
      const reward = 10;
      const alpha = 0.1;
      const gamma = 0.9;

      // Update multiple times
      for (let i = 0; i < 100; i++) {
        q = updateQValue(q, reward, 0, alpha, gamma);
      }

      // Should converge to reward value
      expect(q).toBeCloseTo(reward, 0);
    });
  });

  describe('getMaxQValue', () => {
    it('should return maximum Q(s,a) over all valid actions', () => {
      const grid = createEmptyGrid(5);
      const pos = { x: 2, y: 2 };
      // ACTION_DIRS: 0=up, 1=down, 2=left, 3=right
      const qTable = qTableWith({ '2,2': [5, 20, 3, 10] }); // down=20 is max

      expect(getMaxQValue(grid, pos, qTable)).toBe(20);
    });

    it('should return 0 when no actions available', () => {
      const grid = createEmptyGrid(3);
      const pos = { x: 1, y: 1 };

      grid[0][1].type = 'obstacle';
      grid[2][1].type = 'obstacle';
      grid[1][0].type = 'obstacle';
      grid[1][2].type = 'obstacle';

      expect(getMaxQValue(grid, pos, emptyQTable())).toBe(0);
    });

    it('should handle negative Q-values', () => {
      const grid = createEmptyGrid(5);
      const pos = { x: 2, y: 2 };
      const qTable = qTableWith({ '2,2': [-10, -5, -20, -15] }); // down=-5 is max

      expect(getMaxQValue(grid, pos, qTable)).toBe(-5);
    });
  });
});
