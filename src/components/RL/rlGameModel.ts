// Pure game model for RLGame: constants, labels, types and state factories (moved out of RLGame.tsx).
import { LEVEL_WORLDS } from "@/lib/levelWorlds";
import { PRESET_LEVELS, type GridConfig } from "@/lib/rl/presets";
import type { LevelNumber } from "@/lib/levelProgression";
import { TileType } from "./Tile";
import type { Position, TileState as LibTileState, PlaygroundState, ComparisonRoverState } from "@/lib/rl/types";
import { recordConsumedTile, restoreConsumedTiles, type ConsumedTile } from "@/lib/rl/consumedTiles";
import { stepPlayground } from "@/lib/rl/playgroundStep";
import { type QTable, chooseAction, getTileReward, getQValue, setQValue, getDisplayQValue, getMaxQValue, posToActionIndex } from "@/lib/rl/qLearning";
import { teleportThroughPortal, decrementPortalCooldowns, withPortalCooldowns, isPortalOnCooldown } from "@/lib/rl/portalUtils";
import { createEmptyGrid, cloneGrid, calculateItemCount, manhattanDistance } from "@/lib/rl/gridUtils";
import { getSpeedrunStageConfig, GOAL_REWARD, REWARD_VALUE, PUNISHMENT_VALUE, OBSTACLE_PENALTY } from "@/lib/rl/constants";

export const TILE_SIZE_MAP = {
  s: 6,
  m: 9,
  l: 14,
} as const;

export type Language = "de" | "en";

export const TILE_SIZE_LABELS: Record<Language, Record<keyof typeof TILE_SIZE_MAP, string>> = {
  de: {
    s: "Klein",
    m: "Mittel",
    l: "Groß",
  },
  en: {
    s: "Small",
    m: "Medium",
    l: "Large",
  },
};

export const TILE_ICONS: Record<TileType, string> = {
  empty: "",
  obstacle: "",
  reward: "🍬",
  punishment: "⚡",
  goal: "🎯",
  portal: "🌀",
};

export const TILE_LABELS: Record<Language, Record<TileType, string>> = {
  de: {
    empty: "Leer",
    obstacle: "Hindernis",
    reward: "Belohnung",
    punishment: "Strafe",
    goal: "Ziel",
    portal: "Portal",
  },
  en: {
    empty: "Empty",
    obstacle: "Wall",
    reward: "Reward",
    punishment: "Punishment",
    goal: "Goal",
    portal: "Portal",
  },
};

export const GRID_PIXEL_TARGET: Record<keyof typeof TILE_SIZE_MAP, number> = {
  s: 380,
  m: 480,
  l: 580,
};

export const MIN_GOAL_DISTANCE = 5;
export const BONUS_INTERVAL = 10;
export const TUTORIAL_STORAGE_KEY = "reward_rover_tutorial_seen";
export const LEVEL_COACH_STORAGE_KEY = "rr-level-coach-seen";

export const EPISODE_TITLES = [
  "Aurora Approach",
  "Nebula Run",
  "Photon Trail",
  "Orbit of Insight",
  "Cosmic Shortcut",
  "Meteor Glide",
  "Luminous Leap",
  "Ion Drift",
  "Gravity Groove",
  "Quantum Quest",
  "Stellar Sprint",
  "Satellite Swing",
  "Comet Carousel",
  "Solar Surge",
  "Pulse of Polaris",
  "Eclipse Escapade",
  "Nova Nexus",
  "Plasma Dash",
  "Orbit Overdrive",
  "Galactic Gambit",
  "Supernova Sprint",
  "Celestial Circuit",
  "Asteroid Ascent",
  "Photon Finale",
  "Lunar Loop",
  "Starlight Stride",
  "Ion Inferno",
  "Cosmos Crosswind",
  "Warpway Whirl",
  "Pulsar Pathway",
  "Zenith Zigzag",
  "Orbit Odyssey",
  "Quasar Questline",
  "Meteoric Maze",
  "Zephyr Zenith",
  "Aether Approach",
  "Radiant Relay",
  "Spectrum Sprint",
  "Gravity Gauntlet",
  "Solaris Speedway",
  "Nebula Nightfall",
  "Astro Ascent",
  "Prism Pursuit",
  "Chrono Comet",
  "Drift of Destiny",
  "Halo Hop",
  "Lattice Leap",
  "Orbit Outrun",
  "Plasma Parkway",
  "Vector Voyage",
  "Zenith Rush",
  "Stardust Spiral",
  "Cosmic Cascade",
  "Void Velocity",
  "Starfire Slalom",
  "Moonbeam Mission",
  "Hyperdrive Highway",
  "Constellation Cruise",
  "Astral Adventure",
  "Magnetar March",
  "Nebular Nomad",
  "Cosmic Corridor",
  "Titan Trek",
  "Starborn Sprint",
  "Celestial Sweep",
  "Quantum Quickstep",
  "Solar Surfing",
  "Interstellar Insight",
  "Stellar Synchrony",
  "Warp Wave",
  "Galaxy Glide",
  "Photon Phoenix",
  "Supergiant Shift",
  "Dark Matter Dash",
  "Cosmic Convergence",
  "Andromeda Arc",
  "Meteor Momentum",
  "Starlight Sequence",
  "Astro Algorithm",
  "Void Voyage",
  "Celestial Cipher",
  "Quantum Quasar",
  "Stellar Strategy",
  "Cosmic Calculation",
  "Orbit Optimizer",
  "Nebula Navigator",
  "Photon Pathfinder",
  "Galactic Gateway",
  "Space-Time Sprint",
  "Wormhole Wander",
  "Planetary Pursuit",
  "Asteroid Algorithm",
  "Comet Computation",
  "Supernova Solver",
  "Cosmic Catalyst",
  "Stellar Synapse",
  "Quantum Quotient",
  "Gravity Grid",
  "Celestial Calculation",
  "Aurora Analytics",
  "Cosmic Cognition",
  "Starfield Strategy",
] as const;

