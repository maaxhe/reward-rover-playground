import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Play, Pause, RotateCcw, Brain, Target,
  Shield, Gift, Zap, ArrowLeft, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { LEVELS } from "./levelConfig";

type CellType = "empty" | "obstacle" | "reward" | "punishment" | "portal";

interface Cell {
  type: CellType;
  qValue: number;
  visits: number;
}

interface Position {
  x: number;
  y: number;
}

interface GameState {
  agent: Position;
  goal: Position;
  grid: Cell[][];
  isRunning: boolean;
  sessionEpisodes: number;
  totalReward: number;
}

const REWARD_VALUE = 10;
const PUNISHMENT_VALUE = -15;
const GOAL_REWARD = 100;
const STEP_PENALTY = -1;

function makeGrid(size: number): Cell[][] {
  return Array(size)
    .fill(null)
    .map(() =>
      Array(size)
        .fill(null)
        .map(() => ({ type: "empty" as CellType, qValue: 0, visits: 0 }))
    );
}

function makeInitialState(size: number): GameState {
  return {
    agent: { x: 1, y: 1 },
    goal: { x: size - 2, y: size - 2 },
    grid: makeGrid(size),
    isRunning: false,
    sessionEpisodes: 0,
    totalReward: 0,
  };
}

function getActions(pos: Position, grid: Cell[][], size: number): Position[] {
  const dirs = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];
  const valid = dirs
    .map((d) => ({ x: pos.x + d.x, y: pos.y + d.y }))
    .filter(
      (p) =>
        p.x >= 0 &&
        p.x < size &&
        p.y >= 0 &&
        p.y < size &&
        grid[p.y][p.x].type !== "obstacle"
    );
  return valid.length > 0 ? valid : [pos];
}

function portalPartner(pos: Position, grid: Cell[][]): Position | null {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x].type === "portal" && !(x === pos.x && y === pos.y)) {
        return { x, y };
      }
    }
  }
  return null;
}

