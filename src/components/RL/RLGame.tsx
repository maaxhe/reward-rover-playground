import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ToWorkerMsg, FromWorkerMsg, SnapshotPayload } from "../../workers/rlWorker";
import type { CSSProperties } from "react";
import { useLevel } from "@/contexts/LevelContext";
import { getUnlockedFeatures } from "@/lib/levelProgression";
import { LEVEL_WORLDS } from "@/lib/levelWorlds";
import { SIMULATION_SPEEDS, type SimulationSpeed } from "@/lib/rl/simulation";
import { CELEBRATION_FACTS } from "@/lib/rl/celebrationFacts";
import { PRESET_LEVELS, type GridConfig, type PresetLevel } from "@/lib/rl/presets";
import { evaluateObjective } from "@/lib/levelObjectives";
import { LevelObjectivePanel } from "./LevelObjectivePanel";
import { ControlBar, PlaygroundControls, RandomControls, ScrollIndicator } from "./RLGameControls";
import type { LevelNumber, UnlockedFeatures } from "@/lib/levelProgression";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GameLayout } from "./GameLayout";
import { GameHeader } from "./GameHeader";
import { ControlPanel } from "./ControlPanel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Tile, TileType } from "./Tile";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import {
  ChevronDown,
  ChevronUp,
  Gamepad2,
  Info,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Sun,
  Target,
  Undo2,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Position, TileState as LibTileState, PlaygroundState, ComparisonRoverState } from "@/lib/rl/types";
import { recordConsumedTile, restoreConsumedTiles, type ConsumedTile } from "@/lib/rl/consumedTiles";
import { stepPlayground } from "@/lib/rl/playgroundStep";
import { runComparisonRoverStep } from "@/lib/rl/comparisonStep";
import {
  type QTable,
  chooseAction,
  getBestActionDirection,
  getTileReward,
  getQValue,
  setQValue,
  getDisplayQValue,
  getMaxQValue,
  posToActionIndex,
  getPossibleActions,
} from "@/lib/rl/qLearning";
import {
  findPortals,
  teleportThroughPortal,
  getPortalKey,
  decrementPortalCooldowns,
  withPortalCooldowns,
  isPortalOnCooldown,
} from "@/lib/rl/portalUtils";
import {
  createEmptyGrid,
  cloneGrid,
  calculateItemCount,
  manhattanDistance,
} from "@/lib/rl/gridUtils";
import {
  getSpeedrunStageConfig,
  getEpisodeTitle,
  GOAL_REWARD,
  REWARD_VALUE,
  PUNISHMENT_VALUE,
  OBSTACLE_PENALTY,
  DEFAULT_TILE_OPTION as LIB_DEFAULT_TILE_OPTION,
} from "@/lib/rl/constants";

const TILE_SIZE_MAP = {
  s: 6,
  m: 9,
  l: 14,
} as const;

type Language = "de" | "en";

