import { describe, it, expect } from "vitest";
import { stepPlayground, REWARD_DECAY_FACTOR, type PlaygroundParams } from "./playgroundStep";
import { REWARD_VALUE } from "./constants";
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
    // A single random episode may never touch a reward tile, so give it several tries.
    for (let i = 0; i < 20000 && !sawGone; i++) {
      state = stepPlayground(state, params()).nextState;
      if (state.consumedTiles!.length > 0) {
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
    let verified = 0;
    // A random walk sometimes reaches the goal without eating anything; only count runs where it did.
    for (let attempt = 0; attempt < 200 && verified < 5; attempt++) {
      let placed = false;
      const state = runEpisodes(makeState(), params({ explorationRate: 1 }), 1, (s) => {
        if (s.consumedTiles?.length && !placed) {
          placed = true;
          const [{ x, y }] = s.consumedTiles;
          const grid = s.grid.map((row) => row.map((c) => ({ ...c })));
          grid[y][x] = tile("obstacle");
          return { ...s, grid };
        }
        return s;
      });
      if (!placed) continue;
      verified++;
      expect(count(state, "obstacle")).toBeGreaterThanOrEqual(1);
    }
    expect(verified).toBe(5);
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

  describe("rewardDecay (Level Mode)", () => {
    const decayParams = () => params({ consumeRewards: false, rewardDecay: true, explorationRate: 0, autoRestart: false });

    // Rover steps right/left across the reward at (1,1) by seeding Q-values, so the path is deterministic.
    const stepOnto = (state: PlaygroundState, from: { x: number; y: number }, action: number) => {
      const key = `${from.x},${from.y}`;
      const q: [number, number, number, number] = [0, 0, 0, 0];
      q[action] = 100;
      return stepPlayground({ ...state, agent: from, qTable: { ...state.qTable, [key]: q } }, decayParams());
    };

    it("keeps the reward on the board and pays half as much on every repeat hit", () => {
      let state = makeState();
      const hits: number[] = [];
      for (let i = 0; i < 4; i++) {
        const before = state.totalReward;
        // from (0,1) go right (3) onto the reward at (1,1)
        const res = stepOnto({ ...state, totalReward: 0 }, { x: 0, y: 1 }, 3);
        hits.push(res.nextState.totalReward);
        expect(res.nextState.grid[1][1].type).toBe("reward");
        state = { ...res.nextState, totalReward: before };
      }
      expect(hits).toEqual([0, 1, 2, 3].map((k) => REWARD_VALUE * REWARD_DECAY_FACTOR ** k));
    });

    it("starts fresh in the next episode", () => {
      const state = makeState();
      // two hits, then reach the goal from (2,0) going right
      let s = stepOnto(state, { x: 0, y: 1 }, 3).nextState;
      s = stepOnto(s, { x: 0, y: 1 }, 3).nextState;
      expect(Object.values(s.tileVisits ?? {})).toEqual([2]);
      const done = stepOnto({ ...s, goal: { x: 3, y: 0 } }, { x: 2, y: 0 }, 3).nextState;
      expect(done.episode).toBe(1);
      expect(done.tileVisits).toEqual({});
    });

    it("does not touch tiles when consumeRewards is on", () => {
      const res = stepPlayground(makeState(), params({ consumeRewards: true, rewardDecay: true }));
      expect(res.nextState.tileVisits ?? {}).toEqual({});
    });
  });
});