export type BonusType = "reward" | "punishment" | "obstacle" | "portal" | "teleport";

export const BONUS_TYPES: BonusType[] = ["reward", "punishment", "obstacle", "portal", "teleport"];

export const BONUS_WEIGHTS: Record<BonusType, number> = {
  reward: 3,
  punishment: 3,
  obstacle: 3,
  portal: 1,
  teleport: 2,
};

export const AUTH_TOKEN_KEY = "rr_token";
export const AUTH_USER_KEY = "rr_user";
export const safeLocalStorageGet = (key: string) => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
export const safeSessionStorageGet = (key: string) => {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

export type AuthUser = {
  id: number;
  username: string;
  role: "admin" | "user";
};

export const pickWeightedBonus = (): BonusType => {
  const total = BONUS_TYPES.reduce((sum, type) => sum + BONUS_WEIGHTS[type], 0);
  let roll = Math.random() * total;
  for (const type of BONUS_TYPES) {
    roll -= BONUS_WEIGHTS[type];
    if (roll <= 0) return type;
  }
  return BONUS_TYPES[0];
};

export interface CandidatePosition extends Position {
  distance: number;
}

export type TileSizeOption = keyof typeof TILE_SIZE_MAP;
export type Mode = "playground" | "random" | "comparison";

export type LevelKey = "level1" | "level2" | "level3";

export interface LevelConfig {
  key: LevelKey;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  sizeOffset: number;
  rewardDensity: number;
  punishmentDensity: number;
  obstacleDensity: number;
  goals: number;
}

export const LEVELS: Record<LevelKey, LevelConfig> = {
  level1: {
    key: "level1",
    name: "Level 1 – Übungswiese",
    nameEn: "Level 1 – Training Meadow",
    description: "Großzügiges Feld mit wenigen Hindernissen. Perfekt zum Starten.",
    descriptionEn: "Wide-open field with few obstacles. Perfect for getting started.",
    sizeOffset: 0,
    rewardDensity: 0.08,
    punishmentDensity: 0.05,
    obstacleDensity: 0.12,
    goals: 1,
  },
  level2: {
    key: "level2",
    name: "Level 2 – Pfadfinder",
    nameEn: "Level 2 – Path Finder",
    description: "Mehr Hindernisse und Fallen – der Rover braucht clevere Strategien.",
    descriptionEn: "More obstacles and traps – your rover needs sharper strategies.",
    sizeOffset: 0,
    rewardDensity: 0.1,
    punishmentDensity: 0.08,
    obstacleDensity: 0.18,
    goals: 2,
  },
  level3: {
    key: "level3",
    name: "Level 3 – Labyrinth",
    nameEn: "Level 3 – Labyrinth",
    description: "Dicht besetztes Feld mit vielen Strafen – nur für erfahrene Rover!",
    descriptionEn: "Dense maze filled with penalties – only for experienced rovers!",
    sizeOffset: 0,
    rewardDensity: 0.12,
    punishmentDensity: 0.1,
    obstacleDensity: 0.24,
    goals: 1,
  },
};

export interface SpeedrunStageConfig {
  timeLimit: number;
  level: LevelConfig;
}

export const SPEEDRUN_STAGES: SpeedrunStageConfig[] = [
  {
    timeLimit: 55,
    level: {
      ...LEVELS.level2,
      sizeOffset: 0,
      rewardDensity: LEVELS.level2.rewardDensity + 0.02,
      punishmentDensity: LEVELS.level2.punishmentDensity + 0.02,
      obstacleDensity: LEVELS.level2.obstacleDensity + 0.04,
    },
  },
  {
    timeLimit: 48,
    level: {
      ...LEVELS.level2,
      sizeOffset: 1,
      rewardDensity: LEVELS.level2.rewardDensity + 0.03,
      punishmentDensity: LEVELS.level2.punishmentDensity + 0.03,
      obstacleDensity: LEVELS.level2.obstacleDensity + 0.06,
    },
  },
  {
    timeLimit: 42,
    level: {
      ...LEVELS.level3,
      sizeOffset: 1,
      rewardDensity: LEVELS.level3.rewardDensity + 0.02,
      punishmentDensity: LEVELS.level3.punishmentDensity + 0.02,
      obstacleDensity: LEVELS.level3.obstacleDensity + 0.04,
    },
  },
  {
    timeLimit: 36,
    level: {
      ...LEVELS.level3,
      sizeOffset: 2,
      rewardDensity: LEVELS.level3.rewardDensity + 0.03,
      punishmentDensity: LEVELS.level3.punishmentDensity + 0.03,
      obstacleDensity: LEVELS.level3.obstacleDensity + 0.05,
    },
  },
  {
    timeLimit: 30,
    level: {
      ...LEVELS.level3,
      sizeOffset: 3,
      rewardDensity: LEVELS.level3.rewardDensity + 0.04,
      punishmentDensity: LEVELS.level3.punishmentDensity + 0.04,
      obstacleDensity: LEVELS.level3.obstacleDensity + 0.06,
    },
  },
];

export type TileState = LibTileState;

export type { PlaygroundState };

export interface EpisodeStats {
  episode: number;
  steps: number;
  reward: number;
  success: boolean;
  mode: "random" | "speedrun" | "playground";
  stage?: number;
  timeLimit?: number;
  timeUsed?: number;
}

export interface RandomModeState {
  /** Reward/punishment tiles eaten this episode; restored when the next episode starts. */
  consumedTiles?: ConsumedTile[];
  agent: Position;
  goals: Position[];
  grid: TileState[][];
  isRunning: boolean;
  episode: number;
  totalReward: number;
  level: LevelKey;
  currentSteps: number;
  episodeHistory: EpisodeStats[];
  activeBonus: BonusType | null;
  bonusReady: boolean;
  bonusCountdown: number;
  spawn: Position;
  speedrun: {
    active: boolean;
    stage: number;
    timeLeft: number;
    timeLimit: number;
    pendingStage: boolean;
    baseSize: number;
  };
  latestDrop: BonusType | null;
  portalCooldowns: Record<string, number>;
  qTable: QTable;
}

export interface ComparisonState {
  left: ComparisonRoverState;
  right: ComparisonRoverState;
}

export interface MoveStats {
  current: number;
  totalCompleted: number;
  episodes: number;
  average: number | null;
  best: number | null;
}

export const computeMoveStats = (state: ComparisonRoverState): MoveStats => {
  const completedSteps = state.episodeHistory.map((episode) => episode.steps);
  const totalCompleted = completedSteps.reduce((sum, steps) => sum + steps, 0);
  const episodes = completedSteps.length;
  const average = episodes > 0 ? totalCompleted / episodes : null;
  const best = episodes > 0 ? Math.min(...completedSteps) : null;

  return {
    current: state.currentSteps,
    totalCompleted,
    episodes,
    average,
    best,
  };
};

export type EpisodeSummary = {
  count: number;
  avgSteps: number | null;
  avgReward: number | null;
  bestReward: number | null;
  bestSteps: number | null;
};

export const computeEpisodeSummary = (history: EpisodeStats[]): EpisodeSummary => {
  const count = history.length;
  if (count === 0) {
    return {
      count,
      avgSteps: null,
      avgReward: null,
      bestReward: null,
      bestSteps: null,
    };
  }

  const totalSteps = history.reduce((sum, episode) => sum + episode.steps, 0);
  const totalReward = history.reduce((sum, episode) => sum + episode.reward, 0);
  const bestReward = Math.max(...history.map((episode) => episode.reward));
  const bestSteps = Math.min(...history.map((episode) => episode.steps));

  return {
    count,
    avgSteps: totalSteps / count,
    avgReward: totalReward / count,
    bestReward,
    bestSteps,
  };
};

export const selectGoalPositions = (
  grid: TileState[][],
  count: number,
  start: Position,
  forbidden: Set<string>,
  minDistance: number,
): Position[] => {
  const size = grid.length;
  const candidates: CandidatePosition[] = [];
  const fallbacks: CandidatePosition[] = [];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid[y][x].type !== "empty") continue;
      const key = `${x}-${y}`;
      if (forbidden.has(key)) continue;
      const distance = manhattanDistance(start, { x, y });
      const candidate: CandidatePosition = { x, y, distance };
      fallbacks.push(candidate);
      if (distance >= minDistance) {
        candidates.push(candidate);
      }
    }
  }

  let source: CandidatePosition[];
  if (candidates.length >= count) {
    source = candidates;
  } else {
    const sortedFallbacks = fallbacks.sort((a, b) => b.distance - a.distance);
    const limit = Math.min(sortedFallbacks.length, Math.max(count, count * 3));
    source = sortedFallbacks.slice(0, limit);
  }

  if (source.length === 0) return [];

  const pool = [...source];
  const selected: Position[] = [];

  while (selected.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    const chosen = pool.splice(index, 1)[0];
    selected.push({ x: chosen.x, y: chosen.y });
  }

  return selected;
};

