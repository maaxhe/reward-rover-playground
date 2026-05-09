import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type CellType = "empty" | "obstacle" | "reward" | "punishment";
type Position = { x: number; y: number };

interface Cell {
  type: CellType;
  qValue: number;
  visits: number;
}

interface GameState {
  agent: Position;
  goal: Position;
  grid: Cell[][];
  isRunning: boolean;
  episode: number;
  totalReward: number;
  explorationRate: number;
}

const GRID_SIZE = 8;
const LEARNING_RATE = 0.1;
const DISCOUNT_FACTOR = 0.9;
const REWARD_VALUE = 10;
const PUNISHMENT_VALUE = -15;
const OBSTACLE_PENALTY = -5;
const GOAL_REWARD = 100;
const STEP_PENALTY = -1;

const PLACEMENTS: { mode: CellType; emoji: string; label: string }[] = [
  { mode: "obstacle", emoji: "🚫", label: "Hindernis" },
  { mode: "reward", emoji: "💎", label: "Belohnung" },
  { mode: "punishment", emoji: "⚡", label: "Strafe" },
];

function makeGrid(): Cell[][] {
  return Array(GRID_SIZE)
    .fill(null)
    .map(() =>
      Array(GRID_SIZE)
        .fill(null)
        .map(() => ({ type: "empty" as CellType, qValue: 0, visits: 0 }))
    );
}

