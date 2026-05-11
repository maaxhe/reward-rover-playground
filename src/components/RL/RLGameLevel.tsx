import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Brain, Target, Gift, Shield, Zap,
  ArrowLeft, Lock, Play, Pause, RotateCcw,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LEVELS } from "./levelConfig";
import { api } from "@/lib/api";
import { Tile, type TileType } from "./Tile";
import type { Position, TileState } from "@/lib/rl/types";
import {
  type QTable,
  chooseAction,
  setQValue,
  getQValue,
  posToActionIndex,
  getMaxQValue,
  getBestActionDirection,
} from "@/lib/rl/qLearning";
import { createEmptyGrid } from "@/lib/rl/gridUtils";
import { teleportThroughPortal } from "@/lib/rl/portalUtils";
import {
  GOAL_REWARD,
  REWARD_VALUE,
  PUNISHMENT_VALUE,
  OBSTACLE_PENALTY,
  STEP_PENALTY,
  TILE_ICONS,
} from "@/lib/rl/constants";

const GRID_PIXEL = 420;

function syncProgress(level: number, episodes: number) {
  const token = localStorage.getItem("rrp_token");
  if (!token) return;
  api
    .updateProgress(token, {
      level,
      episodes,
      freemode_unlocked: localStorage.getItem("rrp_freemode") === "1" ? 1 : 0,
    })
    .catch(() => {});
}

interface GameState {
  agent: Position;
  goal: Position;
  grid: TileState[][];
  qTable: QTable;
  isRunning: boolean;
  sessionEpisodes: number;
  totalReward: number;
  currentSteps: number;
}