export const runPlaygroundStep = (
  state: PlaygroundState,
  explorationRate: number,
  bias?: Position | null,
  consumeRewards = true,
  alpha = 0.1,
  gamma = 0.85,
  autoRestart = false,
  rewardDecay = false,
): PlaygroundState =>
  stepPlayground(state, { explorationRate, alpha, gamma, consumeRewards, rewardDecay, autoRestart, directionBias: bias ?? null }).nextState;

export const runRandomModeStep = (
  state: RandomModeState,
  explorationRate: number,
  bias?: Position | null,
  consumeRewards = true,
  alpha = 0.1,
  gamma = 0.85,
  autoRestart = false,
): RandomModeState => {
  const current = state.agent;
  let nextPos = chooseAction(state.grid, current, state.qTable, explorationRate, bias);
  const cooledCooldowns = decrementPortalCooldowns(state.portalCooldowns);
  let portalCooldowns = cooledCooldowns;

  // Check for portal teleportation
  if (
    state.grid[nextPos.y][nextPos.x].type === "portal" &&
    !isPortalOnCooldown(portalCooldowns, nextPos)
  ) {
    const entryPortal = nextPos;
    const targetPortal = teleportThroughPortal(state.grid, nextPos);
    portalCooldowns = withPortalCooldowns(portalCooldowns, [entryPortal, targetPortal]);
    nextPos = targetPortal;
  }

  const reward = getTileReward(state.grid, state.goals, nextPos);

  const newGrid = cloneGrid(state.grid);

  // Belohnungen und Strafen verschwinden beim Einsammeln (optional)
  let consumedTiles = state.consumedTiles ?? [];
  if (consumeRewards) {
    const tileType = state.grid[nextPos.y][nextPos.x].type;
    if (tileType === "reward" || tileType === "punishment") {
      consumedTiles = recordConsumedTile(consumedTiles, nextPos.x, nextPos.y, state.grid[nextPos.y][nextPos.x]);
      newGrid[nextPos.y][nextPos.x] = {
        ...newGrid[nextPos.y][nextPos.x],
        type: "empty",
        value: 0,
      };
    }
  }

  // Q-Learning update: Q(s,a) ← Q(s,a) + α[R + γ·max_a' Q(s',a') − Q(s,a)]
  const actionIdx = posToActionIndex(current, nextPos);
  const currentQ = getQValue(state.qTable, current, actionIdx);
  const maxNextQ = getMaxQValue(newGrid, nextPos, state.qTable);
  const newQ = currentQ + alpha * (reward + gamma * maxNextQ - currentQ);
  const newQTable = setQValue(state.qTable, current, actionIdx, newQ);

  const currentCell = newGrid[current.y][current.x];
  newGrid[current.y][current.x] = {
    ...currentCell,
    qValue: getDisplayQValue(newQTable, current),
    value: getDisplayQValue(newQTable, current),
    visits: currentCell.visits + 1,
  };

  const reachedGoal = state.goals.some((goal) => goal.x === nextPos.x && goal.y === nextPos.y);
  const newSteps = state.currentSteps + 1;

  // Wenn Ziel erreicht: Episode-Stats speichern und Challenge-Resources auffüllen
  if (reachedGoal) {
    restoreConsumedTiles(newGrid, consumedTiles);
    const isSpeedrun = state.speedrun.active;
    const timeUsed = isSpeedrun ? state.speedrun.timeLimit - state.speedrun.timeLeft : undefined;
    const episodeStat: EpisodeStats = {
      episode: state.episode + 1,
      steps: newSteps,
      reward: state.totalReward + reward,
      success: true,
      mode: isSpeedrun ? "speedrun" : "random",
      stage: isSpeedrun ? state.speedrun.stage : undefined,
      timeLimit: isSpeedrun ? state.speedrun.timeLimit : undefined,
      timeUsed,
    };
    const newHistory = [...state.episodeHistory.slice(-19), episodeStat];

    if (isSpeedrun) {
      const nextStage = Math.min(state.speedrun.stage + 1, SPEEDRUN_STAGES.length - 1);
      const stageConfig = getSpeedrunStageConfig(nextStage);
      return {
        ...state,
        consumedTiles: [],
        agent: { ...state.spawn },
        grid: newGrid,
        qTable: newQTable,
        totalReward: 0,
        isRunning: false,
        episode: state.episode + 1,
        currentSteps: 0,
        episodeHistory: newHistory,
        activeBonus: null,
        bonusReady: false,
        bonusCountdown: BONUS_INTERVAL,
        spawn: state.spawn,
        latestDrop: null,
        speedrun: {
          ...state.speedrun,
          stage: nextStage,
          timeLeft: stageConfig.timeLimit,
          timeLimit: stageConfig.timeLimit,
          pendingStage: true,
        },
        portalCooldowns: {},
      };
    }

    return {
      ...state,
      consumedTiles: [],
      agent: { ...state.spawn },
      grid: newGrid,
      qTable: newQTable,
      totalReward: 0,
      isRunning: autoRestart,
      episode: state.episode + 1,
      currentSteps: 0,
      episodeHistory: newHistory,
      activeBonus: null,
      bonusReady: false,
      bonusCountdown: BONUS_INTERVAL,
      spawn: state.spawn,
      latestDrop: null,
      portalCooldowns: {},
    };
  }

  return {
    ...state,
    consumedTiles,
    agent: nextPos,
    grid: newGrid,
    qTable: newQTable,
    totalReward: state.totalReward + reward,
    currentSteps: newSteps,
    spawn: state.spawn,
    portalCooldowns,
  };
};