export function RLGame() {
  const navigate = useNavigate();

  const [gameState, setGameState] = useState<GameState>(() => ({
    agent: { x: 1, y: 1 },
    goal: { x: GRID_SIZE - 2, y: GRID_SIZE - 2 },
    grid: makeGrid(),
    isRunning: false,
    episode: 0,
    totalReward: 0,
    explorationRate: 0.1,
  }));

  const [placementMode, setPlacementMode] = useState<CellType>("obstacle");
  const [moveCount, setMoveCount] = useState(0);
  const [isAgentMoving, setIsAgentMoving] = useState(false);

  const resetGame = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      agent: { x: 1, y: 1 },
      isRunning: false,
      episode: 0,
      totalReward: 0,
      grid: prev.grid.map((row) =>
        row.map((cell) => ({ ...cell, qValue: 0, visits: 0 }))
      ),
    }));
    setMoveCount(0);
  }, []);

  const handleCellClick = useCallback(
    (x: number, y: number) => {
      if (
        (x === gameState.agent.x && y === gameState.agent.y) ||
        (x === gameState.goal.x && y === gameState.goal.y)
      )
        return;
      setGameState((prev) => ({
        ...prev,
        grid: prev.grid.map((row, ry) =>
          row.map((cell, cx) =>
            ry === y && cx === x
              ? {
                  ...cell,
                  type:
                    cell.type === placementMode ? "empty" : placementMode,
                }
              : cell
          )
        ),
      }));
    },
    [gameState.agent, gameState.goal, placementMode]
  );

  const getPossibleActions = (pos: Position): Position[] => {
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
          p.x < GRID_SIZE &&
          p.y >= 0 &&
          p.y < GRID_SIZE &&
          gameState.grid[p.y][p.x].type !== "obstacle"
      );
    return valid.length > 0 ? valid : [pos];
  };

  const chooseAction = (pos: Position): Position => {
    const actions = getPossibleActions(pos);
    if (Math.random() < gameState.explorationRate) {
      return actions[Math.floor(Math.random() * actions.length)];
    }
    return actions.reduce(
      (best, a) =>
        gameState.grid[a.y][a.x].qValue > gameState.grid[best.y][best.x].qValue
          ? a
          : best,
      actions[0]
    );
  };

  const getReward = (pos: Position): number => {
    if (pos.x === gameState.goal.x && pos.y === gameState.goal.y)
      return GOAL_REWARD;
    switch (gameState.grid[pos.y][pos.x].type) {
      case "obstacle":
        return OBSTACLE_PENALTY;
      case "reward":
        return REWARD_VALUE;
      case "punishment":
        return PUNISHMENT_VALUE;
      default:
        return STEP_PENALTY;
    }
  };

  const updateQValue = (pos: Position, reward: number, nextPos: Position) => {
    const currentQ = gameState.grid[pos.y][pos.x].qValue;
    const nextMaxQ = Math.max(
      ...getPossibleActions(nextPos).map(
        (a) => gameState.grid[a.y][a.x].qValue
      )
    );
    const newQ =
      currentQ + LEARNING_RATE * (reward + DISCOUNT_FACTOR * nextMaxQ - currentQ);
    setGameState((prev) => ({
      ...prev,
      grid: prev.grid.map((row, ry) =>
        row.map((cell, cx) =>
          ry === pos.y && cx === pos.x
            ? { ...cell, qValue: newQ, visits: cell.visits + 1 }
            : cell
        )
      ),
    }));
  };

  const stepAgent = useCallback(() => {
    if (!gameState.isRunning) return;
    const cur = gameState.agent;
    const next = chooseAction(cur);

    if (next.x === cur.x && next.y === cur.y) {
      updateQValue(cur, STEP_PENALTY, cur);
      setGameState((prev) => ({
        ...prev,
        totalReward: prev.totalReward + STEP_PENALTY,
      }));
      setMoveCount((m) => m + 1);
      return;
    }

    const reward = getReward(next);
    updateQValue(cur, reward, next);
    setIsAgentMoving(true);
    setTimeout(() => setIsAgentMoving(false), 300);

    setGameState((prev) => ({ ...prev, agent: next, totalReward: prev.totalReward + reward }));
    setMoveCount((m) => m + 1);

    if (next.x === gameState.goal.x && next.y === gameState.goal.y) {
      setGameState((prev) => ({
        ...prev,
        isRunning: false,
        episode: prev.episode + 1,
      }));
    }
  }, [gameState]);

  useEffect(() => {
    if (!gameState.isRunning) return;
    const id = setInterval(stepAgent, 200);
    return () => clearInterval(id);
  }, [gameState.isRunning, stepAgent]);

  const getCellClasses = (x: number, y: number) => {
    const cell = gameState.grid[y][x];
    const isAgent = gameState.agent.x === x && gameState.agent.y === y;
    const isGoal = gameState.goal.x === x && gameState.goal.y === y;

    let cls =
      "w-10 h-10 border border-grid-line transition-all duration-200 cursor-pointer flex items-center justify-center text-sm font-bold";

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
    } else {
      cls += " hover:bg-white/5";
    }

    return cls;
  };

  const getCellStyle = (x: number, y: number): React.CSSProperties => {
    const cell = gameState.grid[y][x];
    if (cell.visits > 0 && cell.type === "empty") {
      const q = Math.max(0, Math.min(1, (cell.qValue + 50) / 100));
      return { backgroundColor: `hsl(235 50% 30% / ${0.08 + q * 0.3})` };
    }
    return {};
  };

  const reward = gameState.totalReward;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--gradient-main)" }}
    >
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Menü
        </Button>

        <span className="text-sm font-semibold text-muted-foreground">
          Free Mode
        </span>

        {/* Live stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
          <span>Ep.&nbsp;{gameState.episode}</span>
          <span className="opacity-30">·</span>
          <span>{moveCount}&nbsp;Schritte</span>
          <span className="opacity-30">·</span>
          <span className={reward >= 0 ? "text-green-400" : "text-red-400"}>
            {reward >= 0 ? "+" : ""}
            {reward.toFixed(0)}
          </span>
        </div>
      </header>

      {/* Center content */}
      <main className="flex-1 flex flex-col items-center justify-center gap-5 px-4 pb-6">

        {/* Legend */}
        <div className="flex items-center gap-5 text-xs text-muted-foreground">
          <Dot color="bg-agent" label="Agent" />
          <Dot color="bg-goal" label="Ziel" />
          <Dot color="bg-obstacle/80" label="Hindernis" />
          <Dot color="bg-reward/80" label="Belohnung" />
          <Dot color="bg-destructive/80" label="Strafe" />
        </div>

        {/* Grid */}
        <div className="rounded-xl overflow-hidden border border-grid-line">
          {gameState.grid.map((row, y) => (
            <div key={y} className="flex">
              {row.map((cell, x) => (
                <div
                  key={`${x}-${y}`}
                  className={getCellClasses(x, y)}
                  style={getCellStyle(x, y)}
                  onClick={() => handleCellClick(x, y)}
                  title={`Q: ${cell.qValue.toFixed(1)} · Besuche: ${cell.visits}`}
                >
                  {gameState.agent.x === x && gameState.agent.y === y && "🤖"}
                  {gameState.goal.x === x && gameState.goal.y === y && "🎯"}
                  {cell.type === "obstacle" && "🚫"}
                  {cell.type === "reward" && "💎"}
                  {cell.type === "punishment" && "⚡"}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Placement hint */}
        <p className="text-xs text-muted-foreground/50">
          Klicke ins Grid um{" "}
          {PLACEMENTS.find((p) => p.mode === placementMode)?.emoji}{" "}
          {PLACEMENTS.find((p) => p.mode === placementMode)?.label}e zu
          platzieren · Dunkle Felder zeigen Q-Werte
        </p>

        {/* Controls bar */}
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm px-6 py-3">
          {/* Play / Reset */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="rounded-xl w-20"
              onClick={() =>
                setGameState((prev) => ({
                  ...prev,
                  isRunning: !prev.isRunning,
                }))
              }
            >
              {gameState.isRunning ? (
                <Pause className="w-4 h-4 mr-1" />
              ) : (
                <Play className="w-4 h-4 mr-1" />
              )}
              {gameState.isRunning ? "Pause" : "Start"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={resetGame}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-white/15" />

          {/* Exploration slider */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Explore{" "}
              <span className="text-foreground font-medium">
                {(gameState.explorationRate * 100).toFixed(0)}%
              </span>
            </span>
            <Slider
              value={[gameState.explorationRate]}
              onValueChange={([v]) =>
                setGameState((prev) => ({ ...prev, explorationRate: v }))
              }
              min={0}
              max={1}
              step={0.01}
              className="w-28"
            />
          </div>

          <div className="h-6 w-px bg-white/15" />

          {/* Placement toggle */}
          <div className="flex items-center gap-1">
            {PLACEMENTS.map((item) => (
              <button
                key={item.mode}
                onClick={() => setPlacementMode(item.mode)}
                title={item.label}
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all",
                  placementMode === item.mode
                    ? "bg-primary/20 ring-1 ring-primary"
                    : "hover:bg-white/10 opacity-50 hover:opacity-100"
                )}
              >
                {item.emoji}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function Dot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2.5 h-2.5 rounded-sm ${color}`} />
      <span>{label}</span>
    </div>
  );
}
