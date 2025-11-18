import type { Position, TileState } from "./types";
import { STEP_PENALTY, REWARD_VALUE, PUNISHMENT_VALUE, OBSTACLE_PENALTY, GOAL_REWARD } from "./constants";

/**
 * Gets all possible actions (adjacent tiles that are not obstacles) from a position
 */
export const getPossibleActions = (grid: TileState[][], pos: Position): Position[] => {
  const actions: Position[] = [];
  const size = grid.length;
  const dirs = [
    { x: 0, y: -1 }, // up
    { x: 0, y: 1 },  // down
    { x: -1, y: 0 }, // left
    { x: 1, y: 0 },  // right
  ];

  dirs.forEach((dir) => {
    const nx = pos.x + dir.x;
    const ny = pos.y + dir.y;
    if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
      if (grid[ny][nx].type !== "obstacle") {
        actions.push({ x: nx, y: ny });
      }
    }
  });

  // If no actions available (surrounded by obstacles), stay in place
  if (actions.length === 0) actions.push(pos);
  return actions;
};

/**
 * Chooses an action using epsilon-greedy policy
 */
export const chooseAction = (
  grid: TileState[][],
  pos: Position,
  explorationRate: number,
  biasDirection?: Position | null
): Position => {
  const possible = getPossibleActions(grid, pos);

  // Check for bias direction
  let biasMatch: Position | undefined;
  if (biasDirection) {
    biasMatch = possible.find(
      (action) => action.x - pos.x === biasDirection.x && action.y - pos.y === biasDirection.y
    );
    if (biasMatch && Math.random() < 0.35) {
      return biasMatch;
    }
  }

  // Exploration: random action
  if (Math.random() < explorationRate) {
    return possible[Math.floor(Math.random() * possible.length)];
  }

  // Exploitation: best Q-value action
  let best = possible[0];
  let bestQ =
    grid[best.y][best.x].qValue +
    (biasMatch && best.x === biasMatch.x && best.y === biasMatch.y ? 0.05 : 0);

  for (let i = 1; i < possible.length; i++) {
    const action = possible[i];
    const q = grid[action.y][action.x].qValue;
    const biasBonus =
      biasMatch && action.x === biasMatch.x && action.y === biasMatch.y ? 0.05 : 0;
    if (q + biasBonus > bestQ) {
      bestQ = q + biasBonus;
      best = action;
    }
  }
  return best;
};

/**
 * Gets the best action direction as a string for visualization
 */
export const getBestActionDirection = (
  grid: TileState[][],
  pos: Position
): string | undefined => {
  const possible = getPossibleActions(grid, pos);
  if (possible.length === 0) return undefined;

  let best = possible[0];
  let bestQ = grid[best.y][best.x].qValue;

  for (let i = 1; i < possible.length; i++) {
    const action = possible[i];
    const q = grid[action.y][action.x].qValue;
    if (q > bestQ) {
      bestQ = q;
      best = action;
    }
  }

  // Convert position to direction
  const dx = best.x - pos.x;
  const dy = best.y - pos.y;

  if (dy === -1) return "up";
  if (dy === 1) return "down";
  if (dx === -1) return "left";
  if (dx === 1) return "right";

  return undefined;
};

/**
 * Gets the reward for stepping on a tile
 */
export const getTileReward = (grid: TileState[][], goals: Position[], pos: Position): number => {
  // Check if position is a goal
  if (goals.some((goal) => goal.x === pos.x && goal.y === pos.y)) return GOAL_REWARD;

  const cell = grid[pos.y][pos.x];
  switch (cell.type) {
    case "obstacle":
      return OBSTACLE_PENALTY;
    case "reward":
      return REWARD_VALUE;
    case "punishment":
      return PUNISHMENT_VALUE;
    case "portal":
      return 0;
    default:
      return STEP_PENALTY;
  }
};

/**
 * Updates Q-value using the Q-learning update rule
 * Q(s,a) ← Q(s,a) + α[r + γ max Q(s',a') - Q(s,a)]
 */
export const updateQValue = (
  currentQValue: number,
  reward: number,
  maxNextQ: number,
  alpha: number,
  gamma: number
): number => {
  return currentQValue + alpha * (reward + gamma * maxNextQ - currentQValue);
};

/**
 * Gets the maximum Q-value from possible next actions
 */
export const getMaxQValue = (grid: TileState[][], pos: Position): number => {
  const possible = getPossibleActions(grid, pos);
  if (possible.length === 0) return 0;

  return possible
    .map((p) => grid[p.y][p.x].qValue)
    .reduce((acc, val) => (val > acc ? val : acc), Number.NEGATIVE_INFINITY);
};
