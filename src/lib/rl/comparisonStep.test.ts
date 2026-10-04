import { describe, it, expect } from "vitest";
import { runComparisonRoverStep } from "./comparisonStep";
import { createEmptyGrid } from "./gridUtils";
import type { ComparisonRoverState, TileState } from "./types";

const tile = (type: TileState["type"]): TileState => ({ type, qValue: 0, visits: 0, value: 0 });

const makeRover = (): ComparisonRoverState => {
  const grid = createEmptyGrid(4);
  grid[1][1] = tile("reward");
  grid[2][2] = tile("punishment");
  grid[0][3] = tile("goal");
  return {
    agent: { x: 0, y: 3 }, spawn: { x: 0, y: 3 }, goal: { x: 3, y: 0 }, grid,
    isRunning: true, episode: 0, totalReward: 0, currentSteps: 0, episodeHistory: [],
    alpha: 0.3, gamma: 0.9, explorationRate: 0.5, name: "test", portalCooldowns: {}, qTable: {},
  };
};

const count = (s: ComparisonRoverState, type: TileState["type"]) => s.grid.flat().filter((c) => c.type === type).length;

describe("runComparisonRoverStep", () => {
  it("restores eaten tiles when an episode ends", () => {
    let rover = makeRover();
    for (let i = 0; i < 20000 && rover.episode < 3; i++) rover = runComparisonRoverStep(rover, true);
    expect(rover.episode).toBe(3);
    expect(count(rover, "reward")).toBe(1);
    expect(count(rover, "punishment")).toBe(1);
  });

  it("leaves tiles alone when consuming is off", () => {
    let rover = makeRover();
    for (let i = 0; i < 1000; i++) {
      rover = runComparisonRoverStep(rover, false);
      expect(count(rover, "reward")).toBe(1);
    }
  });
});
