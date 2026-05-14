export type LevelNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface UnlockedFeatures {
  canPlaceWalls: boolean;
  canPlaceRewards: boolean;
  canPlacePunishments: boolean;
  canPlacePortals: boolean;
  canChangeGridSize: boolean;
  canAdjustAlpha: boolean;
  canAdjustGamma: boolean;
}

export interface LevelConfig {
  level: LevelNumber;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  unlockedFeatures: UnlockedFeatures;
}

export const LEVEL_CONFIGS: Record<LevelNumber, LevelConfig> = {
  1: {
    level: 1,
    name: "Anfänger – Erkunden",
    nameEn: "Beginner – Exploration",
    description: "Lerne nur die Exploration kennen. Alles andere ist deaktiviert.",
    descriptionEn: "Learn only exploration. Everything else is disabled.",
    unlockedFeatures: {
      canPlaceWalls: false,
      canPlaceRewards: false,
      canPlacePunishments: false,
      canPlacePortals: false,
      canChangeGridSize: false,
      canAdjustAlpha: false,
      canAdjustGamma: false,
    },
  },
  2: {
    level: 2,
    name: "Lernrate – Alpha (α)",
    nameEn: "Learning Rate – Alpha (α)",
    description: "Schalte die Lernrate frei. Verstehe wie schnell der Rover lernt.",
    descriptionEn: "Unlock learning rate. Understand how fast the rover learns.",
    unlockedFeatures: {
      canPlaceWalls: false,
      canPlaceRewards: false,
      canPlacePunishments: false,
      canPlacePortals: false,
      canChangeGridSize: false,
      canAdjustAlpha: true,
      canAdjustGamma: false,
    },
  },
  3: {
    level: 3,
    name: "Diskontfaktor – Gamma (γ)",
    nameEn: "Discount Factor – Gamma (γ)",
    description: "Schalte den Diskontfaktor frei. Kurz- vs. Langfristiges Denken.",
    descriptionEn: "Unlock discount factor. Short-term vs. long-term thinking.",
    unlockedFeatures: {
      canPlaceWalls: false,
      canPlaceRewards: false,
      canPlacePunishments: false,
      canPlacePortals: false,
      canChangeGridSize: false,
      canAdjustAlpha: true,
      canAdjustGamma: true,
    },
  },
  4: {
    level: 4,
    name: "Belohnungen platzieren",
    nameEn: "Place Rewards",
    description: "Platziere Belohnungen auf dem Spielfeld. Wir werden sehen, ob der Rover sie findet!",
    descriptionEn: "Place rewards on the field. Will the rover find them?",
    unlockedFeatures: {
      canPlaceWalls: false,
      canPlaceRewards: true,
      canPlacePunishments: false,
      canPlacePortals: false,
      canChangeGridSize: false,
      canAdjustAlpha: true,
      canAdjustGamma: true,
    },
  },
  5: {
    level: 5,
    name: "Strafen platzieren",
    nameEn: "Place Penalties",
    description: "Platziere Strafen. Der Rover muss lernen, sie zu vermeiden.",
    descriptionEn: "Place penalties. The rover must learn to avoid them.",
    unlockedFeatures: {
      canPlaceWalls: false,
      canPlaceRewards: true,
      canPlacePunishments: true,
      canPlacePortals: false,
      canChangeGridSize: false,
      canAdjustAlpha: true,
      canAdjustGamma: true,
    },
  },
  6: {
    level: 6,
    name: "Mauern bauen",
    nameEn: "Build Walls",
    description: "Platziere Hindernisse. Der Rover muss kreative Wege finden.",
    descriptionEn: "Place obstacles. The rover must find creative paths.",
    unlockedFeatures: {
      canPlaceWalls: true,
      canPlaceRewards: true,
      canPlacePunishments: true,
      canPlacePortals: false,
      canChangeGridSize: false,
      canAdjustAlpha: true,
      canAdjustGamma: true,
    },
  },
  7: {
    level: 7,
    name: "Gittergröße ändern",
    nameEn: "Change Grid Size",
    description: "Passt die Spielfeldgröße an. Größer = schwieriger.",
    descriptionEn: "Adjust the field size. Bigger = harder.",
    unlockedFeatures: {
      canPlaceWalls: true,
      canPlaceRewards: true,
      canPlacePunishments: true,
      canPlacePortals: false,
      canChangeGridSize: true,
      canAdjustAlpha: true,
      canAdjustGamma: true,
    },
  },
  8: {
    level: 8,
    name: "Portale freischalten",
    nameEn: "Unlock Portals",
    description: "Nutze Portale für Teleportation. Der Rover entdeckt neue Dimensionen!",
    descriptionEn: "Use portals for teleportation. The rover discovers new dimensions!",
    unlockedFeatures: {
      canPlaceWalls: true,
      canPlaceRewards: true,
      canPlacePunishments: true,
      canPlacePortals: true,
      canChangeGridSize: true,
      canAdjustAlpha: true,
      canAdjustGamma: true,
    },
  },
  9: {
    level: 9,
    name: "Meister – Alles kombiniert",
    nameEn: "Master – Everything Combined",
    description: "Kombiniere alles was du gelernt hast. Kreiere komplexe Szenarien.",
    descriptionEn: "Combine everything you've learned. Create complex scenarios.",
    unlockedFeatures: {
      canPlaceWalls: true,
      canPlaceRewards: true,
      canPlacePunishments: true,
      canPlacePortals: true,
      canChangeGridSize: true,
      canAdjustAlpha: true,
      canAdjustGamma: true,
    },
  },
  10: {
    level: 10,
    name: "Champion – Free Mode entsperrt!",
    nameEn: "Champion – Free Mode Unlocked!",
    description: "Du hast es geschafft! Free Mode ist jetzt verfügbar.",
    descriptionEn: "You made it! Free Mode is now available.",
    unlockedFeatures: {
      canPlaceWalls: true,
      canPlaceRewards: true,
      canPlacePunishments: true,
      canPlacePortals: true,
      canChangeGridSize: true,
      canAdjustAlpha: true,
      canAdjustGamma: true,
    },
  },
};

export function getUnlockedFeatures(level: number): UnlockedFeatures {
  const validLevel = Math.max(1, Math.min(10, level)) as LevelNumber;
  return LEVEL_CONFIGS[validLevel].unlockedFeatures;
}

export function getLevelConfig(level: number): LevelConfig {
  const validLevel = Math.max(1, Math.min(10, level)) as LevelNumber;
  return LEVEL_CONFIGS[validLevel];
}
