import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { evaluateObjective, LEVEL_OBJECTIVES, shortestPathLength } from "./levelObjectives";
import { LEVEL_WORLDS } from "./levelWorlds";
import type { LevelNumber } from "./levelProgression";
import { createEmptyGrid } from "./rl/gridUtils";
import { chooseAction, getTileReward, getQValue, getMaxQValue, posToActionIndex, setQValue, type QTable } from "./rl/qLearning";
import { teleportThroughPortal } from "./rl/portalUtils";
import { recordConsumedTile, restoreConsumedTiles, type ConsumedTile } from "./rl/consumedTiles";
import type { EpisodeStats, TileState } from "./rl/types";

const buildGrid = (level: LevelNumber) => {
  const world = LEVEL_WORLDS[level];
  const grid = createEmptyGrid(world.size);
  world.tiles.forEach(({ x, y, type }) => {
    grid[y][x] = { type, qValue: 0, visits: 0, value: 0 } as TileState;
  });
  grid[world.goal.y][world.goal.x] = { type: "goal", qValue: 0, visits: 0, value: 0 } as TileState;
  return { grid, world };
};

// Headless copy of the worker's playground loop (portal wait of 2 steps included).
const simulate = (level: LevelNumber, alpha: number, gamma: number, epsilon: number, maxEpisodes: number, consume: boolean) => {
  const { grid, world } = buildGrid(level);
  const history: EpisodeStats[] = [];
  let q: QTable = {};
  for (let episode = 1; episode <= maxEpisodes; episode++) {
    let pos = { ...world.agent };
    let steps = 0;
    let eaten: ConsumedTile[] = [];
    while (steps < 3000) {
      const next = chooseAction(grid, pos, q, epsilon, null);
      let landing = next;
      let extra = 0;
      if (grid[next.y][next.x].type === "portal") {
        landing = teleportThroughPortal(grid, next);
        extra = 2;
      }
      const reward = getTileReward(grid, [world.goal], landing);
      if (consume && (grid[landing.y][landing.x].type === "reward" || grid[landing.y][landing.x].type === "punishment")) {
        eaten = recordConsumedTile(eaten, landing.x, landing.y, grid[landing.y][landing.x]);
        grid[landing.y][landing.x] = { ...grid[landing.y][landing.x], type: "empty" };
      }
      const a = posToActionIndex(pos, next);
      const target = reward + gamma * getMaxQValue(grid, landing, q);
      q = setQValue(q, pos, a, getQValue(q, pos, a) + alpha * (target - getQValue(q, pos, a)));
      pos = landing;
      steps += 1 + extra;
      if (pos.x === world.goal.x && pos.y === world.goal.y) break;
    }
    restoreConsumedTiles(grid, eaten);
    history.push({ episode, steps, reward: 0, success: true, mode: "playground" });
    const status = evaluateObjective({
      level, grid, spawn: world.agent, goal: world.goal, history: history.slice(-20), alpha: Math.max(alpha, 0.5), gamma: Math.max(gamma, 0.9),
    });
    if (status.efficientStreak >= LEVEL_OBJECTIVES[level].efficientEpisodes) return episode;
  }
  return Infinity;
};

// Deterministic Math.random (mulberry32) so the learnability numbers don't flicker between runs.
const seedRandom = (seed: number) => {
  let a = seed;
  vi.spyOn(Math, "random").mockImplementation(() => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  });
};

describe("level objectives", () => {
  beforeEach(() => seedRandom(12345));
  afterEach(() => vi.restoreAllMocks());

  it("every level world has a path to the goal", () => {
    for (let l = 1; l <= 10; l++) {
      const { grid, world } = buildGrid(l as LevelNumber);
      expect(Number.isFinite(shortestPathLength(grid, world.agent, world.goal))).toBe(true);
    }
  });

  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as LevelNumber[])(
    "level %i is learnable with sensible parameters in a reasonable number of episodes",
    (level) => {
      const alpha = level === 1 ? 0.1 : level === 2 ? 0.5 : 0.3;
      const gamma = level >= 3 ? 0.9 : 0.85;
      const runs = Array.from({ length: 60 }, () => simulate(level, alpha, gamma, 0.2, 400, true));
      runs.sort((a, b) => a - b);
      const p90 = runs[Math.floor(runs.length * 0.9)];
      console.log(`level ${level}: median ${runs[30]} p90 ${p90} episodes`);
      expect(p90).toBeLessThan(400);
    },
  );

  it("level 1 is not solved by a single random run", () => {
    const { grid, world } = buildGrid(1);
    const status = evaluateObjective({
      level: 1, grid, spawn: world.agent, goal: world.goal,
      history: [{ episode: 1, steps: 60, reward: 0, success: true, mode: "playground" }], alpha: 0.1, gamma: 0.85,
    });
    expect(status.solved).toBe(false);
  });

  it("build objectives count only tiles beyond the pre-built world", () => {
    const { grid, world } = buildGrid(5);
    const history = Array.from({ length: 3 }, (_, i) => ({ episode: i + 1, steps: 8, reward: 0, success: true, mode: "playground" as const }));
    const args = { level: 5 as LevelNumber, grid, spawn: world.agent, goal: world.goal, history, alpha: 0.1, gamma: 0.85 };
    expect(evaluateObjective(args).solved).toBe(false);
    grid[3][1] = { type: "punishment", qValue: 0, visits: 0, value: 0 } as TileState;
    expect(evaluateObjective(args).solved).toBe(true);
  });
});
