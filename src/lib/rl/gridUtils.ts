import type { TileType } from "@/components/RL/Tile";
import type { Position, TileState, CandidatePosition } from "./types";
import { GOAL_REWARD, REWARD_VALUE, PUNISHMENT_VALUE, OBSTACLE_PENALTY } from "./constants";

/**
 * Creates an empty grid of the specified size
 */
export const createEmptyGrid = (size: number): TileState[][] =>
  Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ type: "empty", qValue: 0, visits: 0, value: 0 }))
  );

/**
 * Deep clones a grid
 */
export const cloneGrid = (grid: TileState[][]): TileState[][] =>
  grid.map((row) => row.map((cell) => ({ ...cell })));

/**
 * Calculates Manhattan distance between two positions
 */
export const manhattanDistance = (a: Position, b: Position): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/**
 * Calculates the number of items to place based on grid size and density
 */
export const calculateItemCount = (gridSize: number, density: number, minimum = 1): number =>
  Math.max(minimum, Math.round(gridSize * gridSize * density));

/**
 * Gets the reward value for a specific tile type
 */
export const getTileValue = (type: TileType): number => {
  switch (type) {
    case "reward":
      return REWARD_VALUE;
    case "punishment":
      return PUNISHMENT_VALUE;
    case "goal":
      return GOAL_REWARD;
    case "obstacle":
      return OBSTACLE_PENALTY;
    case "portal":
      return 0;
    default:
      return 0;
  }
};

/**
 * Selects goal positions on the grid that meet distance requirements
 */
export const selectGoalPositions = (
  grid: TileState[][],
  count: number,
  start: Position,
  forbidden: Set<string>,
  minDistance: number
): Position[] => {
  const size = grid.length;
  const candidates: CandidatePosition[] = [];
  const fallbacks: CandidatePosition[] = [];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid[y][x].type !== "empty") continue;
      const key = `${x}-${y}`;
      if (forbidden.has(key)) continue;
      const distance = manhattanDistance(start, { x, y });
      const candidate: CandidatePosition = { x, y, distance };
      fallbacks.push(candidate);
      if (distance >= minDistance) {
        candidates.push(candidate);
      }
    }
  }

  let source: CandidatePosition[];
  if (candidates.length >= count) {
    source = candidates;
  } else {
    const sortedFallbacks = fallbacks.sort((a, b) => b.distance - a.distance);
    const limit = Math.min(sortedFallbacks.length, Math.max(count, count * 3));
    source = sortedFallbacks.slice(0, limit);
  }

  if (source.length === 0) return [];

  const pool = [...source];
  const selected: Position[] = [];

  while (selected.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    const chosen = pool.splice(index, 1)[0];
    selected.push({ x: chosen.x, y: chosen.y });
  }

  return selected;
};

/**
 * Places random tiles on the grid
 */
export const placeRandomTiles = (
  grid: TileState[][],
  count: number,
  type: TileType,
  forbidden: Set<string>,
  goals: Position[]
): void => {
  const size = grid.length;
  let placed = 0;
  let guard = 0;

  while (placed < count && guard < 5000) {
    guard++;
    const x = Math.floor(Math.random() * size);
    const y = Math.floor(Math.random() * size);
    const key = `${x}-${y}`;
    if (forbidden.has(key)) continue;
    if (grid[y][x].type !== "empty") continue;

    grid[y][x] = { type, qValue: 0, visits: 0, value: getTileValue(type) };
    forbidden.add(key);
    if (type === "goal") goals.push({ x, y });
    placed++;
  }
};

/**
 * Generates a maze using recursive backtracking
 */
export const generateMaze = (grid: TileState[][], forbidden: Set<string>): void => {
  const size = grid.length;

  // Mark all fields as walls (except forbidden)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const key = `${x}-${y}`;
      if (!forbidden.has(key)) {
        grid[y][x] = { type: "obstacle", qValue: 0, visits: 0, value: getTileValue("obstacle") };
      }
    }
  }

  // Recursive backtracking for maze generation
  const visited = new Set<string>();
  const dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]];

  const carve = (x: number, y: number) => {
    const key = `${x}-${y}`;
    visited.add(key);
    if (!forbidden.has(key)) {
      grid[y][x] = { type: "empty", qValue: 0, visits: 0, value: 0 };
    }

    // Shuffle directions
    const shuffled = [...dirs].sort(() => Math.random() - 0.5);

    for (const [dx, dy] of shuffled) {
      const nx = x + dx;
      const ny = y + dy;
      const nkey = `${nx}-${ny}`;

      if (nx >= 0 && nx < size && ny >= 0 && ny < size && !visited.has(nkey)) {
        // Carve the wall between
        const wx = x + dx / 2;
        const wy = y + dy / 2;
        const wkey = `${wx}-${wy}`;
        if (!forbidden.has(wkey)) {
          grid[wy][wx] = { type: "empty", qValue: 0, visits: 0, value: 0 };
        }
        carve(nx, ny);
      }
    }
  };

  // Start from bottom-left
  const startX = 1;
  const startY = size - 2;
  carve(startX, startY);

  // Add few extra paths for maze variety
  const extraPaths = Math.floor(size * 0.03);
  for (let i = 0; i < extraPaths; i++) {
    const x = Math.floor(Math.random() * size);
    const y = Math.floor(Math.random() * size);
    const key = `${x}-${y}`;
    if (!forbidden.has(key) && grid[y][x].type === "obstacle") {
      grid[y][x] = { type: "empty", qValue: 0, visits: 0, value: 0 };
    }
  }
};

/**
 * Computes statistics for move counts
 */
export const computeMoveStats = (currentSteps: number, episodeHistory: Array<{ steps: number }>): {
  current: number;
  totalCompleted: number;
  episodes: number;
  average: number | null;
  best: number | null;
} => {
  const completedSteps = episodeHistory.map((episode) => episode.steps);
  const totalCompleted = completedSteps.reduce((sum, steps) => sum + steps, 0);
  const episodes = completedSteps.length;
  const average = episodes > 0 ? totalCompleted / episodes : null;
  const best = episodes > 0 ? Math.min(...completedSteps) : null;

  return {
    current: currentSteps,
    totalCompleted,
    episodes,
    average,
    best,
  };
};

/**
 * Computes episode summary statistics
 */
export const computeEpisodeSummary = (history: Array<{ steps: number; reward: number }>): {
  count: number;
  avgSteps: number | null;
  avgReward: number | null;
  bestReward: number | null;
  bestSteps: number | null;
} => {
  const count = history.length;
  if (count === 0) {
    return {
      count,
      avgSteps: null,
      avgReward: null,
      bestReward: null,
      bestSteps: null,
    };
  }

  const totalSteps = history.reduce((sum, episode) => sum + episode.steps, 0);
  const totalReward = history.reduce((sum, episode) => sum + episode.reward, 0);
  const bestReward = Math.max(...history.map((episode) => episode.reward));
  const bestSteps = Math.min(...history.map((episode) => episode.steps));

  return {
    count,
    avgSteps: totalSteps / count,
    avgReward: totalReward / count,
    bestReward,
    bestSteps,
  };
};
