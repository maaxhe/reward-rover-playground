import type { LevelNumber } from "@/lib/levelProgression";
import { LEVEL_WORLDS } from "@/lib/levelWorlds";
import type { EpisodeStats, Position, TileState } from "@/lib/rl/types";

type BuildTile = "reward" | "punishment" | "obstacle" | "portal";

export interface LevelObjective {
  /** The last N successful episodes must all be efficient (this is what "learned" means). */
  efficientEpisodes: number;
  /** An episode is efficient if steps <= shortestPath * stepFactor. */
  stepFactor: number;
  minAlpha?: number;
  minGamma?: number;
  /** The player must place at least `extra` more tiles of this type than the pre-built world has. */
  build?: { tile: BuildTile; extra: number };
  /** The player must change the grid size away from the level's default. */
  resizeGrid?: boolean;
  hint: { de: string; en: string };
}

export const LEVEL_OBJECTIVES: Record<LevelNumber, LevelObjective> = {
  1: {
    efficientEpisodes: 3,
    stepFactor: 2.5,
    hint: {
      de: "Anfangs läuft der Rover fast blind. Mit jeder Runde merkt er sich bessere Wege. Probiere die Erkundungsrate: zu niedrig und er probiert nichts Neues, zu hoch und er läuft weiter zufällig.",
      en: "At first the rover moves almost blindly. Each run it remembers better paths. Try the exploration rate: too low and it never tries anything new, too high and it keeps wandering randomly.",
    },
  },
  2: {
    efficientEpisodes: 3,
    stepFactor: 2.5,
    minAlpha: 0.5,
    hint: {
      de: "Alpha ist die Lernrate: Wie stark überschreibt neue Erfahrung das alte Wissen? Bei hohem α lernt der Rover schnell, bei niedrigem vorsichtig. Vergleiche die Anzahl der Episoden.",
      en: "Alpha is the learning rate: how strongly does new experience overwrite old knowledge? A high α learns fast, a low α learns cautiously. Compare the number of episodes.",
    },
  },
  3: {
    efficientEpisodes: 3,
    stepFactor: 2,
    minGamma: 0.9,
    hint: {
      de: "Gamma bestimmt, wie sehr der Rover an die Zukunft denkt. Bei hohem γ lohnt sich der Weg zum Ziel mehr als die kleine Belohnung am Rand. Setze γ auf mindestens 0,9.",
      en: "Gamma decides how much the rover cares about the future. With a high γ the path to the goal is worth more than the small reward on the side. Set γ to at least 0.9.",
    },
  },
  4: {
    efficientEpisodes: 3,
    stepFactor: 2,
    build: { tile: "reward", extra: 1 },
    hint: {
      de: "Platziere mindestens eine eigene Belohnung. Der Rover wird davon angezogen. Schau in die Q-Werte: Wo wird der Weg besonders hell?",
      en: "Place at least one reward of your own. The rover is drawn to it. Look at the Q-values: where does the path light up?",
    },
  },
  5: {
    efficientEpisodes: 3,
    stepFactor: 2,
    build: { tile: "punishment", extra: 1 },
    hint: {
      de: "Platziere mindestens eine eigene Strafe, zum Beispiel direkt auf dem kürzesten Weg. Der Rover muss einen Umweg lernen.",
      en: "Place at least one penalty of your own, for example right on the shortest path. The rover has to learn a detour.",
    },
  },
  6: {
    efficientEpisodes: 3,
    stepFactor: 2,
    build: { tile: "obstacle", extra: 2 },
    hint: {
      de: "Baue mindestens zwei zusätzliche Mauern. Lass einen Weg zum Ziel offen, sonst kann der Rover nie ankommen.",
      en: "Build at least two extra walls. Leave a path to the goal open, or the rover can never arrive.",
    },
  },
  7: {
    efficientEpisodes: 3,
    stepFactor: 2,
    resizeGrid: true,
    hint: {
      de: "Ändere die Gittergröße. Je größer das Feld, desto mehr Zustände muss der Rover erkunden und desto länger dauert das Lernen.",
      en: "Change the grid size. The bigger the field, the more states the rover has to explore and the longer learning takes.",
    },
  },
  8: {
    efficientEpisodes: 3,
    stepFactor: 2.5,
    build: { tile: "portal", extra: 2 },
    hint: {
      de: "Platziere ein weiteres Portalpaar. Portale sind Abkürzungen, die der Rover nur durch Ausprobieren findet.",
      en: "Place another portal pair. Portals are shortcuts the rover can only find by trying.",
    },
  },
  9: {
    efficientEpisodes: 4,
    stepFactor: 1.75,
    hint: {
      de: "Jetzt zählt Effizienz: Die letzten vier Läufe müssen nah am kürzesten Weg liegen. Passe α, γ und die Erkundung an.",
      en: "Efficiency counts now: the last four runs must be close to the shortest path. Tune α, γ and exploration.",
    },
  },
  10: {
    efficientEpisodes: 5,
    stepFactor: 1.6,
    hint: {
      de: "Meisterprüfung: Fünf Läufe in Folge fast auf dem optimalen Weg. Danach kennst du alle Stellschrauben und der Free Mode wartet.",
      en: "Master test: five runs in a row almost on the optimal path. After that you know every knob, and Free Mode awaits.",
    },
  },
};