// Helper function to build grid from config (static version without hooks)
export const buildGridFromConfigStatic = (config: GridConfig) => {
  const grid = createEmptyGrid(config.size);

  // Platziere Tiles
  config.tiles.forEach(({ x, y, type }) => {
    if (!grid[y] || !grid[y][x]) return;
    grid[y][x] = {
      type,
      qValue: 0,
      visits: 0,
      value: levelValue(type),
    };
  });

  const agent = config.agent || { x: 0, y: config.size - 1 };
  const goal = config.goal || { x: config.size - 1, y: 0 };

  grid[goal.y][goal.x] = {
    type: "goal",
    qValue: GOAL_REWARD,
    visits: 0,
    value: levelValue("goal"),
  };

  return { grid, agent, goal };
};

// Builds the small hand-built world for a given Level Mode stage (see LEVEL_WORLDS).
export const createLevelPlaygroundState = (level: LevelNumber): PlaygroundState => {
  const world = LEVEL_WORLDS[level];
  const { grid, agent, goal } = buildGridFromConfigStatic(world);
  return {
    agent: { ...agent },
    goal,
    grid,
    isRunning: false,
    episode: 0,
    totalReward: 0,
    currentSteps: 0,
    episodeHistory: [],
    spawn: agent,
    portalCooldowns: {},
    pendingPortalTeleport: null,
    qTable: {},
  };
};

