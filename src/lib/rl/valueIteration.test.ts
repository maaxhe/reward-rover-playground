import { describe, it, expect } from "vitest";
import { createEmptyGrid } from "./gridUtils";
import { GOAL_REWARD, STEP_PENALTY } from "./constants";
import { greedyDirection, greedyPath, solveValues, sweepValues, zeroValues } from "./valueIteration";

describe("valueIteration", () => {
  const goal = { x: 4, y: 2 };

  it("first sweep only knows the tile next to the goal", () => {
    const grid = createEmptyGrid(5);
    const v1 = sweepValues(grid, goal, zeroValues(5), 0.9);
    expect(v1[2][3]).toBe(GOAL_REWARD);
    // two tiles away the best it can see is a step penalty plus a worthless neighbour
    expect(v1[2][2]).toBe(STEP_PENALTY);
    expect(v1[2][4]).toBe(0); // the goal itself is terminal
  });

  it("each sweep pushes the goal's value one tile further back", () => {
    const grid = createEmptyGrid(5);
    const gamma = 0.9;
    let v = zeroValues(5);
    v = sweepValues(grid, goal, v, gamma);
    v = sweepValues(grid, goal, v, gamma);
    expect(v[2][2]).toBeCloseTo(STEP_PENALTY + gamma * GOAL_REWARD, 6);
    v = sweepValues(grid, goal, v, gamma);
    expect(v[2][1]).toBeCloseTo(STEP_PENALTY + gamma * (STEP_PENALTY + gamma * GOAL_REWARD), 6);
  });

  it("converges to the closed form on an open board", () => {
    const grid = createEmptyGrid(5);
    const gamma = 0.9;
    const { values } = solveValues(grid, goal, gamma);
    // d steps from the goal: (d-1) step penalties, then the goal reward, all discounted
    const closed = (d: number) => {
      let value = GOAL_REWARD;
      for (let i = 1; i < d; i++) value = STEP_PENALTY + gamma * value;
      return value;
    };
    expect(values[2][3]).toBeCloseTo(closed(1), 3);
    expect(values[2][0]).toBeCloseTo(closed(4), 3);
    expect(values[0][0]).toBeCloseTo(closed(6), 3);
  });

  it("a low gamma shrinks how far the goal can be felt", () => {
    const grid = createEmptyGrid(5);
    const far = { x: 0, y: 0 };
    const low = solveValues(grid, goal, 0.3).values;
    const high = solveValues(grid, goal, 0.95).values;
    expect(low[far.y][far.x]).toBeLessThan(0);
    expect(high[far.y][far.x]).toBeGreaterThan(0);
  });

  it("greedy direction walks around walls toward the goal", () => {
    const grid = createEmptyGrid(5);
    grid[2][3].type = "obstacle"; // wall right in front of the goal
    const { values } = solveValues(grid, goal, 0.9);
    const dir = greedyDirection(grid, goal, values, { x: 2, y: 2 }, 0.9);
    expect(["up", "down"]).toContain(dir);
    expect(greedyDirection(grid, goal, values, goal, 0.9)).toBeUndefined();
    expect(greedyDirection(grid, goal, values, { x: 3, y: 2 }, 0.9)).toBeUndefined();
  });

  it("greedy path reaches the goal on a converged board and is null before anything is known", () => {
    const grid = createEmptyGrid(5);
    const start = { x: 0, y: 2 };
    const { values } = solveValues(grid, goal, 0.9);
    const path = greedyPath(grid, goal, values, start, 0.9);
    expect(path?.length).toBe(5);
    expect(path?.[4]).toEqual(goal);
    expect(greedyPath(grid, goal, zeroValues(5), start, 0.9)).toBeNull();
  });

  it("planner values stay finite with a candy on the board (no endless farming)", () => {
    const grid = createEmptyGrid(5);
    grid[2][1].type = "reward";
    const v = solveValues(grid, goal, 0.95).values;
    expect(Number.isFinite(v[2][0])).toBe(true);
    expect(v[2][0]).toBeLessThan(100);
    // the candy beside the start makes starting there worth more than on the same board without it
    const plain = solveValues(createEmptyGrid(5), goal, 0.95).values;
    expect(v[2][0]).toBeGreaterThan(plain[2][0]);
  });
});
