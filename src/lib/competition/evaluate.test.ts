import { describe, it, expect } from "vitest";
import { buildWorld, evaluateGreedy, isValidQTable, WORLD_SIZE } from "../../../server/lib/competition.js";
import { runTest, worldToState, type CompetitionWorld } from "./world";
import { stepPlayground } from "@/lib/rl/playgroundStep";
import type { QTable } from "@/lib/rl/qLearning";

const randomQTable = (size: number, rng: () => number): QTable => {
  const q: QTable = {};
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (rng() < 0.9) q[`${x},${y}`] = [0, 1, 2, 3].map(() => Math.round((rng() - 0.5) * 40) / 4) as [number, number, number, number];
    }
  }
  return q;
};

const lcg = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

describe("competition world", () => {
  it("is deterministic per seed and always solvable-shaped", () => {
    const a = buildWorld(42) as CompetitionWorld;
    const b = buildWorld(42) as CompetitionWorld;
    expect(a).toEqual(b);
    expect(a.size).toBe(WORLD_SIZE);
    expect(a.tiles.some((t) => t.x === a.goal.x && t.y === a.goal.y)).toBe(false);
    expect(Math.abs(a.agent.x - a.goal.x) + Math.abs(a.agent.y - a.goal.y)).toBeGreaterThanOrEqual(8);
  });

  it("builds a world for many seeds without throwing", () => {
    for (let seed = 1; seed < 300; seed += 1) expect(() => buildWorld(seed)).not.toThrow();
  });
});

describe("server test run matches the client", () => {
  it("gives identical results for random Q-tables", () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const world = buildWorld(seed) as CompetitionWorld;
      const q = randomQTable(world.size, lcg(seed));
      const server = evaluateGreedy(world, q);
      const client = runTest(world, q);
      expect(client).toEqual(server);
    }
  });

  it("handles an untrained rover (empty Q-table) the same way", () => {
    const world = buildWorld(7) as CompetitionWorld;
    expect(runTest(world, {})).toEqual(evaluateGreedy(world, {}));
  });
});

describe("a trained rover beats an untrained one", () => {
  it("reaches the goal after enough Q-learning episodes", () => {
    const world = buildWorld(11) as CompetitionWorld;
    let state = worldToState(world);
    const params = { explorationRate: 0.2, alpha: 0.3, gamma: 0.95, consumeRewards: true, autoRestart: true, directionBias: null };
    state = { ...state, isRunning: true };
    // Training is random, so look at snapshots along the way instead of one final Q-table.
    let best = runTest(world, {});
    const untrained = best;
    let guard = 0;
    while (state.episode < 600 && guard < 400000) {
      const before = state.episode;
      state = stepPlayground(state, params).nextState;
      guard += 1;
      if (state.episode !== before && state.episode % 25 === 0) {
        const r = runTest(world, state.qTable);
        if (r.totalReward > best.totalReward) best = r;
      }
    }
    expect(best.reachedGoal).toBe(true);
    expect(best.totalReward).toBeGreaterThan(untrained.totalReward);
  });
});

describe("Q-table validation", () => {
  it("accepts well-formed tables and rejects junk", () => {
    expect(isValidQTable({ "0,0": [0, 1, 2, 3] })).toBe(true);
    expect(isValidQTable({})).toBe(true);
    expect(isValidQTable({ "9,0": [0, 0, 0, 0] })).toBe(false);
    expect(isValidQTable({ "0,0": [0, 0, 0] })).toBe(false);
    expect(isValidQTable({ "0,0": [0, 0, 0, NaN] })).toBe(false);
    expect(isValidQTable({ "a": [0, 0, 0, 0] })).toBe(false);
    expect(isValidQTable([])).toBe(false);
    expect(isValidQTable(null)).toBe(false);
  });
});