export const createInitialPlaygroundState = (size: number, usePreset: boolean = false): PlaygroundState => {
  // Load "Zwei Wege" preset as default only on initial load
  if (usePreset) {
    const defaultPreset = PRESET_LEVELS.find(p => p.key === "twopaths");
    if (defaultPreset) {
      const { grid, agent, goal } = buildGridFromConfigStatic(defaultPreset);
      return {
        agent: { ...agent },
        goal,
        grid,
        isRunning: false,
        episode: 0,
        totalReward: 0,
        currentSteps: 0,
        episodeHistory: [],
        spawn: agent,
        portalCooldowns: {},
        pendingPortalTeleport: null,
        qTable: {},
      };
    }
  }

  // Create empty grid with specified size
  const safeSize = Math.max(size, 4);
  const spawn: Position = { x: Math.min(1, safeSize - 1), y: Math.min(1, safeSize - 1) };
  const goal: Position = { x: Math.max(safeSize - 2, 0), y: Math.max(safeSize - 2, 0) };
  const grid = createEmptyGrid(safeSize);
  grid[goal.y][goal.x] = { type: "goal", qValue: GOAL_REWARD, visits: 0, value: GOAL_REWARD };
  return {
    agent: { ...spawn },
    goal,
    grid,
    isRunning: false,
    episode: 0,
    totalReward: 0,
    currentSteps: 0,
    episodeHistory: [],
    spawn,
    portalCooldowns: {},
    pendingPortalTeleport: null,
    qTable: {},
  };
};