/**
 * Shortest number of moves from `from` to `goal` on the current grid. Walls block,
 * portals teleport to the paired portal, everything else is walkable. Returns
 * Infinity when the goal can't be reached.
 */
export function shortestPathLength(grid: TileState[][], from: Position, goal: Position): number {
  const size = grid.length;
  const portals: Position[] = [];
  grid.forEach((row, y) => row.forEach((cell, x) => cell.type === "portal" && portals.push({ x, y })));
  const key = (p: Position) => `${p.x},${p.y}`;
  const seen = new Set([key(from)]);
  let frontier: Position[] = [from];
  for (let dist = 0; frontier.length; dist++) {
    const next: Position[] = [];
    for (const p of frontier) {
      if (p.x === goal.x && p.y === goal.y) return dist;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        let n: Position = { x: p.x + dx, y: p.y + dy };
        if (n.x < 0 || n.y < 0 || n.x >= size || n.y >= size) continue;
        const type = grid[n.y][n.x].type;
        if (type === "obstacle") continue;
        if (type === "portal") {
          const other = portals.find((q) => q.x !== n.x || q.y !== n.y);
          if (other) n = other;
        }
        if (!seen.has(key(n))) {
          seen.add(key(n));
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  return Infinity;
}

export interface ObjectiveRequirement {
  id: string;
  done: boolean;
  de: string;
  en: string;
}

export interface ObjectiveStatus {
  requirements: ObjectiveRequirement[];
  /** Successful, efficient episodes counted from the end of the history. */
  efficientStreak: number;
  stepLimit: number;
  solved: boolean;
}

const TILE_LABEL: Record<BuildTile, { de: [string, string]; en: [string, string] }> = {
  reward: { de: ["Belohnung", "Belohnungen"], en: ["reward", "rewards"] },
  punishment: { de: ["Strafe", "Strafen"], en: ["penalty", "penalties"] },
  obstacle: { de: ["Mauer", "Mauern"], en: ["wall", "walls"] },
  portal: { de: ["Portal", "Portale"], en: ["portal", "portals"] },
};

const countTiles = (grid: TileState[][], type: string) =>
  grid.reduce((sum, row) => sum + row.filter((cell) => cell.type === type).length, 0);

export function evaluateObjective(args: {
  level: LevelNumber;
  grid: TileState[][];
  spawn: Position;
  goal: Position;
  history: EpisodeStats[];
  alpha: number;
  gamma: number;
}): ObjectiveStatus {
  const { level, grid, spawn, goal, history, alpha, gamma } = args;
  const objective = LEVEL_OBJECTIVES[level];
  const world = LEVEL_WORLDS[level];
  const shortest = shortestPathLength(grid, spawn, goal);
  const stepLimit = Number.isFinite(shortest) ? Math.ceil(shortest * objective.stepFactor) : 0;

  let efficientStreak = 0;
  if (stepLimit > 0) {
    for (let i = history.length - 1; i >= 0; i--) {
      const ep = history[i];
      if (!ep.success || ep.steps > stepLimit) break;
      efficientStreak++;
    }
  }

  const requirements: ObjectiveRequirement[] = [];
  if (objective.minAlpha !== undefined) {
    requirements.push({
      id: "alpha",
      done: alpha >= objective.minAlpha,
      de: `Lernrate α auf mindestens ${objective.minAlpha} stellen`,
      en: `Set learning rate α to at least ${objective.minAlpha}`,
    });
  }
  if (objective.minGamma !== undefined) {
    requirements.push({
      id: "gamma",
      done: gamma >= objective.minGamma,
      de: `Diskontfaktor γ auf mindestens ${objective.minGamma} stellen`,
      en: `Set discount factor γ to at least ${objective.minGamma}`,
    });
  }
  if (objective.build) {
    const { tile, extra } = objective.build;
    const baseline = world.tiles.filter((t) => t.type === tile).length;
    const placed = Math.max(0, countTiles(grid, tile) - baseline);
    const label = TILE_LABEL[tile];
    requirements.push({
      id: "build",
      done: placed >= extra,
      de: `${extra} zusätzliche ${label.de[extra === 1 ? 0 : 1]} platzieren (${Math.min(placed, extra)}/${extra})`,
      en: `Place ${extra} extra ${label.en[extra === 1 ? 0 : 1]} (${Math.min(placed, extra)}/${extra})`,
    });
  }
  if (objective.resizeGrid) {
    requirements.push({
      id: "resize",
      done: grid.length !== world.size,
      de: "Die Gittergröße ändern",
      en: "Change the grid size",
    });
  }
  requirements.push({
    id: "efficient",
    done: efficientStreak >= objective.efficientEpisodes,
    de: Number.isFinite(shortest)
      ? `${objective.efficientEpisodes} Läufe in Folge mit höchstens ${stepLimit} Schritten (${Math.min(efficientStreak, objective.efficientEpisodes)}/${objective.efficientEpisodes})`
      : "Es gibt keinen Weg zum Ziel. Entferne eine Mauer.",
    en: Number.isFinite(shortest)
      ? `${objective.efficientEpisodes} runs in a row with at most ${stepLimit} steps (${Math.min(efficientStreak, objective.efficientEpisodes)}/${objective.efficientEpisodes})`
      : "There is no path to the goal. Remove a wall.",
  });

  return {
    requirements,
    efficientStreak,
    stepLimit,
    solved: requirements.every((r) => r.done),
  };
}
