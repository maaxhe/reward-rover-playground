import type { LevelNumber } from "@/lib/levelProgression";
import type { Position } from "@/lib/rl/types";
import type { TileType } from "@/components/RL/Tile";

export interface LevelWorld {
  size: number;
  tiles: Array<{ x: number; y: number; type: TileType }>;
  agent: Position;
  goal: Position;
}

// One small hand-built world per Level Mode stage (1–10), so advancing a
// level lands the rover in a fresh scenario instead of a blank grid. Each
// world foreshadows what the level teaches — e.g. rewards/punishments/walls
// appear on the board even before the matching placement tool unlocks, so
// there's always something to learn from.
export const LEVEL_WORLDS: Record<LevelNumber, LevelWorld> = {
  1: {
    size: 5,
    tiles: [],
    agent: { x: 0, y: 4 },
    goal: { x: 4, y: 0 },
  },
  2: {
    size: 5,
    tiles: [
      { x: 2, y: 1, type: "obstacle" },
      { x: 2, y: 3, type: "obstacle" },
    ],
    agent: { x: 0, y: 4 },
    goal: { x: 4, y: 0 },
  },
  3: {
    size: 6,
    tiles: [
      { x: 3, y: 4, type: "reward" },
      { x: 1, y: 1, type: "obstacle" },
      { x: 4, y: 2, type: "obstacle" },
    ],
    agent: { x: 0, y: 5 },
    goal: { x: 5, y: 0 },
  },
  4: {
    size: 6,
    tiles: [
      { x: 2, y: 4, type: "reward" },
      { x: 4, y: 1, type: "reward" },
      { x: 1, y: 2, type: "obstacle" },
    ],
    agent: { x: 0, y: 5 },
    goal: { x: 5, y: 0 },
  },
  5: {
    size: 6,
    tiles: [
      { x: 2, y: 4, type: "reward" },
      { x: 4, y: 1, type: "reward" },
      { x: 3, y: 2, type: "punishment" },
      { x: 1, y: 4, type: "punishment" },
    ],
    agent: { x: 0, y: 5 },
    goal: { x: 5, y: 0 },
  },
  6: {
    size: 7,
    tiles: [
      { x: 2, y: 1, type: "obstacle" },
      { x: 2, y: 2, type: "obstacle" },
      { x: 2, y: 3, type: "obstacle" },
      { x: 4, y: 3, type: "obstacle" },
      { x: 4, y: 4, type: "obstacle" },
      { x: 4, y: 5, type: "obstacle" },
      { x: 3, y: 5, type: "reward" },
      { x: 5, y: 1, type: "punishment" },
    ],
    agent: { x: 0, y: 6 },
    goal: { x: 6, y: 0 },
  },
  7: {
    size: 8,
    tiles: [
      { x: 2, y: 1, type: "obstacle" },
      { x: 2, y: 2, type: "obstacle" },
      { x: 2, y: 3, type: "obstacle" },
      { x: 5, y: 4, type: "obstacle" },
      { x: 5, y: 5, type: "obstacle" },
      { x: 5, y: 6, type: "obstacle" },
      { x: 4, y: 2, type: "reward" },
      { x: 1, y: 6, type: "reward" },
      { x: 6, y: 2, type: "punishment" },
    ],
    agent: { x: 0, y: 7 },
    goal: { x: 7, y: 0 },
  },
  8: {
    size: 8,
    tiles: [
      { x: 3, y: 0, type: "obstacle" },
      { x: 3, y: 1, type: "obstacle" },
      { x: 3, y: 2, type: "obstacle" },
      { x: 3, y: 3, type: "obstacle" },
      { x: 3, y: 5, type: "obstacle" },
      { x: 3, y: 6, type: "obstacle" },
      { x: 3, y: 7, type: "obstacle" },
      { x: 1, y: 4, type: "portal" },
      { x: 5, y: 4, type: "portal" },
      { x: 6, y: 1, type: "reward" },
      { x: 6, y: 6, type: "punishment" },
    ],
    agent: { x: 0, y: 4 },
    goal: { x: 7, y: 0 },
  },
  9: {
    size: 9,
    tiles: [
      { x: 2, y: 2, type: "obstacle" },
      { x: 2, y: 3, type: "obstacle" },
      { x: 2, y: 4, type: "obstacle" },
      { x: 6, y: 4, type: "obstacle" },
      { x: 6, y: 5, type: "obstacle" },
      { x: 6, y: 6, type: "obstacle" },
      { x: 1, y: 6, type: "portal" },
      { x: 7, y: 2, type: "portal" },
      { x: 4, y: 1, type: "reward" },
      { x: 4, y: 7, type: "reward" },
      { x: 5, y: 2, type: "punishment" },
      { x: 3, y: 6, type: "punishment" },
    ],
    agent: { x: 0, y: 8 },
    goal: { x: 8, y: 0 },
  },
  10: {
    size: 10,
    tiles: [
      { x: 3, y: 1, type: "obstacle" },
      { x: 3, y: 2, type: "obstacle" },
      { x: 3, y: 3, type: "obstacle" },
      { x: 3, y: 4, type: "obstacle" },
      { x: 6, y: 5, type: "obstacle" },
      { x: 6, y: 6, type: "obstacle" },
      { x: 6, y: 7, type: "obstacle" },
      { x: 6, y: 8, type: "obstacle" },
      { x: 1, y: 7, type: "portal" },
      { x: 8, y: 2, type: "portal" },
      { x: 5, y: 1, type: "reward" },
      { x: 1, y: 3, type: "reward" },
      { x: 8, y: 8, type: "reward" },
      { x: 4, y: 6, type: "punishment" },
      { x: 7, y: 4, type: "punishment" },
    ],
    agent: { x: 0, y: 9 },
    goal: { x: 9, y: 0 },
  },
};