export const levelValue = (type: TileType): number => {
  switch (type) {
    case "reward":
      return REWARD_VALUE;
    case "punishment":
      return PUNISHMENT_VALUE;
    case "goal":
      return GOAL_REWARD;
    case "obstacle":
      return OBSTACLE_PENALTY;
    case "portal":
      return 0;
    default:
      return 0;
  }
};

export const randomCoord = (max: number) => Math.floor(Math.random() * max);

export const placeRandomTiles = (
  grid: TileState[][],
  count: number,
  type: TileType,
  forbidden: Set<string>,
  goals: Position[],
) => {
  const size = grid.length;
  let placed = 0;
  let guard = 0;
  while (placed < count && guard < 5000) {
    guard++;
    const x = randomCoord(size);
    const y = randomCoord(size);
    const key = `${x}-${y}`;
    if (forbidden.has(key)) continue;
    if (grid[y][x].type !== "empty") continue;
    grid[y][x] = { type, qValue: 0, visits: 0, value: levelValue(type) };
    forbidden.add(key);
    if (type === "goal") goals.push({ x, y });
    placed++;
  }
};

export const generateMaze = (grid: TileState[][], forbidden: Set<string>) => {
  const size = grid.length;

  // Zuerst alle Felder als Wände markieren (außer forbidden)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const key = `${x}-${y}`;
      if (!forbidden.has(key)) {
        grid[y][x] = { type: "obstacle", qValue: 0, visits: 0, value: levelValue("obstacle") };
      }
    }
  }

  // Recursive Backtracking für Labyrinth-Generierung
  const visited = new Set<string>();
  const dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]]; // Springe 2 Felder für Wände dazwischen

  const carve = (x: number, y: number) => {
    const key = `${x}-${y}`;
    visited.add(key);
    if (!forbidden.has(key)) {
      grid[y][x] = { type: "empty", qValue: 0, visits: 0, value: 0 };
    }

    // Shuffle directions
    const shuffled = [...dirs].sort(() => Math.random() - 0.5);

    for (const [dx, dy] of shuffled) {
      const nx = x + dx;
      const ny = y + dy;
      const nkey = `${nx}-${ny}`;

      if (nx >= 0 && nx < size && ny >= 0 && ny < size && !visited.has(nkey)) {
        // Carve the wall between
        const wx = x + dx / 2;
        const wy = y + dy / 2;
        const wkey = `${wx}-${wy}`;
        if (!forbidden.has(wkey)) {
          grid[wy][wx] = { type: "empty", qValue: 0, visits: 0, value: 0 };
        }
        carve(nx, ny);
      }
    }
  };

  // Starte vom Start-Punkt oder von (1, 1)
  const startX = 1;
  const startY = size - 2;
  carve(startX, startY);

  // Füge nur sehr wenige zusätzliche Pfade hinzu für echtes Labyrinth
  const extraPaths = Math.floor(size * 0.03); // Reduziert von 0.15 auf 0.03
  for (let i = 0; i < extraPaths; i++) {
    const x = randomCoord(size);
    const y = randomCoord(size);
    const key = `${x}-${y}`;
    if (!forbidden.has(key) && grid[y][x].type === "obstacle") {
      grid[y][x] = { type: "empty", qValue: 0, visits: 0, value: 0 };
    }
  }
};

export const softenMazeBorders = (grid: TileState[][], forbidden: Set<string>) => {
  const size = grid.length;
  if (size > 9) return; // nur für kleine und mittlere Labyrinthe

  // Öffne nur wenige zufällige Randfelder statt alle, um mehr Mauern zu behalten
  const borderOpenings = Math.max(2, Math.floor(size * 0.3)); // Nur 30% der Ränder öffnen
  const borderTiles: Position[] = [];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (y === 0 || y === size - 1 || x === 0 || x === size - 1) {
        const key = `${x}-${y}`;
        if (!forbidden.has(key)) {
          borderTiles.push({ x, y });
        }
      }
    }
  }

  // Öffne nur einige zufällige Randfelder
  const shuffled = borderTiles.sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(borderOpenings, shuffled.length); i++) {
    const pos = shuffled[i];
    grid[pos.y][pos.x] = { type: "empty", qValue: 0, visits: 0, value: 0 };
  }
};

