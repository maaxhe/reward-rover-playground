import { createEmptyGrid } from "@/lib/rl/gridUtils";
import { chooseAction } from "@/lib/rl/qLearning";
import { GOAL_REWARD, REWARD_VALUE, PUNISHMENT_VALUE, STEP_PENALTY } from "@/lib/rl/constants";
import type { PlaygroundState, Position } from "@/lib/rl/types";
import type { QTable } from "@/lib/rl/qLearning";

/** Mirrors server/lib/competition.js MAX_TEST_STEPS. */
export const MAX_TEST_STEPS = 120;

export interface CompetitionWorld {
  size: number;
  agent: Position;
  goal: Position;
  tiles: Array<{ x: number; y: number; type: "obstacle" | "reward" | "punishment" }>;
}

export interface TestResult {
  totalReward: number;
  steps: number;
  reachedGoal: boolean;
  path: Position[];
}

export const worldToState = (world: CompetitionWorld): PlaygroundState => {
  const grid = createEmptyGrid(world.size);
  for (const t of world.tiles) {
    const value = t.type === "reward" ? REWARD_VALUE : t.type === "punishment" ? PUNISHMENT_VALUE : 0;
    grid[t.y][t.x] = { ...grid[t.y][t.x], type: t.type, value };
  }
  return {
    agent: { ...world.agent },
    goal: { ...world.goal },
    spawn: { ...world.agent },
    grid,
    isRunning: false,
    episode: 0,
    totalReward: 0,
    currentSteps: 0,
    episodeHistory: [],
    portalCooldowns: {},
    pendingPortalTeleport: null,
    qTable: {},
    consumedTiles: [],
  };
};

/**
 * The test run: greedy (ε = 0) walk with the learned Q-table, rewards eaten once.
 * The server runs the same test on submit; this is the local preview.
 */
export const runTest = (world: CompetitionWorld, qTable: QTable): TestResult => {
  const grid = worldToState(world).grid;
  let pos: Position = { ...world.agent };
  let totalReward = 0;
  let reachedGoal = false;
  const path: Position[] = [{ ...pos }];

  for (let step = 0; step < MAX_TEST_STEPS; step += 1) {
    pos = chooseAction(grid, pos, qTable, 0, null);
    path.push({ ...pos });
    if (pos.x === world.goal.x && pos.y === world.goal.y) {
      totalReward += GOAL_REWARD;
      reachedGoal = true;
      break;
    }
    const cell = grid[pos.y][pos.x];
    if (cell.type === "reward") {
      totalReward += REWARD_VALUE;
      grid[pos.y][pos.x] = { ...cell, type: "empty", value: 0 };
    } else if (cell.type === "punishment") {
      totalReward += PUNISHMENT_VALUE;
      grid[pos.y][pos.x] = { ...cell, type: "empty", value: 0 };
    } else {
      totalReward += STEP_PENALTY;
    }
  }
  return { totalReward, steps: path.length - 1, reachedGoal, path };
};
