import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Tile, TileType } from "./Tile";
import { cn } from "@/lib/utils";
import {
  Gamepad2,
  Pause,
  Play,
  RotateCcw,
  Target,
} from "lucide-react";

const formatter = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });

const TILE_SIZE_MAP = {
  s: 8,
  m: 12,
  l: 16,
} as const;

const TILE_SIZE_LABELS: Record<keyof typeof TILE_SIZE_MAP, string> = {
  s: "Klein",
  m: "Mittel",
  l: "Groß",
};

const TILE_ICONS: Record<TileType, string> = {
  empty: "",
  obstacle: "",
  reward: "🍬",
  punishment: "⚡",
  goal: "🎯",
  portal: "🌀",
};

const TYPE_LABEL_MAP: Record<TileType, string> = {
  empty: "Leer",
  obstacle: "Hindernis",
  reward: "Belohnung",
  punishment: "Strafe",
  goal: "Ziel",
  portal: "Portal",
};

const GRID_PIXEL_TARGET: Record<keyof typeof TILE_SIZE_MAP, number> = {
  s: 420,
  m: 520,
  l: 640,
};

type TileSizeOption = keyof typeof TILE_SIZE_MAP;
type Mode = "playground" | "random";

type LevelKey = "level1" | "level2" | "level3";

interface LevelConfig {
  key: LevelKey;
  name: string;
  description: string;
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
    description: "Großzügiges Feld mit wenigen Hindernissen. Perfekt zum Starten.",
    sizeOffset: 0,
    rewardDensity: 0.08,
    punishmentDensity: 0.05,
    obstacleDensity: 0.12,
    goals: 1,
  },
  level2: {
    key: "level2",
    name: "Level 2 – Pfadfinder",
    description: "Mehr Hindernisse und Fallen – der Rover braucht clevere Strategien.",
    sizeOffset: 0,
    rewardDensity: 0.1,
    punishmentDensity: 0.08,
    obstacleDensity: 0.18,
    goals: 2,
  },
  level3: {
    key: "level3",
    name: "Level 3 – Labyrinth",
    description: "Dicht besetztes Feld mit vielen Strafen – nur für erfahrene Rover!",
    sizeOffset: 0,
    rewardDensity: 0.12,
    punishmentDensity: 0.1,
    obstacleDensity: 0.24,
    goals: 3,
  },
};

const LEARNING_RATE = 0.1;
const DISCOUNT_FACTOR = 0.85;
const STEP_PENALTY = -1;
const REWARD_VALUE = 12;
const PUNISHMENT_VALUE = -15;
const OBSTACLE_PENALTY = -20;
const GOAL_REWARD = 100;
const DEFAULT_TILE_OPTION: TileSizeOption = "m";

type Position = { x: number; y: number };

interface TileState {
  type: TileType;
  qValue: number;
  visits: number;
  value: number;
}

interface PlaygroundState {
  agent: Position;
  goal: Position;
  grid: TileState[][];
  isRunning: boolean;
  episode: number;
  totalReward: number;
}

interface EpisodeStats {
  episode: number;
  steps: number;
  reward: number;
  success: boolean;
}

interface RandomModeState {
  agent: Position;
  goals: Position[];
  grid: TileState[][];
  isRunning: boolean;
  episode: number;
  totalReward: number;
  level: LevelKey;
  currentSteps: number;
  episodeHistory: EpisodeStats[];
  challengeResources: {
    reward: number;
    obstacle: number;
    portal: number;
  };
}

const createEmptyGrid = (size: number): TileState[][] =>
  Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ type: "empty", qValue: 0, visits: 0, value: 0 }))
  );

const cloneGrid = (grid: TileState[][]): TileState[][] =>
  grid.map((row) => row.map((cell) => ({ ...cell })));

const calculateItemCount = (gridSize: number, density: number, minimum = 1) =>
  Math.max(minimum, Math.round(gridSize * gridSize * density));

const getPossibleActions = (grid: TileState[][], pos: Position): Position[] => {
  const actions: Position[] = [];
  const size = grid.length;
  const dirs = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];

  dirs.forEach((dir) => {
    const nx = pos.x + dir.x;
    const ny = pos.y + dir.y;
    if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
      if (grid[ny][nx].type !== "obstacle") {
        actions.push({ x: nx, y: ny });
      }
    }
  });

  if (actions.length === 0) actions.push(pos);
  return actions;
};

const chooseAction = (
  grid: TileState[][],
  pos: Position,
  explorationRate: number,
): Position => {
  const possible = getPossibleActions(grid, pos);
  if (Math.random() < explorationRate) {
    return possible[Math.floor(Math.random() * possible.length)];
  }
  let best = possible[0];
  let bestQ = grid[best.y][best.x].qValue;
  for (let i = 1; i < possible.length; i++) {
    const action = possible[i];
    const q = grid[action.y][action.x].qValue;
    if (q > bestQ) {
      bestQ = q;
      best = action;
    }
  }
  return best;
};

