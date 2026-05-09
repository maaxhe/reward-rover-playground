export interface LevelFeatures {
  explorationSlider: boolean;
  learningRateSlider: boolean;
  gammaSlider: boolean;
  gridSizeControl: boolean;
  placementReward: boolean;
  placementObstacle: boolean;
  placementPunishment: boolean;
  placementPortal: boolean;
}

export interface LevelDef {
  level: number;
  name: string;
  emoji: string;
  tagline: string;
  defaultGridSize: number;
  features: LevelFeatures;
  /** Cumulative total episodes needed to unlock the NEXT level. Infinity = final level. */
  unlockAt: number;
  newFeature: string;
}

export const LEVELS: LevelDef[] = [
  {
    level: 1,
    name: "Erste Schritte",
    emoji: "🚀",
    tagline: "Lerne den Agenten kennen",
    defaultGridSize: 6,
    features: {
      explorationSlider: true,
      learningRateSlider: false,
      gammaSlider: false,
      gridSizeControl: false,
      placementReward: false,
      placementObstacle: false,
      placementPunishment: false,
      placementPortal: false,
    },
    unlockAt: 3,
    newFeature: "Exploration / Exploitation",
  },
  {
    level: 2,
    name: "Belohnungen",
    emoji: "💎",
    tagline: "Platziere Belohnungen im Grid",
    defaultGridSize: 6,
    features: {
      explorationSlider: true,
      learningRateSlider: false,
      gammaSlider: false,
      gridSizeControl: false,
      placementReward: true,
      placementObstacle: false,
      placementPunishment: false,
      placementPortal: false,
    },
    unlockAt: 8,
    newFeature: "Belohnungsfelder",
  },
  {
    level: 3,
    name: "Hindernisse",
    emoji: "🚧",
    tagline: "Forme das Labyrinth",
    defaultGridSize: 6,
    features: {
      explorationSlider: true,
      learningRateSlider: false,
      gammaSlider: false,
      gridSizeControl: false,
      placementReward: true,
      placementObstacle: true,
      placementPunishment: false,
      placementPortal: false,
    },
    unlockAt: 15,
    newFeature: "Hindernisse",
  },
  {
    level: 4,
    name: "Lernrate",
    emoji: "🧠",
    tagline: "Steuere wie schnell der Agent lernt",
    defaultGridSize: 8,
    features: {
      explorationSlider: true,
      learningRateSlider: true,
      gammaSlider: false,
      gridSizeControl: false,
      placementReward: true,
      placementObstacle: true,
      placementPunishment: false,
      placementPortal: false,
    },
    unlockAt: 25,
    newFeature: "Lernrate (α)",
  },
  {
    level: 5,
    name: "Bestrafungen",
    emoji: "⚡",
    tagline: "Füge Gefahren hinzu",
    defaultGridSize: 8,
    features: {
      explorationSlider: true,
      learningRateSlider: true,
      gammaSlider: false,
      gridSizeControl: false,
      placementReward: true,
      placementObstacle: true,
      placementPunishment: true,
      placementPortal: false,
    },
    unlockAt: 40,
    newFeature: "Bestrafungsfelder",
  },
  {
    level: 6,
    name: "Gamma",
    emoji: "🔮",
    tagline: "Kontrolliere den Blick in die Zukunft",
    defaultGridSize: 8,
    features: {
      explorationSlider: true,
      learningRateSlider: true,
      gammaSlider: true,
      gridSizeControl: false,
      placementReward: true,
      placementObstacle: true,
      placementPunishment: true,
      placementPortal: false,
    },
    unlockAt: 60,
    newFeature: "Diskontierungsfaktor (γ)",
  },
  {
    level: 7,
    name: "Weltenbauer",
    emoji: "🌍",
    tagline: "Gestalte die Größe deiner Welt",
    defaultGridSize: 8,
    features: {
      explorationSlider: true,
      learningRateSlider: true,
      gammaSlider: true,
      gridSizeControl: true,
      placementReward: true,
      placementObstacle: true,
      placementPunishment: true,
      placementPortal: false,
    },
    unlockAt: 80,
    newFeature: "Grid-Größe anpassen",
  },
  {
    level: 8,
    name: "Portale",
    emoji: "🌀",
    tagline: "Master-Level – Teleportation freigeschaltet!",
    defaultGridSize: 8,
    features: {
      explorationSlider: true,
      learningRateSlider: true,
      gammaSlider: true,
      gridSizeControl: true,
      placementReward: true,
      placementObstacle: true,
      placementPunishment: true,
      placementPortal: true,
    },
    unlockAt: Infinity,
    newFeature: "Portal-Teleportation",
  },
];
