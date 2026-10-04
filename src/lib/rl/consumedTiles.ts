import type { TileState } from "./types";

export interface ConsumedTile {
  x: number;
  y: number;
  type: "reward" | "punishment";
  value: number;
}

/** Remembers a tile that was just eaten, so it can be restored when the next episode starts. */
export const recordConsumedTile = (consumed: ConsumedTile[], x: number, y: number, tile: TileState): ConsumedTile[] =>
  tile.type === "reward" || tile.type === "punishment"
    ? [...consumed, { x, y, type: tile.type, value: tile.value }]
    : consumed;

/** Puts eaten tiles back (mutates `grid`), unless the player placed something else there meanwhile. */
export const restoreConsumedTiles = (grid: TileState[][], consumed: ConsumedTile[]): void => {
  for (const t of consumed) {
    if (grid[t.y]?.[t.x]?.type === "empty") {
      grid[t.y][t.x] = { ...grid[t.y][t.x], type: t.type, value: t.value };
    }
  }
};