export const createRandomModeState = (level: LevelConfig, baseSize: number): RandomModeState => {
  const gridSize = Math.max(4, baseSize + level.sizeOffset);
  const grid = createEmptyGrid(gridSize);
  const start: Position = {
    x: Math.min(1, gridSize - 1),
    y: Math.max(gridSize - 2, 0),
  };
  const goals: Position[] = [];
  const forbidden = new Set<string>([`${start.x}-${start.y}`]);

  const goalCount = gridSize >= 14 ? 2 : 1;
  const minGoalDistance =
    level.key === "level3"
      ? Math.max(MIN_GOAL_DISTANCE, Math.floor(gridSize * 0.6))
      : MIN_GOAL_DISTANCE;
  const goalPositions = selectGoalPositions(
    grid,
    goalCount,
    start,
    forbidden,
    minGoalDistance,
  );

  goalPositions.forEach((pos) => {
    grid[pos.y][pos.x] = {
      type: "goal",
      qValue: GOAL_REWARD,
      visits: 0,
      value: levelValue("goal"),
    };
    goals.push(pos);
    forbidden.add(`${pos.x}-${pos.y}`);
  });

  // Level 3 ist ein Labyrinth
  if (level.key === "level3") {
    generateMaze(grid, forbidden);
    softenMazeBorders(grid, forbidden);

    // Platziere Rewards und Punishments im Labyrinth
    const placeInMaze = (density: number, type: TileType, minimum = 1) => {
      const emptyTiles: Position[] = [];
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const key = `${x}-${y}`;
          if (!forbidden.has(key) && grid[y][x].type === "empty") {
            emptyTiles.push({ x, y });
          }
        }
      }

      const count = Math.min(emptyTiles.length, calculateItemCount(gridSize, density, minimum));
      const shuffled = emptyTiles.sort(() => Math.random() - 0.5);

      for (let i = 0; i < count; i++) {
        const pos = shuffled[i];
        grid[pos.y][pos.x] = { type, qValue: 0, visits: 0, value: levelValue(type) };
      }
    };

    placeInMaze(level.rewardDensity, "reward", Math.max(2, Math.round(gridSize / 3)));
    placeInMaze(level.punishmentDensity, "punishment", Math.max(2, Math.round(gridSize / 4)));

    // Platziere Portal-Paare im Labyrinth (1-2 Paare je nach Level-Größe)
    const portalPairs = Math.min(2, Math.max(1, Math.floor(gridSize / 10)));
    for (let i = 0; i < portalPairs; i++) {
      const emptyTiles: Position[] = [];
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const key = `${x}-${y}`;
          if (!forbidden.has(key) && grid[y][x].type === "empty") {
            emptyTiles.push({ x, y });
          }
        }
      }

      if (emptyTiles.length >= 2) {
        const shuffled = emptyTiles.sort(() => Math.random() - 0.5);
        grid[shuffled[0].y][shuffled[0].x] = { type: "portal", qValue: 0, visits: 0, value: 0 };
        grid[shuffled[1].y][shuffled[1].x] = { type: "portal", qValue: 0, visits: 0, value: 0 };
      }
    }
  } else {
    // Normale Level-Generierung für Level 1 und 2
    const placeWithDensity = (density: number, type: TileType, minimum = 1) => {
      const remaining = gridSize * gridSize - forbidden.size;
      if (remaining <= 0) return;
      const target = Math.min(remaining, calculateItemCount(gridSize, density, minimum));
      if (target > 0) {
        placeRandomTiles(grid, target, type, forbidden, goals);
      }
    };

    placeWithDensity(level.obstacleDensity, "obstacle", Math.max(2, Math.round(gridSize / 2)));
    placeWithDensity(level.rewardDensity, "reward", Math.max(2, Math.round(gridSize / 3)));
    placeWithDensity(level.punishmentDensity, "punishment", Math.max(2, Math.round(gridSize / 4)));

    // Platziere 1-2 Portal-Paare in normalen Levels
    const portalPairs = level.key === "level2" ? 1 : (level.key === "level1" ? 0 : 1);
    for (let i = 0; i < portalPairs; i++) {
      const remaining = gridSize * gridSize - forbidden.size;
      if (remaining >= 2) {
        placeRandomTiles(grid, 2, "portal", forbidden, goals);
      }
    }
  }

  if (goals.length === 0) {
    const fallbackPositions = selectGoalPositions(grid, 1, start, forbidden, 0);
    const fallback =
      fallbackPositions[0] ?? {
        x: Math.max(gridSize - 2, 0),
        y: Math.min(1, gridSize - 1),
      };
    goals.push(fallback);
    grid[fallback.y][fallback.x] = {
      type: "goal",
      qValue: GOAL_REWARD,
      visits: 0,
      value: levelValue("goal"),
    };
    forbidden.add(`${fallback.x}-${fallback.y}`);
  }

  return {
    grid,
    agent: start,
    goals,
    isRunning: false,
    episode: 0,
    totalReward: 0,
    level: level.key,
    currentSteps: 0,
    episodeHistory: [],
    activeBonus: null,
    bonusReady: false,
    bonusCountdown: BONUS_INTERVAL,
    spawn: start,
    speedrun: {
      active: false,
      stage: 0,
      timeLeft: 0,
      timeLimit: 0,
      pendingStage: false,
      baseSize,
    },
    latestDrop: null,
    portalCooldowns: {},
    qTable: {},
  };
};