const getTileReward = (grid: TileState[][], goals: Position[], pos: Position): number => {
  if (goals.some((goal) => goal.x === pos.x && goal.y === pos.y)) return GOAL_REWARD;
  const cell = grid[pos.y][pos.x];
  switch (cell.type) {
    case "obstacle":
      return OBSTACLE_PENALTY;
    case "reward":
      return REWARD_VALUE;
    case "punishment":
      return PUNISHMENT_VALUE;
    case "portal":
      return 5;
    default:
      return STEP_PENALTY;
  }
};

const findPortals = (grid: TileState[][]): Position[] => {
  const portals: Position[] = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x].type === "portal") {
        portals.push({ x, y });
      }
    }
  }
  return portals;
};

const teleportThroughPortal = (grid: TileState[][], currentPos: Position): Position => {
  const portals = findPortals(grid);
  if (portals.length < 2) return currentPos;

  // Filter out current portal
  const otherPortals = portals.filter(p => !(p.x === currentPos.x && p.y === currentPos.y));
  if (otherPortals.length === 0) return currentPos;

  // Randomly select a portal
  const targetPortal = otherPortals[Math.floor(Math.random() * otherPortals.length)];
  return targetPortal;
};

const runPlaygroundStep = (state: PlaygroundState, explorationRate: number): PlaygroundState => {
  const current = state.agent;
  let nextPos = chooseAction(state.grid, current, explorationRate);

  // Check for portal teleportation
  if (state.grid[nextPos.y][nextPos.x].type === "portal") {
    nextPos = teleportThroughPortal(state.grid, nextPos);
  }

  const reward = getTileReward(state.grid, [state.goal], nextPos);

  const newGrid = cloneGrid(state.grid);
  const currentCell = newGrid[current.y][current.x];
  const possibleNext = getPossibleActions(newGrid, nextPos);
  const maxNextQ = possibleNext
    .map((p) => newGrid[p.y][p.x].qValue)
    .reduce((acc, val) => (val > acc ? val : acc), Number.NEGATIVE_INFINITY);

  const newQ =
    currentCell.qValue +
    LEARNING_RATE * (reward + DISCOUNT_FACTOR * maxNextQ - currentCell.qValue);

  newGrid[current.y][current.x] = {
    ...currentCell,
    qValue: newQ,
    value: newQ,
    visits: currentCell.visits + 1,
  };

  const reachedGoal = nextPos.x === state.goal.x && nextPos.y === state.goal.y;

  return {
    ...state,
    agent: nextPos,
    grid: newGrid,
    totalReward: state.totalReward + reward,
    isRunning: reachedGoal ? false : state.isRunning,
    episode: reachedGoal ? state.episode + 1 : state.episode,
  };
};

const runRandomModeStep = (state: RandomModeState, explorationRate: number): RandomModeState => {
  const current = state.agent;
  let nextPos = chooseAction(state.grid, current, explorationRate);

  // Check for portal teleportation
  if (state.grid[nextPos.y][nextPos.x].type === "portal") {
    nextPos = teleportThroughPortal(state.grid, nextPos);
  }

  const reward = getTileReward(state.grid, state.goals, nextPos);

  const newGrid = cloneGrid(state.grid);
  const currentCell = newGrid[current.y][current.x];
  const possibleNext = getPossibleActions(newGrid, nextPos);
  const maxNextQ = possibleNext
    .map((p) => newGrid[p.y][p.x].qValue)
    .reduce((acc, val) => (val > acc ? val : acc), Number.NEGATIVE_INFINITY);

  const newQ =
    currentCell.qValue +
    LEARNING_RATE * (reward + DISCOUNT_FACTOR * maxNextQ - currentCell.qValue);

  newGrid[current.y][current.x] = {
    ...currentCell,
    qValue: newQ,
    value: newQ,
    visits: currentCell.visits + 1,
  };

  const reachedGoal = state.goals.some((goal) => goal.x === nextPos.x && goal.y === nextPos.y);
  const newSteps = state.currentSteps + 1;

  // Wenn Ziel erreicht: Episode-Stats speichern und Challenge-Resources auffüllen
  if (reachedGoal) {
    const episodeStat: EpisodeStats = {
      episode: state.episode + 1,
      steps: newSteps,
      reward: state.totalReward + reward,
      success: true,
    };
    const newHistory = [...state.episodeHistory.slice(-19), episodeStat]; // Behalte nur letzte 20

    return {
      ...state,
      agent: nextPos,
      grid: newGrid,
      totalReward: 0, // Reset für neue Episode
      isRunning: false,
      episode: state.episode + 1,
      currentSteps: 0,
      episodeHistory: newHistory,
      challengeResources: {
        reward: 3,
        obstacle: 3,
        portal: 1,
      },
    };
  }

  return {
    ...state,
    agent: nextPos,
    grid: newGrid,
    totalReward: state.totalReward + reward,
    currentSteps: newSteps,
  };
};

