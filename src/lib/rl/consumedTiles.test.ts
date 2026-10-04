import { describe, it, expect } from "vitest";
import { recordConsumedTile, restoreConsumedTiles } from "./consumedTiles";
import { createEmptyGrid } from "./gridUtils";
import type { TileState } from "./types";

const tile = (type: TileState["type"], value = 0): TileState => ({ type, qValue: 0, visits: 0, value });

describe("consumed tiles", () => {
  it("records only rewards and punishments", () => {
    expect(recordConsumedTile([], 1, 2, tile("empty"))).toEqual([]);
    expect(recordConsumedTile([], 1, 2, tile("goal"))).toEqual([]);
    expect(recordConsumedTile([], 1, 2, tile("reward", 5))).toEqual([{ x: 1, y: 2, type: "reward", value: 5 }]);
    expect(recordConsumedTile([], 0, 0, tile("punishment", -3))).toEqual([{ x: 0, y: 0, type: "punishment", value: -3 }]);
  });

  it("does not mutate the input list", () => {
    const list = [{ x: 0, y: 0, type: "reward" as const, value: 1 }];
    recordConsumedTile(list, 1, 1, tile("reward", 1));
    expect(list).toHaveLength(1);
  });

  it("restores eaten tiles with their original value", () => {
    const grid = createEmptyGrid(3);
    restoreConsumedTiles(grid, [
      { x: 1, y: 0, type: "reward", value: 5 },
      { x: 2, y: 2, type: "punishment", value: -3 },
    ]);
    expect(grid[0][1]).toMatchObject({ type: "reward", value: 5 });
    expect(grid[2][2]).toMatchObject({ type: "punishment", value: -3 });
  });

  it("keeps tiles the player placed in the meantime", () => {
    const grid = createEmptyGrid(3);
    grid[0][1] = tile("obstacle");
    restoreConsumedTiles(grid, [{ x: 1, y: 0, type: "reward", value: 5 }]);
    expect(grid[0][1].type).toBe("obstacle");
  });

  it("ignores out-of-bounds entries (grid was resized)", () => {
    const grid = createEmptyGrid(2);
    expect(() => restoreConsumedTiles(grid, [{ x: 9, y: 9, type: "reward", value: 1 }])).not.toThrow();
  });
});