const TILE_SIZE_LABELS: Record<Language, Record<keyof typeof TILE_SIZE_MAP, string>> = {
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

const TILE_ICONS: Record<TileType, string> = {
  empty: "",
  obstacle: "",
  reward: "🍬",
  punishment: "⚡",
  goal: "🎯",
  portal: "🌀",
};

const TILE_LABELS: Record<Language, Record<TileType, string>> = {
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

const GRID_PIXEL_TARGET: Record<keyof typeof TILE_SIZE_MAP, number> = {
  s: 380,
  m: 480,
  l: 580,
};

const MIN_GOAL_DISTANCE = 5;
const BONUS_INTERVAL = 10;
const TUTORIAL_STORAGE_KEY = "reward_rover_tutorial_seen";

const EPISODE_TITLES = [
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

type BonusType = "reward" | "punishment" | "obstacle" | "portal" | "teleport";

const BONUS_TYPES: BonusType[] = ["reward", "punishment", "obstacle", "portal", "teleport"];

const BONUS_WEIGHTS: Record<BonusType, number> = {
  reward: 3,
  punishment: 3,
  obstacle: 3,
  portal: 1,
  teleport: 2,
};

const AUTH_TOKEN_KEY = "rr_token";
const AUTH_USER_KEY = "rr_user";
const safeLocalStorageGet = (key: string) => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const safeSessionStorageGet = (key: string) => {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

type AuthUser = {
  id: number;
  username: string;
  role: "admin" | "user";
};

const pickWeightedBonus = (): BonusType => {
  const total = BONUS_TYPES.reduce((sum, type) => sum + BONUS_WEIGHTS[type], 0);
  let roll = Math.random() * total;
  for (const type of BONUS_TYPES) {
    roll -= BONUS_WEIGHTS[type];
    if (roll <= 0) return type;
  }
  return BONUS_TYPES[0];
};

interface CandidatePosition extends Position {
  distance: number;
}

type TileSizeOption = keyof typeof TILE_SIZE_MAP;
type Mode = "playground" | "random" | "comparison";

type LevelKey = "level1" | "level2" | "level3";

interface LevelConfig {
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

const LEVELS: Record<LevelKey, LevelConfig> = {
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

interface SpeedrunStageConfig {
  timeLimit: number;
  level: LevelConfig;
}

const SPEEDRUN_STAGES: SpeedrunStageConfig[] = [
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

type TileState = LibTileState;

export type { PlaygroundState };

interface EpisodeStats {
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

interface ComparisonState {
  left: ComparisonRoverState;
  right: ComparisonRoverState;
}

interface MoveStats {
  current: number;
  totalCompleted: number;
  episodes: number;
  average: number | null;
  best: number | null;
}

const computeMoveStats = (state: ComparisonRoverState): MoveStats => {
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

type EpisodeSummary = {
  count: number;
  avgSteps: number | null;
  avgReward: number | null;
  bestReward: number | null;
  bestSteps: number | null;
};

const computeEpisodeSummary = (history: EpisodeStats[]): EpisodeSummary => {
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

const selectGoalPositions = (
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

const runPlaygroundStep = (
  state: PlaygroundState,
  explorationRate: number,
  bias?: Position | null,
  consumeRewards = true,
  alpha = 0.1,
  gamma = 0.85,
  autoRestart = false,
): PlaygroundState =>
  stepPlayground(state, { explorationRate, alpha, gamma, consumeRewards, autoRestart, directionBias: bias ?? null }).nextState;

const runRandomModeStep = (
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
const buildGridFromConfigStatic = (config: GridConfig) => {
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
const createLevelPlaygroundState = (level: LevelNumber): PlaygroundState => {
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

const createInitialPlaygroundState = (size: number, usePreset: boolean = false): PlaygroundState => {
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

const levelValue = (type: TileType): number => {
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

const randomCoord = (max: number) => Math.floor(Math.random() * max);

const placeRandomTiles = (
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

const generateMaze = (grid: TileState[][], forbidden: Set<string>) => {
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

const softenMazeBorders = (grid: TileState[][], forbidden: Set<string>) => {
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

const createRandomModeState = (level: LevelConfig, baseSize: number): RandomModeState => {
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

const createComparisonState = (size: number): ComparisonState => {
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

const buildSpeedrunState = (
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

type ChallengeTile = "reward" | "obstacle" | "punishment" | "portal";

const CHALLENGE_ICON_MAP: Record<ChallengeTile, string> = {
  reward: "🍬",
  obstacle: "🧱",
  punishment: "⚡",
  portal: "🌀",
};

const BONUS_DETAILS: Record<BonusType, { icon: string; label: Record<Language, string>; actionHint: Record<Language, string> }> = {
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

interface RLGameProps {
  /** Learning parameters are owned by the surrounding layout (left sidebar) and passed in. */
  explorationRate?: number;
  alpha?: number;
  gamma?: number;
  /** Reports the login token (or null after logout) so the layout can sync level progress to the account. */
  onAuthTokenChange?: (token: string | null) => void;
}

export function RLGame({ explorationRate = 0.2, alpha = 0.1, gamma = 0.85, onAuthTokenChange }: RLGameProps = {}) {
  const { levelMode, currentLevel, onLevelSolved } = useLevel();
  const unlockedFeatures = levelMode ? getUnlockedFeatures(currentLevel as LevelNumber) : null;

  const placementModeRef = useRef<PlaceableTile>("obstacle");
  const challengeModeRef = useRef<ChallengeTile | null>(null);
  const consoleScrollRef = useRef<HTMLDivElement>(null);
  const settingsScrollRef = useRef<HTMLDivElement>(null);
  // Web Worker for the playground training loop
  const rlWorkerRef = useRef<Worker | null>(null);
  // True while we are applying a snapshot from the worker (to avoid re-syncing it back)
  const workerSnapshotRef = useRef(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const stored = safeLocalStorageGet("theme");
      if (stored === "light" || stored === "dark") return stored;
      return "dark"; // Default immer dark
    }
    return "dark";
  });
  const { language, setLanguage, isEnglish, translate } = useLanguage();
  const [mode, setMode] = useState<Mode>("playground");
  const [tileSize, setTileSize] = useState<TileSizeOption>(LIB_DEFAULT_TILE_OPTION);
  const [levelKey, setLevelKey] = useState<LevelKey>("level1");
  const [placementMode, setPlacementModeState] = useState<PlaceableTile>("obstacle");
  const [challengeMode, setChallengeModeState] = useState<ChallengeTile | null>(null);
  const [simulationSpeed, setSimulationSpeed] = useState<SimulationSpeed>("1x");
  const [comparisonSpeed, setComparisonSpeed] = useState<SimulationSpeed>("1x");
  const [showValues, setShowValues] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [showStatistics, setShowStatistics] = useState(true);
  const [showActions, setShowActions] = useState(false);
  // Level Mode starts with consumption on (the rover can't farm a reward forever); eaten tiles come back each episode, and the player can still switch it off.
  const [consumeRewards, setConsumeRewards] = useState(levelMode);
  useEffect(() => {
    if (levelMode) setConsumeRewards(true);
  }, [levelMode]);
  const [isAutoRestartEnabled, setIsAutoRestartEnabled] = useState(false);
  const [showRewardHistory, setShowRewardHistory] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [showQValuesInfo, setShowQValuesInfo] = useState(false);
  const [showHeatmapInfo, setShowHeatmapInfo] = useState(false);
  const [showConsumeRewardsInfo, setShowConsumeRewardsInfo] = useState(false);

  const [showComparisonLeftAlphaInfo, setShowComparisonLeftAlphaInfo] = useState(false);
  const [showComparisonLeftGammaInfo, setShowComparisonLeftGammaInfo] = useState(false);
  const [showComparisonLeftExplorationInfo, setShowComparisonLeftExplorationInfo] = useState(false);
  const [showComparisonRightAlphaInfo, setShowComparisonRightAlphaInfo] = useState(false);
  const [showComparisonRightGammaInfo, setShowComparisonRightGammaInfo] = useState(false);
  const [showComparisonRightExplorationInfo, setShowComparisonRightExplorationInfo] = useState(false);
  const [comparisonPresetsOpen, setComparisonPresetsOpen] = useState(false);
  const [showActionsInfo, setShowActionsInfo] = useState(false);
  const [showRLBasics, setShowRLBasics] = useState(true);
  const [showRLFormula, setShowRLFormula] = useState(false);
  const [showRLExamples, setShowRLExamples] = useState(false);
  const [showRLLoop, setShowRLLoop] = useState(false);
  const [showRLParameters, setShowRLParameters] = useState(false);
  const [showRLSettings, setShowRLSettings] = useState(false);
  const [showRandomStatsCard, setShowRandomStatsCard] = useState(false);
  const [showPlaygroundStatsCard, setShowPlaygroundStatsCard] = useState(false);
  const [showConsolePanel, setShowConsolePanel] = useState(true);
  const [showSettingsPanel, setShowSettingsPanel] = useState(true);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayEpisode, setReplayEpisode] = useState<EpisodeStats | null>(null);
  const [replayStep, setReplayStep] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [episodeHistory, setEpisodeHistory] = useState<Array<{ episode: number; reward: number; steps: number }>>([]);
  const [undoStack, setUndoStack] = useState<TileState[][][]>([]);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [rewardAnimation, setRewardAnimation] = useState<{ x: number; y: number; type: "reward" | "punishment" } | null>(null);
  const [leftRewardAnimation, setLeftRewardAnimation] = useState<{ x: number; y: number; type: "reward" | "punishment" } | null>(null);
  const [rightRewardAnimation, setRightRewardAnimation] = useState<{ x: number; y: number; type: "reward" | "punishment" } | null>(null);
  const [celebration, setCelebration] = useState<{
    title: string;
    steps: number;
    reward: number;
    rank: number;
    fact: string;
  } | null>(null);
  const [directionBias, setDirectionBias] = useState<Position | null>(null);
  const [speedrunEnabled, setSpeedrunEnabled] = useState(false);
  const [rlDialogOpen, setRlDialogOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authIsRegistering, setAuthIsRegistering] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(() => {
    const localToken = safeLocalStorageGet(AUTH_TOKEN_KEY);
    if (localToken) return true;
    const sessionToken = safeSessionStorageGet(AUTH_TOKEN_KEY);
    if (sessionToken) return false;
    return true;
  });
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return safeLocalStorageGet(AUTH_TOKEN_KEY) ?? safeSessionStorageGet(AUTH_TOKEN_KEY);
  });
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    const raw = safeLocalStorageGet(AUTH_USER_KEY) ?? safeSessionStorageGet(AUTH_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  });
  const [hasLoadedGlobalEnv, setHasLoadedGlobalEnv] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [environmentName, setEnvironmentName] = useState("");
  const [saveEnvError, setSaveEnvError] = useState<string | null>(null);
  const [isSavingEnv, setIsSavingEnv] = useState(false);
  const [isLoadingEnvs, setIsLoadingEnvs] = useState(false);
  const [savedEnvironments, setSavedEnvironments] = useState<
    Array<{ id: number; name: string; gridConfig: GridConfig; progressData: unknown; createdAt: string }>
  >([]);
  const simulationDelayMs =
    SIMULATION_SPEEDS.find((speed) => speed.key === simulationSpeed)?.delayMs ?? SIMULATION_SPEEDS[0].delayMs;
  const comparisonDelayMs =
    SIMULATION_SPEEDS.find((speed) => speed.key === comparisonSpeed)?.delayMs ?? SIMULATION_SPEEDS[0].delayMs;
  const apiBase = import.meta.env.VITE_API_BASE ?? "";
  const isAdmin = authUser?.role === "admin";
  useEffect(() => {
    onAuthTokenChange?.(authToken);
  }, [authToken, onAuthTokenChange]);
  const introToggleLabel = showIntro
    ? translate("Anleitung ausblenden", "Hide guide")
    : translate("Anleitung & Infos anzeigen", "Show guide & info");

  useEffect(() => {
    if (isAutoRestartEnabled) {
      setCelebration(null);
    }
  }, [isAutoRestartEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const persist = rememberMe ? window.localStorage : window.sessionStorage;
      const clear = rememberMe ? window.sessionStorage : window.localStorage;
      if (authToken) {
        persist.setItem(AUTH_TOKEN_KEY, authToken);
      } else {
        persist.removeItem(AUTH_TOKEN_KEY);
      }
      clear.removeItem(AUTH_TOKEN_KEY);
    } catch (e) {
      console.warn("Could not persist auth token", e);
    }
  }, [authToken, rememberMe]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const persist = rememberMe ? window.localStorage : window.sessionStorage;
      const clear = rememberMe ? window.sessionStorage : window.localStorage;
      if (authUser) {
        persist.setItem(AUTH_USER_KEY, JSON.stringify(authUser));
      } else {
        persist.removeItem(AUTH_USER_KEY);
      }
      clear.removeItem(AUTH_USER_KEY);
    } catch (e) {
      console.warn("Could not persist auth user", e);
    }
  }, [authUser, rememberMe]);

  const applyAuthPayload = useCallback(
    (payload: { token?: string; user?: AuthUser }, title?: { de: string; en: string }) => {
      if (!payload?.token || !payload?.user) {
        setAuthError(translate("Unerwartete Antwort vom Server.", "Unexpected server response."));
        return;
      }
      setAuthToken(payload.token);
      setAuthUser(payload.user);
      setAuthDialogOpen(false);
      setAuthPassword("");
      toast({
        title: title ? translate(title.de, title.en) : translate("Willkommen zurück!", "Welcome back!"),
        description: translate("Du bist jetzt eingeloggt.", "You are now logged in."),
      });
    },
    [translate],
  );

  const handleLogout = useCallback(() => {
    setAuthToken(null);
    setAuthUser(null);
    setAuthPassword("");
    setAuthUsername("");
    setAuthError(null);
  }, []);

  const handleAuthSubmit = useCallback(async () => {
    const trimmedUsername = authUsername.trim();
    if (!trimmedUsername || !authPassword) {
      setAuthError(translate("Bitte Nutzername und Passwort eingeben.", "Enter username and password."));
      return;
    }

    if (authIsRegistering && authPassword.length < 6) {
      setAuthError(translate("Das Passwort braucht mindestens 6 Zeichen.", "The password needs at least 6 characters."));
      return;
    }
    setAuthError(null);
    try {
      const endpoint = authIsRegistering ? "/api/auth/register" : "/api/auth/login";
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmedUsername, password: authPassword }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        if (response.status === 404) {
          setAuthError(
            translate(
              "API nicht erreichbar. Starte den Server oder prüfe die URL.",
              "API not reachable. Start the server or check the URL.",
            ),
          );
          return;
        }
        setAuthError(
          errorBody.error ||
            (authIsRegistering
              ? translate("Registrierung fehlgeschlagen.", "Registration failed.")
              : translate("Login fehlgeschlagen.", "Login failed.")),
        );
        return;
      }

      const payload = await response.json();
      applyAuthPayload(
        payload,
        authIsRegistering
          ? { de: "Account erstellt!", en: "Account created!" }
          : { de: "Willkommen zurück!", en: "Welcome back!" },
      );
    } catch (error) {
      setAuthError(translate("Server nicht erreichbar.", "Server not reachable."));
    }
  }, [authIsRegistering, authPassword, authUsername, apiBase, applyAuthPayload, translate]);

  const buildGridConfigFromState = useCallback((state: PlaygroundState): GridConfig => {
    const tiles: GridConfig["tiles"] = [];
    state.grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell.type === "empty" || cell.type === "goal") return;
        tiles.push({ x, y, type: cell.type });
      });
    });
    return {
      size: state.grid.length,
      tiles,
      agent: state.agent,
      goal: state.goal,
    };
  }, []);

  // Tutorial Slides
  const tutorialSlides = useMemo(() => [
    {
      title: translate("Welcome to Reward Rover", "Welcome to Reward Rover"),
      content: translate(
        "Entdecke, wie Reinforcement Learning funktioniert! Der Rover lernt eigenständig, welche Wege zum Ziel führen.",
        "Discover how reinforcement learning works! The rover learns on its own which paths lead to the goal."
      ),
    },
    {
      title: translate("Der Start-Button ▶️", "The Start Button ▶️"),
      content: translate(
        "Drücke den Start-Button im linken Panel, um den Lernprozess zu starten. Der Rover beginnt dann, das Spielfeld zu erkunden.",
        "Press the Start button in the left panel to begin the learning process. The rover will then start exploring the playfield."
      ),
    },
    {
      title: translate("Pfeiltasten = Impulse geben! ⌨️", "Arrow Keys = Give Hints! ⌨️"),
      content: translate(
        "WICHTIG: Die Pfeiltasten steuern den Rover NICHT direkt! Sie geben ihm nur kurzfristige Impulse in eine Richtung. Der Rover entscheidet weiterhin selbst und lernt dabei.",
        "IMPORTANT: Arrow keys do NOT control the rover directly! They only give short-term directional hints. The rover still makes its own decisions and keeps learning."
      ),
      bullets: [
        translate("⚠️ Der Rover trifft weiterhin eigene Entscheidungen", "⚠️ The rover still makes its own decisions"),
        translate("Der Impuls wirkt nur beim Drücken der Taste", "The hint only works while pressing the key"),
        translate("Der Lernprozess läuft weiter", "The learning process continues"),
      ],
    },
    {
      title: translate("Design the Playfield", "Design the Playfield"),
      content: translate(
        "Nutze die Platzierungs-Tools links, um Hindernisse, Belohnungen oder Strafen zu platzieren. Experimentiere und beobachte, wie der Rover lernt!",
        "Use the placement tools on the left to place obstacles, rewards, or penalties. Experiment and watch how the rover learns!"
      ),
    },
  ], [translate]);

  // Tutorial functions
  const closeTutorial = useCallback(() => {
    setTutorialOpen(false);
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    } catch (e) {
      console.warn("Could not save tutorial status", e);
    }
  }, []);

  const nextTutorialStep = useCallback(() => {
    if (tutorialStep < tutorialSlides.length - 1) {
      setTutorialStep(prev => prev + 1);
    } else {
      closeTutorial();
    }
  }, [tutorialStep, tutorialSlides.length, closeTutorial]);

  const prevTutorialStep = useCallback(() => {
    if (tutorialStep > 0) {
      setTutorialStep(prev => prev - 1);
    }
  }, [tutorialStep]);

  // Check if tutorial was already seen
  useEffect(() => {
    try {
      const seen = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (!seen) {
        setTutorialOpen(true);
      }
    } catch (e) {
      console.warn("Could not check tutorial status", e);
    }
  }, []);

  // Theme effect
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {
      console.warn("Could not save theme preference", e);
    }
  }, [theme]);

  // Clear animation after it plays
  useEffect(() => {
    if (rewardAnimation) {
      const timer = setTimeout(() => {
        setRewardAnimation(null);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [rewardAnimation]);

  useEffect(() => {
    if (leftRewardAnimation) {
      const timer = setTimeout(() => {
        setLeftRewardAnimation(null);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [leftRewardAnimation]);

  useEffect(() => {
    if (rightRewardAnimation) {
      const timer = setTimeout(() => {
        setRightRewardAnimation(null);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [rightRewardAnimation]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const tileLabels = useMemo(() => TILE_LABELS[language], [language]);
  const sizeLabels = useMemo(() => TILE_SIZE_LABELS[language], [language]);
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(isEnglish ? "en-US" : "de-DE", { maximumFractionDigits: 2 }),
    [isEnglish],
  );
  const legendItems = useMemo(
    () => [
      {
        label: translate("Agent", "Agent"),
        className: "bg-tile-agent",
        emoji: "🤖",
        description: translate(
          "Der lernende Rover – beobachte seine Entscheidungen!",
          "The learning rover – watch its decisions unfold!",
        ),
      },
      {
        label: translate("Ziel", "Goal"),
        className: "bg-tile-goal",
        emoji: "🎯",
        description: translate(
          "Das Ziel – hier gibt's die größte Belohnung",
          "The target tile – maximum reward lives here",
        ),
      },
      {
        label: translate("Belohnung", "Reward"),
        className: "bg-tile-reward",
        emoji: "🍬",
        description: translate(
          "Positive Rewards – der Rover mag diese Felder",
          "Positive rewards – the rover loves these tiles",
        ),
      },
      {
        label: translate("Strafe", "Penalty"),
        className: "bg-tile-punishment",
        emoji: "⚡",
        description: translate(
          "Negative Rewards – besser vermeiden",
          "Negative rewards – better avoid them",
        ),
      },
      {
        label: translate("Hindernis", "Wall"),
        className: "bg-tile-obstacle",
        emoji: "🧱",
        description: translate(
          "Unpassierbare Wände – hier kommt keiner durch",
          "Solid walls – nobody passes through here",
        ),
      },
      {
        label: translate("Portal", "Portal"),
        className: "bg-tile-portal",
        emoji: "🌀",
        description: translate(
          "Magisches Portal – teleportiert zu einem anderen Portal!",
          "Magic portal – teleports you to another portal!",
        ),
      },
    ],
    [translate, tileLabels],
  );

  const baseFieldSize = TILE_SIZE_MAP[tileSize];
  const levelConfig = LEVELS[levelKey];
  const levelName = isEnglish ? levelConfig.nameEn : levelConfig.name;
  const levelDescription = isEnglish ? levelConfig.descriptionEn : levelConfig.description;

  const [playgroundState, setPlaygroundState] = useState<PlaygroundState>(() =>
    levelMode
      ? createLevelPlaygroundState(currentLevel as LevelNumber)
      : createInitialPlaygroundState(baseFieldSize, true)
  );
  const [randomState, setRandomState] = useState<RandomModeState>(() =>
    createRandomModeState(levelConfig, baseFieldSize)
  );
  const [comparisonState, setComparisonState] = useState<ComparisonState>(() =>
    createComparisonState(baseFieldSize)
  );
  const leftMoveStats = useMemo(
    () => computeMoveStats(comparisonState.left),
    [comparisonState.left],
  );
  const rightMoveStats = useMemo(
    () => computeMoveStats(comparisonState.right),
    [comparisonState.right],
  );
  const formatMovesValue = useCallback(
    (value: number | null) => (value !== null ? numberFormatter.format(value) : "–"),
    [numberFormatter],
  );
  const formatStepsValue = useCallback(
    (value: number | null) => (value !== null ? value.toFixed(1) : "–"),
    [],
  );
  const formatRewardValue = useCallback(
    (value: number | null) => (value !== null ? numberFormatter.format(value) : "–"),
    [numberFormatter],
  );
  const getLeadClasses = useCallback(
    (left: number | null, right: number | null, lowerIsBetter = true): [string, string] => {
      if (left === null || right === null) {
        return ["text-muted-foreground", "text-muted-foreground"];
      }
      if (left === right) {
        return ["text-foreground font-semibold", "text-foreground font-semibold"];
      }
      const leftIsWinning = lowerIsBetter ? left < right : left > right;
      return [
        leftIsWinning ? "text-emerald-500 font-semibold" : "text-muted-foreground",
        leftIsWinning ? "text-muted-foreground" : "text-emerald-500 font-semibold",
      ];
    },
    [],
  );
  const moveComparisonMessage = useMemo(() => {
    const leftEpisodes = leftMoveStats.episodes;
    const rightEpisodes = rightMoveStats.episodes;
    if (leftEpisodes === 0 && rightEpisodes === 0) {
      return translate(
        "Noch keine abgeschlossenen Episoden – lass beide Rover laufen, um ihre Züge zu vergleichen.",
        "No completed episodes yet – start both rovers to compare their moves.",
      );
    }
    if (leftMoveStats.average === null || rightMoveStats.average === null) {
      return translate(
        "Mindestens ein Rover hat noch keine Episode abgeschlossen.",
        "At least one rover hasn't completed an episode yet.",
      );
    }
    const leftAverage = leftMoveStats.average;
    const rightAverage = rightMoveStats.average;
    const formattedLeftAvg = numberFormatter.format(leftAverage);
    const formattedRightAvg = numberFormatter.format(rightAverage);
    if (Math.abs(leftAverage - rightAverage) < 0.01) {
      return translate(
        `Beide Rover bewegen sich gleich schnell (Ø ${formattedLeftAvg} Züge).`,
        `Both rovers move at the same speed (Ø ${formattedLeftAvg} moves).`,
      );
    }
    if (leftAverage < rightAverage) {
      return translate(
        `${comparisonState.left.name} ist derzeit effizienter (Ø ${formattedLeftAvg} vs. ${formattedRightAvg} Züge).`,
        `${comparisonState.left.name} is currently more efficient (Ø ${formattedLeftAvg} vs ${formattedRightAvg} moves).`,
      );
    }
    return translate(
      `${comparisonState.right.name} ist derzeit effizienter (Ø ${formattedRightAvg} vs. ${formattedLeftAvg} Züge).`,
      `${comparisonState.right.name} is currently more efficient (Ø ${formattedRightAvg} vs ${formattedLeftAvg} moves).`,
    );
  }, [
    translate,
    comparisonState.left.name,
    comparisonState.right.name,
    leftMoveStats.average,
    rightMoveStats.average,
    leftMoveStats.episodes,
    rightMoveStats.episodes,
    numberFormatter,
  ]);

  const loadSavedEnvironments = useCallback(async () => {
    if (!authToken) return;
    setIsLoadingEnvs(true);
    try {
      const response = await fetch(`${apiBase}/api/load`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!response.ok) {
        setIsLoadingEnvs(false);
        return;
      }
      const payload = await response.json();
      setSavedEnvironments(
        (payload?.items ?? []).map((item: { id: number; name: string | null; gridConfig: GridConfig; progressData: unknown; createdAt: string }) => ({
          id: item.id,
          name: item.name || translate("Unbenannt", "Untitled"),
          gridConfig: item.gridConfig,
          progressData: item.progressData ?? null,
          createdAt: item.createdAt,
        })),
      );
    } catch {
      // ignore load errors
    } finally {
      setIsLoadingEnvs(false);
    }
  }, [apiBase, authToken, translate]);

  useEffect(() => {
    if (!authToken) {
      setSavedEnvironments([]);
      return;
    }
    loadSavedEnvironments();
  }, [authToken, loadSavedEnvironments]);

  const handleSaveEnvironment = useCallback(async () => {
    const trimmed = environmentName.trim();
    if (!trimmed) {
      setSaveEnvError(translate("Bitte gib einen Namen ein.", "Please enter a name."));
      return;
    }
    if (!authToken) {
      setAuthDialogOpen(true);
      return;
    }
    setSaveEnvError(null);
    setIsSavingEnv(true);
    try {
      const gridConfig = buildGridConfigFromState(playgroundState);
      const response = await fetch(`${apiBase}/api/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ name: trimmed, gridConfig }),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        setSaveEnvError(errorBody.error || translate("Speichern fehlgeschlagen.", "Save failed."));
        return;
      }
      setEnvironmentName("");
      await loadSavedEnvironments();
      toast({
        title: translate("Umgebung gespeichert", "Environment saved"),
        description: translate("Du findest sie in deinen Umgebungen.", "You can find it in your environments."),
      });
    } catch {
      setSaveEnvError(translate("Server nicht erreichbar.", "Server not reachable."));
    } finally {
      setIsSavingEnv(false);
    }
  }, [
    apiBase,
    authToken,
    buildGridConfigFromState,
    environmentName,
    loadSavedEnvironments,
    playgroundState,
    translate,
  ]);
  const moveComparisonRows = useMemo(
    () => [
      {
        key: "current",
        label: translate("Aktuelle Züge", "Current moves"),
        left: leftMoveStats.current,
        right: rightMoveStats.current,
        lowerIsBetter: true,
      },
      {
        key: "average",
        label: translate("Ø Züge (niedriger besser)", "Avg. moves (lower is better)"),
        left: leftMoveStats.average,
        right: rightMoveStats.average,
        lowerIsBetter: true,
      },
      {
        key: "best",
        label: translate("Beste Züge", "Best moves"),
        left: leftMoveStats.best,
        right: rightMoveStats.best,
        lowerIsBetter: true,
      },
      {
        key: "episodes",
        label: translate("Abgeschlossene Runs", "Completed runs"),
        left: leftMoveStats.episodes,
        right: rightMoveStats.episodes,
        lowerIsBetter: false,
      },
    ],
    [
      translate,
      leftMoveStats.current,
      leftMoveStats.average,
      leftMoveStats.best,
      leftMoveStats.episodes,
      rightMoveStats.current,
      rightMoveStats.average,
      rightMoveStats.best,
      rightMoveStats.episodes,
    ],
  );

  const randomStatsSummary = useMemo(
    () => computeEpisodeSummary(randomState.episodeHistory),
    [randomState.episodeHistory],
  );

  const playgroundStatsSummary = useMemo(
    () => computeEpisodeSummary(playgroundState.episodeHistory),
    [playgroundState.episodeHistory],
  );

  const randomLeaderboardEntries = useMemo(
    () =>
      [...randomState.episodeHistory].sort((a, b) => {
        if (a.steps !== b.steps) return a.steps - b.steps;
        return b.reward - a.reward;
      }),
    [randomState.episodeHistory],
  );

  const playgroundLeaderboardEntries = useMemo(
    () =>
      [...playgroundState.episodeHistory].sort((a, b) => {
        if (a.steps !== b.steps) return a.steps - b.steps;
        return b.reward - a.reward;
      }),
    [playgroundState.episodeHistory],
  );

  const gridRef = useRef<HTMLDivElement>(null);
  const lastCelebratedEpisodeRef = useRef<{ random: number; playground: number }>({ random: 0, playground: 0 });

  const changePlacementMode = useCallback((nextMode: PlaceableTile) => {
    placementModeRef.current = nextMode;
    setPlacementModeState(nextMode);
  }, []);

  useEffect(() => {
    if (mode === "random") {
      gridRef.current?.focus();
    }
    setDirectionBias(null);
  }, [mode]);

  useEffect(() => {
    const biasMap: Record<string, Position> = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      // Handle Space for Play/Pause
      if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        if (mode === "playground") {
          if (playgroundState.isRunning) {
            handlePlaygroundPause();
          } else {
            handlePlaygroundStart();
          }
        } else if (mode === "random") {
          if (randomState.isRunning) {
            handleRandomPause();
          } else {
            handleRandomStart();
          }
        } else if (mode === "comparison") {
          // Toggle both sides in comparison mode
          if (comparisonState.left.isRunning || comparisonState.right.isRunning) {
            handleComparisonPause();
          } else {
            handleComparisonStart();
          }
        }
        return;
      }

      // Handle R for Reset
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        if (mode === "playground") {
          handlePlaygroundReset();
        } else if (mode === "random") {
          handleRandomReset();
        } else if (mode === "comparison") {
          handleComparisonReset();
        }
        return;
      }

      const bias = biasMap[event.key];
      if (!bias) return;
      event.preventDefault();
      setDirectionBias(bias);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (biasMap[event.key]) {
        setDirectionBias(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [mode, playgroundState.isRunning, randomState.isRunning, comparisonState.left.isRunning, comparisonState.right.isRunning]);

  // ── Web Worker: lifecycle (create once, destroy on unmount) ─────────────────
  useEffect(() => {
    const worker = new Worker(
      new URL("../../workers/rlWorker.ts", import.meta.url),
      { type: "module" },
    );
    rlWorkerRef.current = worker;

    worker.onmessage = (event: MessageEvent<FromWorkerMsg>) => {
      const msg = event.data;
      if (msg.type !== "SNAPSHOT") return;
      const { state: workerState, rewardTileMoved } = msg.payload as SnapshotPayload;

      workerSnapshotRef.current = true;
      setPlaygroundState(workerState);

      // Reward/punishment tile animation
      if (rewardTileMoved) {
        setRewardAnimation({ x: rewardTileMoved.x, y: rewardTileMoved.y, type: rewardTileMoved.tileType as "reward" | "punishment" });
      }

      // Stop replay when episode completes (currentSteps reset to 0)
      if (workerState.currentSteps === 0 && !workerState.isRunning) {
        // isRunning=false after goal → check if was replaying
        setIsReplaying((prev) => {
          if (prev) {
            setTimeout(() => {
              setIsReplaying(false);
              setReplayEpisode(null);
            }, 500);
          }
          return prev;
        });
      }
    };

    return () => {
      worker.terminate();
      rlWorkerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Web Worker: sync params whenever they change ──────────────────────────
  useEffect(() => {
    const worker = rlWorkerRef.current;
    if (!worker) return;
    const msg: ToWorkerMsg = {
      type: "UPDATE_PARAMS",
      params: {
        explorationRate: isReplaying ? 0 : explorationRate,
        alpha,
        gamma,
        consumeRewards,
        autoRestart: isAutoRestartEnabled && !isReplaying,
        directionBias,
      },
    };
    worker.postMessage(msg);
  }, [explorationRate, alpha, gamma, consumeRewards, isAutoRestartEnabled, directionBias, isReplaying]);

  // ── Web Worker: sync speed ────────────────────────────────────────────────
  useEffect(() => {
    const worker = rlWorkerRef.current;
    if (!worker) return;
    const msg: ToWorkerMsg = { type: "SET_DELAY", delayMs: isReplaying ? 400 : simulationDelayMs };
    worker.postMessage(msg);
  }, [simulationDelayMs, isReplaying]);

  // ── Web Worker: sync grid changes caused by the user (tile placement etc.) ─
  // Skip if the change originated from a worker snapshot to avoid loops.
  useEffect(() => {
    if (mode !== "playground" || !playgroundState.isRunning) return;
    if (workerSnapshotRef.current) {
      workerSnapshotRef.current = false;
      return;
    }
    const worker = rlWorkerRef.current;
    if (!worker) return;
    const msg: ToWorkerMsg = { type: "SYNC_STATE", state: playgroundState };
    worker.postMessage(msg);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playgroundState.grid]);

  // ── Web Worker: start / pause training loop ───────────────────────────────
  useEffect(() => {
    if (mode !== "playground") return;
    const worker = rlWorkerRef.current;
    if (!worker) return;

    if (playgroundState.isRunning) {
      // Sync latest state + params to worker before starting
      const initMsg: ToWorkerMsg = {
        type: "INIT",
        state: playgroundState,
        params: {
          explorationRate: isReplaying ? 0 : explorationRate,
          alpha,
          gamma,
          consumeRewards,
          autoRestart: isAutoRestartEnabled && !isReplaying,
          directionBias,
        },
        delayMs: isReplaying ? 400 : simulationDelayMs,
      };
      worker.postMessage(initMsg);
      worker.postMessage({ type: "START" } as ToWorkerMsg);
    } else {
      worker.postMessage({ type: "PAUSE" } as ToWorkerMsg);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, playgroundState.isRunning]);

  useEffect(() => {
    if (mode !== "random" || !randomState.isRunning) return;
    const interval = window.setInterval(() => {
      setRandomState((prev) => {
        const next = runRandomModeStep(
          prev,
          explorationRate,
          directionBias,
          consumeRewards,
          alpha,
          gamma,
          isAutoRestartEnabled,
        );

        // Check if agent moved to a reward or punishment tile
        const tileType = next.grid[next.agent.y][next.agent.x].type;
        const hasMoved = prev.agent.x !== next.agent.x || prev.agent.y !== next.agent.y;
        if (hasMoved && (tileType === "reward" || tileType === "punishment")) {
          setRewardAnimation({ x: next.agent.x, y: next.agent.y, type: tileType });
        }
        return next;
      });
    }, 220);
    return () => window.clearInterval(interval);
  }, [mode, randomState.isRunning, explorationRate, directionBias, consumeRewards, alpha, gamma, isAutoRestartEnabled]);

  useEffect(() => {
    if (mode !== "comparison" || (!comparisonState.left.isRunning && !comparisonState.right.isRunning)) return;
    const interval = window.setInterval(() => {
      setComparisonState((prev) => {
        const nextLeft = prev.left.isRunning ? runComparisonRoverStep(prev.left, consumeRewards) : prev.left;
        const nextRight = prev.right.isRunning ? runComparisonRoverStep(prev.right, consumeRewards) : prev.right;

        // Check for reward/punishment animations on left side
        if (prev.left.isRunning && (nextLeft.agent.x !== prev.left.agent.x || nextLeft.agent.y !== prev.left.agent.y)) {
          const tileType = prev.left.grid[nextLeft.agent.y][nextLeft.agent.x].type;
          if (tileType === "reward" || tileType === "punishment") {
            setLeftRewardAnimation({ x: nextLeft.agent.x, y: nextLeft.agent.y, type: tileType });
          }
        }

        // Check for reward/punishment animations on right side
        if (prev.right.isRunning && (nextRight.agent.x !== prev.right.agent.x || nextRight.agent.y !== prev.right.agent.y)) {
          const tileType = prev.right.grid[nextRight.agent.y][nextRight.agent.x].type;
          if (tileType === "reward" || tileType === "punishment") {
            setRightRewardAnimation({ x: nextRight.agent.x, y: nextRight.agent.y, type: tileType });
          }
        }

        return { left: nextLeft, right: nextRight };
      });
    }, comparisonDelayMs);
    return () => window.clearInterval(interval);
  }, [mode, comparisonState.left.isRunning, comparisonState.right.isRunning, consumeRewards, comparisonDelayMs]);

  useEffect(() => {
    if (mode !== "random") return;

    const grantBonus = () => {
      const nextType = pickWeightedBonus();
      setRandomState((prev) => ({
        ...prev,
        activeBonus: nextType,
        bonusReady: true,
        bonusCountdown: BONUS_INTERVAL,
        latestDrop: nextType,
      }));
      challengeModeRef.current = null;
      setChallengeModeState(null);
    };

    grantBonus();
    const interval = window.setInterval(grantBonus, 10000);
    return () => window.clearInterval(interval);
  }, [mode]);

  useEffect(() => {
    if (mode !== "random") return;
    const timer = window.setInterval(() => {
      setRandomState((prev) => {
        if (prev.bonusCountdown <= 0) return prev;
        return { ...prev, bonusCountdown: prev.bonusCountdown - 1 };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mode]);

  useEffect(() => {
    if (!randomState.speedrun.active || !randomState.isRunning) return;
    const timer = window.setInterval(() => {
      setRandomState((prev) => {
        if (!prev.speedrun.active || !prev.isRunning) return prev;
        if (prev.speedrun.timeLeft <= 1) {
          const failureStat: EpisodeStats = {
            episode: prev.episode + 1,
            steps: prev.currentSteps,
            reward: prev.totalReward,
            success: false,
            mode: "speedrun",
            stage: prev.speedrun.stage,
            timeLimit: prev.speedrun.timeLimit,
            timeUsed: prev.speedrun.timeLimit,
          };
          const newHistory = [...prev.episodeHistory.slice(-19), failureStat];
          const baseSize = prev.speedrun.baseSize;
          const stageState = buildSpeedrunState(0, baseSize, prev.episode + 1, newHistory);
          return stageState;
        }
        return {
          ...prev,
          speedrun: {
            ...prev.speedrun,
            timeLeft: prev.speedrun.timeLeft - 1,
          },
        };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [randomState.speedrun.active, randomState.isRunning]);

  useEffect(() => {
    if (!randomState.speedrun.active || !randomState.speedrun.pendingStage) return;
    setRandomState((prev) => {
      if (!prev.speedrun.active || !prev.speedrun.pendingStage) return prev;
      const stageState = buildSpeedrunState(
        prev.speedrun.stage,
        prev.speedrun.baseSize,
        prev.episode,
        prev.episodeHistory,
      );
      return stageState;
    });
  }, [randomState.speedrun.active, randomState.speedrun.pendingStage]);

  const handleTilePlacement = useCallback(
    (x: number, y: number) => {
      if (mode === "playground") {
        const selectedType = placementModeRef.current;
        setPlaygroundState((prev) => {
          if ((x === prev.agent.x && y === prev.agent.y) || (x === prev.goal.x && y === prev.goal.y)) {
            return prev;
          }
          const grid = cloneGrid(prev.grid);
          const current = grid[y][x];
          // Beim Dragging immer platzieren, nicht togglen
          const nextType = isDragging ? selectedType : (current.type === selectedType ? "empty" : selectedType);

          // Prüfe ob sich was ändert
          if (current.type === nextType) {
            return prev;
          }

          // Speichere vorherigen Zustand für Undo
          setUndoStack(stack => [...stack.slice(-19), cloneGrid(prev.grid)]);

          grid[y][x] = {
            ...current,
            type: nextType,
            value: levelValue(nextType),
            qValue: nextType === "empty" ? 0 : current.qValue,
            visits: nextType === "empty" ? 0 : current.visits,
          };
          return { ...prev, grid };
        });
      } else if (mode === "random" && challengeModeRef.current) {
        const selectedChallenge = challengeModeRef.current;
        let consumed = false;
        setRandomState((prev) => {
          if (
            !prev.bonusReady ||
            !prev.activeBonus ||
            prev.activeBonus !== selectedChallenge ||
            (x === prev.agent.x && y === prev.agent.y) ||
            prev.goals.some((g) => g.x === x && g.y === y)
          ) {
            return prev;
          }

          const grid = cloneGrid(prev.grid);
          const current = grid[y][x];

          if (selectedChallenge === "obstacle" && current.type === "obstacle") {
            grid[y][x] = { type: "empty", qValue: 0, visits: 0, value: 0 };
            consumed = true;
            return {
              ...prev,
              grid,
              bonusReady: false,
              latestDrop: null,
            };
          }

          if (current.type === selectedChallenge) {
            return prev;
          }

          grid[y][x] = {
            type: selectedChallenge,
            qValue: 0,
            visits: 0,
            value: levelValue(selectedChallenge),
          };

          consumed = true;
          return {
            ...prev,
            grid,
            bonusReady: false,
            latestDrop: null,
          };
        });
        if (consumed) {
          challengeModeRef.current = null;
          setChallengeModeState(null);
        }
      }
    },
    [mode, isDragging]
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;

    const previousGrid = undoStack[undoStack.length - 1];
    // Keep the first entry (initial/loaded state) in the stack so environment stays stable
    if (undoStack.length > 1) {
      setUndoStack(stack => stack.slice(0, -1));
    }
    setPlaygroundState(prev => ({
      ...prev,
      grid: cloneGrid(previousGrid),
    }));
  }, [undoStack]);

  const handleMouseDown = useCallback(() => {
    if (
      mode === "playground" ||
      mode === "comparison" ||
      (mode === "random" && challengeModeRef.current)
    ) {
      setIsDragging(true);
    }
  }, [mode]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

const handleActiveBonusClick = useCallback(() => {
  if (mode !== "random") return;
  const bonus = randomState.activeBonus;
  if (!bonus || !randomState.bonusReady) return;

    if (bonus === "teleport") {
      let consumed = false;
      setRandomState((prev) => {
        if (!prev.bonusReady || prev.activeBonus !== "teleport") return prev;
        const grid = prev.grid;
        const validTiles: Position[] = [];
        for (let y = 0; y < grid.length; y++) {
          for (let x = 0; x < grid.length; x++) {
            if (grid[y][x].type !== "obstacle" && !prev.goals.some((g) => g.x === x && g.y === y)) {
              validTiles.push({ x, y });
            }
          }
        }
        if (validTiles.length === 0) {
          consumed = true;
          return { ...prev, bonusReady: false, latestDrop: null };
        }
        const currentPos = prev.agent;
        const nonCurrent = validTiles.filter((tile) => tile.x !== currentPos.x || tile.y !== currentPos.y);
        const farThreshold = Math.max(4, Math.floor(prev.grid.length / 3));
        const farTiles = nonCurrent.filter(
          (tile) => Math.abs(tile.x - currentPos.x) + Math.abs(tile.y - currentPos.y) >= farThreshold,
        );
        const candidates = farTiles.length > 0 ? farTiles : nonCurrent.length > 0 ? nonCurrent : validTiles;
        if (candidates.length === 0) {
          consumed = true;
          return { ...prev, bonusReady: false, latestDrop: null };
        }
        consumed = true;
        const newPos = candidates[Math.floor(Math.random() * candidates.length)];
        return {
          ...prev,
          agent: newPos,
          bonusReady: false,
          latestDrop: null,
        };
      });
      if (consumed) {
        challengeModeRef.current = null;
        setChallengeModeState(null);
      }
      return;
    }

    const challengeType = bonus as ChallengeTile;
    const nextMode = challengeModeRef.current === challengeType ? null : challengeType;
    challengeModeRef.current = nextMode;
    setChallengeModeState(nextMode);
  }, [mode, randomState.activeBonus, randomState.bonusReady]);

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  useEffect(() => {
    if (mode !== "random") return;
    if (randomState.episode === 0) return;
    const latest = randomState.episodeHistory[randomState.episodeHistory.length - 1];
    if (!latest || !latest.success) return;
    if (latest.episode <= lastCelebratedEpisodeRef.current.random) return;
    if (isAutoRestartEnabled) {
      lastCelebratedEpisodeRef.current.random = latest.episode;
      setCelebration(null);
      return;
    }
    lastCelebratedEpisodeRef.current.random = latest.episode;
    const title = getEpisodeTitle(latest.episode, language);
    const sortedHistory = [...randomState.episodeHistory].sort((a, b) => {
      if (b.reward !== a.reward) return b.reward - a.reward;
      return a.steps - b.steps;
    });
    const rankIndex = sortedHistory.findIndex((entry) => entry.episode === latest.episode);
    const rank = rankIndex === -1 ? sortedHistory.length : rankIndex + 1;
    const fact = CELEBRATION_FACTS[Math.floor(Math.random() * CELEBRATION_FACTS.length)][language];
    toast({
      title: translate("Mission Complete", "Mission Complete"),
      description: translate(
        `Du hast ${title} in ${latest.steps} Zügen geknackt. Schau ins Leaderboard!`,
        `You conquered ${title} in ${latest.steps} moves. Check the leaderboard!`,
      ),
    });
    requestAnimationFrame(() => {
      setCelebration({ title, steps: latest.steps, reward: latest.reward, rank, fact });
    });
  }, [mode, randomState.episodeHistory, randomState.episode, translate, language, isAutoRestartEnabled]);

  useEffect(() => {
    if (mode !== "playground") return;
    if (playgroundState.episode === 0) return;
    const latest = playgroundState.episodeHistory[playgroundState.episodeHistory.length - 1];
    if (!latest || !latest.success) return;
    if (latest.episode <= lastCelebratedEpisodeRef.current.playground) return;
    if (isAutoRestartEnabled) {
      lastCelebratedEpisodeRef.current.playground = latest.episode;
      setCelebration(null);
      return;
    }
    lastCelebratedEpisodeRef.current.playground = latest.episode;
    const title = getEpisodeTitle(latest.episode, language);
    const sortedHistory = [...playgroundState.episodeHistory].sort((a, b) => {
      if (b.reward !== a.reward) return b.reward - a.reward;
      return a.steps - b.steps;
    });
    const rankIndex = sortedHistory.findIndex((entry) => entry.episode === latest.episode);
    const rank = rankIndex === -1 ? sortedHistory.length : rankIndex + 1;
    const fact = CELEBRATION_FACTS[Math.floor(Math.random() * CELEBRATION_FACTS.length)][language];
    toast({
      title: translate("Mission Complete", "Mission Complete"),
      description: translate(
        `Du hast ${title} in ${latest.steps} Zügen gemeistert. Schau ins Leaderboard!`,
        `You completed ${title} in ${latest.steps} moves. Check the leaderboard!`,
      ),
    });
    requestAnimationFrame(() => {
      setCelebration({ title, steps: latest.steps, reward: latest.reward, rank, fact });
    });
  }, [mode, playgroundState.episodeHistory, playgroundState.episode, translate, language, isAutoRestartEnabled]);

  // Level Mode: a level counts as solved when its objective is met (learned behaviour,
  // not a single lucky run), then the next level unlocks.
  const objectiveStatus = useMemo(
    () =>
      levelMode
        ? evaluateObjective({
            level: currentLevel as LevelNumber,
            grid: playgroundState.grid,
            spawn: playgroundState.spawn,
            goal: playgroundState.goal,
            history: playgroundState.episodeHistory,
            alpha,
            gamma,
          })
        : null,
    [levelMode, currentLevel, playgroundState.grid, playgroundState.spawn, playgroundState.goal, playgroundState.episodeHistory, alpha, gamma],
  );
  const solvedLevelRef = useRef<number | null>(null);
  useEffect(() => {
    if (!objectiveStatus?.solved || solvedLevelRef.current === currentLevel) return;
    solvedLevelRef.current = currentLevel;
    onLevelSolved?.();
    toast({
      title: translate("Level geschafft!", "Level solved!"),
      description:
        currentLevel >= 10
          ? translate("Du hast alle Level gemeistert. Der Free Mode ist freigeschaltet!", "You mastered every level. Free Mode is unlocked!")
          : translate("Das nächste Level ist freigeschaltet.", "The next level is unlocked."),
    });
  }, [objectiveStatus?.solved, currentLevel, onLevelSolved, translate]);

  const handlePlaygroundStart = () =>
    setPlaygroundState((prev) => ({ ...prev, isRunning: true }));

  const handlePlaygroundPause = () =>
    setPlaygroundState((prev) => ({ ...prev, isRunning: false }));

  const handlePlaygroundStep = () => {
    const worker = rlWorkerRef.current;
    if (worker) {
      // Sync latest state + params to worker, then request one step
      const initMsg: ToWorkerMsg = {
        type: "INIT",
        state: { ...playgroundState, isRunning: false },
        params: { explorationRate, alpha, gamma, consumeRewards, autoRestart: false, directionBias },
        delayMs: simulationDelayMs,
      };
      worker.postMessage(initMsg);
      worker.postMessage({ type: "STEP_ONCE" } as ToWorkerMsg);
    } else {
      // Fallback: run on main thread
      setPlaygroundState((prev) => {
        const next = runPlaygroundStep({ ...prev, isRunning: true }, explorationRate, directionBias, consumeRewards, alpha, gamma);
        return { ...next, isRunning: prev.isRunning };
      });
    }
  };

  const handlePlaygroundReset = useCallback(() => {
    const nextSize = TILE_SIZE_MAP[tileSize];
    setCelebration(null);
    setUndoStack([]);
    setIsReplaying(false);
    setReplayEpisode(null);
    lastCelebratedEpisodeRef.current.playground = 0;
    setPlaygroundState(
      levelMode
        ? createLevelPlaygroundState(currentLevel as LevelNumber)
        : createInitialPlaygroundState(nextSize, false),
    );
  }, [tileSize, levelMode, currentLevel]);

  // Level Mode: switching to another level (or (re-)entering Level Mode at all,
  // e.g. coming back from Free Mode) loads that level's own small world, so
  // each level is a genuine, populated challenge instead of a blank grid.
  const prevLevelRef = useRef<number>(currentLevel);
  const wasLevelModeRef = useRef<boolean>(levelMode);
  useEffect(() => {
    if (!levelMode) {
      prevLevelRef.current = currentLevel;
      wasLevelModeRef.current = false;
      return;
    }
    if (currentLevel !== prevLevelRef.current || !wasLevelModeRef.current) {
      handlePlaygroundReset();
    }
    prevLevelRef.current = currentLevel;
    wasLevelModeRef.current = true;
  }, [currentLevel, levelMode, handlePlaygroundReset]);

  // Entering Level Mode always lands on the Playground grid — Random/Comparison
  // mode carry their own ungated hyperparameter sliders and would let a player
  // skip level restrictions if the mode was left on one of them from Free Mode.
  useEffect(() => {
    if (levelMode && mode !== "playground") {
      setMode("playground");
    }
  }, [levelMode, mode]);

  const handleReplayBest = useCallback(() => {
    if (mode === "playground" && playgroundState.episodeHistory.length > 0) {
      // Find the best successful episode
      const successfulEpisodes = playgroundState.episodeHistory.filter(ep => ep.success);
      if (successfulEpisodes.length === 0) {
        toast({
          title: translate("Keine erfolgreiche Episode", "No successful episode"),
          description: translate(
            "Es gibt noch keine erfolgreiche Episode zum Abspielen. Lass den Rover erst das Ziel erreichen!",
            "There's no successful episode to replay yet. Let the rover reach the goal first!"
          ),
        });
        return;
      }

      // Sort by reward (highest first), then by steps (lowest first)
      const bestEpisode = [...successfulEpisodes].sort((a, b) => {
        if (b.reward !== a.reward) return b.reward - a.reward;
        return a.steps - b.steps;
      })[0];

      setReplayEpisode(bestEpisode);
      setIsReplaying(true);
      setPlaygroundState(prev => ({
        ...prev,
        agent: { x: Math.min(1, prev.grid.length - 1), y: Math.min(1, prev.grid.length - 1) },
        currentSteps: 0,
        isRunning: true,
      }));

      toast({
        title: translate("Replay Started", "🎬 Replay started"),
        description: translate(
          `Zeige beste Episode: ${bestEpisode.steps} Schritte, ${numberFormatter.format(bestEpisode.reward)} Reward`,
          `Showing best episode: ${bestEpisode.steps} steps, ${numberFormatter.format(bestEpisode.reward)} reward`
        ),
      });
    }
  }, [mode, playgroundState.episodeHistory, translate]);

  const handleStopReplay = useCallback(() => {
    setIsReplaying(false);
    setReplayEpisode(null);
    setPlaygroundState(prev => ({ ...prev, isRunning: false }));
  }, []);

  const buildGridFromConfig = useCallback((config: GridConfig) => {
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
  }, []);

  const applyGridConfig = useCallback((config: GridConfig) => {
    setCelebration(null);
    setIsReplaying(false);
    setReplayEpisode(null);
    lastCelebratedEpisodeRef.current.playground = 0;
    const sizeOptionEntry = (Object.entries(TILE_SIZE_MAP) as Array<[TileSizeOption, number]>).find(
      ([, value]) => value === config.size,
    );
    const targetSize = sizeOptionEntry?.[0] ?? "s";
    setTileSize(targetSize);

    const { grid, agent, goal } = buildGridFromConfig(config);

    // Save initial grid state so undo returns to loaded environment instead of clearing it
    setUndoStack([cloneGrid(grid)]);

    setPlaygroundState({
      agent,
      goal,
      spawn: agent,
      grid,
      isRunning: false,
      episode: 0,
      totalReward: 0,
      currentSteps: 0,
      episodeHistory: [],
      portalCooldowns: {},
      pendingPortalTeleport: null,
      qTable: {},
    });
  }, [buildGridFromConfig]);

  const handleLoadPreset = useCallback((preset: PresetLevel) => {
    applyGridConfig(preset);
  }, [applyGridConfig]);

  const applyComparisonConfig = useCallback((config: GridConfig) => {
    const sizeOptionEntry = (Object.entries(TILE_SIZE_MAP) as Array<[TileSizeOption, number]>).find(
      ([, value]) => value === config.size,
    );
    const targetSize = sizeOptionEntry?.[0] ?? "s";
    setTileSize(targetSize);

    const { grid, agent, goal } = buildGridFromConfig(config);
    const leftGrid = cloneGrid(grid);
    const rightGrid = cloneGrid(grid);
    const leftAgent = { ...agent };
    const rightAgent = { ...agent };
    const leftGoal = { ...goal };
    const rightGoal = { ...goal };

    setLeftRewardAnimation(null);
    setRightRewardAnimation(null);
    setComparisonState((prev) => ({
      left: {
        ...prev.left,
        agent: leftAgent,
        goal: leftGoal,
        spawn: leftAgent,
        grid: leftGrid,
        isRunning: false,
        episode: 0,
        totalReward: 0,
        currentSteps: 0,
        episodeHistory: [],
        portalCooldowns: {},
        qTable: {},
      },
      right: {
        ...prev.right,
        agent: rightAgent,
        goal: rightGoal,
        spawn: rightAgent,
        grid: rightGrid,
        isRunning: false,
        episode: 0,
        totalReward: 0,
        currentSteps: 0,
        episodeHistory: [],
        portalCooldowns: {},
        qTable: {},
      },
    }));
  }, [buildGridFromConfig]);

  const handleLoadComparisonPreset = useCallback((preset: PresetLevel) => {
    applyComparisonConfig(preset);
  }, [applyComparisonConfig]);

  const getPreviewTileClass = useCallback((type: TileType | "goal" | "agent") => {
    switch (type) {
      case "reward":
        return "bg-tile-reward";
      case "punishment":
        return "bg-tile-punishment";
      case "obstacle":
        return "bg-tile-obstacle";
      case "portal":
        return "bg-tile-portal";
      case "goal":
        return "bg-tile-goal";
      case "agent":
        return "bg-tile-agent";
      default:
        return "bg-tile-empty";
    }
  }, []);

  const renderEnvironmentPreview = useCallback(
    (config: GridConfig) => {
      const size = config.size;
      const tileSize = Math.max(6, Math.floor(80 / size));
      const tileLookup = new Map<string, TileType>();
      config.tiles.forEach((tile) => {
        tileLookup.set(`${tile.x}-${tile.y}`, tile.type);
      });

      return (
        <div
          className="grid bg-tile-bg rounded-md overflow-hidden"
          style={{
            gridTemplateColumns: `repeat(${size}, ${tileSize}px)`,
            gridTemplateRows: `repeat(${size}, ${tileSize}px)`,
            gap: "1px",
          }}
        >
          {Array.from({ length: size * size }, (_, index) => {
            const x = index % size;
            const y = Math.floor(index / size);
            const isAgent = config.agent?.x === x && config.agent?.y === y;
            const isGoal = config.goal?.x === x && config.goal?.y === y;
            const tileType = isGoal ? "goal" : isAgent ? "agent" : tileLookup.get(`${x}-${y}`) || "empty";
            return (
              <div
                key={`${x}-${y}`}
                className={cn("rounded-[2px]", getPreviewTileClass(tileType))}
                style={{ width: tileSize, height: tileSize }}
              />
            );
          })}
        </div>
      );
    },
    [getPreviewTileClass],
  );

  const handlePublishGlobal = useCallback(async () => {
    if (!authToken) {
      setAuthDialogOpen(true);
      return;
    }
    if (!isAdmin) {
      toast({
        title: translate("Nur für Admins", "Admins only"),
        description: translate(
          "Du brauchst Admin-Rechte, um eine globale Challenge zu veröffentlichen.",
          "You need admin rights to publish a global challenge.",
        ),
      });
      return;
    }

    const config = buildGridConfigFromState(playgroundState);
    try {
      const response = await fetch(`${apiBase}/api/admin/global-env`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || "Publish failed");
      }

      toast({
        title: translate("Global Challenge veröffentlicht", "Global challenge published"),
        description: translate(
          "Dein Setup ist jetzt die Challenge des Tages.",
          "Your setup is now the challenge of the day.",
        ),
      });
    } catch (error) {
      toast({
        title: translate("Veröffentlichung fehlgeschlagen", "Publish failed"),
        description: translate(
          "Bitte prüfe die Serververbindung und versuche es erneut.",
          "Check the server connection and try again.",
        ),
      });
    }
  }, [apiBase, authToken, buildGridConfigFromState, isAdmin, playgroundState, translate]);

  const handleLoadEnvironment = useCallback((gridConfig: GridConfig, progressData: unknown) => {
    if (gridConfig) {
      applyGridConfig(gridConfig);
    }
    const history = (progressData as { episodeHistory?: EpisodeStats[] } | null)?.episodeHistory;
    if (history) {
      setPlaygroundState((prev) => ({ ...prev, episodeHistory: history }));
    }
  }, [applyGridConfig]);

  const handleLoadSavedEnvironment = useCallback(
    (env: { name: string; gridConfig: GridConfig; progressData: unknown }) => {
      handleLoadEnvironment(env.gridConfig, env.progressData);
      toast({
        title: translate("Umgebung geladen", "Environment loaded"),
        description: translate(
          `"${env.name}" ist bereit im Playground.`,
          `"${env.name}" is ready in the playground.`,
        ),
      });
    },
    [handleLoadEnvironment, translate],
  );

  useEffect(() => {
    if (hasLoadedGlobalEnv) return;
    // Don't auto-load global env on initial page load to preserve "zwei wege" preset for small field
    // Users can manually load saved environments if needed
    setHasLoadedGlobalEnv(true);
  }, [hasLoadedGlobalEnv]);

  const handleTileSizeChange = useCallback(
    (size: TileSizeOption) => {
      if (size === tileSize) return;
      const nextSize = TILE_SIZE_MAP[size];
      setTileSize(size);
      setCelebration(null);
      setPlaygroundState(createInitialPlaygroundState(nextSize, false));
      setComparisonState(createComparisonState(nextSize));
      if (speedrunEnabled) {
        setRandomState((prev) =>
          buildSpeedrunState(prev.speedrun.stage, nextSize, prev.episode, prev.episodeHistory),
        );
      } else {
        setRandomState(createRandomModeState(LEVELS[levelKey], nextSize));
      }
    },
    [tileSize, levelKey, speedrunEnabled]
  );

  const handleModeChange = (targetMode: Mode) => {
    // Level Mode only ever shows the Playground grid — Random/Comparison
    // mode expose their own hyperparameter sliders and grids that aren't
    // gated by level progress, which would let players skip levels and
    // see "locked" learning parameters. Free Mode is unrestricted.
    if (levelMode && targetMode !== "playground") return;
    setMode(targetMode);
    setCelebration(null);
    // Reset celebration tracking when switching modes
    lastCelebratedEpisodeRef.current.playground = 0;
    lastCelebratedEpisodeRef.current.random = 0;

    // Stop all running modes
    setPlaygroundState((prev) => ({ ...prev, isRunning: false }));
    setRandomState((prev) => ({ ...prev, isRunning: false }));
    setComparisonState((prev) => ({
      left: { ...prev.left, isRunning: false },
      right: { ...prev.right, isRunning: false },
    }));

    if (targetMode === "random") {
      if (speedrunEnabled) {
        setRandomState((prev) =>
          buildSpeedrunState(prev.speedrun.stage, baseFieldSize, prev.episode, prev.episodeHistory),
        );
      } else {
        setRandomState(createRandomModeState(LEVELS[levelKey], baseFieldSize));
      }
    } else if (targetMode === "playground") {
      if (speedrunEnabled) {
        setSpeedrunEnabled(false);
        setRandomState((prev) => {
          const baseState = createRandomModeState(LEVELS[levelKey], baseFieldSize);
          return {
            ...baseState,
            episode: prev.episode,
            episodeHistory: prev.episodeHistory,
            speedrun: {
              active: false,
              stage: 0,
              timeLeft: 0,
              timeLimit: 0,
              pendingStage: false,
              baseSize: baseFieldSize,
            },
          };
        });
      }
    } else if (targetMode === "comparison") {
      // Reset comparison state
      setComparisonState(createComparisonState(baseFieldSize));
    }
  };

  const handleComparisonStart = useCallback(() => {
    setComparisonState((prev) => ({
      left: prev.left.isRunning
        ? prev.left
        : {
            ...prev.left,
            isRunning: true,
          },
      right: prev.right.isRunning
        ? prev.right
        : {
            ...prev.right,
            isRunning: true,
          },
    }));
  }, []);

  const handleComparisonPause = useCallback(() => {
    setComparisonState((prev) => ({
      left: prev.left.isRunning ? { ...prev.left, isRunning: false } : prev.left,
      right: prev.right.isRunning ? { ...prev.right, isRunning: false } : prev.right,
    }));
  }, []);

  const handleComparisonReset = useCallback(() => {
    setComparisonState(createComparisonState(baseFieldSize));
  }, [baseFieldSize]);

  const handleComparisonTilePlacement = useCallback(
    (x: number, y: number) => {
      const selectedType = placementModeRef.current;
      if (!selectedType) return;

      setComparisonState((prev) => {
        const applyPlacement = (rover: ComparisonRoverState) => {
          if ((x === rover.agent.x && y === rover.agent.y) || (x === rover.goal.x && y === rover.goal.y)) {
            return rover;
          }

          const grid = cloneGrid(rover.grid);
          const current = grid[y][x];
          const nextType = isDragging ? selectedType : (current.type === selectedType ? "empty" : selectedType);

          if (current.type === nextType) {
            return rover;
          }

          grid[y][x] = {
            ...current,
            type: nextType,
            value: levelValue(nextType),
            qValue: nextType === "empty" ? 0 : current.qValue,
            visits: nextType === "empty" ? 0 : current.visits,
          };

          return {
            ...rover,
            grid,
          };
        };

        const updatedLeft = applyPlacement(prev.left);
        const updatedRight = applyPlacement(prev.right);

        if (updatedLeft === prev.left && updatedRight === prev.right) {
          return prev;
        }

        return {
          left: updatedLeft,
          right: updatedRight,
        };
      });
    },
    [isDragging],
  );

  useEffect(() => {
    if (mode !== "comparison") return;
    setComparisonState((prev) => {
      const leftNeedsUpdate =
        prev.left.alpha !== alpha ||
        prev.left.gamma !== gamma ||
        prev.left.explorationRate !== explorationRate;
      const rightNeedsUpdate =
        prev.right.alpha !== alpha ||
        prev.right.gamma !== gamma ||
        prev.right.explorationRate !== explorationRate;

      if (!leftNeedsUpdate && !rightNeedsUpdate) {
        return prev;
      }

      return {
        left: leftNeedsUpdate ? { ...prev.left, alpha, gamma, explorationRate } : prev.left,
        right: rightNeedsUpdate ? { ...prev.right, alpha, gamma, explorationRate } : prev.right,
      };
    });
  }, [mode, alpha, gamma, explorationRate]);

  const handleLevelChange = useCallback((value: LevelKey) => {
    if (speedrunEnabled) return;
    setCelebration(null);
    setLevelKey(value);
    setRandomState(createRandomModeState(LEVELS[value], baseFieldSize));
  }, [baseFieldSize, speedrunEnabled]);

  const handleSpeedrunToggle = useCallback(
    (checked: boolean) => {
      setCelebration(null);
      const baseSize = baseFieldSize;
      if (checked) {
        setSpeedrunEnabled(true);
        challengeModeRef.current = null;
        setChallengeModeState(null);
        setRandomState((prev) =>
          buildSpeedrunState(0, baseSize, prev.episode, prev.episodeHistory),
        );
      } else {
        setSpeedrunEnabled(false);
        challengeModeRef.current = null;
        setChallengeModeState(null);
        setRandomState((prev) => {
          const baseState = createRandomModeState(LEVELS[levelKey], baseSize);
          return {
            ...baseState,
            episode: prev.episode,
            episodeHistory: prev.episodeHistory,
            speedrun: {
              active: false,
              stage: 0,
              timeLeft: 0,
              timeLimit: 0,
              pendingStage: false,
              baseSize,
            },
          };
        });
      }
    },
    [levelKey, baseFieldSize],
  );

  const handleRandomStart = () => {
    setCelebration(null);
    setRandomState((prev) => {
      if (prev.isRunning) return prev;
      const agentAtSpawn = prev.agent.x === prev.spawn.x && prev.agent.y === prev.spawn.y;
      return {
        ...prev,
        agent: agentAtSpawn ? prev.agent : { ...prev.spawn },
        isRunning: true,
        speedrun: prev.speedrun.active
          ? {
              ...prev.speedrun,
              timeLeft: prev.speedrun.timeLimit,
            }
          : prev.speedrun,
      };
    });
  };

  const handleRandomPause = () =>
    setRandomState((prev) => ({ ...prev, isRunning: false }));

  const handleRandomStep = () =>
    setRandomState((prev) => {
      const next = runRandomModeStep(
        { ...prev, isRunning: true },
        explorationRate,
        directionBias,
        consumeRewards,
        alpha,
        gamma,
      );
      return {
        ...next,
        isRunning: prev.isRunning,
        speedrun: {
          ...next.speedrun,
          timeLeft: prev.speedrun.timeLeft,
        },
      };
    });

  const handleRandomReset = () => {
    setCelebration(null);
    lastCelebratedEpisodeRef.current.random = 0;
    const baseSize = baseFieldSize;
    if (speedrunEnabled) {
      setRandomState((prev) =>
        buildSpeedrunState(0, baseSize, prev.episode, prev.episodeHistory),
      );
    } else {
      setRandomState(createRandomModeState(LEVELS[levelKey], baseSize));
    }
  };

  const activeGrid = mode === "playground" ? playgroundState.grid : randomState.grid;
  const activeQTable = mode === "playground" ? playgroundState.qTable : randomState.qTable;
  const gridSize = activeGrid.length;
  const tileSizePx = Math.max(24, Math.floor(GRID_PIXEL_TARGET[tileSize] / Math.max(gridSize, 1)));
  const gridPixelDimension = tileSizePx * gridSize;

  // Zusätzlicher Platz basierend auf Feldgröße: s=320px, m=200px, l=150px
  // Bei l: genug für Header + Grid + padding ohne scrollen
  const cardHeightExtra = tileSize === 's' ? 320 : tileSize === 'm' ? 200 : 150;
  const cardHeight = gridPixelDimension + cardHeightExtra;

  // Grid-Layout: Bei größeren Feldern wird die Playground-Spalte breiter
  const gridCols = tileSize === 's'
    ? 'lg:grid-cols-[minmax(250px,1fr)_auto_minmax(250px,1fr)]'
    : tileSize === 'm'
    ? 'lg:grid-cols-[minmax(200px,0.7fr)_auto_minmax(200px,0.7fr)]'
    : 'lg:grid-cols-[minmax(180px,0.5fr)_auto_minmax(180px,0.5fr)]';

  const leftComparisonGridSize = comparisonState.left.grid.length;
  const rightComparisonGridSize = comparisonState.right.grid.length;
  const leftComparisonTileSizePx = Math.max(
    24,
    Math.floor(GRID_PIXEL_TARGET[tileSize] / Math.max(leftComparisonGridSize, 1)),
  );
  const rightComparisonTileSizePx = Math.max(
    24,
    Math.floor(GRID_PIXEL_TARGET[tileSize] / Math.max(rightComparisonGridSize, 1)),
  );
  const leftComparisonMaxVisits = useMemo(
    () => {
      if (!showHeatmap) return 1;
      const visits = comparisonState.left.grid.flat().map((cell) => cell.visits);
      return Math.max(...visits, 1);
    },
    [comparisonState.left.grid, showHeatmap],
  );
  const rightComparisonMaxVisits = useMemo(
    () => {
      if (!showHeatmap) return 1;
      const visits = comparisonState.right.grid.flat().map((cell) => cell.visits);
      return Math.max(...visits, 1);
    },
    [comparisonState.right.grid, showHeatmap],
  );
  const randomGridSize = randomState.grid.length;
  const randomObstacleCount = randomState.grid.reduce(
    (acc, row) => acc + row.filter((cell) => cell.type === "obstacle").length,
    0,
  );
  const randomRewardCount = randomState.grid.reduce(
    (acc, row) => acc + row.filter((cell) => cell.type === "reward").length,
    0,
  );
  const randomPunishmentCount = randomState.grid.reduce(
    (acc, row) => acc + row.filter((cell) => cell.type === "punishment").length,
    0,
  );
  const activeBonus = randomState.activeBonus;
  const bonusDetail = activeBonus ? BONUS_DETAILS[activeBonus] : null;
  const isPlaceableBonus = activeBonus !== null && activeBonus !== "teleport";
  const isBonusArmed = isPlaceableBonus && challengeMode === activeBonus;
  const bonusButtonVariant: "default" | "outline" = !randomState.bonusReady
    ? "outline"
    : isPlaceableBonus
      ? isBonusArmed
        ? "default"
      : "outline"
    : "default";
  const bonusDisabled = !randomState.bonusReady;
  const randomLeaderboardFiltered = speedrunEnabled
    ? randomLeaderboardEntries.filter((entry) => entry.mode === "speedrun")
      : randomLeaderboardEntries.filter((entry) => entry.mode !== "speedrun");
  const activeLeaderboardEntries =
    mode === "random" ? randomLeaderboardFiltered : playgroundLeaderboardEntries;
  const leaderboardTitle =
    mode === "random"
      ? speedrunEnabled
        ? translate("Speedrun Leaderboard", "Speedrun Leaderboard")
        : translate("Random Mode Leaderboard", "Random Mode Leaderboard")
      : translate("Playground Leaderboard", "Playground Leaderboard");
  const leaderboardEmptyText = mode === "random"
    ? speedrunEnabled
      ? translate(
          "Starte den Speedrun, um deinen ersten Eintrag zu erzielen.",
          "Start the speedrun to record your first entry.",
        )
      : translate(
          "Spiele eine Episode, um deinen ersten Eintrag freizuschalten.",
          "Complete an episode to unlock your first entry.",
        )
    : translate(
        "Spiele eine Episode, um deinen ersten Eintrag freizuschalten.",
        "Complete an episode to unlock your first entry.",
      );
  const legend = (
    <div className="mt-3 grid gap-3 text-sm">
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-3 group">
          <span className={cn("legend-dot transition-transform group-hover:scale-110", item.className)} aria-hidden />
          <div className="flex flex-col">
            <span className="font-bold text-foreground">
              {item.emoji} {item.label}
            </span>
            <span className="text-sm text-muted-foreground leading-relaxed">{item.description}</span>
          </div>
        </div>
      ))}
    </div>
  );

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${gridSize}, ${tileSizePx}px)`,
    gridTemplateRows: `repeat(${gridSize}, ${tileSizePx}px)`,
  };

  const randomHud = mode === "random" && (
    <Card className="rounded-3xl border border-border bg-card/95 p-6 shadow-medium text-foreground backdrop-blur-sm transition-colors duration-200 hover:border-primary/30">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-3">
          <h3 className="text-lg font-bold gradient-text">
            {translate("🎲 Zufallsmodus", "🎲 Random Mode")}
          </h3>
          <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
            {translate(
              "Der Rover lernt in zufällig generierten Welten. Beobachte, wie er selbstständig Strategien entwickelt!",
              "Watch the rover learn inside procedurally generated worlds – every run is a fresh challenge!",
            )}
          </p>
          <p className="text-sm text-muted-foreground/80">{levelDescription}</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Label className="text-sm font-semibold text-muted-foreground">
                {translate("Speedrun-Modus", "Speedrun mode")}
              </Label>
              <Switch
                checked={speedrunEnabled}
                onCheckedChange={handleSpeedrunToggle}
                aria-label={translate("Speedrun umschalten", "Toggle speedrun mode")}
              />
            </div>
            {speedrunEnabled && (
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="bg-red-500/10 text-red-400 border-red-400/30">
                    ⏱ {randomState.speedrun.timeLeft}s
                  </Badge>
                  <Badge variant="secondary" className="bg-foreground/10 text-foreground border-foreground/20">
                    {translate("Stufe", "Stage")} {(randomState.speedrun.stage ?? 0) + 1}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {translate(
                    "Die Zeit läuft weiter, bis der Rover das Ziel erreicht – jede Stufe wird dichter und schwieriger.",
                    "The clock keeps ticking until the rover hits the goal – each stage is denser and harder.",
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            {levelName}
          </Badge>
          <Badge variant="secondary" className="bg-foreground/10 text-foreground border-foreground/15 font-semibold">
            {randomGridSize} × {randomGridSize}
          </Badge>
          <Badge variant="secondary">
            {translate("Episode", "Episode")} {randomState.episode}
          </Badge>
          <Badge variant="secondary" className="bg-foreground/10 text-foreground border-foreground/15">
            👣 {randomState.currentSteps}
          </Badge>
          <Badge
            variant="secondary"
            className={
              randomState.totalReward >= 0
                ? "bg-green-500/10 text-green-400"
                : "bg-red-500/10 text-red-400"
            }
          >
            {numberFormatter.format(randomState.totalReward)}
          </Badge>
          <Badge variant="secondary">🍬 {randomRewardCount}</Badge>
          <Badge variant="secondary">⚡ {randomPunishmentCount}</Badge>
          <Badge variant="secondary">🧱 {randomObstacleCount}</Badge>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-border/40 bg-background/70">
        <button
          type="button"
          onClick={() => setShowRandomStatsCard((prev) => !prev)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:text-primary"
        >
          <span>{translate("Random Mode Statistics", "Random Mode Statistics")}</span>
          {showRandomStatsCard ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showRandomStatsCard && (
          <div className="border-t border-border/40 px-4 py-3 text-sm text-muted-foreground">
            {randomStatsSummary.count === 0 ? (
              <p>{translate("Noch keine Daten – starte eine Episode, um Statistiken zu sehen.", "No data yet — run an episode to gather statistics.")}</p>
            ) : (
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <span>{translate("Gesamt-Episoden", "Total episodes")}</span>
                  <span className="font-semibold text-foreground">{randomStatsSummary.count}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate("Ø Schritte", "Avg. steps")}</span>
                  <span className="font-semibold text-foreground">{formatStepsValue(randomStatsSummary.avgSteps)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate("Ø Reward", "Avg. reward")}</span>
                  <span className="font-semibold text-foreground">{formatRewardValue(randomStatsSummary.avgReward)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate("Bester Reward", "Best reward")}</span>
                  <span className="font-semibold text-foreground">{formatRewardValue(randomStatsSummary.bestReward)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate("Schnellste Episode", "Fastest episode")}</span>
                  <span className="font-semibold text-foreground">{formatStepsValue(randomStatsSummary.bestSteps)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );

  const currentSlide = tutorialSlides[tutorialStep];

  return (
    <>
      {/* Tutorial Dialog */}
      <Dialog open={tutorialOpen} onOpenChange={setTutorialOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold">{currentSlide?.title}</DialogTitle>
              <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1.5">
                <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span role="img" aria-hidden>
                    🇬🇧
                  </span>
                  {translate("English", "English")}
                </span>
                <Switch
                  id="tutorial-language-toggle"
                  checked={isEnglish}
                  onCheckedChange={(checked) => setLanguage(checked ? "en" : "de")}
                  aria-label={translate("Sprache umschalten", "Toggle language")}
                />
              </div>
            </div>
            <DialogDescription className="text-base leading-relaxed pt-2">
              {currentSlide?.content}
            </DialogDescription>
          </DialogHeader>

          {currentSlide?.bullets && (
            <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-6 py-3">
              {currentSlide.bullets.map((bullet, idx) => (
                <li key={idx} className="leading-relaxed">{bullet}</li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {translate("Schritt", "Step")} {tutorialStep + 1} / {tutorialSlides.length}
            </div>
            <div className="flex gap-2">
              {tutorialStep > 0 && (
                <Button variant="outline" onClick={prevTutorialStep}>
                  {translate("Zurück", "Back")}
                </Button>
              )}
              <Button variant="ghost" onClick={closeTutorial}>
                {translate("Später", "Skip")}
              </Button>
              <Button onClick={nextTutorialStep}>
                {tutorialStep < tutorialSlides.length - 1
                  ? translate("Weiter", "Next")
                  : translate("Los geht's!", "Let's go!")
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={authDialogOpen}
        onOpenChange={(open) => {
          setAuthDialogOpen(open);
          if (!open) {
            setAuthError(null);
            setAuthPassword("");
          }
        }}
      >
        <DialogContent className="max-w-md bg-slate-900 border border-slate-800 shadow-2xl p-8 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              {authIsRegistering
                ? translate("Account erstellen", "Create account")
                : translate("Login", "Login")}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-400">
              {translate(
                "Nur Nutzername und Passwort. Dein Level-Fortschritt wird gespeichert und folgt dir auf jedes Gerät.",
                "Just a username and password. Your level progress is saved and follows you to any device.",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="auth-username"
                className="text-xs font-semibold text-slate-400 uppercase tracking-wider"
              >
                {translate("Nutzername", "Username")}
              </Label>
              <Input
                id="auth-username"
                onKeyDown={(event) => event.key === "Enter" && handleAuthSubmit()}
                value={authUsername}
                onChange={(event) => setAuthUsername(event.target.value)}
                placeholder="max"
                className="h-12 rounded-lg bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="auth-password"
                className="text-xs font-semibold text-slate-400 uppercase tracking-wider"
              >
                {translate("Passwort", "Password")}
              </Label>
              <Input
                id="auth-password"
                onKeyDown={(event) => event.key === "Enter" && handleAuthSubmit()}
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                className="h-12 rounded-lg bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:border-transparent"
              />
            </div>
            {authIsRegistering && (
              <p
                role="note"
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200"
              >
                {translate(
                  "Merk dir dein Passwort gut! Es gibt keine „Passwort vergessen“-Funktion. Ohne Passwort ist dein Fortschritt nicht mehr erreichbar. Mindestens 6 Zeichen.",
                  "Remember your password! There is no “forgot password” option. Without it your progress can't be recovered. At least 6 characters.",
                )}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                className="border-slate-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label htmlFor="remember-me" className="text-sm text-slate-300">
                {translate("Eingeloggt bleiben", "Stay signed in")}
              </Label>
            </div>
            {authError && <p className="text-xs text-red-400">{authError}</p>}
            <div className="space-y-3">
              <Button
                onClick={handleAuthSubmit}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-colors"
              >
                {authIsRegistering ? translate("Registrieren", "Register") : translate("Login", "Login")}
              </Button>
              <button
                type="button"
                onClick={() => setAuthIsRegistering((prev) => !prev)}
                className="mx-auto text-sm text-slate-400 hover:text-white transition-colors"
              >
                {authIsRegistering
                  ? translate("Schon registriert? ", "Already registered? ")
                  : translate("Neu hier? ", "New here? ")}
                <span className="text-primary/90 hover:text-primary">
                  {authIsRegistering ? translate("Login", "Login") : translate("Registrieren", "Register")}
                </span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="bg-[var(--gradient-main)] pb-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-6">
        {/* Hero Section */}
        <div className="rounded-3xl border border-border bg-card/95 p-8 ">
          <div className="flex items-center gap-3 mb-4">
            <Target className="h-8 w-8 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold gradient-text">Reward Rover</h1>
          </div>

          <p className="text-xl text-muted-foreground leading-relaxed mb-6 max-w-4xl">
            {isEnglish ? (
              <>
                Experience <strong className="text-foreground gradient-text">reinforcement learning</strong> across three modes.
                Compare strategies, explore random worlds, and build your own playground.
              </>
            ) : (
              <>
                Erlebe <strong className="text-foreground gradient-text">Reinforcement Learning</strong> in drei Modi.
                Vergleiche Strategien, erkunde Zufallswelten und baue deinen eigenen Playground.
              </>
            )}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowIntro((prev) => !prev)}
                className="font-semibold flex items-center gap-2"
              >
                {introToggleLabel}
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform duration-200", showIntro ? "rotate-180" : "")}
                />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {authUser ? (
                <>
                  <Badge variant="secondary" className="bg-foreground/10 text-foreground border-foreground/15">
                    {authUser.username}
                  </Badge>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open("/admin", "_blank")}
                    >
                      {translate("Admin Panel", "Admin Panel")}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    {translate("Logout", "Logout")}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setAuthDialogOpen(true)}>
                  {translate("Login", "Login")}
                </Button>
              )}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 hover:bg-card transition-colors"
                aria-label={translate("Theme umschalten", "Toggle theme")}
              >
                {theme === "light" ? (
                  <Moon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Sun className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1.5">
                <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span role="img" aria-hidden>
                    🇬🇧
                  </span>
                  {translate("English UI", "English UI")}
                </span>
                <Switch
                  id="language-toggle"
                  checked={isEnglish}
                  onCheckedChange={(checked) => setLanguage(checked ? "en" : "de")}
                  aria-label={translate("Sprache umschalten", "Toggle language")}
                />
              </div>
            </div>
          </div>

          <Dialog open={rlDialogOpen} onOpenChange={setRlDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[85vh]">
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {translate("Reinforcement Learning auf einen Blick", "Reinforcement learning at a glance")}
                </DialogTitle>
                <DialogDescription className="text-base">
                  {translate(
                    "Wie der Rover lernt und warum Q-Werte so wichtig sind.",
                    "How the rover learns and why Q-values matter.",
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 overflow-y-auto max-h-[calc(85vh-120px)] pr-2">

                {/* Grundlagen */}
                <Collapsible open={showRLBasics} onOpenChange={setShowRLBasics} className="space-y-3">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between rounded-xl border border-border/40 bg-background/60 font-semibold text-base hover:bg-background/80"
                    >
                      <span>{translate("🧠 Grundlagen", "🧠 Basics")}</span>
                      <ChevronDown
                        className={cn("h-4 w-4 transition-transform duration-200", showRLBasics ? "rotate-180" : "")}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <div className="space-y-6 text-base leading-relaxed text-muted-foreground pt-3">
                      <p>
                        {translate(
                          "🤖 Der Rover ist ein Agent, der durch Belohnungen und Strafen lernt. Jede seiner Aktionen verändert die Welt – und er versucht herauszufinden, welche Folgen langfristig die meisten Punkte bringen.",
                          "🤖 Our rover is an agent that learns through rewards and penalties. Every action changes the world, and it experiments to discover which outcomes yield the most points long-term.",
                        )}
                      </p>

                      <p>
                        {translate(
                          "🍽️ Stell dir ein Restaurant vor: Dein Lieblingsgericht zu bestellen ist Ausbeuten (Exploitation) – sicher und vertraut. Neues probieren ist Entdecken (Exploration) – vielleicht findest du deinen neuen Favoriten. RL hilft dabei, genau diese Balance zu finden.",
                          "🍽️ Picture a restaurant: ordering your favourite dish is exploitation – safe and familiar. Trying something new is exploration – and you might discover a new favourite. RL helps agents strike that balance.",
                        )}
                      </p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Q-Learning Formel */}
                <Collapsible open={showRLFormula} onOpenChange={setShowRLFormula} className="space-y-3">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between rounded-xl border border-border/40 bg-background/60 font-semibold text-base hover:bg-background/80"
                    >
                      <span>{translate("📐 Q-Learning Formel", "📐 Q-Learning Formula")}</span>
                      <ChevronDown
                        className={cn("h-4 w-4 transition-transform duration-200", showRLFormula ? "rotate-180" : "")}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <div className="pt-3">
                      <div className="rounded-xl border border-border/60 bg-secondary/40 p-5 text-foreground space-y-4">
                        <h4 className="text-lg font-semibold">
                          {translate("Q-Learning Update-Regel", "Q-Learning Update Rule")}
                        </h4>
                        <pre className="whitespace-pre-wrap text-base sm:text-lg font-mono">
                          Q(s, a) ← Q(s, a) + α · [ r + γ · maxₐ′ Q(s′, a′) − Q(s, a) ]
                        </pre>
                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                          {translate(
                            "α (Alpha) ist die Lernrate, γ (Gamma) der Optimismus in die Zukunft, r der direkte Reward. Q(s, a) speichert, wie gut eine Aktion in einem Zustand bisher funktioniert hat.",
                            "α (alpha) is the learning rate, γ (gamma) the optimism for the future, and r the immediate reward. Q(s, a) stores how good an action has proven in a given state.",
                          )}
                        </p>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Anwendungsbeispiele */}
                <Collapsible open={showRLExamples} onOpenChange={setShowRLExamples} className="space-y-3">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between rounded-xl border border-border/40 bg-background/60 font-semibold text-base hover:bg-background/80"
                    >
                      <span>{translate("🌍 Anwendungsbeispiele", "🌍 Real-World Examples")}</span>
                      <ChevronDown
                        className={cn("h-4 w-4 transition-transform duration-200", showRLExamples ? "rotate-180" : "")}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <div className="space-y-4 text-base leading-relaxed text-muted-foreground pt-3">
                      <p className="font-medium text-foreground">
                        {translate(
                          "Wo begegnet dir RL im Alltag?",
                          "Where does RL appear in everyday life?",
                        )}
                      </p>
                      <ul className="space-y-3">
                        <li>
                          {translate("🚗 Autonomes Fahren: Fahrzeuge planen sichere Routen und passen Fahrstil an.", "🚗 Autonomous driving: cars plan safe routes and adapt driving styles.")}
                        </li>
                        <li>
                          {translate("🎮 Game-Bots: KI-Gegner lernen, menschliche Spieler:innen auszutricksen.", "🎮 Game bots: AI opponents learn to outsmart human players.")}
                        </li>
                        <li>
                          {translate("🏥 Medizin: Dosierungsempfehlungen oder Therapiepläne werden adaptiv optimiert.", "🏥 Medicine: dosing recommendations or treatment plans get adaptively optimised.")}
                        </li>
                        <li>
                          {translate("⚡ Energienetze: Stromanbieter balancieren Angebot und Nachfrage in Echtzeit.", "⚡ Energy grids: providers balance supply and demand in real time.")}
                        </li>
                        <li>
                          {translate("🛒 Empfehlungen: Shops schlagen Produkte vor, die dir mit hoher Wahrscheinlichkeit gefallen.", "🛒 Recommendations: shops suggest products you're likely to enjoy.")}
                        </li>
                      </ul>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Lernparameter im Detail */}
                <Collapsible open={showRLParameters} onOpenChange={setShowRLParameters} className="space-y-3">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between rounded-xl border border-border/40 bg-background/60 font-semibold text-base hover:bg-background/80"
                    >
                      <span>{translate("🎛️ Lernparameter im Detail", "🎛️ Learning Parameters Explained")}</span>
                      <ChevronDown
                        className={cn("h-4 w-4 transition-transform duration-200", showRLParameters ? "rotate-180" : "")}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <div className="space-y-6 text-base leading-relaxed text-muted-foreground pt-3">

                      {/* Exploration Rate (Entdeckungsrate) */}
                      <div className="rounded-xl border border-border/60 bg-secondary/30 p-5 space-y-3">
                        <h4 className="text-lg font-semibold text-foreground">
                          {translate("🎲 Exploration Rate (Entdeckungsrate)", "🎲 Exploration Rate")}
                        </h4>
                        <p className="text-foreground font-medium">
                          {translate(
                            "Was macht dieser Parameter?",
                            "What does this parameter do?"
                          )}
                        </p>
                        <p>
                          {translate(
                            "Die Exploration Rate bestimmt, wie oft der Rover zufällige Aktionen ausprobiert, anstatt dem zu folgen, was er bereits gelernt hat. Bei 20% Exploration wird der Rover in 20% der Fälle etwas Neues versuchen und in 80% der Fälle seine beste bekannte Strategie nutzen.",
                            "The exploration rate determines how often the rover tries random actions instead of following what it has already learned. At 20% exploration, the rover will try something new 20% of the time and use its best known strategy 80% of the time."
                          )}
                        </p>
                        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                          <p className="font-semibold text-foreground mb-2">
                            {translate("Real-Life Analogy: Restaurant Choice", "💡 Real-Life Analogy: Restaurant Choice")}
                          </p>
                          <p>
                            {translate(
                              "Stell dir vor, du gehst jede Woche essen. Mit niedriger Exploration gehst du fast immer zu deinem Lieblingsrestaurant – sicher, aber du verpasst vielleicht tolle neue Orte. Mit hoher Exploration probierst du ständig neue Restaurants – spannend, aber manchmal enttäuschend. Die goldene Mitte: Du gehst meistens zu bewährten Orten, probierst aber ab und zu etwas Neues.",
                              "Imagine you go out to eat every week. With low exploration, you almost always go to your favorite restaurant – safe, but you might miss great new places. With high exploration, you constantly try new restaurants – exciting, but sometimes disappointing. The sweet spot: You mostly go to proven places, but occasionally try something new."
                            )}
                          </p>
                        </div>
                        <p>
                          <span className="font-semibold text-foreground">{translate("Praktischer Tipp:", "Practical Tip:")}</span>{" "}
                          {translate(
                            "Zu Beginn sollte die Exploration hoch sein (30-50%), damit der Rover viele verschiedene Strategien kennenlernt. Später kann sie niedriger sein (5-10%), damit er seine beste Strategie verfeinert.",
                            "At the beginning, exploration should be high (30-50%) so the rover learns many different strategies. Later it can be lower (5-10%) so it refines its best strategy."
                          )}
                        </p>
                      </div>

                      {/* Learning Rate (Alpha) */}
                      <div className="rounded-xl border border-border/60 bg-secondary/30 p-5 space-y-3">
                        <h4 className="text-lg font-semibold text-foreground">
                          {translate("📚 Learning Rate – Alpha (α)", "📚 Learning Rate – Alpha (α)")}
                        </h4>
                        <p className="text-foreground font-medium">
                          {translate(
                            "Was macht dieser Parameter?",
                            "What does this parameter do?"
                          )}
                        </p>
                        <p>
                          {translate(
                            "Die Lernrate bestimmt, wie stark neue Erfahrungen die bisherigen Überzeugungen des Rovers überschreiben. Bei Alpha = 0.1 werden neue Erkenntnisse zu 10% berücksichtigt und zu 90% bleibt das alte Wissen erhalten. Bei Alpha = 0.5 haben neue Erfahrungen ein viel größeres Gewicht.",
                            "The learning rate determines how much new experiences override the rover's previous beliefs. At alpha = 0.1, new insights count for 10% and 90% of the old knowledge is retained. At alpha = 0.5, new experiences have much more weight."
                          )}
                        </p>
                        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                          <p className="font-semibold text-foreground mb-2">
                            {translate("Real-Life Analogy: Opinion Formation", "💡 Real-Life Analogy: Opinion Formation")}
                          </p>
                          <p>
                            {translate(
                              "Stell dir vor, du liest Produktbewertungen. Mit niedriger Lernrate bist du wie jemand, der sehr skeptisch ist: Eine einzelne negative Bewertung ändert deine Meinung über ein Produkt kaum, das du schon 10x gut erlebt hast. Mit hoher Lernrate bist du wie jemand, der sehr beeinflussbar ist: Eine einzige schlechte Erfahrung macht deine ganze vorherige positive Einstellung zunichte.",
                              "Imagine you're reading product reviews. With a low learning rate, you're like someone who's very skeptical: A single negative review barely changes your opinion about a product you've had good experiences with 10 times. With a high learning rate, you're like someone who's easily influenced: A single bad experience negates all your previous positive attitude."
                            )}
                          </p>
                        </div>
                        <p>
                          <span className="font-semibold text-foreground">{translate("Praktischer Tipp:", "Practical Tip:")}</span>{" "}
                          {translate(
                            "Hohe Lernraten (0.3-0.5) sind gut für sich schnell ändernde Umgebungen. Niedrige Lernraten (0.05-0.15) sind besser für stabile Umgebungen, wo der Rover Zeit hat, präzise zu lernen. Ein typischer Wert ist 0.1.",
                            "High learning rates (0.3-0.5) are good for rapidly changing environments. Low learning rates (0.05-0.15) are better for stable environments where the rover has time to learn precisely. A typical value is 0.1."
                          )}
                        </p>
                      </div>

                      {/* Discount Factor (Gamma) */}
                      <div className="rounded-xl border border-border/60 bg-secondary/30 p-5 space-y-3">
                        <h4 className="text-lg font-semibold text-foreground">
                          {translate("🔮 Discount Factor – Gamma (γ)", "🔮 Discount Factor – Gamma (γ)")}
                        </h4>
                        <p className="text-foreground font-medium">
                          {translate(
                            "Was macht dieser Parameter?",
                            "What does this parameter do?"
                          )}
                        </p>
                        <p>
                          {translate(
                            "Der Discount-Faktor bestimmt, wie wichtig zukünftige Belohnungen im Vergleich zu sofortigen Belohnungen sind. Bei Gamma = 0.9 ist eine Belohnung in 5 Schritten noch 59% so wertvoll wie eine sofortige Belohnung. Bei Gamma = 0.5 wäre sie nur noch 3% wert – der Rover denkt also sehr kurzfristig.",
                            "The discount factor determines how important future rewards are compared to immediate rewards. At gamma = 0.9, a reward in 5 steps is still worth 59% of an immediate reward. At gamma = 0.5, it would only be worth 3% – so the rover thinks very short-term."
                          )}
                        </p>
                        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                          <p className="font-semibold text-foreground mb-2">
                            {translate("Real-Life Analogy: Saving vs. Spending", "💡 Real-Life Analogy: Saving vs. Spending")}
                          </p>
                          <p>
                            {translate(
                              "Niedriges Gamma ist wie jemand, der sein Geld sofort ausgibt: 'Ich will jetzt Spaß haben, die Zukunft ist mir egal!' Hohes Gamma ist wie jemand, der für die Rente spart: 'Ich verzichte heute auf etwas, weil ich weiß, dass es mir später viel bringen wird.' Im Rover-Kontext: Niedriges Gamma → sammle schnell die nächste Belohnung ein. Hohes Gamma → plane eine langfristige Route zum größten Schatz, auch wenn du dafür erstmal an kleineren Belohnungen vorbei musst.",
                              "Low gamma is like someone who spends their money immediately: 'I want fun now, I don't care about the future!' High gamma is like someone saving for retirement: 'I'm giving up something today because I know it will benefit me greatly later.' In the rover context: Low gamma → quickly collect the next reward. High gamma → plan a long-term route to the biggest treasure, even if you have to pass smaller rewards first."
                            )}
                          </p>
                        </div>
                        <p>
                          <span className="font-semibold text-foreground">{translate("Praktischer Tipp:", "Practical Tip:")}</span>{" "}
                          {translate(
                            "Für Aufgaben mit klarem Endziel (wie unser Rover-Spiel) ist ein hohes Gamma (0.9-0.99) ideal. Für Aufgaben ohne Ende oder wo sofortige Belohnungen wichtig sind, kann ein niedrigeres Gamma (0.7-0.85) besser sein.",
                            "For tasks with a clear end goal (like our rover game), a high gamma (0.9-0.99) is ideal. For endless tasks or where immediate rewards are important, a lower gamma (0.7-0.85) may be better."
                          )}
                        </p>
                      </div>

                      {/* Zusammenspiel der Parameter */}
                      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3">
                        <h4 className="text-lg font-semibold text-foreground">
                          {translate("How They Work Together", "🎯 How They Work Together")}
                        </h4>
                        <p>
                          {translate(
                            "Diese drei Parameter arbeiten zusammen wie ein Team:",
                            "These three parameters work together like a team:"
                          )}
                        </p>
                        <ul className="space-y-2 list-disc pl-5">
                          <li>
                            <span className="font-semibold text-foreground">{translate("Exploration Rate", "Exploration Rate")}</span>
                            {translate(
                              " entscheidet, ob der Rover überhaupt etwas Neues lernen kann",
                              " decides whether the rover can learn something new at all"
                            )}
                          </li>
                          <li>
                            <span className="font-semibold text-foreground">{translate("Learning Rate", "Learning Rate")}</span>
                            {translate(
                              " bestimmt, wie schnell das Gelernte ins Gedächtnis eingebrannt wird",
                              " determines how quickly what is learned is burned into memory"
                            )}
                          </li>
                          <li>
                            <span className="font-semibold text-foreground">{translate("Discount Factor", "Discount Factor")}</span>
                            {translate(
                              " legt fest, ob der Rover in die Zukunft oder nur an 'jetzt' denkt",
                              " determines whether the rover thinks about the future or only about 'now'"
                            )}
                          </li>
                        </ul>
                        <p className="text-foreground font-medium mt-4">
                          {translate(
                            "Experiment with the values und beobachte, wie sich das Verhalten des Rovers ändert!",
                            "Experiment with the values and observe how the rover's behavior changes!"
                          )}
                        </p>
                      </div>

                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Der Lernprozess */}
                <Collapsible open={showRLLoop} onOpenChange={setShowRLLoop} className="space-y-3">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between rounded-xl border border-border/40 bg-background/60 font-semibold text-base hover:bg-background/80"
                    >
                      <span>{translate("Learning Process", "🔁 The Learning Process")}</span>
                      <ChevronDown
                        className={cn("h-4 w-4 transition-transform duration-200", showRLLoop ? "rotate-180" : "")}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <div className="pt-3 space-y-4">
                      <div className="rounded-xl border border-border/60 bg-secondary/30 p-5 text-foreground space-y-4">
                        <h4 className="text-lg font-semibold">
                          {translate("So lernt der Rover Schritt für Schritt", "The learning loop step by step")}
                        </h4>
                        <ol className="list-decimal pl-5 space-y-3 text-sm sm:text-base leading-relaxed">
                          <li>
                            {translate(
                              "Zustand beobachten – der Rover schaut sich an, wo er steht und welche Optionen es gibt.",
                              "Observe the state – the rover inspects where it stands and what actions are possible.",
                            )}
                          </li>
                          <li>
                            {translate(
                              "Aktion wählen – per Zufall oder anhand der höchsten Q-Werte (Exploration vs. Exploitation).",
                              "Pick an action – either explore randomly or exploit the highest Q-values.",
                            )}
                          </li>
                          <li>
                            {translate(
                              "Belohnung erhalten – sofortige Punkte (positiv oder negativ) geben Feedback.",
                              "Collect the reward – immediate positive or negative feedback is received.",
                            )}
                          </li>
                          <li>
                            {translate(
                              "Q-Wert aktualisieren – mit der Formel oben wird der Wert der gewählten Aktion angepasst.",
                              "Update the Q-value – apply the formula above to adjust the value of the chosen action.",
                            )}
                          </li>
                        </ol>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {translate(
                          "The step button in the console shows each decision individually – ideal, um den Lernprozess live zu beobachten.",
                          "The step button lets you inspect every single decision – perfect for watching the learning process live.",
                        )}
                      </p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Einstellungen */}
                <Collapsible open={showRLSettings} onOpenChange={setShowRLSettings} className="space-y-3">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between rounded-xl border border-border/40 bg-background/60 font-semibold text-base hover:bg-background/80"
                    >
                      <span>{translate("⚙️ Die Einstellungen", "⚙️ The Settings")}</span>
                      <ChevronDown
                        className={cn("h-4 w-4 transition-transform duration-200", showRLSettings ? "rotate-180" : "")}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <div className="pt-3">
                      <div className="rounded-xl border border-border/60 bg-secondary/20 p-5 space-y-4 text-sm sm:text-base text-muted-foreground">
                        <p className="text-foreground font-semibold text-base">
                          {translate("Was bewirken die Einstellungen?", "What do the settings do?")}
                        </p>
                        <div className="space-y-3 leading-relaxed">
                          <p>
                            {translate(
                              "• Lernrate (α) bestimmt, wie stark neue Erfahrungen alte Werte überschreiben.",
                              "• Learning rate (α) controls how strongly fresh experiences overwrite existing values.",
                            )}
                          </p>
                          <p>
                            {translate(
                              "• Discount (γ) legt fest, wie wichtig zukünftige Belohnungen im Vergleich zu sofortigen sind.",
                              "• Discount (γ) decides how much future rewards matter compared to immediate ones.",
                            )}
                          </p>
                          <p>
                            {translate(
                              "• Exploration beeinflusst, wie oft der Rover bewusst neue Aktionen ausprobiert.",
                              "• Exploration influences how often the rover purposefully tries new actions.",
                            )}
                          </p>
                        </div>
                        <p className="text-foreground font-medium pt-2">
                          {translate(
                            "Nutze die Slider, um zu sehen, wie sich das Verhalten des Agents verändert – im Vergleichsmodus kannst du sogar zwei Konfigurationen gegeneinander antreten lassen.",
                            "Use the sliders to see how the agent's behaviour shifts – and in comparison mode you can let two configurations compete head to head.",
                          )}
                        </p>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

              </div>
            </DialogContent>
          </Dialog>

          <Collapsible open={showIntro} onOpenChange={setShowIntro}>
            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
              <div className="grid md:grid-cols-2 gap-6 pt-3">
                <Card className="rounded-2xl border border-border bg-secondary/40 p-5 shadow-soft transform transition-transform transition-colors duration-300 hover:-translate-y-1 hover:border-primary/50 hover:bg-primary/10 hover:shadow-sm">
                  <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                    {translate(
                      "Exploration vs. Exploitation",
                      "🎯 Exploration vs. Exploitation",
                    )}
                  </h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {isEnglish ? (
                      <>
                        Imagine visiting a restaurant: exploitation means
                        <strong className="text-foreground"> ordering your favourite dish </strong>
                        every time – safe and familiar. Exploration means
                        <strong className="text-foreground"> trying something new </strong>
                        – maybe you discover something even better! The rover has to strike the same balance:
                        rely on learned strategies or explore unknown territory.
                      </>
                    ) : (
                      <>
                        Stell dir vor, du gehst in ein Restaurant: Ausbeuten (Exploitation) bedeutet,
                        <strong className="text-foreground"> immer dein Lieblingsgericht </strong>
                        zu bestellen – sicher und vertraut. Entdecken (Exploration) heißt,
                        <strong className="text-foreground"> mutig etwas Neues zu probieren </strong>
                        – vielleicht entdeckst du etwas noch Besseres! Der Rover muss genau diese Balance finden:
                        Nutzt er, was er schon weiß, oder wagt er neue Wege?
                      </>
                    )}
                  </p>
                </Card>
                <Card className="rounded-2xl border border-border bg-secondary/40 p-5 shadow-soft transform transition-transform transition-colors duration-300 hover:-translate-y-1 hover:border-primary/50 hover:bg-primary/10 hover:shadow-sm">
                  <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                    {translate("Three Modes to Explore", "🚀 Three modes to explore")}
                  </h3>
                  <div className="text-base text-muted-foreground leading-relaxed space-y-2">
                    <p>
                      <strong className="text-foreground">
                        {translate("Playground:", "Playground:")}
                      </strong>{" "}
                      {translate(
                        "Baue deine eigene Welt und platziere Mauern, Belohnungen oder Strafen ganz nach deinen Regeln.",
                        "Build your own world and place walls, rewards, or penalties however you like.",
                      )}
                    </p>
                    <p>
                      <strong className="text-foreground">
                        {translate("Zufallsmodus:", "Random mode:")}
                      </strong>{" "}
                      {translate(
                        "Lass den Rover in prozedural erzeugten Labyrinthen trainieren – jede Episode ist anders.",
                        "Let the rover train inside procedurally generated mazes – every episode is different.",
                      )}
                    </p>
                    <p>
                      <strong className="text-foreground">
                        {translate("Vergleichsmodus:", "Comparison mode:")}
                      </strong>{" "}
                      {translate(
                        "Starte zwei Rover mit unterschiedlichen Hyperparametern und beobachte ihre Fortschritte im direkten Vergleich.",
                        "Launch two rovers with different hyperparameters and watch their progress side by side.",
                      )}
                    </p>
                  </div>
                </Card>
              </div>
              <div className="flex justify-end pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRlDialogOpen(true)}
                  className="text-xs"
                >
                  {translate("Mehr über Reinforcement Learning", "Learn more about reinforcement learning")}
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {levelMode && objectiveStatus && (
          <LevelObjectivePanel
            level={currentLevel as LevelNumber}
            status={objectiveStatus}
            translate={translate}
          />
        )}

        <ControlBar
          mode={mode}
          onModeChange={handleModeChange}
          translate={translate}
          levelMode={levelMode}
        />

        {mode === "comparison" && (
            <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={placementMode === "reward" ? "default" : "outline"}
                  onClick={() => changePlacementMode("reward")}
                  className="flex items-center gap-2 font-semibold"
                >
                  <span aria-hidden>🍬</span>
                  {translate("Belohnung platzieren", "Place reward")}
                </Button>
                <Button
                  variant={placementMode === "punishment" ? "default" : "outline"}
                  onClick={() => changePlacementMode("punishment")}
                  className="flex items-center gap-2 font-semibold"
                >
                  <span aria-hidden>⚡</span>
                  {translate("Strafe platzieren", "Place penalty")}
                </Button>
                <Button
                  variant={comparisonState.left.isRunning && comparisonState.right.isRunning ? "secondary" : "default"}
                  onClick={handleComparisonStart}
                  className="flex items-center gap-2 font-semibold"
                >
                  <span aria-hidden>▶️</span>
                  {translate("Beide starten", "Start both")}
                </Button>
                <Button
                  variant={comparisonState.left.isRunning || comparisonState.right.isRunning ? "default" : "outline"}
                  onClick={handleComparisonPause}
                  className="flex items-center gap-2 font-semibold"
                >
                  <span aria-hidden>⏸️</span>
                  {translate("Beide pausieren", "Pause both")}
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={handleComparisonReset}
                className="flex items-center gap-2 font-semibold"
              >
                {translate("Restart", "Restart comparison")}
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
              <Card className="rounded-lg border border-border/40 bg-secondary/20 p-4">
                <Collapsible open={comparisonPresetsOpen} onOpenChange={setComparisonPresetsOpen} className="space-y-2">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between rounded-xl border border-border/40 bg-background/60 font-semibold text-base"
                    >
                      <span>{translate("🎯 Preset-Levels", "🎯 Preset Levels")}</span>
                      <ChevronDown
                        className={cn("h-4 w-4 transition-transform duration-200", comparisonPresetsOpen ? "rotate-180" : "")}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {PRESET_LEVELS.map((preset) => (
                        <TooltipProvider key={preset.key}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleLoadComparisonPreset(preset)}
                                className="text-xs font-semibold h-auto py-2"
                              >
                                {preset.name[language]}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{preset.description[language]}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
              <Card className="rounded-lg border border-border/40 bg-secondary/20 p-4">
                <Label className="text-base font-semibold text-foreground">
                  {translate("🚀 Geschwindigkeit", "🚀 Speed")}
                </Label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {SIMULATION_SPEEDS.map((option) => (
                    <Button
                      key={option.key}
                      variant={comparisonSpeed === option.key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setComparisonSpeed(option.key)}
                      className="text-xs font-semibold"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
            {/* Left Rover */}
            <Card className="rounded-3xl border border-border bg-card/95 p-4 shadow-medium text-foreground backdrop-blur-sm max-h-[calc(100vh-12rem)] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-primary">{comparisonState.left.name}</h2>
                <Button
                  variant={comparisonState.left.isRunning ? "secondary" : "default"}
                  onClick={() =>
                    setComparisonState((prev) => ({
                      ...prev,
                      left: { ...prev.left, isRunning: !prev.left.isRunning },
                    }))
                  }
                >
                  {comparisonState.left.isRunning ?
                    <><Pause className="mr-2 h-5 w-5" />{translate("Pause", "Pause")}</> :
                    <><Play className="mr-2 h-5 w-5" />{translate("Start", "Start")}</>
                  }
                </Button>
              </div>

              <div className="mb-4 space-y-3 text-sm">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-1.5">
                      <span>{translate("Lernrate (α):", "Learning rate (α):")}</span>
                      <button
                        onClick={() => setShowComparisonLeftAlphaInfo(!showComparisonLeftAlphaInfo)}
                        className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                        aria-label="Toggle info"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="font-bold">{comparisonState.left.alpha.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.01}
                    max={0.5}
                    step={0.01}
                    value={comparisonState.left.alpha}
                    onChange={(e) =>
                      setComparisonState((prev) => ({
                        ...prev,
                        left: { ...prev.left, alpha: e.target.valueAsNumber },
                      }))
                    }
                    className="input-slider w-full"
                    style={{ "--slider-value": comparisonState.left.alpha / 0.5 } as CSSProperties}
                  />
                  {showComparisonLeftAlphaInfo && (
                    <p className="text-sm text-muted-foreground leading-relaxed pl-1 animate-in fade-in duration-200">
                      {translate(
                        "Bestimmt, wie stark neue Erfahrungen alte Werte überschreiben. Hohe Werte = schnelles Lernen, niedrige Werte = stabiles Lernen.",
                        "Determines how much new experiences override old values. High values = fast learning, low values = stable learning."
                      )}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-1.5">
                      <span>{translate("Discount (γ):", "Discount (γ):")}</span>
                      <button
                        onClick={() => setShowComparisonLeftGammaInfo(!showComparisonLeftGammaInfo)}
                        className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                        aria-label="Toggle info"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="font-bold">{comparisonState.left.gamma.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.99}
                    step={0.01}
                    value={comparisonState.left.gamma}
                    onChange={(e) =>
                      setComparisonState((prev) => ({
                        ...prev,
                        left: { ...prev.left, gamma: e.target.valueAsNumber },
                      }))
                    }
                    className="input-slider w-full"
                    style={{ "--slider-value": comparisonState.left.gamma } as CSSProperties}
                  />
                  {showComparisonLeftGammaInfo && (
                    <p className="text-sm text-muted-foreground leading-relaxed pl-1 animate-in fade-in duration-200">
                      {translate(
                        "Gewichtet zukünftige Belohnungen. Hohe Werte = langfristige Planung, niedrige Werte = kurzfristige Belohnungen bevorzugen.",
                        "Weights future rewards. High values = long-term planning, low values = prefer immediate rewards."
                      )}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-1.5">
                      <span>{translate("Exploration:", "Exploration:")}</span>
                      <button
                        onClick={() => setShowComparisonLeftExplorationInfo(!showComparisonLeftExplorationInfo)}
                        className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                        aria-label="Toggle info"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="font-bold">{Math.round(comparisonState.left.explorationRate * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={comparisonState.left.explorationRate}
                    onChange={(e) =>
                      setComparisonState((prev) => ({
                        ...prev,
                        left: { ...prev.left, explorationRate: e.target.valueAsNumber },
                      }))
                    }
                    className="input-slider w-full"
                    style={{ "--slider-value": comparisonState.left.explorationRate } as CSSProperties}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span className="font-medium">
                      {translate("← Ausbeutung", "← Exploitation")}
                    </span>
                    <span className="font-medium">
                      {translate("Entdeckung →", "Exploration →")}
                    </span>
                  </div>
                  {showComparisonLeftExplorationInfo && (
                    <p className="text-sm text-muted-foreground leading-relaxed pl-1 animate-in fade-in duration-200">
                      {translate(
                        "Bestimmt, wie oft der Rover neue Wege ausprobiert statt bekannte Routen zu nutzen. Hohe Werte = mehr Entdecken, niedrige Werte = mehr Ausbeuten bereits gelernter Strategien.",
                        "Determines how often the rover tries new paths instead of using known routes. Higher values explore more, lower values exploit known strategies."
                      )}
                    </p>
                  )}
                </div>
                <div className="flex justify-between pt-2 border-t border-border/30">
                  <span>{translate("Episode:", "Episode:")}</span>
                  <span className="font-bold">{comparisonState.left.episode}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate("Gesamt-Belohnung:", "Total reward:")}</span>
                  <span className="font-bold">{comparisonState.left.totalReward.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate("Aktuelle Züge:", "Current moves:")}</span>
                  <span className="font-bold tabular-nums">{formatMovesValue(leftMoveStats.current)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate("Ø Züge (niedriger besser):", "Avg. moves (lower is better):")}</span>
                  <span className="font-bold tabular-nums">{formatMovesValue(leftMoveStats.average)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate("Beste Züge:", "Best moves:")}</span>
                  <span className="font-bold tabular-nums">{formatMovesValue(leftMoveStats.best)}</span>
                </div>
              </div>

              <div
                className="relative mx-auto overflow-hidden"
                style={{
                  width: leftComparisonTileSizePx * leftComparisonGridSize + (leftComparisonGridSize - 1),
                  height: leftComparisonTileSizePx * leftComparisonGridSize + (leftComparisonGridSize - 1),
                  borderRadius: "8px",
                }}
              >
                <div
                  className="grid bg-tile-bg"
                  style={{
                    gridTemplateColumns: `repeat(${leftComparisonGridSize}, ${leftComparisonTileSizePx}px)`,
                    gridTemplateRows: `repeat(${leftComparisonGridSize}, ${leftComparisonTileSizePx}px)`,
                    gap: "1px",
                  }}
                >
                  {comparisonState.left.grid.flatMap((row, y) =>
                    row.map((cell, x) => {
                      const isAgent = comparisonState.left.agent.x === x && comparisonState.left.agent.y === y;
                      const isGoal = comparisonState.left.goal.x === x && comparisonState.left.goal.y === y;
                      const tileType = isGoal ? "goal" : isAgent ? "empty" : cell.type;
                      const value = showValues ? cell.qValue : cell.value;
                      const icon = isAgent ? "" : isGoal ? TILE_ICONS.goal : TILE_ICONS[cell.type];
                      const showValue =
                        showValues &&
                        !isAgent &&
                        tileType !== "obstacle" &&
                        tileType !== "portal";
                      const ariaLabel = isEnglish
                        ? `${tileLabels[cell.type]} at tile (${x + 1}, ${y + 1}), value ${numberFormatter.format(value)}${isAgent ? ", Rover" : ""}${isGoal ? ", Goal" : ""}`
                        : `${tileLabels[cell.type]} bei Feld (${x + 1}, ${y + 1}), Wert ${numberFormatter.format(value)}${isAgent ? ", Agent" : ""}${isGoal ? ", Ziel" : ""}`;
                      return (
                        <Tile
                          key={`left-${x}-${y}`}
                          x={x}
                          y={y}
                          type={tileType}
                          value={value}
                          showValues={showValue}
                          isAgent={isAgent}
                          isGoal={isGoal}
                          tileSize={leftComparisonTileSizePx}
                          ariaLabel={ariaLabel}
                          icon={icon}
                          visits={cell.visits}
                          showHeatmap={showHeatmap}
                          maxVisits={leftComparisonMaxVisits}
                          bestAction={showActions ? getBestActionDirection(comparisonState.left.grid, { x, y }, comparisonState.left.qTable) : undefined}
                          showActions={showActions}
                          onClick={mode === "comparison" ? handleComparisonTilePlacement : undefined}
                          onMouseDown={mode === "comparison" ? handleMouseDown : undefined}
                          onMouseEnter={
                            mode === "comparison"
                              ? () => {
                                  if (isDragging) {
                                    handleComparisonTilePlacement(x, y);
                                  }
                                }
                              : undefined
                          }
                          rewardAnimation={leftRewardAnimation && leftRewardAnimation.x === x && leftRewardAnimation.y === y ? leftRewardAnimation.type : null}
                        />
                      );
                    })
                  )}
                </div>
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: comparisonState.left.agent.x * leftComparisonTileSizePx,
                    top: comparisonState.left.agent.y * leftComparisonTileSizePx,
                    width: leftComparisonTileSizePx,
                    height: leftComparisonTileSizePx,
                    transition: "left 0.3s ease-out, top 0.3s ease-out",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize:
                      leftComparisonTileSizePx > 40
                        ? "2.5rem"
                        : leftComparisonTileSizePx > 32
                          ? "2rem"
                          : "1.5rem",
                    zIndex: 10,
                  }}
                  aria-hidden
                >
                  🤖
                </div>
              </div>
            </Card>

            {/* Right Rover */}
            <Card className="rounded-3xl border border-border bg-card/95 p-4 shadow-medium text-foreground backdrop-blur-sm max-h-[calc(100vh-12rem)] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-primary">{comparisonState.right.name}</h2>
                <Button
                  variant={comparisonState.right.isRunning ? "secondary" : "default"}
                  onClick={() =>
                    setComparisonState((prev) => ({
                      ...prev,
                      right: { ...prev.right, isRunning: !prev.right.isRunning },
                    }))
                  }
                >
                  {comparisonState.right.isRunning ?
                    <><Pause className="mr-2 h-5 w-5" />{translate("Pause", "Pause")}</> :
                    <><Play className="mr-2 h-5 w-5" />{translate("Start", "Start")}</>
                  }
                </Button>
              </div>

              <div className="mb-4 space-y-3 text-sm">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-1.5">
                      <span>{translate("Lernrate (α):", "Learning rate (α):")}</span>
                      <button
                        onClick={() => setShowComparisonRightAlphaInfo(!showComparisonRightAlphaInfo)}
                        className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                        aria-label="Toggle info"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="font-bold">{comparisonState.right.alpha.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.01}
                    max={0.5}
                    step={0.01}
                    value={comparisonState.right.alpha}
                    onChange={(e) =>
                      setComparisonState((prev) => ({
                        ...prev,
                        right: { ...prev.right, alpha: e.target.valueAsNumber },
                      }))
                    }
                    className="input-slider w-full"
                    style={{ "--slider-value": comparisonState.right.alpha / 0.5 } as CSSProperties}
                  />
                  {showComparisonRightAlphaInfo && (
                    <p className="text-sm text-muted-foreground leading-relaxed pl-1 animate-in fade-in duration-200">
                      {translate(
                        "Bestimmt, wie stark neue Erfahrungen alte Werte überschreiben. Hohe Werte = schnelles Lernen, niedrige Werte = stabiles Lernen.",
                        "Determines how much new experiences override old values. High values = fast learning, low values = stable learning."
                      )}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-1.5">
                      <span>{translate("Discount (γ):", "Discount (γ):")}</span>
                      <button
                        onClick={() => setShowComparisonRightGammaInfo(!showComparisonRightGammaInfo)}
                        className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                        aria-label="Toggle info"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="font-bold">{comparisonState.right.gamma.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.99}
                    step={0.01}
                    value={comparisonState.right.gamma}
                    onChange={(e) =>
                      setComparisonState((prev) => ({
                        ...prev,
                        right: { ...prev.right, gamma: e.target.valueAsNumber },
                      }))
                    }
                    className="input-slider w-full"
                    style={{ "--slider-value": comparisonState.right.gamma } as CSSProperties}
                  />
                  {showComparisonRightGammaInfo && (
                    <p className="text-sm text-muted-foreground leading-relaxed pl-1 animate-in fade-in duration-200">
                      {translate(
                        "Gewichtet zukünftige Belohnungen. Hohe Werte = langfristige Planung, niedrige Werte = kurzfristige Belohnungen bevorzugen.",
                        "Weights future rewards. High values = long-term planning, low values = prefer immediate rewards."
                      )}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-1.5">
                      <span>{translate("Exploration:", "Exploration:")}</span>
                      <button
                        onClick={() => setShowComparisonRightExplorationInfo(!showComparisonRightExplorationInfo)}
                        className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                        aria-label="Toggle info"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="font-bold">{Math.round(comparisonState.right.explorationRate * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={comparisonState.right.explorationRate}
                    onChange={(e) =>
                      setComparisonState((prev) => ({
                        ...prev,
                        right: { ...prev.right, explorationRate: e.target.valueAsNumber },
                      }))
                    }
                    className="input-slider w-full"
                    style={{ "--slider-value": comparisonState.right.explorationRate } as CSSProperties}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span className="font-medium">
                      {translate("← Ausbeutung", "← Exploitation")}
                    </span>
                    <span className="font-medium">
                      {translate("Entdeckung →", "Exploration →")}
                    </span>
                  </div>
                  {showComparisonRightExplorationInfo && (
                    <p className="text-sm text-muted-foreground leading-relaxed pl-1 animate-in fade-in duration-200">
                      {translate(
                        "Bestimmt, wie oft der Rover neue Wege ausprobiert statt bekannte Routen zu nutzen. Hohe Werte = mehr Entdecken, niedrige Werte = mehr Ausbeuten bereits gelernter Strategien.",
                        "Determines how often the rover tries new paths instead of using known routes. Higher values explore more, lower values exploit known strategies."
                      )}
                    </p>
                  )}
                </div>
                <div className="flex justify-between pt-2 border-t border-border/30">
                  <span>{translate("Episode:", "Episode:")}</span>
                  <span className="font-bold">{comparisonState.right.episode}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate("Gesamt-Belohnung:", "Total reward:")}</span>
                  <span className="font-bold">{comparisonState.right.totalReward.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate("Aktuelle Züge:", "Current moves:")}</span>
                  <span className="font-bold tabular-nums">{formatMovesValue(rightMoveStats.current)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate("Ø Züge (niedriger besser):", "Avg. moves (lower is better):")}</span>
                  <span className="font-bold tabular-nums">{formatMovesValue(rightMoveStats.average)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate("Beste Züge:", "Best moves:")}</span>
                  <span className="font-bold tabular-nums">{formatMovesValue(rightMoveStats.best)}</span>
                </div>
              </div>

              <div
                className="relative mx-auto overflow-hidden"
                style={{
                  width: rightComparisonTileSizePx * rightComparisonGridSize + (rightComparisonGridSize - 1),
                  height: rightComparisonTileSizePx * rightComparisonGridSize + (rightComparisonGridSize - 1),
                  borderRadius: "8px",
                }}
              >
                <div
                  className="grid bg-tile-bg"
                  style={{
                    gridTemplateColumns: `repeat(${rightComparisonGridSize}, ${rightComparisonTileSizePx}px)`,
                    gridTemplateRows: `repeat(${rightComparisonGridSize}, ${rightComparisonTileSizePx}px)`,
                    gap: "1px",
                  }}
                >
                  {comparisonState.right.grid.flatMap((row, y) =>
                    row.map((cell, x) => {
                      const isAgent = comparisonState.right.agent.x === x && comparisonState.right.agent.y === y;
                      const isGoal = comparisonState.right.goal.x === x && comparisonState.right.goal.y === y;
                      const tileType = isGoal ? "goal" : isAgent ? "empty" : cell.type;
                      const value = showValues ? cell.qValue : cell.value;
                      const icon = isAgent ? "" : isGoal ? TILE_ICONS.goal : TILE_ICONS[cell.type];
                      const showValue =
                        showValues &&
                        !isAgent &&
                        tileType !== "obstacle" &&
                        tileType !== "portal";
                      const ariaLabel = isEnglish
                        ? `${tileLabels[cell.type]} at tile (${x + 1}, ${y + 1}), value ${numberFormatter.format(value)}${isAgent ? ", Rover" : ""}${isGoal ? ", Goal" : ""}`
                        : `${tileLabels[cell.type]} bei Feld (${x + 1}, ${y + 1}), Wert ${numberFormatter.format(value)}${isAgent ? ", Agent" : ""}${isGoal ? ", Ziel" : ""}`;
                      return (
                        <Tile
                          key={`right-${x}-${y}`}
                          x={x}
                          y={y}
                          type={tileType}
                          value={value}
                          showValues={showValue}
                          isAgent={isAgent}
                          isGoal={isGoal}
                          tileSize={rightComparisonTileSizePx}
                          ariaLabel={ariaLabel}
                          icon={icon}
                          visits={cell.visits}
                          showHeatmap={showHeatmap}
                          maxVisits={rightComparisonMaxVisits}
                          bestAction={showActions ? getBestActionDirection(comparisonState.right.grid, { x, y }, comparisonState.right.qTable) : undefined}
                          showActions={showActions}
                          onClick={mode === "comparison" ? handleComparisonTilePlacement : undefined}
                          onMouseDown={mode === "comparison" ? handleMouseDown : undefined}
                          onMouseEnter={
                            mode === "comparison"
                              ? () => {
                                  if (isDragging) {
                                    handleComparisonTilePlacement(x, y);
                                  }
                                }
                              : undefined
                          }
                          rewardAnimation={rightRewardAnimation && rightRewardAnimation.x === x && rightRewardAnimation.y === y ? rightRewardAnimation.type : null}
                        />
                      );
                    })
                  )}
                </div>
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: comparisonState.right.agent.x * rightComparisonTileSizePx,
                    top: comparisonState.right.agent.y * rightComparisonTileSizePx,
                    width: rightComparisonTileSizePx,
                    height: rightComparisonTileSizePx,
                    transition: "left 0.3s ease-out, top 0.3s ease-out",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize:
                      rightComparisonTileSizePx > 40
                        ? "2.5rem"
                        : rightComparisonTileSizePx > 32
                          ? "2rem"
                          : "1.5rem",
                    zIndex: 10,
                  }}
                  aria-hidden
                >
                  🤖
                </div>
              </div>
            </Card>
            <Card className="md:col-span-2 rounded-3xl border border-border bg-card/95 p-6 shadow-medium text-foreground backdrop-blur-sm">
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {translate("🔍 Move-Vergleich", "🔍 Move comparison")}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {moveComparisonMessage}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-[minmax(170px,1fr)_repeat(2,minmax(110px,1fr))] gap-x-3 gap-y-2 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {translate("Metrik", "Metric")}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">
                      {comparisonState.left.name}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">
                      {comparisonState.right.name}
                    </span>
                    {moveComparisonRows.map((row) => {
                      const [leftClass, rightClass] = getLeadClasses(row.left, row.right, row.lowerIsBetter);
                      return (
                        <div className="contents" key={row.key}>
                          <span className="text-foreground">{row.label}</span>
                          <span className={cn("text-center tabular-nums", leftClass)}>
                            {formatMovesValue(row.left)}
                          </span>
                          <span className={cn("text-center tabular-nums", rightClass)}>
                            {formatMovesValue(row.right)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

        {celebration && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
            <Card className="relative w-full max-w-xl overflow-hidden border-primary/40 bg-card/95 p-8 text-center shadow-sm">
              <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-primary/30 blur-3xl" />
              <div className="absolute -bottom-12 -right-12 h-36 w-36 rounded-full bg-accent/30 blur-3xl" />
              <div className="relative space-y-4">
                <h2 className="text-3xl md:text-4xl font-black text-primary drop-shadow">
                  {translate("Congratulations!", "Congratulations!")}
                </h2>
                <p className="text-sm uppercase tracking-wide text-primary/80">
                  {translate("Mission", "Mission")} #{celebration.rank}
                </p>
                <h3 className="text-lg font-semibold text-foreground">
                  {celebration.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {translate(
                    `Du hast es in ${celebration.steps} Zügen mit einem Reward von ${numberFormatter.format(celebration.reward)} geschafft. Schau in der Bestenliste nach deinem Rang!`,
                    `Finished in ${celebration.steps} moves with a reward of ${numberFormatter.format(celebration.reward)}. Check the leaderboard to see your rank!`,
                  )}
                </p>
                <p className="text-sm text-primary font-semibold">
                  💡 {celebration.fact}
                </p>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <Badge variant="secondary" className="px-4 py-2 text-sm font-semibold">
                    #{celebration.rank}
                  </Badge>
                  <Badge variant="secondary" className="px-4 py-2 text-sm font-semibold">
                    {numberFormatter.format(celebration.reward)}
                  </Badge>
                </div>
                <Button className="mt-4" onClick={() => setCelebration(null)}>
                  {translate("Weiter geht's", "Keep exploring")}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {randomHud}
        {mode === "playground" && (
          <Card className="rounded-3xl border border-border bg-card/95 p-6 shadow-medium text-foreground backdrop-blur-sm transition-colors duration-200 hover:border-primary/30">
            <button
              type="button"
              onClick={() => setShowPlaygroundStatsCard((prev) => !prev)}
              className="flex w-full items-center justify-between text-left text-sm font-semibold text-foreground"
            >
              <span>{translate("Playground Statistics", "Playground Statistics")}</span>
              {showPlaygroundStatsCard ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showPlaygroundStatsCard && (
              <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                {playgroundStatsSummary.count === 0 ? (
                  <p>{translate("Noch keine Daten – starte eine Episode, um Statistiken zu sehen.", "No data yet — run an episode to gather statistics.")}</p>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span>{translate("Gesamt-Episoden", "Total episodes")}</span>
                      <span className="font-semibold text-foreground">{playgroundStatsSummary.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{translate("Ø Schritte", "Avg. steps")}</span>
                      <span className="font-semibold text-foreground">{formatStepsValue(playgroundStatsSummary.avgSteps)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{translate("Ø Reward", "Avg. reward")}</span>
                      <span className="font-semibold text-foreground">{formatRewardValue(playgroundStatsSummary.avgReward)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{translate("Bester Reward", "Best reward")}</span>
                      <span className="font-semibold text-foreground">{formatRewardValue(playgroundStatsSummary.bestReward)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{translate("Schnellste Episode", "Fastest episode")}</span>
                      <span className="font-semibold text-foreground">{formatStepsValue(playgroundStatsSummary.bestSteps)}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>
        )}

        <div className="relative">
          <div
            className={cn("flex flex-col gap-6 lg:grid lg:items-stretch transition-opacity", gridCols)}
            aria-disabled={mode === "comparison"}
          >
          <div className="relative order-2 lg:order-1">
            <Card
              ref={consoleScrollRef}
              className={cn(
                "flex flex-col gap-4 rounded-3xl border border-border bg-card/95 p-6 shadow-medium text-foreground backdrop-blur-sm overflow-y-auto transition-all duration-200 hover:border-primary/30",
                "h-auto lg:h-[var(--console-height)]",
                mode === "comparison" && "pointer-events-none opacity-40 grayscale",
              )}
              style={{
                ["--console-height" as string]: `${cardHeight}px`,
              }}
            >
              <button
                onClick={() => setShowConsolePanel(!showConsolePanel)}
                className="flex items-center justify-between w-full text-left lg:pointer-events-none"
              >
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Gamepad2 className="h-6 w-6 text-primary" />
                  <span className="gradient-text">
                    {translate("Konsole", "Console")}
                  </span>
                </h2>
                <ChevronDown className={cn("h-5 w-5 transition-transform lg:hidden", showConsolePanel && "rotate-180")} />
              </button>
              {showConsolePanel && (
              <>
            {mode === "playground" && (
              <Badge variant="secondary" className="self-start bg-foreground/10 text-foreground border-foreground/15 font-semibold">
                👣 {playgroundState.currentSteps}
              </Badge>
            )}

            {mode === "playground" ? (
              <PlaygroundControls
                state={playgroundState}
                onStart={handlePlaygroundStart}
                onPause={handlePlaygroundPause}
                onStep={handlePlaygroundStep}
                onReset={handlePlaygroundReset}
                onUndo={handleUndo}
                canUndo={undoStack.length > 0}
                onReplay={handleReplayBest}
                isReplaying={isReplaying}
                onStopReplay={handleStopReplay}
                onLoadPreset={handleLoadPreset}
                placementMode={placementMode}
                onPlacementModeChange={changePlacementMode}
                simulationSpeed={simulationSpeed}
                onSimulationSpeedChange={setSimulationSpeed}
                canPublishGlobal={isAdmin}
                onPublishGlobal={handlePublishGlobal}
                showValues={showValues}
                onShowValuesChange={setShowValues}
                translate={translate}
                numberFormatter={numberFormatter}
                language={language}
                showStatistics={showStatistics}
                setShowStatistics={setShowStatistics}
                levelMode={levelMode}
                unlockedFeatures={unlockedFeatures}
              />
            ) : (
              <RandomControls
                state={randomState}
                onStart={handleRandomStart}
                onPause={handleRandomPause}
                onStep={handleRandomStep}
                onReset={handleRandomReset}
                translate={translate}
                numberFormatter={numberFormatter}
                isSpeedrun={randomState.speedrun.active}
              />
            )}

            {/* Verlaufsdiagramm */}
            {(mode === "playground" ? playgroundState.episodeHistory : randomState.episodeHistory).length > 0 && (
              <Collapsible open={showRewardHistory} onOpenChange={setShowRewardHistory}>
                <Card className="rounded-lg border border-border/40 bg-card/50 p-4">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between cursor-pointer">
                      <h3 className="text-base font-bold text-foreground">
                        {translate("Reward History", "Reward History")}
                      </h3>
                      {showRewardHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <div className="mt-3">
                <div className="relative w-full h-40 bg-background/50 rounded-lg p-2">
                  {(() => {
                    const history = mode === "playground" ? playgroundState.episodeHistory : randomState.episodeHistory;
                    const displayHistory = history.slice(-20); // Zeige letzte 20 Episoden

                    if (displayHistory.length < 2) return null;

                    const maxReward = Math.max(...displayHistory.map(h => h.reward), 1);
                    const minReward = Math.min(...displayHistory.map(h => h.reward), 0);
                    const range = maxReward - minReward || 1;

                    const width = 100; // Prozent
                    const height = 100; // Prozent
                    const padding = 5;

                    const points = displayHistory.map((stat, i) => {
                      const x = padding + (i / (displayHistory.length - 1)) * (width - 2 * padding);
                      const y = height - padding - ((stat.reward - minReward) / range) * (height - 2 * padding);
                      return `${x},${y}`;
                    }).join(' ');

                    return (
                      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                        {/* Gitterlinie */}
                        <line
                          x1={padding}
                          y1={height / 2}
                          x2={width - padding}
                          y2={height / 2}
                          stroke="currentColor"
                          strokeWidth="0.2"
                          opacity="0.2"
                        />
                        {/* Linie */}
                        <polyline
                          points={points}
                          fill="none"
                          stroke="rgb(var(--primary))"
                          strokeWidth="1"
                          strokeLinejoin="round"
                        />
                        {/* Punkte */}
                        {displayHistory.map((stat, i) => {
                          const x = padding + (i / (displayHistory.length - 1)) * (width - 2 * padding);
                          const y = height - padding - ((stat.reward - minReward) / range) * (height - 2 * padding);
                          return (
                            <circle
                              key={i}
                              cx={x}
                              cy={y}
                              r="1"
                              fill="rgb(var(--primary))"
                            />
                          );
                        })}
                      </svg>
                    );
                  })()}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {translate(
                    `Letzte ${Math.min((mode === "playground" ? playgroundState.episodeHistory : randomState.episodeHistory).length, 20)} Episoden`,
                    `Last ${Math.min((mode === "playground" ? playgroundState.episodeHistory : randomState.episodeHistory).length, 20)} episodes`
                  )}
                </p>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {mode === "random" && (
              <Card className="rounded-lg border border-border/40 bg-card/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground">
                    {translate("⚡ Live-Challenge", "⚡ Live challenge")}
                  </h3>
                  <Badge variant="outline" className="text-sm font-semibold">
                    {translate("wechsel alle 10s", "rotates every 10s")}
                  </Badge>
                </div>
                {bonusDetail ? (
                  <>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {bonusDetail.actionHint[language]}
                    </p>
                    <Button
                      variant={bonusButtonVariant}
                      size="sm"
                      disabled={bonusDisabled}
                      onClick={handleActiveBonusClick}
                      className="flex w-full items-center justify-center gap-2 text-base font-semibold"
                    >
                      <span aria-hidden>{bonusDetail.icon}</span>
                      <span>{bonusDetail.label[language]}</span>
                    </Button>
                    <p className="text-sm text-muted-foreground text-center">
                      {translate("Nächste Belohnung in", "Next bonus in")}
                      {" "}
                      {randomState.bonusCountdown}s
                    </p>
                    {!randomState.bonusReady && (
                      <p className="text-sm text-muted-foreground tracking-wide uppercase text-center">
                        {translate("Belohnung verbraucht – neue Belohnung erscheint gleich.", "Reward spent – new reward arrives soon.")}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {translate("Belohnung wird vorbereitet...", "Preparing next bonus...")}
                  </p>
                )}
              </Card>
            )}

            <Card className="rounded-lg border border-border/40 bg-secondary/20 p-4 space-y-3">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setShowLeaderboard(!showLeaderboard)}
              >
                <h3 className="text-base font-bold text-foreground">
                  {leaderboardTitle}
                </h3>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-foreground/10 text-foreground border-foreground/15 font-semibold">
                    {activeLeaderboardEntries.length}
                  </Badge>
                  {showLeaderboard ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
              {showLeaderboard && (activeLeaderboardEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {leaderboardEmptyText}
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {activeLeaderboardEntries.map((entry, index) => {
                    const detailText = entry.mode === "speedrun"
                      ? translate(
                          `${entry.steps} Züge • ${numberFormatter.format(entry.reward)} Punkte • ${entry.timeUsed ?? entry.timeLimit ?? 0}s`,
                          `${entry.steps} moves • ${numberFormatter.format(entry.reward)} reward • ${entry.timeUsed ?? entry.timeLimit ?? 0}s`,
                        )
                      : translate(
                          `${entry.steps} Züge • ${numberFormatter.format(entry.reward)} Punkte`,
                          `${entry.steps} moves • ${numberFormatter.format(entry.reward)} reward`,
                        );
                    return (
                      <div
                        key={`leaderboard-left-${entry.episode}-${entry.steps}-${entry.mode}`}
                        className="flex items-center justify-between rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-base font-bold text-primary min-w-[1.5rem] text-center">
                            #{index + 1}
                          </span>
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold">{getEpisodeTitle(entry.episode, language)}</span>
                            <span className="text-sm text-muted-foreground">
                              {detailText}
                            </span>
                            {!entry.success && (
                              <span className="text-xs uppercase tracking-wide text-red-400">
                                {translate("Fehlversuch", "Failed attempt")}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {entry.mode === "speedrun" && (
                            <Badge variant="outline" className="px-3 py-1 text-xs font-semibold">
                              ⏱ {entry.timeUsed ?? entry.timeLimit ?? 0}s
                            </Badge>
                          )}
                          {entry.mode === "speedrun" && (
                            <Badge variant="outline" className="px-3 py-1 text-xs font-semibold">
                              {translate("Stufe", "Stage")} {(entry.stage ?? 0) + 1}
                            </Badge>
                          )}
                          <Badge
                            variant="secondary"
                            className={cn(
                              "px-4 py-2 text-sm font-semibold",
                              entry.reward >= 0 && entry.success ? "bg-green-500/10 text-green-400" : entry.success ? "bg-foreground/10 text-foreground" : "bg-red-500/10 text-red-400",
                            )}
                          >
                            {numberFormatter.format(entry.reward)}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </Card>

            <Collapsible open={showLegend} onOpenChange={setShowLegend}>
              <Card className="rounded-lg border border-border/40 bg-secondary/20 p-4">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between cursor-pointer mb-3">
                    <h3 className="text-base font-bold text-foreground">
                      {translate("📚 Legende", "📚 Legend")}
                    </h3>
                    {showLegend ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                  {legend}
                </CollapsibleContent>
              </Card>
            </Collapsible>
              </>
              )}

          </Card>
          <ScrollIndicator containerRef={consoleScrollRef} />
          </div>

          <div className="order-1 lg:order-2 w-full overflow-x-hidden">
          <Card
            style={{ height: `${cardHeight}px` }}
            className={cn(
              "flex flex-col rounded-3xl border border-border bg-card/95 p-6 shadow-medium text-foreground backdrop-blur-sm w-full lg:w-fit mx-auto overflow-y-auto transition-colors duration-200 hover:border-primary/30",
              mode === "comparison" && "pointer-events-none opacity-40 grayscale",
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold gradient-text">
                {translate("🎮 Playground", "🎮 Playground")}
              </h2>
            </div>

            <div
              ref={gridRef}
              tabIndex={0}
              role="application"
              aria-label={translate("Reward Rover Spielfeld", "Reward Rover playfield")}
              className="rounded-2xl border border-border/50 bg-background/80 p-4 shadow-soft focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow w-full max-w-full mx-auto"
              style={{
                maxWidth: gridPixelDimension + 40,
                aspectRatio: "1 / 1",
              }}
              onMouseDown={() => gridRef.current?.focus()}
            >
              <div className="relative">
                <div className="grid gap-0" style={gridStyle}>
                {(() => {
                  // Berechne maxVisits für Heatmap
                  const maxVisits = showHeatmap
                    ? Math.max(...activeGrid.flat().map(cell => cell.visits), 1)
                    : 1;

                  return activeGrid.map((row, y) =>
                  row.map((cell, x) => {
                    const isAgent =
                      mode === "playground"
                        ? playgroundState.agent.x === x && playgroundState.agent.y === y
                        : randomState.agent.x === x && randomState.agent.y === y;
                    const isGoal =
                      mode === "playground"
                        ? playgroundState.goal.x === x && playgroundState.goal.y === y
                        : randomState.goals.some((goal) => goal.x === x && goal.y === y);
                    const tileType = isGoal ? "goal" : (isAgent ? "empty" : cell.type);
                    const icon = isAgent ? "" : isGoal ? "🎯" : TILE_ICONS[cell.type];
                    const value = showValues ? cell.qValue : cell.value;
                    const showValue =
                      showValues &&
                      !isAgent &&
                      tileType !== "obstacle" &&
                      tileType !== "portal";
                    const ariaLabel = isEnglish
                      ? `${tileLabels[cell.type]} at tile (${x + 1}, ${y + 1}), value ${numberFormatter.format(value)}${isAgent ? ", Rover" : ""}${isGoal ? ", Goal" : ""}`
                      : `${tileLabels[cell.type]} bei Feld (${x + 1}, ${y + 1}), Wert ${numberFormatter.format(value)}${isAgent ? ", Agent" : ""}${isGoal ? ", Ziel" : ""}`;
                    return (
                      <Tile
                        key={`${x}-${y}`}
                        x={x}
                        y={y}
                        type={tileType}
                        value={value}
                        showValues={showValue}
                        isAgent={isAgent}
                        isGoal={isGoal}
                        tileSize={tileSizePx}
                        ariaLabel={ariaLabel}
                        icon={icon}
                        visits={cell.visits}
                        showHeatmap={showHeatmap}
                        maxVisits={maxVisits}
                        bestAction={showActions ? getBestActionDirection(activeGrid, { x, y }, activeQTable) : undefined}
                        showActions={showActions}
                        onClick={mode === "playground" || (mode === "random" && challengeMode) ? handleTilePlacement : undefined}
                        onMouseDown={mode === "playground" || (mode === "random" && challengeMode) ? handleMouseDown : undefined}
                        onMouseEnter={(mode === "playground" || (mode === "random" && challengeMode)) && isDragging ? () => handleTilePlacement(x, y) : undefined}
                        rewardAnimation={rewardAnimation && rewardAnimation.x === x && rewardAnimation.y === y ? rewardAnimation.type : null}
                      />
                    );
                  })
                );
                })()}
              </div>
              {/* Animated Rover */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: (mode === "playground" ? playgroundState.agent.x : randomState.agent.x) * tileSizePx,
                  top: (mode === "playground" ? playgroundState.agent.y : randomState.agent.y) * tileSizePx,
                  width: tileSizePx,
                  height: tileSizePx,
                  transition: "left 0.3s ease-out, top 0.3s ease-out",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: tileSizePx > 40 ? "2.5rem" : tileSizePx > 32 ? "2rem" : "1.5rem",
                  zIndex: 10,
                }}
                aria-hidden
              >
                🤖
              </div>
            </div>
            </div>

            {mode === "playground" && (
              <div className="mt-4 space-y-4 hidden lg:block">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">
                    {translate("Umgebung speichern", "Save environment")}
                  </Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={environmentName}
                      onChange={(event) => setEnvironmentName(event.target.value)}
                      placeholder={translate("Name eingeben…", "Enter name…")}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSaveEnvironment}
                      disabled={isSavingEnv}
                      variant="secondary"
                      className="font-semibold"
                    >
                      {isSavingEnv ? translate("Speichert…", "Saving…") : translate("Speichern", "Save")}
                    </Button>
                  </div>
                  {saveEnvError && <p className="text-xs text-red-500">{saveEnvError}</p>}
                  {!authUser && (
                    <p className="text-xs text-muted-foreground">
                      {translate(
                        "Zum Speichern bitte einloggen.",
                        "Please log in to save environments.",
                      )}
                    </p>
                  )}
                </div>

              </div>
            )}
          </Card>

          {/* Mobile Play Button - Only visible on mobile devices */}
          <div className="lg:hidden mt-4 mx-auto w-full max-w-md px-4">
            {mode === "playground" ? (
              <Button
                className="w-full font-semibold shadow-lg"
                size="lg"
                onClick={playgroundState.isRunning ? handlePlaygroundPause : handlePlaygroundStart}
              >
                {playgroundState.isRunning ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
                {playgroundState.isRunning ? translate("Pause", "Pause") : translate("Start", "Start")}
              </Button>
            ) : (
              <Button
                className="w-full font-semibold shadow-lg"
                size="lg"
                onClick={randomState.isRunning ? handleRandomPause : handleRandomStart}
              >
                {randomState.isRunning ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
                {randomState.isRunning ? translate("Pause", "Pause") : translate("Start", "Start")}
              </Button>
            )}
          </div>
          </div>

          <div className="relative order-3 lg:order-3">
            <Card
              ref={settingsScrollRef}
              className={cn(
                "flex flex-col gap-4 rounded-3xl border border-border bg-card/95 p-6 shadow-medium text-foreground backdrop-blur-sm overflow-y-auto transition-all duration-200 hover:border-primary/30",
                "h-auto lg:h-[var(--settings-height)]"
              )}
              style={{
                ["--settings-height" as string]: `${cardHeight}px`,
              }}
            >
              <button
                onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                className="flex items-center justify-between w-full text-left lg:pointer-events-none"
              >
                <h2 className="text-xl font-bold gradient-text">
                  {translate("Settings", "Settings")}
                </h2>
                <ChevronDown className={cn("h-5 w-5 transition-transform lg:hidden", showSettingsPanel && "rotate-180")} />
              </button>

            {showSettingsPanel && (
            <>
            <Card className="rounded-lg border border-border/40 bg-secondary/20 p-4 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <h3 className="text-lg font-bold text-foreground">
                  {translate("Q-Values & Exploration", "Q-Values & Exploration")}
                </h3>
                <div className="flex flex-col items-end gap-3">
                  <div className="space-y-1">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="show-actions-settings" className="text-xs font-semibold leading-tight">
                          {translate("Policy-Pfeile anzeigen", "Show policy arrows")}
                        </Label>
                        <button
                          onClick={() => setShowActionsInfo(!showActionsInfo)}
                          className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                          aria-label="Toggle info"
                        >
                          <Info className="h-3 w-3" />
                        </button>
                      </div>
                      <Switch
                        id="show-actions-settings"
                        checked={showActions}
                        onCheckedChange={setShowActions}
                        aria-label={translate("Policy-Pfeile umschalten", "Toggle policy arrows")}
                      />
                    </div>
                    {showActionsInfo && (
                      <p className="text-xs text-muted-foreground leading-relaxed pl-1 animate-in fade-in duration-200">
                        {translate(
                          "Zeigt Pfeile, die die bevorzugte Bewegungsrichtung des Rovers für jedes Feld anzeigen.",
                          "Shows arrows indicating the rover's preferred direction for each tile.",
                        )}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="show-values-settings" className="text-xs font-semibold leading-tight">
                          {translate("Q-Werte anzeigen", "Show Q-values")}
                        </Label>
                        <button
                          onClick={() => setShowQValuesInfo(!showQValuesInfo)}
                          className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                          aria-label="Toggle info"
                        >
                          <Info className="h-3 w-3" />
                        </button>
                      </div>
                      <Switch
                        id="show-values-settings"
                        checked={showValues}
                        onCheckedChange={setShowValues}
                        aria-label={translate("Q-Werte umschalten", "Toggle Q-values")}
                      />
                    </div>
                    {showQValuesInfo && (
                      <p className="text-xs text-muted-foreground leading-relaxed pl-1 animate-in fade-in duration-200">
                        {translate(
                          "Blendet die gelernten Werte direkt auf den Feldern ein.",
                          "Overlays the learned Q-values directly on the grid.",
                        )}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="show-heatmap-settings" className="text-xs font-semibold leading-tight">
                          {translate("Heatmap anzeigen", "Show heatmap")}
                        </Label>
                        <button
                          onClick={() => setShowHeatmapInfo(!showHeatmapInfo)}
                          className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                          aria-label="Toggle info"
                        >
                          <Info className="h-3 w-3" />
                        </button>
                      </div>
                      <Switch
                        id="show-heatmap-settings"
                        checked={showHeatmap}
                        onCheckedChange={setShowHeatmap}
                        aria-label={translate("Heatmap umschalten", "Toggle heatmap")}
                      />
                    </div>
                    {showHeatmapInfo && (
                      <p className="text-xs text-muted-foreground leading-relaxed pl-1 animate-in fade-in duration-200">
                        {translate(
                          "Färbt Felder basierend auf Besuchshäufigkeit ein.",
                          "Colors tiles based on visit frequency.",
                        )}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="consume-rewards-settings" className="text-xs font-semibold leading-tight">
                          {translate("Belohnungen verschwinden", "Consume rewards")}
                        </Label>
                        <button
                          onClick={() => setShowConsumeRewardsInfo(!showConsumeRewardsInfo)}
                          className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                          aria-label="Toggle info"
                        >
                          <Info className="h-3 w-3" />
                        </button>
                      </div>
                      <Switch
                        id="consume-rewards-settings"
                        checked={consumeRewards}
                        onCheckedChange={setConsumeRewards}
                        aria-label={translate("Belohnungen/Strafen verschwinden umschalten", "Toggle consume rewards")}
                      />
                    </div>
                    {showConsumeRewardsInfo && (
                      <p className="text-xs text-muted-foreground leading-relaxed pl-1 animate-in fade-in duration-200">
                        {translate(
                          "Belohnungen und Strafen verschwinden nach dem Einsammeln.",
                          "Rewards and penalties disappear after collection.",
                        )}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                      <Label htmlFor="auto-restart-settings" className="text-xs font-semibold leading-tight">
                        {translate("Auto-Restart bei Ziel", "Auto-restart at goal")}
                      </Label>
                      <Switch
                        id="auto-restart-settings"
                        checked={isAutoRestartEnabled}
                        onCheckedChange={setIsAutoRestartEnabled}
                        aria-label={translate("Auto-Restart umschalten", "Toggle auto-restart")}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="rounded-lg border border-border/40 bg-secondary/20 p-4">
              <h3 className="text-lg font-bold text-foreground mb-1">
                {translate("📏 Feld-Größe", "📏 Grid size")}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {translate(
                  "Legt fest, wie viele Felder das Spielfeld besitzt.",
                  "Controls how many tiles the grid contains.",
                )}
              </p>
              <div className="flex flex-col gap-2">
                {(Object.keys(TILE_SIZE_MAP) as TileSizeOption[]).map((sizeKey) => (
                  <Button
                    key={sizeKey}
                    variant={tileSize === sizeKey ? "default" : "outline"}
                    onClick={() => handleTileSizeChange(sizeKey)}
                    disabled={levelMode && !unlockedFeatures?.canChangeGridSize}
                    className="rounded-lg text-base font-semibold w-full justify-between px-4"
                  >
                    <span>{sizeLabels[sizeKey]}</span>
                    <span className="text-sm opacity-70">
                      {TILE_SIZE_MAP[sizeKey]}×{TILE_SIZE_MAP[sizeKey]}
                    </span>
                  </Button>
                ))}
              </div>
              {levelMode && !unlockedFeatures?.canChangeGridSize && (
                <p className="text-xs text-muted-foreground italic mt-3">
                  🔒 {translate("Schalte Level 7 frei, um die Gittergröße anzupassen.", "Reach level 7 to change grid size.")}
                </p>
              )}
            </Card>

            <Card className="rounded-lg border border-border/40 bg-secondary/20 p-4 space-y-3 hidden lg:block">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">
                  {translate("Meine Umgebungen", "My environments")}
                </h3>
                {authUser && (
                  <Badge variant="secondary" className="bg-foreground/10 text-foreground border-foreground/15">
                    {savedEnvironments.length}
                  </Badge>
                )}
              </div>
              {isLoadingEnvs ? (
                <p className="text-xs text-muted-foreground">
                  {translate("Umgebungen werden geladen…", "Loading environments…")}
                </p>
              ) : !authUser ? (
                <p className="text-xs text-muted-foreground">
                  {translate(
                    "Zum Anzeigen deiner Umgebungen bitte einloggen.",
                    "Log in to see your environments.",
                  )}
                </p>
              ) : savedEnvironments.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {translate(
                    "Noch keine gespeicherten Umgebungen.",
                    "No saved environments yet.",
                  )}
                </p>
              ) : (
                <div className="space-y-2">
                  {savedEnvironments.map((env) => (
                    <div
                      key={env.id}
                      className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/60 p-3"
                    >
                      {renderEnvironmentPreview(env.gridConfig)}
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-foreground">{env.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {env.gridConfig.size} × {env.gridConfig.size}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleLoadSavedEnvironment(env)}>
                        {translate("Laden", "Load")}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {mode === "random" && (
              <>
                <Card className="rounded-lg border border-border/40 bg-card/50 p-4 space-y-3">
                  <h3 className="text-base font-bold text-foreground">
                    {translate("🎲 Zufallsmodus-Einstellungen", "🎲 Random mode settings")}
                  </h3>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 w-fit">
                    {levelName}
                  </Badge>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {translate(
                      "Wähle den Schwierigkeitsgrad und platziere Herausforderungen live im Feld.",
                      "Pick the difficulty and drop live challenges onto the grid.",
                    )}
                  </p>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {translate("Level wählen", "Select level")}
                    </Label>
                    <div className="flex flex-col gap-2">
                      {Object.values(LEVELS).map((level) => {
                        const name = isEnglish ? level.nameEn : level.name;
                        const description = isEnglish ? level.descriptionEn : level.description;
                        return (
                          <Button
                            key={level.key}
                            variant={levelKey === level.key ? "default" : "outline"}
                            onClick={() => handleLevelChange(level.key)}
                            disabled={speedrunEnabled}
                            className="w-full justify-start text-left h-auto py-3 px-4 whitespace-normal"
                          >
                            <div className="flex flex-col items-start gap-1">
                              <span className="font-semibold text-sm">{name}</span>
                              <span className="text-sm opacity-80 font-normal leading-snug text-left break-words">
                                {description}
                              </span>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </Card>

              </>
            )}

            {mode === "random" && (
              <Card className="rounded-lg border border-border/40 bg-card/50 p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  💡 <strong className="text-foreground">Level:</strong>{" "}
                  {translate(
                    "Höhere Level vergrößern das Feld und erhöhen die Dichte von Hindernissen, Belohnungen und Strafen – eine echte Herausforderung!",
                    "Higher levels expand the grid and increase the density of walls, rewards, and penalties – a serious challenge!",
                  )}
                </p>
              </Card>
            )}
            </>
            )}

          </Card>
          <ScrollIndicator containerRef={settingsScrollRef} />
          </div>
        </div>
          {mode === "comparison" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
              <div className="max-w-xl rounded-3xl border border-dashed border-border/70 bg-background/90 px-6 py-4 text-center text-sm font-semibold text-muted-foreground shadow-inner">
                {translate(
                  "Vergleichsmodus aktiv: Platzierungen wirken auf beide Spielfelder.",
                  "Comparison mode active: placements sync across both boards.",
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