const createInitialPlaygroundState = (size: number): PlaygroundState => {
  const safeSize = Math.max(size, 4);
  const agent: Position = { x: Math.min(1, safeSize - 1), y: Math.min(1, safeSize - 1) };
  const goal: Position = { x: Math.max(safeSize - 2, 0), y: Math.max(safeSize - 2, 0) };
  return {
    agent,
    goal,
    grid: createEmptyGrid(safeSize),
    isRunning: false,
    episode: 0,
    totalReward: 0,
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
      return 5;
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

  // Füge zusätzliche Pfade hinzu für mehr Komplexität
  const extraPaths = Math.floor(size * 0.15);
  for (let i = 0; i < extraPaths; i++) {
    const x = randomCoord(size);
    const y = randomCoord(size);
    const key = `${x}-${y}`;
    if (!forbidden.has(key) && grid[y][x].type === "obstacle") {
      grid[y][x] = { type: "empty", qValue: 0, visits: 0, value: 0 };
    }
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

  // Platziere Ziele zuerst
  placeRandomTiles(grid, Math.max(1, level.goals), "goal", forbidden, goals);

  // Für jeden Goal-Position zur forbidden-Liste hinzufügen
  goals.forEach(goal => forbidden.add(`${goal.x}-${goal.y}`));

  // Level 3 ist ein Labyrinth
  if (level.key === "level3") {
    generateMaze(grid, forbidden);

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
        grid[shuffled[0].y][shuffled[0].x] = { type: "portal", qValue: 0, visits: 0, value: 5 };
        grid[shuffled[1].y][shuffled[1].x] = { type: "portal", qValue: 0, visits: 0, value: 5 };
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
    const fallback: Position = {
      x: Math.max(gridSize - 2, 0),
      y: Math.min(1, gridSize - 1),
    };
    goals.push(fallback);
    grid[fallback.y][fallback.x] = {
      type: "goal",
      qValue: 0,
      visits: 0,
      value: levelValue("goal"),
    };
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
    challengeResources: {
      reward: 3,
      obstacle: 3,
      portal: 1,
    },
  };
};

const legendItems: Array<{ label: string; className: string; emoji: string; description: string }> = [
  { label: "Agent", className: "bg-tile-agent", emoji: "🤖", description: "Der lernende Rover – beobachte seine Entscheidungen!" },
  { label: "Ziel", className: "bg-tile-goal", emoji: "🎯", description: "Das Ziel – hier gibt's die größte Belohnung" },
  { label: "Belohnung", className: "bg-tile-reward", emoji: "🍬", description: "Positive Rewards – der Rover mag diese Felder" },
  { label: "Strafe", className: "bg-tile-punishment", emoji: "⚡", description: "Negative Rewards – besser vermeiden" },
  { label: "Hindernis", className: "bg-tile-obstacle", emoji: "🧱", description: "Unpassierbare Wände – hier kommt keiner durch" },
  { label: "Portal", className: "bg-tile-portal", emoji: "🌀", description: "Magisches Portal – teleportiert zu einem anderen Portal!" },
];

type PlaceableTile = "obstacle" | "reward" | "punishment" | "portal";

type ChallengeTile = "reward" | "obstacle" | "portal-pair";

export function RLGame() {
  const placementModeRef = useRef<PlaceableTile>("obstacle");
  const challengeModeRef = useRef<ChallengeTile | null>(null);
  const [mode, setMode] = useState<Mode>("playground");
  const [tileSize, setTileSize] = useState<TileSizeOption>(DEFAULT_TILE_OPTION);
  const [levelKey, setLevelKey] = useState<LevelKey>("level1");
  const [placementMode, setPlacementModeState] = useState<PlaceableTile>("obstacle");
  const [challengeMode, setChallengeModeState] = useState<ChallengeTile | null>(null);
  const [explorationRate, setExplorationRate] = useState(0.2);
  const [showValues, setShowValues] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showPolicyArrows, setShowPolicyArrows] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const baseFieldSize = TILE_SIZE_MAP[tileSize];
  const levelConfig = LEVELS[levelKey];

  const [playgroundState, setPlaygroundState] = useState<PlaygroundState>(() =>
    createInitialPlaygroundState(baseFieldSize)
  );
  const [randomState, setRandomState] = useState<RandomModeState>(() =>
    createRandomModeState(levelConfig, baseFieldSize)
  );

  const gridRef = useRef<HTMLDivElement>(null);

  const changePlacementMode = useCallback((nextMode: PlaceableTile) => {
    placementModeRef.current = nextMode;
    setPlacementModeState(nextMode);
  }, []);

  const changeChallengeMode = useCallback((nextMode: ChallengeTile | null) => {
    challengeModeRef.current = nextMode;
    setChallengeModeState(nextMode);
  }, []);

  useEffect(() => {
    if (mode === "random") {
      gridRef.current?.focus();
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "playground" || !playgroundState.isRunning) return;
    const interval = window.setInterval(() => {
      setPlaygroundState((prev) => runPlaygroundStep(prev, explorationRate));
    }, 220);
    return () => window.clearInterval(interval);
  }, [mode, playgroundState.isRunning, explorationRate]);

  useEffect(() => {
    if (mode !== "random" || !randomState.isRunning) return;
    const interval = window.setInterval(() => {
      setRandomState((prev) => runRandomModeStep(prev, explorationRate));
    }, 220);
    return () => window.clearInterval(interval);
  }, [mode, randomState.isRunning, explorationRate]);

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
        setRandomState((prev) => {
          if ((x === prev.agent.x && y === prev.agent.y) || prev.goals.some(g => g.x === x && g.y === y)) {
            return prev;
          }
          const grid = cloneGrid(prev.grid);

          if (selectedChallenge === "portal-pair") {
            // Finde erstes existierendes unvollständiges Portal oder erstelle neues Paar
            const portals = findPortals(grid);
            const clickedIsPortal = grid[y][x].type === "portal";

            if (clickedIsPortal) {
              // Entferne Portal
              grid[y][x] = { type: "empty", qValue: 0, visits: 0, value: 0 };
            } else {
              // Platziere Portal
              grid[y][x] = { type: "portal", qValue: 0, visits: 0, value: 5 };
            }
          } else {
            // Normale Platzierung für reward/obstacle
            const tileType = selectedChallenge;
            const current = grid[y][x];
            // Beim Dragging immer platzieren, nicht togglen
            const nextType = isDragging ? tileType : (current.type === tileType ? "empty" : tileType);
            grid[y][x] = {
              ...current,
              type: nextType,
              value: levelValue(nextType),
              qValue: nextType === "empty" ? 0 : current.qValue,
              visits: nextType === "empty" ? 0 : current.visits,
            };
          }

          return { ...prev, grid };
        });
      }
    },
    [mode, isDragging]
  );

  const handleMouseDown = useCallback(() => {
    if (mode === "playground" || (mode === "random" && challengeModeRef.current)) {
      setIsDragging(true);
    }
  }, [mode]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  const handlePlaygroundStart = () =>
    setPlaygroundState((prev) => ({ ...prev, isRunning: true }));

  const handlePlaygroundPause = () =>
    setPlaygroundState((prev) => ({ ...prev, isRunning: false }));

  const handlePlaygroundStep = () =>
    setPlaygroundState((prev) => {
      const wasRunning = prev.isRunning;
      const next = runPlaygroundStep({ ...prev, isRunning: true }, explorationRate);
      return { ...next, isRunning: wasRunning };
    });

  const handlePlaygroundReset = useCallback(() => {
    const nextSize = TILE_SIZE_MAP[tileSize];
    setPlaygroundState(createInitialPlaygroundState(nextSize));
  }, [tileSize]);

  const handleTileSizeChange = useCallback(
    (size: TileSizeOption) => {
      if (size === tileSize) return;
      const nextSize = TILE_SIZE_MAP[size];
      setTileSize(size);
      setPlaygroundState(createInitialPlaygroundState(nextSize));
      setRandomState(createRandomModeState(LEVELS[levelKey], nextSize));
    },
    [tileSize, levelKey]
  );

  const handleModeToggle = (checked: boolean) => {
    const targetMode: Mode = checked ? "random" : "playground";
    setMode(targetMode);
    if (targetMode === "random") {
      setRandomState(createRandomModeState(LEVELS[levelKey], baseFieldSize));
    } else {
      setPlaygroundState((prev) => ({ ...prev, isRunning: false }));
    }
  };

  const handleLevelChange = useCallback((value: LevelKey) => {
    setLevelKey(value);
    setRandomState(createRandomModeState(LEVELS[value], baseFieldSize));
  }, [baseFieldSize]);

  const handleRandomStart = () =>
    setRandomState((prev) => ({ ...prev, isRunning: true }));

  const handleRandomPause = () =>
    setRandomState((prev) => ({ ...prev, isRunning: false }));

  const handleRandomStep = () =>
    setRandomState((prev) => {
      const wasRunning = prev.isRunning;
      const next = runRandomModeStep({ ...prev, isRunning: true }, explorationRate);
      return { ...next, isRunning: wasRunning };
    });

  const handleRandomReset = () =>
    setRandomState(createRandomModeState(LEVELS[levelKey], baseFieldSize));

  // Interactive Challenges for Random Mode
  const handleAddRandomReward = useCallback(() => {
    if (mode !== "random") return;
    setRandomState((prev) => {
      const grid = cloneGrid(prev.grid);
      const emptyTiles: Position[] = [];

      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid.length; x++) {
          if (grid[y][x].type === "empty" &&
              !(prev.agent.x === x && prev.agent.y === y) &&
              !prev.goals.some(g => g.x === x && g.y === y)) {
            emptyTiles.push({ x, y });
          }
        }
      }

      if (emptyTiles.length > 0) {
        const pos = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
        grid[pos.y][pos.x] = { type: "reward", qValue: 0, visits: 0, value: REWARD_VALUE };
      }

      return { ...prev, grid };
    });
  }, [mode]);

  const handleAddRandomObstacle = useCallback(() => {
    if (mode !== "random") return;
    setRandomState((prev) => {
      const grid = cloneGrid(prev.grid);
      const emptyTiles: Position[] = [];

      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid.length; x++) {
          if (grid[y][x].type === "empty" &&
              !(prev.agent.x === x && prev.agent.y === y) &&
              !prev.goals.some(g => g.x === x && g.y === y)) {
            emptyTiles.push({ x, y });
          }
        }
      }

      if (emptyTiles.length > 0) {
        const pos = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
        grid[pos.y][pos.x] = { type: "obstacle", qValue: 0, visits: 0, value: OBSTACLE_PENALTY };
      }

      return { ...prev, grid };
    });
  }, [mode]);

  const handleTeleportAgent = useCallback(() => {
    if (mode !== "random") return;
    setRandomState((prev) => {
      const grid = prev.grid;
      const validTiles: Position[] = [];

      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid.length; x++) {
          if (grid[y][x].type !== "obstacle" &&
              !prev.goals.some(g => g.x === x && g.y === y)) {
            validTiles.push({ x, y });
          }
        }
      }

      if (validTiles.length > 0) {
        const newPos = validTiles[Math.floor(Math.random() * validTiles.length)];
        return { ...prev, agent: newPos };
      }

      return prev;
    });
  }, [mode]);

  const handleAddPortalPair = useCallback(() => {
    if (mode !== "random") return;
    setRandomState((prev) => {
      const grid = cloneGrid(prev.grid);
      const emptyTiles: Position[] = [];

      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid.length; x++) {
          if (grid[y][x].type === "empty" &&
              !(prev.agent.x === x && prev.agent.y === y) &&
              !prev.goals.some(g => g.x === x && g.y === y)) {
            emptyTiles.push({ x, y });
          }
        }
      }

      if (emptyTiles.length >= 2) {
        const shuffled = emptyTiles.sort(() => Math.random() - 0.5);
        grid[shuffled[0].y][shuffled[0].x] = { type: "portal", qValue: 0, visits: 0, value: 5 };
        grid[shuffled[1].y][shuffled[1].x] = { type: "portal", qValue: 0, visits: 0, value: 5 };
      }

      return { ...prev, grid };
    });
  }, [mode]);

  const activeGrid = mode === "playground" ? playgroundState.grid : randomState.grid;
  const gridSize = activeGrid.length;
  const tileSizePx = Math.max(24, Math.floor(GRID_PIXEL_TARGET[tileSize] / Math.max(gridSize, 1)));
  const gridPixelDimension = tileSizePx * gridSize;
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
const legend = (
    <div className="mt-3 grid gap-3 text-xs">
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-3 group">
          <span className={cn("legend-dot transition-transform group-hover:scale-110", item.className)} aria-hidden />
          <div className="flex flex-col">
            <span className="font-bold text-foreground">
              {item.emoji} {item.label}
            </span>
            <span className="text-[11px] text-muted-foreground leading-relaxed">{item.description}</span>
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
    <Card className="rounded-3xl border border-border bg-card/95 p-6 shadow-medium hover-lift text-foreground backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h3 className="text-lg font-bold gradient-text">🎲 Zufallsmodus</h3>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Der Rover lernt in zufällig generierten Welten. Beobachte, wie er selbstständig Strategien entwickelt!
          </p>
          <p className="text-xs text-muted-foreground/80">{levelConfig.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            {levelConfig.name}
          </Badge>
          <Badge variant="secondary" className="bg-accent/10 text-accent-foreground border-accent/20">
            {randomGridSize} × {randomGridSize}
          </Badge>
          <Badge variant="secondary">Episode {randomState.episode}</Badge>
          <Badge variant="secondary" className={randomState.totalReward >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}>
            {formatter.format(randomState.totalReward)}
          </Badge>
          <Badge variant="secondary">🍬 {randomRewardCount}</Badge>
          <Badge variant="secondary">⚡ {randomPunishmentCount}</Badge>
          <Badge variant="secondary">🧱 {randomObstacleCount}</Badge>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-[var(--gradient-main)] pb-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-6">
        {/* Hero Section */}
        <div className="rounded-3xl border border-border bg-card/95 p-8 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <Target className="h-8 w-8 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold gradient-text">Reward Rover</h1>
          </div>

          <p className="text-lg text-muted-foreground leading-relaxed mb-6 max-w-4xl">
            Erlebe <strong className="text-foreground gradient-text">Reinforcement Learning</strong> in Aktion!
            Der Rover lernt durch Versuch und Irrtum, welche Entscheidungen zu Belohnungen führen.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="rounded-2xl border border-accent/20 bg-accent/5 p-5 shadow-soft">
              <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                🎯 Exploration vs. Exploitation
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Stell dir vor, du gehst in ein Restaurant: Exploitation bedeutet, <strong className="text-foreground">immer dein Lieblingsgericht</strong> zu bestellen –
                sicher und vertraut. Exploration heißt, <strong className="text-foreground">etwas Neues auszuprobieren</strong> –
                vielleicht entdeckst du etwas noch Besseres! Der Rover muss genau diese Balance finden:
                Nutzt er, was er schon weiß, oder erkundet er neue Wege?
              </p>
            </Card>

            <Card className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-soft">
              <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                🚀 Zwei Modi zum Experimentieren
              </h3>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                <p>
                  <strong className="text-foreground">Playground:</strong> Baue deine eigene Welt!
                  Klicke und ziehe, um Hindernisse, Belohnungen und Strafen zu platzieren.
                </p>
                <p>
                  <strong className="text-foreground">Zufallsmodus:</strong> Lass den Rover in automatisch
                  generierten Labyrinthen lernen – von einfachen Wiesen bis zu komplexen Labyrinthen!
                </p>
              </div>
            </Card>
          </div>
        </div>

        <ControlBar
          mode={mode}
          onModeChange={handleModeToggle}
        />

        {randomHud}

        <div className="grid gap-6 lg:grid-cols-[minmax(280px,340px)_1fr_minmax(280px,340px)]">
          <Card className="flex flex-col gap-4 rounded-3xl border border-border bg-card/95 p-6 shadow-medium hover-lift text-foreground backdrop-blur-sm max-h-[calc(100vh-12rem)] overflow-y-auto">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Gamepad2 className="h-6 w-6 text-primary" />
              <span className="gradient-text">Konsole</span>
            </h2>

            {mode === "playground" ? (
              <PlaygroundControls
                state={playgroundState}
                explorationRate={explorationRate}
                onStart={handlePlaygroundStart}
                onPause={handlePlaygroundPause}
                onStep={handlePlaygroundStep}
                onReset={handlePlaygroundReset}
                placementMode={placementMode}
                onPlacementModeChange={changePlacementMode}
                onExplorationRateChange={setExplorationRate}
                showValues={showValues}
                onShowValuesChange={setShowValues}
              />
            ) : (
              <RandomControls
                state={randomState}
                explorationRate={explorationRate}
                onStart={handleRandomStart}
                onPause={handleRandomPause}
                onStep={handleRandomStep}
                onReset={handleRandomReset}
                onExplorationRateChange={setExplorationRate}
                showValues={showValues}
                onShowValuesChange={setShowValues}
                levelKey={levelKey}
                onLevelChange={handleLevelChange}
                challengeMode={challengeMode}
                onChallengeModeChange={changeChallengeMode}
                onTeleportAgent={handleTeleportAgent}
              />
            )}

            <Card className="rounded-2xl border border-border/50 bg-secondary/30 p-4 shadow-soft">
              <h3 className="text-base font-bold text-foreground mb-3">📚 Legende</h3>
              {legend}
            </Card>

            <Card className="rounded-2xl border border-border/50 bg-secondary/30 p-4 shadow-soft">
              <h3 className="text-base font-bold text-foreground mb-2">💡 So funktioniert's</h3>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
                <li>• <strong className="text-foreground">Playground:</strong> Platziere Hindernisse, Belohnungen und Strafen mit einem Klick</li>
                <li>• <strong className="text-foreground">Start:</strong> Der Rover lernt selbstständig und entwickelt Strategien</li>
                <li>• <strong className="text-foreground">Zufallsmodus:</strong> Automatisch generierte Welten mit steigendem Schwierigkeitsgrad</li>
              </ul>
            </Card>
          </Card>

          <Card className="rounded-3xl border border-border bg-card/95 p-6 shadow-medium hover-lift text-foreground backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold gradient-text">🎮 Playground</h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-help">
                      💡 Tipp: Nutze Step-by-Step
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Mit dem Step-Button siehst du jede Entscheidung des Rovers im Detail</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div
              ref={gridRef}
              tabIndex={0}
              role="application"
              aria-label="Reward Rover Spielfeld"
              className="overflow-auto rounded-2xl border border-border/50 bg-background/80 p-4 shadow-soft focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              style={{
                maxHeight: gridPixelDimension + 40,
                maxWidth: gridPixelDimension + 40,
              }}
              onMouseDown={() => gridRef.current?.focus()}
            >
              <div className="grid gap-0" style={gridStyle}>
                {activeGrid.map((row, y) =>
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
                    const icon = isAgent ? "🤖" : isGoal ? "🎯" : TILE_ICONS[cell.type];
                    const value = cell.qValue;
                    const showValue = showValues && !isAgent && !isGoal && cell.type !== "obstacle";
                    const ariaLabel = `${TYPE_LABEL_MAP[cell.type]} bei Feld (${x + 1}, ${y + 1}), Wert ${formatter.format(value)}${isAgent ? ", Agent" : ""}${isGoal ? ", Ziel" : ""}`;
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
                        onClick={mode === "playground" || (mode === "random" && challengeMode) ? handleTilePlacement : undefined}
                        onMouseDown={mode === "playground" || (mode === "random" && challengeMode) ? handleMouseDown : undefined}
                        onMouseEnter={(mode === "playground" || (mode === "random" && challengeMode)) && isDragging ? () => handleTilePlacement(x, y) : undefined}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </Card>

          <Card className="flex flex-col gap-4 rounded-3xl border border-border bg-card/95 p-6 shadow-medium hover-lift text-foreground backdrop-blur-sm max-h-[calc(100vh-12rem)] overflow-y-auto">
            <h2 className="text-xl font-bold gradient-text">⚙️ Einstellungen</h2>

            <Card className="rounded-2xl border border-border/50 bg-secondary/30 p-4 shadow-soft">
              <h3 className="text-base font-bold text-foreground mb-3">🎯 Q-Werte & Exploration</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-values-settings" className="text-sm font-semibold text-foreground">Q-Werte anzeigen</Label>
                    <Switch
                      id="show-values-settings"
                      checked={showValues}
                      onCheckedChange={setShowValues}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Zeigt die gelernten Werte auf den Feldern an
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-foreground">Exploration Rate</Label>
                    <span className="text-sm font-bold text-primary">{Math.round(explorationRate * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={explorationRate}
                    onChange={(e) => setExplorationRate(e.target.valueAsNumber)}
                    className="input-slider w-full"
                  />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Höhere Werte = mehr Zufall und Entdeckung, niedrigere = nutzt gelernte Strategien
                  </p>
                </div>
              </div>
            </Card>

            <Card className="rounded-2xl border border-border/50 bg-secondary/30 p-4 shadow-soft">
              <h3 className="text-base font-bold text-foreground mb-1">📏 Feld-Größe</h3>
              <p className="text-xs text-muted-foreground mb-3">Bestimmt die Anzahl der Felder im Grid</p>
              <div className="flex flex-col gap-2">
                {(Object.keys(TILE_SIZE_MAP) as TileSizeOption[]).map((sizeKey) => (
                  <Button
                    key={sizeKey}
                    variant={tileSize === sizeKey ? "default" : "outline"}
                    onClick={() => handleTileSizeChange(sizeKey)}
                    className="rounded-lg text-sm font-semibold w-full justify-between px-4"
                  >
                    <span>{TILE_SIZE_LABELS[sizeKey]}</span>
                    <span className="text-xs opacity-70">
                      {TILE_SIZE_MAP[sizeKey]}×{TILE_SIZE_MAP[sizeKey]}
                    </span>
                  </Button>
                ))}
              </div>
            </Card>

            {mode === "random" && (
              <Card className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-soft">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  💡 <strong className="text-foreground">Level-Effekt:</strong> Höhere Level erhöhen die Feldgröße und steigern die Dichte von Hindernissen, Belohnungen und Strafen – eine echte Herausforderung für den Rover!
                </p>
              </Card>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

type PlaygroundControlsProps = {
  state: PlaygroundState;
  explorationRate: number;
  onStart: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  placementMode: PlaceableTile;
  onPlacementModeChange: (type: PlaceableTile) => void;
  onExplorationRateChange: (value: number) => void;
  showValues: boolean;
  onShowValuesChange: (show: boolean) => void;
};

const PlaygroundControls = ({
  state,
  explorationRate,
  onStart,
  onPause,
  onStep,
  onReset,
  placementMode,
  onPlacementModeChange,
  onExplorationRateChange,
  showValues,
  onShowValuesChange,
}: PlaygroundControlsProps) => (
  <div className="space-y-5">
    <div className="flex gap-2">
      <Button className="flex-1 font-semibold" size="lg" onClick={state.isRunning ? onPause : onStart}>
        {state.isRunning ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
        {state.isRunning ? "Pause" : "Start"}
      </Button>
      <Button variant="secondary" size="lg" onClick={onStep} className="font-semibold px-6">
        Step
      </Button>
      <Button variant="outline" size="lg" onClick={onReset} className="px-4">
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>

    <div className="space-y-2">
      <Label className="text-sm font-semibold text-foreground">🎨 Platzierungs-Modus</Label>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={placementMode === "obstacle" ? "default" : "outline"}
          onClick={() => onPlacementModeChange("obstacle")}
          className="text-xs font-semibold"
        >
          🧱 Mauer
        </Button>
        <Button
          variant={placementMode === "reward" ? "default" : "outline"}
          onClick={() => onPlacementModeChange("reward")}
          className="text-xs font-semibold"
        >
          🍬 Bonus
        </Button>
        <Button
          variant={placementMode === "punishment" ? "default" : "outline"}
          onClick={() => onPlacementModeChange("punishment")}
          className="text-xs font-semibold"
        >
          ⚡ Strafe
        </Button>
        <Button
          variant={placementMode === "portal" ? "default" : "outline"}
          onClick={() => onPlacementModeChange("portal")}
          className="text-xs font-semibold"
        >
          🌀 Portal
        </Button>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2">
      <Badge variant="secondary" className="py-2 justify-center text-xs">
        <span className="font-semibold">Episode:</span> {state.episode}
      </Badge>
      <Badge
        variant="secondary"
        className={cn("py-2 justify-center text-xs", state.totalReward >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}
      >
        <span className="font-semibold">Reward:</span> {formatter.format(state.totalReward)}
      </Badge>
    </div>
  </div>
);

type RandomControlsProps = {
  state: RandomModeState;
  explorationRate: number;
  onStart: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  onExplorationRateChange: (value: number) => void;
  showValues: boolean;
  onShowValuesChange: (show: boolean) => void;
  levelKey: LevelKey;
  onLevelChange: (value: LevelKey) => void;
  challengeMode: ChallengeTile | null;
  onChallengeModeChange: (mode: ChallengeTile | null) => void;
  onTeleportAgent: () => void;
};

const RandomControls = ({
  state,
  explorationRate,
  onStart,
  onPause,
  onStep,
  onReset,
  onExplorationRateChange,
  showValues,
  onShowValuesChange,
  levelKey,
  onLevelChange,
  challengeMode,
  onChallengeModeChange,
  onTeleportAgent,
}: RandomControlsProps) => (
  <div className="space-y-5">
    <div className="flex gap-2">
      <Button className="flex-1 font-semibold" size="lg" onClick={state.isRunning ? onPause : onStart}>
        {state.isRunning ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
        {state.isRunning ? "Pause" : "Start"}
      </Button>
      <Button variant="secondary" size="lg" onClick={onStep} className="font-semibold px-6">
        Step
      </Button>
      <Button variant="outline" size="lg" onClick={onReset} className="px-4">
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>

    <div className="space-y-2">
      <Label className="text-sm font-semibold text-foreground">🎮 Level auswählen</Label>
      <div className="flex flex-col gap-2">
        {Object.values(LEVELS).map((level) => (
          <Button
            key={level.key}
            variant={levelKey === level.key ? "default" : "outline"}
            onClick={() => onLevelChange(level.key)}
            className="w-full justify-start text-left h-auto py-3 px-4"
          >
            <div className="flex flex-col items-start gap-1">
              <span className="font-semibold text-sm">{level.name}</span>
              <span className="text-[11px] opacity-70 font-normal">{level.description}</span>
            </div>
          </Button>
        ))}
      </div>
    </div>

    <Card className="rounded-2xl border border-primary/30 bg-primary/10 p-4 shadow-soft">
      <h3 className="text-sm font-bold text-foreground mb-2">⚡ Live-Challenges</h3>
      <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
        Klicke einen Modus und dann ins Feld zum Platzieren!
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={challengeMode === "reward" ? "default" : "outline"}
          size="sm"
          onClick={() => onChallengeModeChange(challengeMode === "reward" ? null : "reward")}
          className="text-xs font-semibold"
        >
          🍬 Belohnung
        </Button>
        <Button
          variant={challengeMode === "obstacle" ? "default" : "outline"}
          size="sm"
          onClick={() => onChallengeModeChange(challengeMode === "obstacle" ? null : "obstacle")}
          className="text-xs font-semibold"
        >
          🧱 Hindernis
        </Button>
        <Button
          variant={challengeMode === "portal-pair" ? "default" : "outline"}
          size="sm"
          onClick={() => onChallengeModeChange(challengeMode === "portal-pair" ? null : "portal-pair")}
          className="text-xs font-semibold"
        >
          🌀 Portale
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onTeleportAgent}
          className="text-xs font-semibold"
        >
          ✨ Beam Rover
        </Button>
      </div>
    </Card>

    <div className="grid grid-cols-2 gap-2">
      <Badge variant="secondary" className="py-2 justify-center text-xs">
        <span className="font-semibold">Episode:</span> {state.episode}
      </Badge>
      <Badge
        variant="secondary"
        className={cn("py-2 justify-center text-xs", state.totalReward >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}
      >
        <span className="font-semibold">Reward:</span> {formatter.format(state.totalReward)}
      </Badge>
    </div>
  </div>
);

type SliderProps = {
  value: number;
  onChange: (value: number) => void;
};

const SliderWithTooltip = ({ value, onChange }: SliderProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={value}
          onChange={(event) => onChange(event.target.valueAsNumber)}
          className="input-slider mt-2"
        />
      </TooltipTrigger>
      <TooltipContent>
        <p>Exploration: {Math.round(value * 100)}%</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

type ControlBarProps = {
  mode: Mode;
  onModeChange: (checked: boolean) => void;
};

const ControlBar = ({
  mode,
  onModeChange,
}: ControlBarProps) => (
  <div className="sticky top-4 z-20 rounded-3xl border border-border bg-card/90 p-4 shadow-medium backdrop-blur-xl text-foreground">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Label htmlFor="mode-toggle" className="text-sm font-semibold">Zufallsmodus aktivieren</Label>
        <Switch
          id="mode-toggle"
          role="switch"
          aria-checked={mode === "random"}
          checked={mode === "random"}
          onCheckedChange={onModeChange}
        />
      </div>
    </div>
  </div>
);
