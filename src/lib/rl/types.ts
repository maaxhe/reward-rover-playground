import type { TileType } from "@/components/RL/Tile";

export type Language = "de" | "en";
export type Mode = "playground" | "random" | "comparison";
export type LevelKey = "level1" | "level2" | "level3";
export type BonusType = "reward" | "punishment" | "obstacle" | "portal" | "teleport";
export type TileSizeOption = "s" | "m" | "l";

export interface Position {
  x: number;
  y: number;
}

export interface CandidatePosition extends Position {
  distance: number;
}

export interface TileState {
  type: TileType;
  qValue: number;
  visits: number;
  value: number;
}

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

export interface PlaygroundState {
  agent: Position;
  goal: Position;
  grid: TileState[][];
  isRunning: boolean;
  episode: number;
  totalReward: number;
  currentSteps: number;
  episodeHistory: EpisodeStats[];
  spawn: Position;
  portalCooldowns: Record<string, number>;
  pendingPortalTeleport?: { from: Position; to: Position; waitCounter: number } | null;
}

export interface RandomModeState {
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
}

export interface ComparisonRoverState {
  agent: Position;
  goal: Position;
  grid: TileState[][];
  isRunning: boolean;
  episode: number;
  totalReward: number;
  currentSteps: number;
  episodeHistory: EpisodeStats[];
  spawn: Position;
  alpha: number;
  gamma: number;
  explorationRate: number;
  name: string;
  portalCooldowns: Record<string, number>;
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

export interface EpisodeSummary {
  count: number;
  avgSteps: number | null;
  avgReward: number | null;
  bestReward: number | null;
  bestSteps: number | null;
}

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

export interface SpeedrunStageConfig {
  timeLimit: number;
  level: LevelConfig;
}

export interface PresetLevel {
  key: string;
  name: Record<Language, string>;
  description: Record<Language, string>;
  size: number;
  tiles: Array<{ x: number; y: number; type: TileType }>;
  agent?: { x: number; y: number };
  goal?: { x: number; y: number };
}
