export type LevelNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface UnlockedFeatures {
  canPlaceWalls: boolean;
  canPlaceRewards: boolean;
  canPlacePunishments: boolean;
  canPlacePortals: boolean;
  /** Medium board (Level 5+). */
  canChangeGridSize: boolean;
  /** Largest board (Level 7+). */
  canUseLargeGrid: boolean;
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
    name: "Neugier",
    nameEn: "Beginner – Curiosity",
    description: "Hier gibt es nur einen Regler: die Neugier. Probier aus, was er mit dem Rover macht.",
    descriptionEn: "Learn only curiosity (exploration). Everything else is disabled.",
    unlockedFeatures: {
      canPlaceWalls: false,
      canPlaceRewards: false,
      canPlacePunishments: false,
      canPlacePortals: false,
      canChangeGridSize: false,
      canUseLargeGrid: false,
      canAdjustAlpha: false,
      canAdjustGamma: false,
    },
  },
  2: {
    level: 2,
    name: "Lernrate (α)",
    nameEn: "Learning Rate – Alpha (α)",
    description: "Jetzt kommt die Lernrate dazu. Sie bestimmt, wie schnell der Rover Neues übernimmt.",
    descriptionEn: "Unlock learning rate. Understand how fast the rover learns.",
    unlockedFeatures: {
      canPlaceWalls: false,
      canPlaceRewards: false,
      canPlacePunishments: false,
      canPlacePortals: false,
      canChangeGridSize: false,
      canUseLargeGrid: false,
      canAdjustAlpha: true,
      canAdjustGamma: false,
    },
  },
  3: {
    level: 3,
    name: "Weitsicht (γ)",
    nameEn: "Foresight – Gamma (γ)",
    description: "Jetzt kommt die Weitsicht dazu. Denkt der Rover nur an den nächsten Schritt oder an das Ziel am Ende?",
    descriptionEn: "Unlock foresight (the discount factor). Short-term vs. long-term thinking.",
    unlockedFeatures: {
      canPlaceWalls: false,
      canPlaceRewards: false,
      canPlacePunishments: false,
      canPlacePortals: false,
      canChangeGridSize: false,
      canUseLargeGrid: false,
      canAdjustAlpha: true,
      canAdjustGamma: true,
    },
  },
  4: {
    level: 4,
    name: "Belohnungen platzieren",
    nameEn: "Place Rewards",
    description: "Leg Belohnungen aufs Feld und schau, ob der Rover sie findet.",
    descriptionEn: "Place rewards on the field. Will the rover find them?",
    unlockedFeatures: {
      canPlaceWalls: false,
      canPlaceRewards: true,
      canPlacePunishments: false,
      canPlacePortals: false,
      canChangeGridSize: false,
      canUseLargeGrid: false,
      canAdjustAlpha: true,
      canAdjustGamma: true,
    },
  },
  5: {
    level: 5,
    name: "Strafen platzieren",
    nameEn: "Place Penalties",
    description: "Leg Strafen aufs Feld. Der Rover muss lernen, ihnen aus dem Weg zu gehen.",
    descriptionEn: "Place penalties. The rover must learn to avoid them.",
    unlockedFeatures: {
      canPlaceWalls: false,
      canPlaceRewards: true,
      canPlacePunishments: true,
      canPlacePortals: false,
      canChangeGridSize: true,
      canUseLargeGrid: false,
      canAdjustAlpha: true,
      canAdjustGamma: true,
    },
  },
  6: {
    level: 6,
    name: "Mauern bauen",
    nameEn: "Build Walls",
    description: "Bau Mauern. Der Rover muss sich einen Weg drumherum suchen.",
    descriptionEn: "Place obstacles. The rover must find creative paths.",
    unlockedFeatures: {
      canPlaceWalls: true,
      canPlaceRewards: true,
      canPlacePunishments: true,
      canPlacePortals: false,
      canChangeGridSize: true,
      canUseLargeGrid: false,
      canAdjustAlpha: true,
      canAdjustGamma: true,
    },
  },
  7: {
    level: 7,
    name: "Gittergröße ändern",
    nameEn: "Change Grid Size",
    description: "Mach das Feld größer. Je größer es ist, desto länger braucht der Rover.",
    descriptionEn: "Adjust the field size. Bigger = harder.",
    unlockedFeatures: {
      canPlaceWalls: true,
      canPlaceRewards: true,
      canPlacePunishments: true,
      canPlacePortals: false,
      canChangeGridSize: true,
      canUseLargeGrid: true,
      canAdjustAlpha: true,
      canAdjustGamma: true,
    },
  },
  8: {
    level: 8,
    name: "Portale freischalten",
    nameEn: "Unlock Portals",
    description: "Setz Portale. Wer hineinfährt, kommt an einer anderen Stelle wieder heraus.",
    descriptionEn: "Use portals for teleportation. The rover discovers new dimensions!",
    unlockedFeatures: {
      canPlaceWalls: true,
      canPlaceRewards: true,
      canPlacePunishments: true,
      canPlacePortals: true,
      canChangeGridSize: true,
      canUseLargeGrid: true,
      canAdjustAlpha: true,
      canAdjustGamma: true,
    },
  },
  9: {
    level: 9,
    name: "Alles zusammen",
    nameEn: "Master – Everything Combined",
    description: "Nimm alles zusammen, was du bisher kennst, und bau dem Rover eine schwierige Welt.",
    descriptionEn: "Combine everything you've learned. Create complex scenarios.",
    unlockedFeatures: {
      canPlaceWalls: true,
      canPlaceRewards: true,
      canPlacePunishments: true,
      canPlacePortals: true,
      canChangeGridSize: true,
      canUseLargeGrid: true,
      canAdjustAlpha: true,
      canAdjustGamma: true,
    },
  },
  10: {
    level: 10,
    name: "Das letzte Level",
    nameEn: "Champion – Free Mode Unlocked!",
    description: "Die letzte Aufgabe. Danach ist das freie Spiel offen.",
    descriptionEn: "You made it! Free Mode is now available.",
    unlockedFeatures: {
      canPlaceWalls: true,
      canPlaceRewards: true,
      canPlacePunishments: true,
      canPlacePortals: true,
      canChangeGridSize: true,
      canUseLargeGrid: true,
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

/**
 * Returns the earliest level at which a given feature becomes unlocked,
 * so the UI can tell the player "unlocks at level N" instead of just
 * greying the feature out.
 */
export function getUnlockLevel(feature: keyof UnlockedFeatures): LevelNumber {
  for (let level = 1 as LevelNumber; level <= 10; level++) {
    if (LEVEL_CONFIGS[level].unlockedFeatures[feature]) {
      return level;
    }
  }
  return 10;
}
