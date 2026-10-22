import { getPossibleActions, getTileReward } from "./qLearning";
import type { Position, TileState } from "./types";

/** Value per tile, indexed [y][x]. Obstacles stay 0 and never matter. */
export type ValueMap = number[][];

export type Direction = "up" | "down" | "left" | "right";

const sameTile = (a: Position, b: Position) => a.x === b.x && a.y === b.y;

export const zeroValues = (size: number): ValueMap => Array.from({ length: size }, () => Array<number>(size).fill(0));

/** The goal ends the episode, so nothing is worth anything after it. */
const isTerminal = (goal: Position, p: Position) => sameTile(goal, p);

/**
 * In the game a candy is eaten once, but a plain Bellman backup would let the planner hop on and off
 * the same candy forever. So after a candy the planner continues with `after`, the values of the same
 * board without candies. Penalty tiles stay (stepping on them again really costs again).
 * Exact for boards with a single candy, slightly cautious with several.
 */
const continuation = (grid: TileState[][], v: ValueMap, after: ValueMap | undefined, n: Position) =>
  after && grid[n.y][n.x].type === "reward" ? after[n.y][n.x] : v[n.y][n.x];

const qValue = (grid: TileState[][], goal: Position, v: ValueMap, after: ValueMap | undefined, next: Position, gamma: number) =>
  getTileReward(grid, [goal], next) + (isTerminal(goal, next) ? 0 : gamma * continuation(grid, v, after, next));

/**
 * One synchronous Bellman-optimality sweep:
 * V'(s) = max_a [ r(s') + γ · V(s') ], with the same rewards the rover gets in the game.
 * The planner knows the map; the rover has to find out by walking.
 */
export const sweepValues = (
  grid: TileState[][],
  goal: Position,
  v: ValueMap,
  gamma: number,
  after?: ValueMap,
): ValueMap => {
  const next = zeroValues(grid.length);
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid.length; x++) {
      const here = { x, y };
      if (grid[y][x].type === "obstacle" || isTerminal(goal, here)) continue;
      let best = Number.NEGATIVE_INFINITY;
      for (const n of getPossibleActions(grid, here)) best = Math.max(best, qValue(grid, goal, v, after, n, gamma));
      next[y][x] = best;
    }
  }
  return next;
};

export const maxChange = (a: ValueMap, b: ValueMap): number => {
  let m = 0;
  for (let y = 0; y < a.length; y++) for (let x = 0; x < a.length; x++) m = Math.max(m, Math.abs(a[y][x] - b[y][x]));
  return m;
};

interface SolveOptions {
  tolerance?: number;
  maxSweeps?: number;
}

const iterate = (grid: TileState[][], goal: Position, gamma: number, after: ValueMap | undefined, { tolerance = 1e-4, maxSweeps = 500 }: SolveOptions) => {
  let v = zeroValues(grid.length);
  for (let sweeps = 1; sweeps <= maxSweeps; sweeps++) {
    const next = sweepValues(grid, goal, v, gamma, after);
    const done = maxChange(v, next) < tolerance;
    v = next;
    if (done) return { values: v, sweeps };
  }
  return { values: v, sweeps: maxSweeps };
};

/** Values of the board with every candy removed: what the planner expects once the candy is gone. */
export const afterCandyValues = (grid: TileState[][], goal: Position, gamma: number): ValueMap | undefined => {
  if (!grid.some((row) => row.some((c) => c.type === "reward"))) return undefined;
  const candyFree = grid.map((row) => row.map((c) => (c.type === "reward" ? { ...c, type: "empty" as const } : c)));
  return iterate(candyFree, goal, gamma, undefined, {}).values;
};

/** Sweeps until the largest change drops below `tolerance`. Returns the values and the number of sweeps. */
export const solveValues = (grid: TileState[][], goal: Position, gamma: number, options: SolveOptions = {}) =>
  iterate(grid, goal, gamma, afterCandyValues(grid, goal, gamma), options);

/** Greedy direction toward the neighbour with the highest r + γ·V; undefined on walls and the goal. */
export const greedyDirection = (
  grid: TileState[][],
  goal: Position,
  v: ValueMap,
  from: Position,
  gamma: number,
  after?: ValueMap,
): Direction | undefined => {
  if (grid[from.y][from.x].type === "obstacle" || isTerminal(goal, from)) return undefined;
  let best: Position | undefined;
  let bestQ = Number.NEGATIVE_INFINITY;
  for (const next of getPossibleActions(grid, from)) {
    if (sameTile(next, from)) continue;
    const q = qValue(grid, goal, v, after, next, gamma);
    if (q > bestQ + 1e-9) {
      bestQ = q;
      best = next;
    }
  }
  if (!best) return undefined;
  if (best.y < from.y) return "up";
  if (best.y > from.y) return "down";
  return best.x < from.x ? "left" : "right";
};

/** Follows the greedy policy from `start`. Returns the visited tiles, or null if it does not reach the goal. */
export const greedyPath = (
  grid: TileState[][],
  goal: Position,
  v: ValueMap,
  start: Position,
  gamma: number,
  after?: ValueMap,
): Position[] | null => {
  const path: Position[] = [start];
  let at = start;
  for (let i = 0; i < grid.length * grid.length; i++) {
    if (sameTile(at, goal)) return path;
    const dir = greedyDirection(grid, goal, v, at, gamma, after);
    if (!dir) return null;
    at = { x: at.x + (dir === "right" ? 1 : dir === "left" ? -1 : 0), y: at.y + (dir === "down" ? 1 : dir === "up" ? -1 : 0) };
    if (path.some((p) => sameTile(p, at))) return null;
    path.push(at);
  }
  return null;
};
