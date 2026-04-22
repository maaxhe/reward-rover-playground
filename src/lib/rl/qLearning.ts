import type { Position, TileState } from "./types";
import { STEP_PENALTY, REWARD_VALUE, PUNISHMENT_VALUE, OBSTACLE_PENALTY, GOAL_REWARD } from "./constants";

/** QTable maps state key "x,y" → [Q_up, Q_down, Q_left, Q_right] */
export type QTable = Record<string, [number, number, number, number]>;

const ACTION_DIRS = [
  { x: 0, y: -1 }, // 0: up
  { x: 0, y: 1 },  // 1: down
  { x: -1, y: 0 }, // 2: left
  { x: 1, y: 0 },  // 3: right
] as const;

const qStateKey = (pos: Position) => `${pos.x},${pos.y}`;

export const getQValues = (qTable: QTable, pos: Position): [number, number, number, number] =>
  qTable[qStateKey(pos)] ?? [0, 0, 0, 0];

export const getQValue = (qTable: QTable, pos: Position, action: number): number =>
  getQValues(qTable, pos)[action];

export const setQValue = (qTable: QTable, pos: Position, action: number, value: number): QTable => {
  const key = qStateKey(pos);
  const current = qTable[key] ?? [0, 0, 0, 0];
  const updated = [...current] as [number, number, number, number];
  updated[action] = value;
  return { ...qTable, [key]: updated };
};

/** max_a Q(s, a) — used as display value on the tile */
export const getDisplayQValue = (qTable: QTable, pos: Position): number =>
  Math.max(...getQValues(qTable, pos));

export const posToActionIndex = (from: Position, to: Position): number => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dy === -1) return 0;
  if (dy === 1) return 1;
  if (dx === -1) return 2;
  return 3;
};

/**
 * Gets all possible actions (adjacent tiles that are not obstacles) from a position
 */
export const getPossibleActions = (grid: TileState[][], pos: Position): Position[] => {
  const actions: Position[] = [];
  const size = grid.length;

  ACTION_DIRS.forEach((dir) => {
    const nx = pos.x + dir.x;
    const ny = pos.y + dir.y;
    if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
      if (grid[ny][nx].type !== "obstacle") {
        actions.push({ x: nx, y: ny });
      }
    }
  });

  if (actions.length === 0) actions.push(pos);
  return actions;
};

/**
 * Chooses an action using epsilon-greedy policy
 */
export const chooseAction = (
  grid: TileState[][],
  pos: Position,
  qTable: QTable,
  explorationRate: number,
  biasDirection?: Position | null
): Position => {
  const possible = getPossibleActions(grid, pos);

  let biasMatch: Position | undefined;
  if (biasDirection) {
    biasMatch = possible.find(
      (action) => action.x - pos.x === biasDirection.x && action.y - pos.y === biasDirection.y
    );
    if (biasMatch && Math.random() < 0.35) {
      return biasMatch;
    }
  }

  if (Math.random() < explorationRate) {
    return possible[Math.floor(Math.random() * possible.length)];
  }

  // Exploitation: argmax_a Q(s, a)
  let best = possible[0];
  let bestQ =
    getQValue(qTable, pos, posToActionIndex(pos, best)) +
    (biasMatch && best.x === biasMatch.x && best.y === biasMatch.y ? 0.05 : 0);

  for (let i = 1; i < possible.length; i++) {
    const action = possible[i];
    const q = getQValue(qTable, pos, posToActionIndex(pos, action));
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
  pos: Position,
  qTable: QTable,
): string | undefined => {
  const possible = getPossibleActions(grid, pos);
  if (possible.length === 0) return undefined;

  let best = possible[0];
  let bestQ = getQValue(qTable, pos, posToActionIndex(pos, best));

  for (let i = 1; i < possible.length; i++) {
    const action = possible[i];
    const q = getQValue(qTable, pos, posToActionIndex(pos, action));
    if (q > bestQ) {
      bestQ = q;
      best = action;
    }
  }

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
 * Gets the maximum Q-value over all valid actions from pos — TD bootstrap target.
 * Returns 0 if no valid actions exist.
 */
export const getMaxQValue = (grid: TileState[][], pos: Position, qTable: QTable): number => {
  const possible = getPossibleActions(grid, pos);
  if (possible.length === 0) return 0;

  return possible
    .map((p) => getQValue(qTable, pos, posToActionIndex(pos, p)))
    .reduce((acc, val) => (val > acc ? val : acc), Number.NEGATIVE_INFINITY);
};
