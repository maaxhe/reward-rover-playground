import { describe, it, expect } from "vitest";
import { stepPlayground, type PlaygroundParams } from "./playgroundStep";
import { createEmptyGrid } from "./gridUtils";
import type { PlaygroundState, TileState } from "./types";

const tile = (type: TileState["type"]): TileState => ({ type, qValue: 0, visits: 0, value: 0 });

const makeState = (): PlaygroundState => {
  const grid = createEmptyGrid(4);
  grid[1][1] = tile("reward");
  grid[2][2] = tile("punishment");
  grid[0][3] = tile("goal");
  return {
    agent: { x: 0, y: 3 },
    spawn: { x: 0, y: 3 },
    goal: { x: 3, y: 0 },
    grid,
    isRunning: true,
    episode: 0,
    totalReward: 0,
    currentSteps: 0,
    episodeHistory: [],
    portalCooldowns: {},
    pendingPortalTeleport: null,
    qTable: {},
  };
};

const params = (over: Partial<PlaygroundParams> = {}): PlaygroundParams => ({
  explorationRate: 0.5, alpha: 0.3, gamma: 0.9, consumeRewards: true, autoRestart: true, directionBias: null, ...over,
});

/** Runs until `episodes` episodes are finished; returns the state right after the last goal hit. */
const runEpisodes = (start: PlaygroundState, p: PlaygroundParams, episodes: number, onStep?: (s: PlaygroundState) => PlaygroundState) => {
  let state = start;
  for (let i = 0; i < 20000 && state.episode < episodes; i++) {
    state = stepPlayground(onStep ? onStep(state) : state, p).nextState;
  }
  expect(state.episode).toBe(episodes);
  return state;
};

const count = (state: PlaygroundState, type: TileState["type"]) => state.grid.flat().filter((c) => c.type === type).length;

describe("stepPlayground", () => {
  it("brings eaten rewards and punishments back after every episode", () => {
    for (let ep = 1; ep <= 5; ep++) {
      const state = runEpisodes(makeState(), params(), ep);
      expect(count(state, "reward")).toBe(1);
      expect(count(state, "punishment")).toBe(1);
      expect(state.consumedTiles).toEqual([]);
    }
  });

  it("really consumes tiles during an episode", () => {
    let state = makeState();
    let sawGone = false;
    for (let i = 0; i < 5000 && state.episode < 1; i++) {
      state = stepPlayground(state, params()).nextState;
      if (state.episode === 0 && state.consumedTiles!.length > 0) {
        sawGone = true;
        expect(count(state, "reward") + count(state, "punishment")).toBeLessThan(2);
      }
    }
    expect(sawGone).toBe(true);
  });

  it("never touches tiles when consuming is off", () => {
    let state = makeState();
    for (let i = 0; i < 2000; i++) {
      state = stepPlayground(state, params({ consumeRewards: false })).nextState;
      expect(state.consumedTiles ?? []).toEqual([]);
      expect(count(state, "reward")).toBe(1);
      expect(count(state, "punishment")).toBe(1);
    }
  });

  it("keeps a tile the player placed on an eaten spot", () => {
    const state = runEpisodes(makeState(), params({ explorationRate: 1 }), 1, (s) => {
      if (s.consumedTiles?.length) {
        const [{ x, y }] = s.consumedTiles;
        const grid = s.grid.map((row) => row.map((c) => ({ ...c })));
        grid[y][x] = tile("obstacle");
        return { ...s, grid };
      }
      return s;
    });
    expect(count(state, "obstacle")).toBeGreaterThanOrEqual(1);
  });

  it("stops after the goal when autoRestart is off and resets the episode counters", () => {
    let state = makeState();
    for (let i = 0; i < 5000 && state.episode < 1; i++) state = stepPlayground(state, params({ autoRestart: false })).nextState;
    expect(state.isRunning).toBe(false);
    expect(state.agent).toEqual(state.spawn);
    expect(state.currentSteps).toBe(0);
    expect(state.episodeHistory).toHaveLength(1);
  });

  it("reports the pickup for the animation only when the rover moved onto it", () => {
    // From (1,2) the rover can step onto the reward at (1,1) or the punishment at (2,2).
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const r = stepPlayground({ ...makeState(), agent: { x: 1, y: 2 } }, params({ explorationRate: 1 }));
      if (r.rewardTileMoved) seen.add(JSON.stringify(r.rewardTileMoved));
    }
    expect(seen).toEqual(new Set([
      JSON.stringify({ x: 1, y: 1, tileType: "reward" }),
      JSON.stringify({ x: 2, y: 2, tileType: "punishment" }),
    ]));
  });
});
