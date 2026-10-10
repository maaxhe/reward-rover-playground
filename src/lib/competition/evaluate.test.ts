import { describe, it, expect } from "vitest";
import { buildWorld, evaluateGreedy, isValidQTable, normalizeWorldSettings, DEFAULT_WORLD_SETTINGS } from "../../../server/lib/competition.js";
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
    expect(a.size).toBe(DEFAULT_WORLD_SETTINGS.size);
    expect(a.tiles.some((t) => t.x === a.goal.x && t.y === a.goal.y)).toBe(false);
    expect(Math.abs(a.agent.x - a.goal.x) + Math.abs(a.agent.y - a.goal.y)).toBeGreaterThanOrEqual(8);
  });

  it("builds a world for many seeds without throwing", () => {
    for (let seed = 1; seed < 300; seed += 1) expect(() => buildWorld(seed)).not.toThrow();
  });
});

describe("world settings", () => {
  it("builds the requested number of tiles and respects distance", () => {
    const w = buildWorld(9, { size: 10, obstacles: 15, rewards: 4, punishments: 3, minDistance: 12 }) as CompetitionWorld;
    const count = (t: string) => w.tiles.filter((x) => x.type === t).length;
    expect(w.size).toBe(10);
    expect(count("obstacle")).toBe(15);
    expect(count("reward")).toBe(4);
    expect(count("punishment")).toBe(3);
    expect(Math.abs(w.agent.x - w.goal.x) + Math.abs(w.agent.y - w.goal.y)).toBeGreaterThanOrEqual(12);
    expect(w.maxSteps).toBe(200);
  });

  it("clamps impossible settings into buildable ones", () => {
    const n = normalizeWorldSettings({ size: 99, obstacles: 999, rewards: -4, punishments: 50, minDistance: 999 });
    expect(n.size).toBe(12);
    expect(n.obstacles).toBeLessThanOrEqual(Math.floor(12 * 12 * 0.3));
    expect(n.rewards).toBe(0);
    expect(n.punishments).toBe(12);
    expect(n.minDistance).toBeLessThanOrEqual(2 * 12 - 4);
    expect(() => buildWorld(1, n)).not.toThrow();
  });

  it("builds every extreme combination", () => {
    for (const size of [5, 8, 12]) {
      for (const obstacles of [0, 999]) {
        for (const minDistance of [2, 999]) {
          expect(() => buildWorld(size * 7 + obstacles, { size, obstacles, rewards: 12, punishments: 12, minDistance })).not.toThrow();
        }
      }
    }
  });

  it("server and client test runs agree on custom worlds too", () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const world = buildWorld(seed, { size: 5 + (seed % 8), obstacles: 6, rewards: 8, punishments: 8, minDistance: 5 }) as CompetitionWorld;
      const q = randomQTable(world.size, lcg(seed * 3));
      expect(runTest(world, q)).toEqual(evaluateGreedy(world, q));
    }
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
