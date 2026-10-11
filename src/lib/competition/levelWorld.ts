import { LEVEL_WORLDS } from "@/lib/levelWorlds";
import { LEVEL_CONFIGS, type LevelNumber } from "@/lib/levelProgression";
import type { CustomWorldInput } from "./api";

export const LEVEL_NUMBERS = Object.keys(LEVEL_WORLDS).map(Number) as LevelNumber[];

export const levelLabel = (level: number) => LEVEL_CONFIGS[level as LevelNumber]?.name ?? `Level ${level}`;

/** True when the level world has portals (they are left out in the classroom: random teleports would make the test unfair). */
export const levelHasPortals = (level: number) => LEVEL_WORLDS[level as LevelNumber]?.tiles.some((t) => t.type === "portal") ?? false;

/** A level world as the classroom server accepts it (portals dropped). */
export const levelToCustomWorld = (level: number): CustomWorldInput => {
  const w = LEVEL_WORLDS[level as LevelNumber];
  return {
    size: w.size,
    agent: { ...w.agent },
    goal: { ...w.goal },
    tiles: w.tiles.flatMap((t) =>
      t.type === "obstacle" || t.type === "reward" || t.type === "punishment" ? [{ x: t.x, y: t.y, type: t.type }] : [],
    ),
  };
};
