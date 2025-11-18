import { describe, it, expect } from 'vitest';
import {
  getPossibleActions,
  chooseAction,
  getBestActionDirection,
  getTileReward,
  updateQValue,
  getMaxQValue,
} from './qLearning';
import { createEmptyGrid } from './gridUtils';
import type { Position } from './types';

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
      grid[2][2].qValue = 100; // Make one action obviously better

      const pos = { x: 2, y: 2 };
      const explorationRate = 1.0;

      // Run multiple times to ensure randomness
      const actions = new Set();
      for (let i = 0; i < 50; i++) {
        const action = chooseAction(grid, pos, explorationRate);
        actions.add(`${action.x},${action.y}`);
      }

      // Should explore different actions
      expect(actions.size).toBeGreaterThan(1);
    });

    it('should choose best Q-value action with 0% exploration rate', () => {
      const grid = createEmptyGrid(5);
      const pos = { x: 2, y: 2 };

      // Set Q-values: down is best
      grid[1][2].qValue = 5;  // up
      grid[3][2].qValue = 20; // down (best)
      grid[2][1].qValue = 3;  // left
      grid[2][3].qValue = 10; // right

      const explorationRate = 0.0;
      const action = chooseAction(grid, pos, explorationRate);

      expect(action).toEqual({ x: 2, y: 3 }); // down
    });

    it('should respect bias direction when provided', () => {
      const grid = createEmptyGrid(5);
      const pos = { x: 2, y: 2 };
      const biasDirection = { x: 1, y: 0 }; // bias right

      // Even with exploration, bias should sometimes be chosen
      let biasChosen = false;
      for (let i = 0; i < 20; i++) {
        const action = chooseAction(grid, pos, 0.5, biasDirection);
        if (action.x === 3 && action.y === 2) {
          biasChosen = true;
          break;
        }
      }

      expect(biasChosen).toBe(true);
    });
  });

  describe('getBestActionDirection', () => {
    it('should return correct direction for best action', () => {
      const grid = createEmptyGrid(5);
      const pos = { x: 2, y: 2 };

      // Make "up" the best action
      grid[1][2].qValue = 100;
      grid[3][2].qValue = 5;
      grid[2][1].qValue = 5;
      grid[2][3].qValue = 5;

      const direction = getBestActionDirection(grid, pos);

      expect(direction).toBe('up');
    });

    it('should return "down" for best Q-value below', () => {
      const grid = createEmptyGrid(5);
      const pos = { x: 2, y: 2 };
      grid[3][2].qValue = 100;

      expect(getBestActionDirection(grid, pos)).toBe('down');
    });

    it('should return "left" for best Q-value to the left', () => {
      const grid = createEmptyGrid(5);
      const pos = { x: 2, y: 2 };
      grid[2][1].qValue = 100;

      expect(getBestActionDirection(grid, pos)).toBe('left');
    });

    it('should return "right" for best Q-value to the right', () => {
      const grid = createEmptyGrid(5);
      const pos = { x: 2, y: 2 };
      grid[2][3].qValue = 100;

      expect(getBestActionDirection(grid, pos)).toBe('right');
    });

    it('should return undefined when no valid actions', () => {
      const grid = createEmptyGrid(3);
      const pos = { x: 1, y: 1 };

      // Surround with obstacles
      grid[0][1].type = 'obstacle';
      grid[2][1].type = 'obstacle';
      grid[1][0].type = 'obstacle';
      grid[1][2].type = 'obstacle';

      const direction = getBestActionDirection(grid, pos);

      expect(direction).toBeUndefined();
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
    it('should return maximum Q-value from possible actions', () => {
      const grid = createEmptyGrid(5);
      const pos = { x: 2, y: 2 };

      grid[1][2].qValue = 5;  // up
      grid[3][2].qValue = 20; // down (max)
      grid[2][1].qValue = 3;  // left
      grid[2][3].qValue = 10; // right

      const maxQ = getMaxQValue(grid, pos);

      expect(maxQ).toBe(20);
    });

    it('should return 0 when no actions available', () => {
      const grid = createEmptyGrid(3);
      const pos = { x: 1, y: 1 };

      // Surround with obstacles
      grid[0][1].type = 'obstacle';
      grid[2][1].type = 'obstacle';
      grid[1][0].type = 'obstacle';
      grid[1][2].type = 'obstacle';

      const maxQ = getMaxQValue(grid, pos);

      expect(maxQ).toBe(0);
    });

    it('should handle negative Q-values', () => {
      const grid = createEmptyGrid(5);
      const pos = { x: 2, y: 2 };

      grid[1][2].qValue = -10;
      grid[3][2].qValue = -5; // max (least negative)
      grid[2][1].qValue = -20;
      grid[2][3].qValue = -15;

      const maxQ = getMaxQValue(grid, pos);

      expect(maxQ).toBe(-5);
    });
  });
});