function makeInitialState(size: number): GameState {
  return {
    agent: { x: 1, y: 1 },
    goal: { x: size - 2, y: size - 2 },
    grid: createEmptyGrid(size),
    qTable: {},
    isRunning: false,
    sessionEpisodes: 0,
    totalReward: 0,
    currentSteps: 0,
  };
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
  const [placementMode, setPlacementMode] = useState<TileType>("reward");
  const [showValues, setShowValues] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [gameState, setGameState] = useState<GameState>(() =>
    makeInitialState(levelDef.defaultGridSize)
  );

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
      syncProgress(newLevel, episodesEver);
      if (newDef.defaultGridSize !== gridSize) {
        const newSize = newDef.defaultGridSize;
        setGridSize(newSize);
        setGameState(makeInitialState(newSize));
      }
      toast.success(`🎉 Level ${newLevel} freigeschaltet!`, {
        description: `${newDef.emoji} ${newDef.name} – Neu: ${newDef.newFeature}`,
        duration: 6000,
      });
    }
  }, [episodesEver, unlockedLevel, gridSize]);

  const handleReset = useCallback(() => {
    setGameState((prev) => ({ ...makeInitialState(gridSize), qTable: prev.qTable }));
  }, [gridSize]);

  const handleGridSizeChange = useCallback((newSize: number) => {
    setGridSize(newSize);
    setGameState(makeInitialState(newSize));
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
              if (cell.type === "portal") return { ...cell, type: "empty" as TileType, value: 0 };
              const count = prev.grid.flat().filter((c) => c.type === "portal").length;
              if (count >= 2) return cell;
              return { ...cell, type: "portal" as TileType, value: 0 };
            }
            const newType = cell.type === placementMode ? ("empty" as TileType) : placementMode;
            const value =
              newType === "reward"
                ? REWARD_VALUE
                : newType === "punishment"
                ? PUNISHMENT_VALUE
                : 0;
            return { ...cell, type: newType, value };
          })
        );
        return { ...prev, grid: newGrid };
      });
    },
    [placementMode]
  );

  const stepAgent = useCallback(() => {
    if (!gameState.isRunning) return;
    const { agent, goal, grid, qTable } = gameState;

    const nextPos = chooseAction(grid, agent, qTable, explorationRate);

    if (nextPos.x === agent.x && nextPos.y === agent.y) {
      setGameState((prev) => ({
        ...prev,
        totalReward: prev.totalReward + STEP_PENALTY,
        currentSteps: prev.currentSteps + 1,
      }));
      return;
    }

    let finalPos = nextPos;
    if (grid[nextPos.y][nextPos.x].type === "portal") {
      finalPos = teleportThroughPortal(grid, nextPos);
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
        case "obstacle":
          reward = OBSTACLE_PENALTY;
          break;
        default:
          reward = STEP_PENALTY;
      }
    }

    const actionIdx = posToActionIndex(agent, nextPos);
    const currentQ = getQValue(qTable, agent, actionIdx);
    const maxNextQ = getMaxQValue(grid, finalPos, qTable);
    const newQ = currentQ + learningRate * (reward + discountFactor * maxNextQ - currentQ);
    const newQTable = setQValue(qTable, agent, actionIdx, newQ);

    const newGrid = grid.map((row, ry) =>
      row.map((cell, cx) =>
        ry === agent.y && cx === agent.x
          ? { ...cell, visits: cell.visits + 1, qValue: newQ }
          : cell
      )
    );

    setGameState((prev) => ({
      ...prev,
      grid: newGrid,
      qTable: newQTable,
      agent: reachedGoal ? { x: 1, y: 1 } : finalPos,
      totalReward: prev.totalReward + reward,
      isRunning: !reachedGoal,
      currentSteps: prev.currentSteps + 1,
      sessionEpisodes: prev.sessionEpisodes + (reachedGoal ? 1 : 0),
    }));

    if (reachedGoal) {
      setEpisodesEver((prev) => {
        const next = prev + 1;
        localStorage.setItem("rrp_episodes", String(next));
        syncProgress(unlockedLevel, next);
        return next;
      });
    }
  }, [gameState, explorationRate, learningRate, discountFactor, unlockedLevel]);

  useEffect(() => {
    if (!gameState.isRunning) return;
    const interval = setInterval(stepAgent, 200);
    return () => clearInterval(interval);
  }, [gameState.isRunning, stepAgent]);

  const tileSizePx = useMemo(
    () => Math.max(28, Math.floor(GRID_PIXEL / Math.max(gridSize, 1))),
    [gridSize]
  );
  // total pixel width including 1px gaps
  const gridPx = tileSizePx * gridSize + (gridSize - 1);

  const maxVisits = useMemo(
    () =>
      showHeatmap
        ? Math.max(...gameState.grid.flat().map((c) => c.visits), 1)
        : 1,
    [gameState.grid, showHeatmap]
  );

  const prevThreshold = unlockedLevel > 1 ? LEVELS[unlockedLevel - 2].unlockAt : 0;
  const nextThreshold = levelDef.unlockAt;
  const isFinalLevel = nextThreshold === Infinity;
  const progressPercent = isFinalLevel
    ? 100
    : Math.min(
        100,
        ((episodesEver - prevThreshold) / (nextThreshold - prevThreshold)) * 100
      );
  const episodesToNext = isFinalLevel ? 0 : Math.max(0, nextThreshold - episodesEver);

  const anyPlacementUnlocked =
    features.placementReward ||
    features.placementObstacle ||
    features.placementPunishment ||
    features.placementPortal;

  const nextLockInfo = (() => {
    if (isFinalLevel) return null;
    const nextDef = LEVELS[unlockedLevel];
    if (!nextDef) return null;
    return {
      feature: nextDef.newFeature,
      emoji: nextDef.emoji,
      episodes: episodesToNext,
    };
  })();

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
              <span className="text-sm text-muted-foreground">{levelDef.tagline}</span>
              {isFinalLevel && (
                <Badge className="bg-yellow-500 text-black text-xs">Master ✨</Badge>
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

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(220px,1fr)_auto] gap-4 items-start">

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
                    setGameState((prev) => ({ ...prev, isRunning: !prev.isRunning }))
                  }
                  className="flex-1"
                  size="sm"
                >
                  {gameState.isRunning ? (
                    <><Pause className="w-4 h-4 mr-1" />Pause</>
                  ) : (
                    <><Play className="w-4 h-4 mr-1" />Start</>
                  )}
                </Button>
                <Button onClick={handleReset} variant="outline" size="sm">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>

              {features.explorationSlider && (
                <div className="mb-4">
                  <label className="text-xs font-medium mb-2 block">
                    Exploration:{" "}
                    <span className="text-primary">{(explorationRate * 100).toFixed(0)}%</span>
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

              {features.learningRateSlider ? (
                <div className="mb-4">
                  <label className="text-xs font-medium mb-2 block">
                    Lernrate (α):{" "}
                    <span className="text-primary">{learningRate.toFixed(2)}</span>
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
                  episodes={Math.max(0, (LEVELS[3]?.unlockAt ?? 0) - episodesEver)}
                  show={unlockedLevel < 4}
                />
              )}

              {features.gammaSlider ? (
                <div className="mb-4">
                  <label className="text-xs font-medium mb-2 block">
                    Gamma (γ):{" "}
                    <span className="text-primary">{discountFactor.toFixed(2)}</span>
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
                  episodes={Math.max(0, (LEVELS[5]?.unlockAt ?? 0) - episodesEver)}
                  show={unlockedLevel < 6}
                />
              )}

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
                  episodes={Math.max(0, (LEVELS[6]?.unlockAt ?? 0) - episodesEver)}
                  show={unlockedLevel < 7}
                />
              )}
            </div>

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
                      <Gift className="w-3 h-3 mr-1" />Belohnung
                    </Button>
                  )}
                  {features.placementObstacle && (
                    <Button
                      variant={placementMode === "obstacle" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPlacementMode("obstacle")}
                      className="text-xs"
                    >
                      <Shield className="w-3 h-3 mr-1" />Hindernis
                    </Button>
                  )}
                  {features.placementPunishment && (
                    <Button
                      variant={placementMode === "punishment" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPlacementMode("punishment")}
                      className="text-xs"
                    >
                      <Zap className="w-3 h-3 mr-1" />Strafe
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
                  <span className="text-primary font-medium">{nextLockInfo.episodes}</span>{" "}
                  Episode{nextLockInfo.episodes !== 1 ? "n" : ""}
                </div>
              </div>
            )}

            <div className="space-y-2 pt-1 border-t border-white/10">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Visualisierung
              </h4>
              <div className="flex items-center justify-between">
                <Label htmlFor="lv-show-values" className="text-xs text-muted-foreground cursor-pointer">
                  Q-Werte
                </Label>
                <Switch
                  id="lv-show-values"
                  checked={showValues}
                  onCheckedChange={setShowValues}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="lv-show-heatmap" className="text-xs text-muted-foreground cursor-pointer">
                  Heatmap
                </Label>
                <Switch
                  id="lv-show-heatmap"
                  checked={showHeatmap}
                  onCheckedChange={setShowHeatmap}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="lv-show-actions" className="text-xs text-muted-foreground cursor-pointer">
                  Beste Aktion
                </Label>
                <Switch
                  id="lv-show-actions"
                  checked={showActions}
                  onCheckedChange={setShowActions}
                />
              </div>
            </div>

            <div className="space-y-1 pt-1 border-t border-white/10">
              <StatRow label="Session Episoden" value={gameState.sessionEpisodes} />
              <StatRow label="Gesamt Episoden" value={episodesEver} />
              <StatRow label="Schritte" value={gameState.currentSteps} />
              <StatRow label="Reward" value={gameState.totalReward.toFixed(0)} />
            </div>
          </Card>

          {/* Grid Card */}
          <Card className="p-5" style={{ background: "var(--gradient-card)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Target className="w-4 h-4" />
                Umgebung
              </h3>
              {anyPlacementUnlocked && (
                <span className="text-xs text-muted-foreground">
                  Klick zum Platzieren
                </span>
              )}
            </div>

            {/* Grid with smooth agent overlay */}
            <div
              className="relative mx-auto overflow-hidden"
              style={{ width: gridPx, height: gridPx, borderRadius: "8px" }}
            >
              <div
                className="grid bg-tile-bg"
                style={{
                  gridTemplateColumns: `repeat(${gridSize}, ${tileSizePx}px)`,
                  gridTemplateRows: `repeat(${gridSize}, ${tileSizePx}px)`,
                  gap: "1px",
                }}
              >
                {gameState.grid.flatMap((row, y) =>
                  row.map((cell, x) => {
                    const isAgent =
                      gameState.agent.x === x && gameState.agent.y === y;
                    const isGoal =
                      gameState.goal.x === x && gameState.goal.y === y;
                    const tileType: TileType = isGoal ? "goal" : cell.type;
                    const icon = isAgent
                      ? ""
                      : isGoal
                      ? TILE_ICONS.goal
                      : TILE_ICONS[cell.type];
                    const showTileValue =
                      showValues &&
                      !isAgent &&
                      tileType !== "obstacle" &&
                      tileType !== "portal";
                    return (
                      <Tile
                        key={`${x}-${y}`}
                        x={x}
                        y={y}
                        type={tileType}
                        value={cell.qValue}
                        showValues={showTileValue}
                        isAgent={isAgent}
                        isGoal={isGoal}
                        tileSize={tileSizePx}
                        ariaLabel={`${tileType} bei (${x + 1}, ${y + 1})`}
                        icon={icon}
                        visits={cell.visits}
                        showHeatmap={showHeatmap}
                        maxVisits={maxVisits}
                        bestAction={
                          showActions
                            ? getBestActionDirection(
                                gameState.grid,
                                { x, y },
                                gameState.qTable
                              )
                            : undefined
                        }
                        showActions={showActions}
                        onClick={anyPlacementUnlocked ? handleCellClick : undefined}
                      />
                    );
                  })
                )}
              </div>

              {/* Smooth-transition agent overlay */}
              <div
                className="absolute pointer-events-none flex items-center justify-center"
                style={{
                  left: gameState.agent.x * (tileSizePx + 1),
                  top: gameState.agent.y * (tileSizePx + 1),
                  width: tileSizePx,
                  height: tileSizePx,
                  transition: "left 0.18s ease-out, top 0.18s ease-out",
                  fontSize:
                    tileSizePx > 40 ? "2rem" : tileSizePx > 32 ? "1.5rem" : "1.1rem",
                  zIndex: 10,
                }}
                aria-hidden
              >
                🤖
              </div>
            </div>
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
        {label}
        {episodes > 0 && (
          <span className="text-muted-foreground/40"> (noch {episodes} Ep.)</span>
        )}
      </span>
    </div>
  );
}

function StatRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex justify-between text-xs text-muted-foreground">
      <span>{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}