export const createComparisonState = (size: number): ComparisonState => {
  const safeSize = Math.max(size, 4);
  const spawn: Position = { x: Math.min(1, safeSize - 1), y: Math.min(1, safeSize - 1) };
  const goal: Position = { x: Math.max(safeSize - 2, 0), y: Math.max(safeSize - 2, 0) };

  // Create a shared grid layout
  const baseGrid = createEmptyGrid(safeSize);

  // Add some obstacles, rewards, and punishments to make it interesting
  const forbidden = new Set<string>([`${spawn.x}-${spawn.y}`, `${goal.x}-${goal.y}`]);

  // Place obstacles (15%)
  placeRandomTiles(baseGrid, calculateItemCount(safeSize, 0.15, 2), "obstacle", forbidden, [goal]);
  // Place rewards (10%)
  placeRandomTiles(baseGrid, calculateItemCount(safeSize, 0.10, 2), "reward", forbidden, [goal]);
  // Place punishments (8%)
  placeRandomTiles(baseGrid, calculateItemCount(safeSize, 0.08, 1), "punishment", forbidden, [goal]);

  baseGrid[goal.y][goal.x] = {
    type: "goal",
    qValue: GOAL_REWARD,
    visits: 0,
    value: levelValue("goal"),
  };

  return {
    left: {
      agent: { ...spawn },
      goal,
      grid: cloneGrid(baseGrid),
      isRunning: false,
      episode: 0,
      totalReward: 0,
      currentSteps: 0,
      episodeHistory: [],
      spawn,
      alpha: 0.1,
      gamma: 0.9,
      explorationRate: 0.3,
      name: "Rover A",
      portalCooldowns: {},
      qTable: {},
    },
    right: {
      agent: { ...spawn },
      goal,
      grid: cloneGrid(baseGrid),
      isRunning: false,
      episode: 0,
      totalReward: 0,
      currentSteps: 0,
      episodeHistory: [],
      spawn,
      alpha: 0.2,
      gamma: 0.7,
      explorationRate: 0.5,
      name: "Rover B",
      portalCooldowns: {},
      qTable: {},
    },
  };
};

export const buildSpeedrunState = (
  stage: number,
  baseSize: number,
  episode: number,
  episodeHistory: EpisodeStats[],
): RandomModeState => {
  const stageConfig = getSpeedrunStageConfig(stage);
  const baseState = createRandomModeState(stageConfig.level, baseSize);
  return {
    ...baseState,
    episode,
    episodeHistory,
    speedrun: {
      active: true,
      stage,
      timeLeft: stageConfig.timeLimit,
      timeLimit: stageConfig.timeLimit,
      pendingStage: false,
      baseSize,
    },
  };
};

export type PlaceableTile = "obstacle" | "reward" | "punishment" | "portal";

export type ChallengeTile = "reward" | "obstacle" | "punishment" | "portal";

export const CHALLENGE_ICON_MAP: Record<ChallengeTile, string> = {
  reward: "🍬",
  obstacle: "🧱",
  punishment: "⚡",
  portal: "🌀",
};

export const BONUS_DETAILS: Record<BonusType, { icon: string; label: Record<Language, string>; actionHint: Record<Language, string> }> = {
  reward: {
    icon: "🍬",
    label: { de: "Belohnung platzieren", en: "Place reward" },
    actionHint: { de: "Klicke ins Feld, um eine Belohnung zu setzen.", en: "Click the grid to drop a reward." },
  },
  punishment: {
    icon: "⚡",
    label: { de: "Strafe platzieren", en: "Place penalty" },
    actionHint: { de: "Klicke ins Feld, um eine Strafe zu setzen.", en: "Click the grid to drop a penalty." },
  },
  obstacle: {
    icon: "🧱",
    label: { de: "Mauer ziehen", en: "Draw wall" },
    actionHint: { de: "Klicke und ziehe, um Mauern zu bauen.", en: "Click and drag to build walls." },
  },
  portal: {
    icon: "🌀",
    label: { de: "Portal setzen", en: "Place portal" },
    actionHint: { de: "Setze ein Portal – ein Partner erscheint bei nächster Belohnung.", en: "Drop a portal – another portal arrives with the next reward." },
  },
  teleport: {
    icon: "✨",
    label: { de: "Rover beamen", en: "Beam rover" },
    actionHint: { de: "Sofortige Aktion: teleportiert den Rover auf ein zufälliges Feld.", en: "Instant action: teleports the rover to a random tile." },
  },
};