export function RLGameLevel() {
  const navigate = useNavigate();

  const [unlockedLevel, setUnlockedLevel] = useState(() =>
    parseInt(localStorage.getItem("rrp_level") || "1", 10)
  );
  const [episodesEver, setEpisodesEver] = useState(() =>
    parseInt(localStorage.getItem("rrp_episodes") || "0", 10)
  );
  const prevEpisodesRef = useRef(episodesEver);

  const levelDef = LEVELS[Math.min(unlockedLevel - 1, LEVELS.length - 1)];
  const { features } = levelDef;

  const [explorationRate, setExplorationRate] = useState(0.3);
  const [learningRate, setLearningRate] = useState(0.1);
  const [discountFactor, setDiscountFactor] = useState(0.9);
  const [gridSize, setGridSize] = useState(levelDef.defaultGridSize);

  const [gameState, setGameState] = useState<GameState>(() =>
    makeInitialState(levelDef.defaultGridSize)
  );
  const [placementMode, setPlacementMode] = useState<CellType>("reward");
  const [moveCount, setMoveCount] = useState(0);
  const [isAgentMoving, setIsAgentMoving] = useState(false);

  // Level-up detection
  useEffect(() => {
    if (episodesEver === prevEpisodesRef.current) return;
    prevEpisodesRef.current = episodesEver;

    if (unlockedLevel >= LEVELS.length) return;
    const currentDef = LEVELS[unlockedLevel - 1];
    if (episodesEver >= currentDef.unlockAt) {
      const newLevel = unlockedLevel + 1;
      const newDef = LEVELS[newLevel - 1];
      setUnlockedLevel(newLevel);
      localStorage.setItem("rrp_level", String(newLevel));

      if (newDef.defaultGridSize !== gridSize) {
        const newSize = newDef.defaultGridSize;
        setGridSize(newSize);
        setGameState(makeInitialState(newSize));
        setMoveCount(0);
      }

      toast.success(`🎉 Level ${newLevel} freigeschaltet!`, {
        description: `${newDef.emoji} ${newDef.name} – Neu: ${newDef.newFeature}`,
        duration: 6000,
      });
    }
  }, [episodesEver, unlockedLevel, gridSize]);

  const handleReset = useCallback(() => {
    setGameState(makeInitialState(gridSize));
    setMoveCount(0);
  }, [gridSize]);

  const handleGridSizeChange = useCallback((newSize: number) => {
    setGridSize(newSize);
    setGameState(makeInitialState(newSize));
    setMoveCount(0);
  }, []);

  const handleCellClick = useCallback(
    (x: number, y: number) => {
      setGameState((prev) => {
        if (
          (x === prev.agent.x && y === prev.agent.y) ||
          (x === prev.goal.x && y === prev.goal.y)
        )
          return prev;

        const newGrid = prev.grid.map((row, ry) =>
          row.map((cell, cx) => {
            if (ry !== y || cx !== x) return cell;
            if (placementMode === "portal") {
              if (cell.type === "portal")
                return { ...cell, type: "empty" as CellType };
              const count = prev.grid
                .flat()
                .filter((c) => c.type === "portal").length;
              if (count >= 2) return cell;
              return { ...cell, type: "portal" as CellType };
            }
            return {
              ...cell,
              type:
                cell.type === placementMode
                  ? ("empty" as CellType)
                  : placementMode,
            };
          })
        );
        return { ...prev, grid: newGrid };
      });
    },
    [placementMode]
  );

  const stepAgent = useCallback(() => {
    if (!gameState.isRunning) return;

    const { agent, goal, grid } = gameState;
    const actions = getActions(agent, grid, gridSize);

    let nextPos: Position;
    if (Math.random() < explorationRate) {
      nextPos = actions[Math.floor(Math.random() * actions.length)];
    } else {
      nextPos = actions.reduce((best, a) =>
        grid[a.y][a.x].qValue > grid[best.y][best.x].qValue ? a : best
      , actions[0]);
    }

    const stuck = nextPos.x === agent.x && nextPos.y === agent.y;
    if (stuck) {
      setGameState((prev) => ({
        ...prev,
        totalReward: prev.totalReward + STEP_PENALTY,
      }));
      setMoveCount((m) => m + 1);
      return;
    }

    // Portal teleportation
    let finalPos = nextPos;
    if (grid[nextPos.y][nextPos.x].type === "portal") {
      const partner = portalPartner(nextPos, grid);
      if (partner) finalPos = partner;
    }

    const reachedGoal = finalPos.x === goal.x && finalPos.y === goal.y;

    let reward: number;
    if (reachedGoal) {
      reward = GOAL_REWARD;
    } else {
      switch (grid[finalPos.y][finalPos.x].type) {
        case "reward":
          reward = REWARD_VALUE;
          break;
        case "punishment":
          reward = PUNISHMENT_VALUE;
          break;
        default:
          reward = STEP_PENALTY;
      }
    }

    // Q-learning update
    const currentQ = grid[agent.y][agent.x].qValue;
    const nextActions = getActions(finalPos, grid, gridSize);
    const nextMaxQ = Math.max(...nextActions.map((a) => grid[a.y][a.x].qValue));
    const newQ =
      currentQ + learningRate * (reward + discountFactor * nextMaxQ - currentQ);

    setIsAgentMoving(true);
    setTimeout(() => setIsAgentMoving(false), 200);
    setMoveCount((m) => m + 1);

    setGameState((prev) => {
      const newGrid = prev.grid.map((row, ry) =>
        row.map((cell, cx) =>
          ry === agent.y && cx === agent.x
            ? { ...cell, qValue: newQ, visits: cell.visits + 1 }
            : cell
        )
      );
      return {
        ...prev,
        grid: newGrid,
        agent: reachedGoal ? { x: 1, y: 1 } : finalPos,
        totalReward: prev.totalReward + reward,
        isRunning: !reachedGoal,
        sessionEpisodes: prev.sessionEpisodes + (reachedGoal ? 1 : 0),
      };
    });

    if (reachedGoal) {
      setEpisodesEver((prev) => {
        const next = prev + 1;
        localStorage.setItem("rrp_episodes", String(next));
        return next;
      });
    }
  }, [gameState, gridSize, explorationRate, learningRate, discountFactor]);

  useEffect(() => {
    if (!gameState.isRunning) return;
    const interval = setInterval(stepAgent, 200);
    return () => clearInterval(interval);
  }, [gameState.isRunning, stepAgent]);

  // Progress bar calculation
  const prevThreshold =
    unlockedLevel > 1 ? LEVELS[unlockedLevel - 2].unlockAt : 0;
  const nextThreshold = levelDef.unlockAt;
  const isFinalLevel = nextThreshold === Infinity;
  const progressPercent = isFinalLevel
    ? 100
    : Math.min(
        100,
        ((episodesEver - prevThreshold) / (nextThreshold - prevThreshold)) *
          100
      );
  const episodesToNext = isFinalLevel
    ? 0
    : Math.max(0, nextThreshold - episodesEver);

  // Which placement tools should be visible
  const anyPlacementUnlocked =
    features.placementReward ||
    features.placementObstacle ||
    features.placementPunishment ||
    features.placementPortal;

  // Next locked feature info
  const nextLockInfo = (() => {
    if (isFinalLevel) return null;
    const nextDef = LEVELS[unlockedLevel]; // index of next level (0-based = unlockedLevel)
    if (!nextDef) return null;
    return {
      feature: nextDef.newFeature,
      level: nextDef.level,
      emoji: nextDef.emoji,
      episodes: episodesToNext,
    };
  })();

  const getCellStyle = (x: number, y: number): React.CSSProperties => {
    const cell = gameState.grid[y][x];
    if (cell.visits > 0 && cell.type === "empty") {
      const qNorm = Math.max(0, Math.min(1, (cell.qValue + 50) / 100));
      return { backgroundColor: `hsl(235 50% 30% / ${0.1 + qNorm * 0.35})` };
    }
    return {};
  };

  const getCellClasses = (x: number, y: number) => {
    const cell = gameState.grid[y][x];
    const isAgent =
      gameState.agent.x === x && gameState.agent.y === y;
    const isGoal = gameState.goal.x === x && gameState.goal.y === y;

    let cls =
      "border border-grid-line transition-all duration-200 cursor-pointer flex items-center justify-center text-sm font-bold";

    if (isAgent) {
      cls += " bg-agent text-primary-foreground animate-glow";
      if (isAgentMoving) cls += " animate-agent-move";
    } else if (isGoal) {
      cls += " bg-goal text-primary-foreground";
    } else if (cell.type === "obstacle") {
      cls += " bg-obstacle/80";
    } else if (cell.type === "reward") {
      cls += " bg-reward/80";
    } else if (cell.type === "punishment") {
      cls += " bg-destructive/80";
    } else if (cell.type === "portal") {
      cls += " bg-orange-500/80";
    } else {
      cls += " hover:bg-white/5";
    }

    return cls;
  };

  const cellSize = gridSize <= 6 ? "w-10 h-10" : gridSize <= 8 ? "w-8 h-8" : "w-6 h-6";

  return (
    <div className="min-h-screen p-4" style={{ background: "var(--gradient-main)" }}>
      <div className="max-w-6xl mx-auto space-y-4">

        {/* Level header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Menü
          </Button>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{levelDef.emoji}</span>
              <span className="font-bold text-lg">
                Level {levelDef.level} – {levelDef.name}
              </span>
              <span className="text-sm text-muted-foreground">
                {levelDef.tagline}
              </span>
              {isFinalLevel && (
                <Badge className="bg-yellow-500 text-black text-xs">
                  Master ✨
                </Badge>
              )}
            </div>

            {!isFinalLevel && (
              <div className="flex items-center gap-3">
                <Progress value={progressPercent} className="flex-1 h-2" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {episodesEver}/{nextThreshold} Ep. → Level {unlockedLevel + 1}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Controls Panel */}
          <Card className="p-5 space-y-5" style={{ background: "var(--gradient-card)" }}>
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Steuerung
              </h3>

              <div className="flex gap-2 mb-4">
                <Button
                  onClick={() =>
                    setGameState((prev) => ({
                      ...prev,
                      isRunning: !prev.isRunning,
                    }))
                  }
                  className="flex-1"
                  size="sm"
                >
                  {gameState.isRunning ? (
                    <Pause className="w-4 h-4 mr-1" />
                  ) : (
                    <Play className="w-4 h-4 mr-1" />
                  )}
                  {gameState.isRunning ? "Pause" : "Start"}
                </Button>
                <Button onClick={handleReset} variant="outline" size="sm">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>

              {/* Exploration slider — always visible in level mode */}
              {features.explorationSlider && (
                <div className="mb-4">
                  <label className="text-xs font-medium mb-2 block">
                    Exploration:{" "}
                    <span className="text-primary">
                      {(explorationRate * 100).toFixed(0)}%
                    </span>
                  </label>
                  <Slider
                    value={[explorationRate]}
                    onValueChange={([v]) => setExplorationRate(v)}
                    min={0}
                    max={1}
                    step={0.01}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Exploit</span>
                    <span>Explore</span>
                  </div>
                </div>
              )}

              {/* Learning rate — unlocked at level 4 */}
              {features.learningRateSlider ? (
                <div className="mb-4">
                  <label className="text-xs font-medium mb-2 block">
                    Lernrate (α):{" "}
                    <span className="text-primary">
                      {learningRate.toFixed(2)}
                    </span>
                  </label>
                  <Slider
                    value={[learningRate]}
                    onValueChange={([v]) => setLearningRate(v)}
                    min={0.01}
                    max={1}
                    step={0.01}
                  />
                </div>
              ) : (
                <LockedFeature
                  label="Lernrate (α)"
                  episodes={
                    levelDef.unlockAt > 0
                      ? Math.max(0, LEVELS[3]?.unlockAt - episodesEver)
                      : 0
                  }
                  show={unlockedLevel < 4}
                />
              )}

              {/* Gamma — unlocked at level 6 */}
              {features.gammaSlider ? (
                <div className="mb-4">
                  <label className="text-xs font-medium mb-2 block">
                    Gamma (γ):{" "}
                    <span className="text-primary">
                      {discountFactor.toFixed(2)}
                    </span>
                  </label>
                  <Slider
                    value={[discountFactor]}
                    onValueChange={([v]) => setDiscountFactor(v)}
                    min={0.1}
                    max={0.99}
                    step={0.01}
                  />
                </div>
              ) : (
                <LockedFeature
                  label="Gamma (γ)"
                  episodes={Math.max(0, LEVELS[5]?.unlockAt - episodesEver)}
                  show={unlockedLevel < 6}
                />
              )}

              {/* Grid size — unlocked at level 7 */}
              {features.gridSizeControl ? (
                <div className="mb-4">
                  <label className="text-xs font-medium mb-2 block">
                    Grid-Größe:{" "}
                    <span className="text-primary">{gridSize}×{gridSize}</span>
                  </label>
                  <Slider
                    value={[gridSize]}
                    onValueChange={([v]) => handleGridSizeChange(v)}
                    min={6}
                    max={12}
                    step={1}
                  />
                </div>
              ) : (
                <LockedFeature
                  label="Grid-Größe"
                  episodes={Math.max(0, LEVELS[6]?.unlockAt - episodesEver)}
                  show={unlockedLevel < 7}
                />
              )}
            </div>

            {/* Placement tools */}
            {anyPlacementUnlocked && (
              <div>
                <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                  Platzieren
                </h4>
                <div className="flex flex-wrap gap-2">
                  {features.placementReward && (
                    <Button
                      variant={placementMode === "reward" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPlacementMode("reward")}
                      className="text-xs"
                    >
                      <Gift className="w-3 h-3 mr-1" />
                      Belohnung
                    </Button>
                  )}
                  {features.placementObstacle && (
                    <Button
                      variant={placementMode === "obstacle" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPlacementMode("obstacle")}
                      className="text-xs"
                    >
                      <Shield className="w-3 h-3 mr-1" />
                      Hindernis
                    </Button>
                  )}
                  {features.placementPunishment && (
                    <Button
                      variant={placementMode === "punishment" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPlacementMode("punishment")}
                      className="text-xs"
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      Strafe
                    </Button>
                  )}
                  {features.placementPortal && (
                    <Button
                      variant={placementMode === "portal" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPlacementMode("portal")}
                      className="text-xs"
                    >
                      🌀 Portal
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Next unlock hint */}
            {nextLockInfo && (
              <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="w-3 h-3" />
                  <span>
                    Nächstes Level:{" "}
                    <span className="text-foreground font-medium">
                      {nextLockInfo.emoji} {nextLockInfo.feature}
                    </span>
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Noch{" "}
                  <span className="text-primary font-medium">
                    {nextLockInfo.episodes}
                  </span>{" "}
                  Episode{nextLockInfo.episodes !== 1 ? "n" : ""}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="space-y-1 pt-1 border-t border-white/10">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Session Episoden</span>
                <span className="text-foreground font-medium">
                  {gameState.sessionEpisodes}
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Gesamt Episoden</span>
                <span className="text-foreground font-medium">{episodesEver}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Schritte</span>
                <span className="text-foreground font-medium">{moveCount}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Reward</span>
                <span className="text-foreground font-medium">
                  {gameState.totalReward.toFixed(0)}
                </span>
              </div>
            </div>
          </Card>

          {/* Grid */}
          <Card
            className="p-5 lg:col-span-2"
            style={{ background: "var(--gradient-card)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Target className="w-4 h-4" />
                Umgebung
              </h3>
              <div className="flex flex-wrap gap-2 text-xs">
                <LegendDot color="bg-agent" label="Agent" />
                <LegendDot color="bg-goal" label="Ziel" />
                {features.placementObstacle && (
                  <LegendDot color="bg-obstacle/80" label="Hindernis" />
                )}
                {features.placementReward && (
                  <LegendDot color="bg-reward/80" label="Belohnung" />
                )}
                {features.placementPunishment && (
                  <LegendDot color="bg-destructive/80" label="Strafe" />
                )}
                {features.placementPortal && (
                  <LegendDot color="bg-orange-500/80" label="Portal" />
                )}
              </div>
            </div>

            <div className="inline-block border border-grid-line rounded-lg overflow-hidden">
              {gameState.grid.map((row, y) => (
                <div key={y} className="flex">
                  {row.map((cell, x) => (
                    <div
                      key={`${x}-${y}`}
                      className={`${getCellClasses(x, y)} ${cellSize}`}
                      style={getCellStyle(x, y)}
                      onClick={() => handleCellClick(x, y)}
                      title={`Q: ${cell.qValue.toFixed(1)}, Besuche: ${cell.visits}`}
                    >
                      {gameState.agent.x === x && gameState.agent.y === y && "🤖"}
                      {gameState.goal.x === x && gameState.goal.y === y && "🎯"}
                      {cell.type === "obstacle" && "🚫"}
                      {cell.type === "reward" && "💎"}
                      {cell.type === "punishment" && "⚡"}
                      {cell.type === "portal" && "🌀"}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {anyPlacementUnlocked && (
              <p className="text-xs text-muted-foreground mt-3">
                Klicke auf Felder um{" "}
                {placementMode === "obstacle"
                  ? "Hindernisse"
                  : placementMode === "reward"
                  ? "Belohnungen"
                  : placementMode === "punishment"
                  ? "Strafen"
                  : "Portale"}{" "}
                zu platzieren. Dunkle Felder zeigen gelernte Q-Werte.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function LockedFeature({
  label,
  episodes,
  show,
}: {
  label: string;
  episodes: number;
  show: boolean;
}) {
  if (!show) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground/60 mb-3 py-1">
      <Lock className="w-3 h-3 flex-shrink-0" />
      <span>
        {label}{" "}
        {episodes > 0 && (
          <span className="text-muted-foreground/40">
            (noch {episodes} Ep.)
          </span>
        )}
      </span>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`w-2.5 h-2.5 rounded ${color}`} />
      <span>{label}</span>
    </div>
  );
}
