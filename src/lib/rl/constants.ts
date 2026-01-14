import type { TileType } from "@/components/RL/Tile";
import type { Language, BonusType, LevelKey, LevelConfig, SpeedrunStageConfig, PresetLevel, TileSizeOption } from "./types";

// RL Hyperparameters
export const LEARNING_RATE = 0.1;
export const DISCOUNT_FACTOR = 0.85;
export const STEP_PENALTY = -1;
export const REWARD_VALUE = 12;
export const PUNISHMENT_VALUE = -15;
export const OBSTACLE_PENALTY = -20;
export const GOAL_REWARD = REWARD_VALUE * 2;
export const PORTAL_COOLDOWN_STEPS = 4;

// Grid Configuration
export const MIN_GOAL_DISTANCE = 5;
export const BONUS_INTERVAL = 10;
export const TUTORIAL_STORAGE_KEY = "reward_rover_tutorial_seen";
export const DEFAULT_TILE_OPTION: TileSizeOption = "s";

export const TILE_SIZE_MAP = {
  s: 6,
  m: 9,
  l: 14,
} as const;

export const GRID_PIXEL_TARGET: Record<keyof typeof TILE_SIZE_MAP, number> = {
  s: 380,
  m: 480,
  l: 580,
};

// UI Labels
export const TILE_SIZE_LABELS: Record<Language, Record<keyof typeof TILE_SIZE_MAP, string>> = {
  de: { s: "Klein", m: "Mittel", l: "Groß" },
  en: { s: "Small", m: "Medium", l: "Large" },
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

// Bonus System
export const BONUS_TYPES: BonusType[] = ["reward", "punishment", "obstacle", "portal", "teleport"];

export const BONUS_WEIGHTS: Record<BonusType, number> = {
  reward: 3,
  punishment: 3,
  obstacle: 3,
  portal: 1,
  teleport: 2,
};

// Episode Titles
export const EPISODE_TITLES = [
  "Aurora Approach", "Nebula Run", "Photon Trail", "Orbit of Insight", "Cosmic Shortcut",
  "Meteor Glide", "Luminous Leap", "Ion Drift", "Gravity Groove", "Quantum Quest",
  "Stellar Sprint", "Satellite Swing", "Comet Carousel", "Solar Surge", "Pulse of Polaris",
  "Eclipse Escapade", "Nova Nexus", "Plasma Dash", "Orbit Overdrive", "Galactic Gambit",
  "Supernova Sprint", "Celestial Circuit", "Asteroid Ascent", "Photon Finale", "Lunar Loop",
  "Starlight Stride", "Ion Inferno", "Cosmos Crosswind", "Warpway Whirl", "Pulsar Pathway",
  "Zenith Zigzag", "Orbit Odyssey", "Quasar Questline", "Meteoric Maze", "Zephyr Zenith",
  "Aether Approach", "Radiant Relay", "Spectrum Sprint", "Gravity Gauntlet", "Solaris Speedway",
  "Nebula Nightfall", "Astro Ascent", "Prism Pursuit", "Chrono Comet", "Drift of Destiny",
  "Halo Hop", "Lattice Leap", "Orbit Outrun", "Plasma Parkway", "Vector Voyage",
  "Zenith Rush", "Stardust Spiral", "Cosmic Cascade", "Void Velocity", "Starfire Slalom",
  "Moonbeam Mission", "Hyperdrive Highway", "Constellation Cruise", "Astral Adventure", "Magnetar March",
  "Nebular Nomad", "Cosmic Corridor", "Titan Trek", "Starborn Sprint", "Celestial Sweep",
  "Quantum Quickstep", "Solar Surfing", "Interstellar Insight", "Stellar Synchrony", "Warp Wave",
  "Galaxy Glide", "Photon Phoenix", "Supergiant Shift", "Dark Matter Dash", "Cosmic Convergence",
  "Andromeda Arc", "Meteor Momentum", "Starlight Sequence", "Astro Algorithm", "Void Voyage",
  "Celestial Cipher", "Quantum Quasar", "Stellar Strategy", "Cosmic Calculation", "Orbit Optimizer",
  "Nebula Navigator", "Photon Pathfinder", "Galactic Gateway", "Space-Time Sprint", "Wormhole Wander",
  "Planetary Pursuit", "Asteroid Algorithm", "Comet Computation", "Supernova Solver", "Cosmic Catalyst",
  "Stellar Synapse", "Quantum Quotient", "Gravity Grid", "Celestial Calculation", "Aurora Analytics",
  "Cosmic Cognition", "Starfield Strategy",
] as const;

// Level Configurations
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

// Speedrun Stages
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

// Preset Levels - Simplified version, add full presets as needed
export const PRESET_LEVELS: PresetLevel[] = [
  {
    key: "trap",
    name: { de: "🪤 Die Falle", en: "🪤 The Trap" },
    description: {
      de: "Mehrere verlockende Sackgassen mit Belohnungen - der Rover muss Geduld lernen!",
      en: "Multiple tempting dead ends with rewards - the rover must learn patience!",
    },
    size: 9,
    tiles: [
      // Upper trap - Rewards leading to punishment
      { x: 2, y: 1, type: "obstacle" },
      { x: 2, y: 2, type: "obstacle" },
      { x: 2, y: 3, type: "obstacle" },
      { x: 3, y: 3, type: "obstacle" },
      { x: 3, y: 1, type: "reward" },
      { x: 3, y: 2, type: "reward" },
      { x: 4, y: 2, type: "punishment" },

      // Middle trap - Looks like a shortcut
      { x: 5, y: 3, type: "obstacle" },
      { x: 5, y: 4, type: "obstacle" },
      { x: 5, y: 5, type: "obstacle" },
      { x: 6, y: 5, type: "obstacle" },
      { x: 6, y: 3, type: "reward" },
      { x: 6, y: 4, type: "reward" },
      { x: 7, y: 4, type: "punishment" },

      // Lower trap - Portal trap
      { x: 1, y: 6, type: "obstacle" },
      { x: 2, y: 6, type: "obstacle" },
      { x: 2, y: 7, type: "obstacle" },
      { x: 1, y: 7, type: "reward" },
      { x: 1, y: 8, type: "portal" },
      { x: 7, y: 1, type: "portal" }, // Portal leads to corner

      // Main path obstacles
      { x: 4, y: 4, type: "obstacle" },
      { x: 4, y: 5, type: "obstacle" },
      { x: 3, y: 6, type: "obstacle" },
      { x: 5, y: 7, type: "obstacle" },

      // Strategic rewards on safe path
      { x: 1, y: 4, type: "reward" },
      { x: 3, y: 5, type: "reward" },
      { x: 4, y: 7, type: "reward" },
      { x: 6, y: 7, type: "reward" },

      // Punishments as warnings
      { x: 2, y: 5, type: "punishment" },
      { x: 5, y: 6, type: "punishment" },
    ],
    agent: { x: 0, y: 0 },
    goal: { x: 8, y: 8 },
  },
  {
    key: "spiral",
    name: { de: "🌀 Spirale des Chaos", en: "🌀 Spiral of Chaos" },
    description: {
      de: "Eine gefährliche Spirale mit Portalen im Zentrum – nur die klügsten Rover finden den Weg!",
      en: "A dangerous spiral with portals at the center – only the smartest rovers find the way!",
    },
    size: 9,
    tiles: [
      // Outer spiral walls
      { x: 1, y: 1, type: "obstacle" },
      { x: 2, y: 1, type: "obstacle" },
      { x: 3, y: 1, type: "obstacle" },
      { x: 4, y: 1, type: "obstacle" },
      { x: 5, y: 1, type: "obstacle" },
      { x: 6, y: 1, type: "obstacle" },
      { x: 7, y: 1, type: "obstacle" },
      { x: 7, y: 2, type: "obstacle" },
      { x: 7, y: 3, type: "obstacle" },
      { x: 7, y: 4, type: "obstacle" },
      { x: 7, y: 5, type: "obstacle" },
      { x: 7, y: 6, type: "obstacle" },
      { x: 7, y: 7, type: "obstacle" },
      { x: 6, y: 7, type: "obstacle" },
      { x: 5, y: 7, type: "obstacle" },
      { x: 4, y: 7, type: "obstacle" },
      { x: 3, y: 7, type: "obstacle" },
      { x: 2, y: 7, type: "obstacle" },
      { x: 1, y: 7, type: "obstacle" },
      { x: 1, y: 6, type: "obstacle" },
      { x: 1, y: 5, type: "obstacle" },
      { x: 1, y: 4, type: "obstacle" },
      { x: 1, y: 3, type: "obstacle" },
      { x: 1, y: 2, type: "obstacle" },
      // Inner spiral
      { x: 3, y: 3, type: "obstacle" },
      { x: 4, y: 3, type: "obstacle" },
      { x: 5, y: 3, type: "obstacle" },
      { x: 5, y: 4, type: "obstacle" },
      { x: 5, y: 5, type: "obstacle" },
      { x: 4, y: 5, type: "obstacle" },
      { x: 3, y: 5, type: "obstacle" },
      { x: 3, y: 4, type: "obstacle" },
      // Portals in center
      { x: 4, y: 4, type: "portal" },
      { x: 6, y: 6, type: "portal" },
      // Rewards on the path
      { x: 2, y: 3, type: "reward" },
      { x: 6, y: 3, type: "reward" },
      { x: 2, y: 5, type: "reward" },
      { x: 6, y: 5, type: "reward" },
      // Punishments at tricky spots
      { x: 2, y: 2, type: "punishment" },
      { x: 6, y: 2, type: "punishment" },
      { x: 2, y: 6, type: "punishment" },
    ],
    agent: { x: 0, y: 0 },
    goal: { x: 8, y: 8 },
  },
  {
    key: "crossroads",
    name: { de: "⚡ Kreuzung der Entscheidungen", en: "⚡ Crossroads of Decisions" },
    description: {
      de: "Vier Wege, eine Entscheidung – welcher Pfad führt zum Sieg?",
      en: "Four paths, one decision – which path leads to victory?",
    },
    size: 11,
    tiles: [
      // Center cross structure
      { x: 5, y: 3, type: "obstacle" },
      { x: 5, y: 4, type: "obstacle" },
      { x: 5, y: 6, type: "obstacle" },
      { x: 5, y: 7, type: "obstacle" },
      { x: 3, y: 5, type: "obstacle" },
      { x: 4, y: 5, type: "obstacle" },
      { x: 6, y: 5, type: "obstacle" },
      { x: 7, y: 5, type: "obstacle" },

      // North path - Risky but rewarding
      { x: 5, y: 0, type: "reward" },
      { x: 5, y: 1, type: "reward" },
      { x: 5, y: 2, type: "punishment" },
      { x: 4, y: 1, type: "obstacle" },
      { x: 6, y: 1, type: "obstacle" },

      // South path - Safe but long
      { x: 5, y: 8, type: "reward" },
      { x: 5, y: 9, type: "reward" },
      { x: 4, y: 9, type: "obstacle" },
      { x: 6, y: 9, type: "obstacle" },

      // East path - Portal shortcut
      { x: 8, y: 5, type: "portal" },
      { x: 9, y: 5, type: "reward" },
      { x: 10, y: 5, type: "portal" },
      { x: 9, y: 4, type: "obstacle" },
      { x: 9, y: 6, type: "obstacle" },

      // West path - Punishment heavy
      { x: 2, y: 5, type: "punishment" },
      { x: 1, y: 5, type: "punishment" },
      { x: 0, y: 5, type: "reward" },
      { x: 1, y: 4, type: "obstacle" },
      { x: 1, y: 6, type: "obstacle" },

      // Corner decorations
      { x: 2, y: 2, type: "reward" },
      { x: 8, y: 2, type: "reward" },
      { x: 2, y: 8, type: "reward" },
      { x: 8, y: 8, type: "punishment" },

      // Additional obstacles for complexity
      { x: 3, y: 3, type: "obstacle" },
      { x: 7, y: 3, type: "obstacle" },
      { x: 3, y: 7, type: "obstacle" },
      { x: 7, y: 7, type: "obstacle" },
    ],
    agent: { x: 5, y: 5 },
    goal: { x: 10, y: 0 },
  },
];

// Utility Functions
export const pickWeightedBonus = (): BonusType => {
  const total = BONUS_TYPES.reduce((sum, type) => sum + BONUS_WEIGHTS[type], 0);
  let roll = Math.random() * total;
  for (const type of BONUS_TYPES) {
    roll -= BONUS_WEIGHTS[type];
    if (roll <= 0) return type;
  }
  return BONUS_TYPES[0];
};

export const getSpeedrunStageConfig = (stage: number): SpeedrunStageConfig =>
  SPEEDRUN_STAGES[Math.min(stage, SPEEDRUN_STAGES.length - 1)];

export const getEpisodeTitle = (episodeNumber: number, language: Language): string => {
  const base = EPISODE_TITLES[(episodeNumber - 1) % EPISODE_TITLES.length];
  const prefix = language === "en" ? "Mission" : "Einsatz";
  return `${prefix} ${episodeNumber}: ${base}`;
};
