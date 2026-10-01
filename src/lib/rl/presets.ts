import type { TileType } from "@/components/RL/Tile";
import type { Language } from "@/lib/rl/types";

// Preset-Level-Definitionen
export interface PresetLevel {
  key: string;
  name: Record<Language, string>;
  description: Record<Language, string>;
  size: number;
  tiles: Array<{ x: number; y: number; type: TileType }>;
  agent?: { x: number; y: number };
  goal?: { x: number; y: number };
}

export type GridConfig = Pick<PresetLevel, "size" | "tiles" | "agent" | "goal">;

export const PRESET_LEVELS: PresetLevel[] = [
  {
    key: "trap",
    name: { de: "🪤 Die Falle", en: "🪤 The Trap" },
    description: {
      de: "Belohnungen locken in eine Sackgasse - der Rover muss lernen zu widerstehen!",
      en: "Rewards lure into a dead end - the rover must learn to resist!",
    },
    size: 6,
    tiles: [
      // Wände um Falle
      { x: 3, y: 1, type: "obstacle" },
      { x: 3, y: 2, type: "obstacle" },
      { x: 3, y: 3, type: "obstacle" },
      { x: 4, y: 3, type: "obstacle" },
      // Belohnungen in der Falle
      { x: 4, y: 1, type: "reward" },
      { x: 4, y: 2, type: "reward" },
      // Bestrafung am Ende
      { x: 5, y: 2, type: "punishment" },
      // Hindernisse zur Erschwerung
      { x: 1, y: 1, type: "obstacle" },
      { x: 1, y: 3, type: "obstacle" },
    ],
    agent: { x: 0, y: 4 },
    goal: { x: 5, y: 4 },
  },
  {
    key: "twopaths",
    name: { de: "🚦 Zwei Wege", en: "🚦 Two Paths" },
    description: {
      de: "Welcher Weg ist besser? Der schnelle mit Risiko oder der sichere Umweg?",
      en: "Which path is better? The fast risky one or the safe detour?",
    },
    size: 6,
    tiles: [
      // Mittlere Wand
      { x: 2, y: 1, type: "obstacle" },
      { x: 2, y: 2, type: "obstacle" },
      { x: 2, y: 3, type: "obstacle" },
      { x: 2, y: 4, type: "obstacle" },
      // Oberer Weg (riskant)
      { x: 3, y: 1, type: "reward" },
      { x: 4, y: 1, type: "punishment" },
      // Unterer Weg (sicher)
      { x: 3, y: 4, type: "reward" },
      { x: 4, y: 4, type: "reward" },
    ],
    agent: { x: 0, y: 2 },
    goal: { x: 5, y: 2 },
  },
  {
    key: "maze",
    name: { de: "Mini Maze", en: "Mini Maze" },
    description: {
      de: "Verzweigtes Mini-Labyrinth mit riskanten Portalen – Umwege sind garantiert.",
      en: "A branching mini maze with risky portals – detours guaranteed.",
    },
    size: 6,
    tiles: [
      // Blockierte Zugänge und Mittelpassagen
      { x: 0, y: 0, type: "obstacle" },
      { x: 1, y: 0, type: "obstacle" },
      { x: 3, y: 0, type: "obstacle" },
      { x: 3, y: 1, type: "obstacle" },
      { x: 2, y: 2, type: "obstacle" },
      { x: 3, y: 2, type: "obstacle" },
      { x: 3, y: 3, type: "obstacle" },
      { x: 4, y: 3, type: "obstacle" },
      { x: 0, y: 4, type: "obstacle" },
      { x: 4, y: 5, type: "obstacle" },
      { x: 5, y: 5, type: "obstacle" },
      // Gefährliche Portale
      { x: 0, y: 2, type: "portal" },
      { x: 1, y: 4, type: "portal" },
      // Belohnungen entlang der Nebenpfade
      { x: 2, y: 1, type: "reward" },
      { x: 4, y: 4, type: "reward" },
      // Strafen an Engstellen
      { x: 4, y: 2, type: "punishment" },
      { x: 2, y: 3, type: "punishment" },
    ],
    agent: { x: 0, y: 5 },
    goal: { x: 5, y: 0 },
  },
  {
    key: "gauntlet",
    name: { de: "⚡ Spießrutenlauf", en: "⚡ The Gauntlet" },
    description: {
      de: "Viele Strafen versperren den direkten Weg - Vorsicht ist geboten!",
      en: "Many penalties block the direct path - caution is required!",
    },
    size: 6,
    tiles: [
      // Strafen-Linie
      { x: 2, y: 1, type: "punishment" },
      { x: 2, y: 2, type: "punishment" },
      { x: 2, y: 3, type: "punishment" },
      { x: 2, y: 4, type: "punishment" },
      // Belohnungen an den Rändern
      { x: 1, y: 0, type: "reward" },
      { x: 1, y: 5, type: "reward" },
      { x: 3, y: 0, type: "reward" },
      { x: 3, y: 5, type: "reward" },
    ],
    agent: { x: 0, y: 2 },
    goal: { x: 5, y: 2 },
  },
  {
    key: "bouncer",
    name: { de: "🚪 Der Türsteher", en: "🚪 The Bouncer" },
    description: {
      de: "Das Ziel ist blockiert – nur durch eine Strafe führt der einzige Eingang.",
      en: "The goal is blocked — only a penalty opens the only entrance.",
    },
    size: 6,
    tiles: [
      // Raum um das Ziel (eine Öffnung bleibt frei)
      { x: 4, y: 5, type: "obstacle" },
      { x: 3, y: 5, type: "obstacle" },
      { x: 5, y: 3, type: "obstacle" },
      // Türsteher-Strafe am Eingang
      { x: 4, y: 4, type: "punishment" },
    ],
    agent: { x: 0, y: 0 },
    goal: { x: 5, y: 5 },
  },
  {
    key: "portalJump",
    name: { de: "Portal Jump", en: "Portal Jump" },
    description: {
      de: "Eine Mauer trennt das Feld – nur ein Portal führt auf die andere Seite.",
      en: "A solid wall splits the field — only a portal lets you pass.",
    },
    size: 6,
    tiles: [
      // Trennwand
      ...Array.from({ length: 6 }, (_, y) => ({ x: 3, y, type: "obstacle" as const })),
      // Portal-Paar
      { x: 1, y: 2, type: "portal" },
      { x: 4, y: 2, type: "portal" },
    ],
    agent: { x: 0, y: 0 },
    goal: { x: 5, y: 5 },
  },
  {
    key: "arena",
    name: { de: "Arena", en: "Arena" },
    description: {
      de: "Portale, Strafkorridore und flankierende Belohnungen – hier entscheidet mutiges Timing den Sieg.",
      en: "Portals, hazard lanes, and flank rewards crank up the duel – bold timing wins this arena.",
    },
    size: 9,
    tiles: [
      // Äußere Pfeiler
      { x: 1, y: 1, type: "obstacle" },
      { x: 7, y: 1, type: "obstacle" },
      { x: 1, y: 7, type: "obstacle" },
      { x: 7, y: 7, type: "obstacle" },
      // Innere Ringmauern
      { x: 3, y: 2, type: "obstacle" },
      { x: 5, y: 2, type: "obstacle" },
      { x: 2, y: 3, type: "obstacle" },
      { x: 6, y: 3, type: "obstacle" },
      { x: 2, y: 5, type: "obstacle" },
      { x: 6, y: 5, type: "obstacle" },
      { x: 3, y: 6, type: "obstacle" },
      { x: 5, y: 6, type: "obstacle" },
      // Riskanter Mittelgang
      { x: 3, y: 4, type: "punishment" },
      { x: 4, y: 3, type: "punishment" },
      { x: 4, y: 4, type: "punishment" },
      { x: 4, y: 5, type: "punishment" },
      { x: 5, y: 4, type: "punishment" },
      { x: 2, y: 4, type: "punishment" },
      { x: 6, y: 4, type: "punishment" },
      // Belohnungen an den Flanken
      { x: 2, y: 2, type: "reward" },
      { x: 6, y: 2, type: "reward" },
      { x: 2, y: 6, type: "reward" },
      { x: 6, y: 6, type: "reward" },
      { x: 4, y: 1, type: "reward" },
      { x: 4, y: 7, type: "reward" },
      // Portalnetz für schnelle Seitenwechsel
      { x: 1, y: 4, type: "portal" },
      { x: 7, y: 4, type: "portal" },
      { x: 3, y: 1, type: "portal" },
      { x: 5, y: 7, type: "portal" },
    ],
    agent: { x: 4, y: 8 },
    goal: { x: 4, y: 0 },
  },
  {
    key: "riskyBridge",
    name: { de: "🌉 Die unsichere Brücke", en: "The Risky Bridge" },
    description: {
      de: "Ein schmaler Steg führt direkt zum Ziel, doch Strafen flankieren ihn – der sichere Umweg ist viel länger.",
      en: "A one-tile bridge heads straight for the goal, but penalties flank it – the safe detour is much longer.",
    },
    size: 9,
    tiles: [
      // Brücke und riskanter Fluss
      ...Array.from({ length: 7 }, (_, x) => ({ x: x + 1, y: 2, type: "obstacle" as const })),
      ...Array.from({ length: 7 }, (_, x) => ({ x: x + 1, y: 6, type: "obstacle" as const })),
      ...Array.from({ length: 7 }, (_, x) => ({ x: x + 1, y: 3, type: "punishment" as const })),
      ...Array.from({ length: 7 }, (_, x) => ({ x: x + 1, y: 5, type: "punishment" as const })),
    ],
    agent: { x: 0, y: 4 },
    goal: { x: 8, y: 4 },
  },
  {
    key: "trappedMaze",
    name: { de: "🧩 Labyrinth mit Fallen", en: "🧩 Trapped Maze" },
    description: {
      de: "Belohnungen stecken in Sackgassen, doch das Ziel in der Mitte erfordert einen riskanten Schritt.",
      en: "Rewards hide in dead ends, but the central goal demands a risky step.",
    },
    size: 9,
    tiles: [
      // Labyrinth-Wände
      { x: 2, y: 0, type: "obstacle" },
      { x: 2, y: 1, type: "obstacle" },
      { x: 2, y: 2, type: "obstacle" },
      { x: 2, y: 4, type: "obstacle" },
      { x: 2, y: 5, type: "obstacle" },
      { x: 2, y: 6, type: "obstacle" },
      { x: 2, y: 8, type: "obstacle" },
      { x: 6, y: 0, type: "obstacle" },
      { x: 6, y: 1, type: "obstacle" },
      { x: 6, y: 2, type: "obstacle" },
      { x: 6, y: 3, type: "obstacle" },
      { x: 6, y: 4, type: "obstacle" },
      { x: 6, y: 6, type: "obstacle" },
      { x: 6, y: 7, type: "obstacle" },
      { x: 6, y: 8, type: "obstacle" },
      { x: 3, y: 2, type: "obstacle" },
      { x: 5, y: 2, type: "obstacle" },
      { x: 3, y: 6, type: "obstacle" },
      { x: 4, y: 6, type: "obstacle" },
      // Zielkammer - nur von oben erreichbar
      { x: 3, y: 4, type: "obstacle" },
      { x: 5, y: 4, type: "obstacle" },
      { x: 4, y: 5, type: "obstacle" },
      // Belohnungen in Sackgassen
      { x: 1, y: 1, type: "reward" },
      { x: 1, y: 7, type: "reward" },
      { x: 7, y: 1, type: "reward" },
      { x: 7, y: 7, type: "reward" },
      // Fallen auf dem Weg
      { x: 4, y: 3, type: "punishment" },
      { x: 7, y: 5, type: "punishment" },
    ],
    agent: { x: 0, y: 8 },
    goal: { x: 4, y: 4 },
  },
  {
    key: "twoRooms",
    name: { de: "🚪 Zwei Räume", en: "🚪 Two Rooms" },
    description: {
      de: "Eine Wand teilt das Feld, nur ein Durchgang führt in den lohnenden zweiten Raum.",
      en: "A wall splits the field; only one doorway leads to the rewarding second room.",
    },
    size: 9,
    tiles: [
      // Trennwand mit Durchgang
      { x: 4, y: 0, type: "obstacle" },
      { x: 4, y: 1, type: "obstacle" },
      { x: 4, y: 2, type: "obstacle" },
      { x: 4, y: 3, type: "obstacle" },
      { x: 4, y: 5, type: "obstacle" },
      { x: 4, y: 6, type: "obstacle" },
      { x: 4, y: 7, type: "obstacle" },
      { x: 4, y: 8, type: "obstacle" },
      // Raum 1 - kleine Strafen
      { x: 1, y: 2, type: "punishment" },
      { x: 2, y: 5, type: "punishment" },
      { x: 3, y: 7, type: "punishment" },
      // Raum 2 - gemischte Anreize
      { x: 6, y: 2, type: "reward" },
      { x: 7, y: 5, type: "reward" },
      { x: 5, y: 7, type: "reward" },
      { x: 6, y: 6, type: "punishment" },
      { x: 7, y: 3, type: "punishment" },
    ],
    agent: { x: 1, y: 7 },
    goal: { x: 7, y: 1 },
  },
  {
    key: "fourRooms",
    name: { de: "🏠 Vier Räume", en: "Four Rooms" },
    description: {
      de: "Der Klassiker: Vier Räume mit engen Durchgängen zwischen den Quadranten.",
      en: "A classic benchmark: four rooms with narrow doorways between quadrants.",
    },
    size: 9,
    tiles: [
      // Kreuzwände mit Durchgängen - Alle 4 Räume sind jetzt erreichbar
      // Vertikale Wand (x=4) mit Öffnungen bei y=2 und y=6
      ...Array.from({ length: 9 }, (_, y) => ({ x: 4, y, type: "obstacle" as const })).filter(({ y }) => y !== 2 && y !== 6),
      // Horizontale Wand (y=4) mit Öffnungen bei x=2 und x=6
      ...Array.from({ length: 9 }, (_, x) => ({ x, y: 4, type: "obstacle" as const })).filter(({ x }) => x !== 2 && x !== 6),
    ],
    agent: { x: 0, y: 0 },
    goal: { x: 8, y: 8 },
  },
  {
    key: "lavaBridge",
    name: { de: "🌋 Die Lavabrücke", en: "Lava Bridge" },
    description: {
      de: "Ein schmaler Steg führt durch Lava – der sichere Umweg kostet wertvolle Schritte.",
      en: "A narrow bridge crosses lava — the safe detour costs many steps.",
    },
    size: 9,
    tiles: [
      // Lavafelder
      ...Array.from({ length: 7 }, (_, x) => ({ x: x + 1, y: 3, type: "punishment" as const })),
      ...Array.from({ length: 7 }, (_, x) => ({ x: x + 1, y: 5, type: "punishment" as const })),
      // Umwege mit Mauern in den Außenbereichen
      { x: 1, y: 0, type: "obstacle" },
      { x: 2, y: 0, type: "obstacle" },
      { x: 6, y: 0, type: "obstacle" },
      { x: 7, y: 0, type: "obstacle" },
      { x: 1, y: 1, type: "obstacle" },
      { x: 4, y: 1, type: "obstacle" },
      { x: 7, y: 1, type: "obstacle" },
      { x: 0, y: 2, type: "obstacle" },
      { x: 3, y: 2, type: "obstacle" },
      { x: 5, y: 2, type: "obstacle" },
      { x: 8, y: 2, type: "obstacle" },
      { x: 0, y: 6, type: "obstacle" },
      { x: 3, y: 6, type: "obstacle" },
      { x: 5, y: 6, type: "obstacle" },
      { x: 8, y: 6, type: "obstacle" },
      { x: 1, y: 7, type: "obstacle" },
      { x: 4, y: 7, type: "obstacle" },
      { x: 7, y: 7, type: "obstacle" },
      { x: 2, y: 8, type: "obstacle" },
      { x: 6, y: 8, type: "obstacle" },
    ],
    agent: { x: 0, y: 4 },
    goal: { x: 8, y: 4 },
  },
  {
    key: "islandHopping",
    name: { de: "🏝️ Insel-Hopping", en: "Island Hopping" },
    description: {
      de: "Drei Inseln sind nur über Portale verbunden – ohne Sprünge bleibt der Rover stecken.",
      en: "Three islands are linked only by portals — without jumps the rover is stuck.",
    },
    size: 9,
    tiles: [
      // Inseln freilassen, alles dazwischen blockieren
      ...Array.from({ length: 9 }, (_, y) =>
        Array.from({ length: 9 }, (_, x) => ({ x, y, type: "obstacle" as const })),
      )
        .flat()
        .filter(
          ({ x, y }) =>
            !(
              (x <= 2 && y <= 2) ||
              (x >= 3 && x <= 5 && y >= 3 && y <= 5) ||
              (x >= 6 && y >= 6)
            ),
        ),
      // Portal-Paar A (Insel 1 -> Insel 2)
      { x: 2, y: 1, type: "portal" },
      { x: 3, y: 3, type: "portal" },
      // Portal-Paar B (Insel 2 -> Insel 3)
      { x: 5, y: 5, type: "portal" },
      { x: 7, y: 7, type: "portal" },
      // Belohnung in Insel 2
      { x: 4, y: 4, type: "reward" },
    ],
    agent: { x: 0, y: 0 },
    goal: { x: 8, y: 8 },
  },
  {
    key: "labyrinthXL",
    name: { de: "🧭 Großes Labyrinth", en: "🧭 Grand Maze" },
    description: {
      de: "Komplexes 14×14-Labyrinth mit verschlungenen Wegen, Portalen und Abzweigungen – du brauchst Ausdauer!",
      en: "Complex 14×14 labyrinth packed with twists, portals, and branches – stamina required!",
    },
    size: 14,
    tiles: [
      // Außenring
      ...Array.from({ length: 14 }, (_, x) => ({ x, y: 0, type: "obstacle" as const })),
      ...Array.from({ length: 14 }, (_, x) => ({ x, y: 13, type: "obstacle" as const })),
      ...Array.from({ length: 12 }, (_, y) => ({ x: 0, y: y + 1, type: "obstacle" as const })),
      ...Array.from({ length: 12 }, (_, y) => ({ x: 13, y: y + 1, type: "obstacle" as const })),
      // Verdichtete Kernmauern formen verschlungene Wege
      { x: 7, y: 1, type: "obstacle" },
      { x: 8, y: 1, type: "obstacle" },
      { x: 11, y: 1, type: "obstacle" },
      { x: 12, y: 1, type: "obstacle" },
      { x: 1, y: 2, type: "obstacle" },
      { x: 2, y: 2, type: "obstacle" },
      { x: 3, y: 2, type: "obstacle" },
      { x: 7, y: 2, type: "obstacle" },
      { x: 10, y: 2, type: "obstacle" },
      { x: 11, y: 2, type: "obstacle" },
      { x: 12, y: 2, type: "obstacle" },
      { x: 1, y: 3, type: "obstacle" },
      { x: 5, y: 3, type: "obstacle" },
      { x: 9, y: 3, type: "obstacle" },
      { x: 10, y: 3, type: "obstacle" },
      { x: 11, y: 3, type: "obstacle" },
      { x: 12, y: 3, type: "obstacle" },
      { x: 3, y: 4, type: "obstacle" },
      { x: 4, y: 4, type: "obstacle" },
      { x: 10, y: 4, type: "obstacle" },
      { x: 11, y: 4, type: "obstacle" },
      { x: 12, y: 4, type: "obstacle" },
      { x: 11, y: 5, type: "obstacle" },
      { x: 12, y: 5, type: "obstacle" },
      { x: 1, y: 6, type: "obstacle" },
      { x: 4, y: 6, type: "obstacle" },
      { x: 5, y: 6, type: "obstacle" },
      { x: 6, y: 6, type: "obstacle" },
      { x: 7, y: 6, type: "obstacle" },
      { x: 11, y: 6, type: "obstacle" },
      { x: 12, y: 6, type: "obstacle" },
      { x: 1, y: 7, type: "obstacle" },
      { x: 8, y: 7, type: "obstacle" },
      { x: 12, y: 7, type: "obstacle" },
      { x: 1, y: 8, type: "obstacle" },
      { x: 8, y: 8, type: "obstacle" },
      { x: 12, y: 8, type: "obstacle" },
      { x: 1, y: 9, type: "obstacle" },
      { x: 6, y: 9, type: "obstacle" },
      { x: 9, y: 9, type: "obstacle" },
      { x: 1, y: 10, type: "obstacle" },
      { x: 2, y: 10, type: "obstacle" },
      { x: 1, y: 11, type: "obstacle" },
      { x: 2, y: 11, type: "obstacle" },
      { x: 7, y: 11, type: "obstacle" },
      { x: 8, y: 11, type: "obstacle" },
      { x: 9, y: 11, type: "obstacle" },
      { x: 1, y: 12, type: "obstacle" },
      { x: 2, y: 12, type: "obstacle" },
      // Belohnungen auf Nebenpfaden
      { x: 9, y: 1, type: "reward" },
      { x: 5, y: 2, type: "reward" },
      { x: 2, y: 8, type: "reward" },
      { x: 7, y: 9, type: "reward" },
      { x: 11, y: 10, type: "reward" },
      // Strafen bewachen Engstellen
      { x: 10, y: 1, type: "punishment" },
      { x: 6, y: 3, type: "punishment" },
      { x: 1, y: 4, type: "punishment" },
      { x: 9, y: 8, type: "punishment" },
      { x: 4, y: 9, type: "punishment" },
      { x: 5, y: 11, type: "punishment" },
      { x: 10, y: 11, type: "punishment" },
      // Neu positionierte Portale
      { x: 9, y: 4, type: "portal" },
      { x: 3, y: 9, type: "portal" },
    ],
    agent: { x: 1, y: 1 },
    goal: { x: 12, y: 12 },
  },
  {
    key: "spiral",
    name: { de: "Spirale", en: "Spiral" },
    description: {
      de: "Eine gefährliche Spirale mit Portalen im Zentrum – nur die klügsten Rover finden den Weg!",
      en: "A dangerous spiral with portals at the center – only the smartest rovers find the way!",
    },
    size: 9,
    tiles: [
      // Outer ring (gap at top left for entry at 1,2)
      { x: 1, y: 1, type: "obstacle" },
      // Gap at x: 2, y: 1 for entry
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

      // Second ring - creates spiral (accessible center)
      { x: 3, y: 3, type: "obstacle" },
      { x: 4, y: 3, type: "obstacle" },
      { x: 5, y: 3, type: "obstacle" },
      { x: 5, y: 4, type: "obstacle" },
      { x: 5, y: 5, type: "obstacle" },
      // Gap at (4,5) to access center portal
      { x: 3, y: 5, type: "obstacle" },
      { x: 3, y: 4, type: "obstacle" },

      // Rewards along the spiral path
      { x: 2, y: 1, type: "reward" },  // Entry reward top left
      { x: 2, y: 4, type: "reward" },  // Along the path
      { x: 4, y: 2, type: "reward" },  // Inner area
      { x: 6, y: 4, type: "reward" },  // Near center

      // Portals - center portal now accessible
      { x: 4, y: 4, type: "portal" },  // Now accessible from (4,5) gap
      { x: 6, y: 6, type: "portal" },

      // Punishments for risk
      { x: 2, y: 2, type: "punishment" },
      { x: 6, y: 2, type: "punishment" },
      { x: 6, y: 5, type: "punishment" },
    ],
    agent: { x: 0, y: 0 },
    goal: { x: 8, y: 8 },
  },
  {
    key: "crossroads",
    name: { de: "⚡ Kreuzung", en: "⚡ Crossroads" },
    description: {
      de: "Vier Wege, eine Entscheidung – welcher Pfad führt zum Sieg?",
      en: "Four paths, one decision – which path leads to victory?",
    },
    size: 11,
    tiles: [
      // Center cross structure - The Hub
      { x: 5, y: 3, type: "obstacle" },
      { x: 5, y: 4, type: "obstacle" },
      { x: 5, y: 6, type: "obstacle" },
      { x: 5, y: 7, type: "obstacle" },
      { x: 3, y: 5, type: "obstacle" },
      { x: 4, y: 5, type: "obstacle" },
      { x: 6, y: 5, type: "obstacle" },
      { x: 7, y: 5, type: "obstacle" },
      { x: 5, y: 5, type: "portal" },  // Center portal!

      // North path - The Gauntlet (high risk, high reward)
      { x: 5, y: 0, type: "reward" },
      { x: 5, y: 1, type: "portal" },
      { x: 5, y: 2, type: "punishment" },
      { x: 4, y: 0, type: "punishment" },
      { x: 6, y: 0, type: "punishment" },
      { x: 4, y: 1, type: "obstacle" },
      { x: 6, y: 1, type: "obstacle" },
      { x: 4, y: 2, type: "reward" },
      { x: 6, y: 2, type: "reward" },

      // South path - The Maze (safe but complex)
      { x: 5, y: 8, type: "reward" },
      { x: 5, y: 9, type: "reward" },
      { x: 5, y: 10, type: "portal" },
      { x: 4, y: 8, type: "obstacle" },
      { x: 6, y: 8, type: "obstacle" },
      { x: 4, y: 9, type: "reward" },
      { x: 6, y: 9, type: "reward" },
      { x: 3, y: 9, type: "obstacle" },
      { x: 7, y: 9, type: "obstacle" },

      // East path - Portal Highway (shortcuts everywhere)
      { x: 8, y: 5, type: "portal" },
      { x: 9, y: 5, type: "portal" },
      { x: 10, y: 5, type: "reward" },
      { x: 8, y: 4, type: "reward" },
      { x: 8, y: 6, type: "reward" },
      { x: 9, y: 4, type: "obstacle" },
      { x: 9, y: 6, type: "obstacle" },
      { x: 10, y: 4, type: "punishment" },
      { x: 10, y: 6, type: "punishment" },

      // West path - The Trap (looks easy, but punishing)
      { x: 2, y: 5, type: "punishment" },
      { x: 1, y: 5, type: "punishment" },
      { x: 0, y: 5, type: "portal" },
      { x: 1, y: 4, type: "obstacle" },
      { x: 1, y: 6, type: "obstacle" },
      { x: 2, y: 4, type: "punishment" },
      { x: 2, y: 6, type: "punishment" },
      { x: 0, y: 4, type: "reward" },
      { x: 0, y: 6, type: "reward" },

      // Corner power-ups (high value targets)
      { x: 1, y: 1, type: "reward" },
      { x: 9, y: 1, type: "reward" },
      { x: 1, y: 9, type: "reward" },
      { x: 9, y: 9, type: "reward" },

      // Diagonal obstacles (create strategic choices)
      { x: 3, y: 3, type: "obstacle" },
      { x: 7, y: 3, type: "obstacle" },
      { x: 3, y: 7, type: "obstacle" },
      { x: 7, y: 7, type: "obstacle" },
      { x: 2, y: 2, type: "portal" },
      { x: 8, y: 2, type: "portal" },
      { x: 2, y: 8, type: "punishment" },
      { x: 8, y: 8, type: "punishment" },
    ],
    agent: { x: 0, y: 0 },
    goal: { x: 10, y: 10 },
  },
];
