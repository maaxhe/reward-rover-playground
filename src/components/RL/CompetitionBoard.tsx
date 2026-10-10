import { useEffect, useState } from "react";
import { Tile } from "@/components/RL/Tile";
import { TILE_ICONS } from "@/lib/rl/constants";
import { getBestActionDirection, type QTable } from "@/lib/rl/qLearning";
import type { Position, TileState } from "@/lib/rl/types";

/** Tile size that fits the viewport: 8 columns, never wider than `max`. */
export const useTileSize = (columns: number, max = 52, reserved = 56) => {
  const compute = () =>
    typeof window === "undefined" ? max : Math.max(24, Math.min(max, Math.floor((window.innerWidth - reserved) / columns)));
  const [size, setSize] = useState(compute);
  useEffect(() => {
    const onResize = () => setSize(compute());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, max, reserved]);
  return size;
};

interface CompetitionBoardProps {
  grid: TileState[][];
  agent: Position;
  goal: Position;
  tileSize: number;
  showArrows?: boolean;
  qTable?: QTable;
  label: string;
}

/** Read-only board used by the classroom competition (training, host preview, replays). */
export const CompetitionBoard = ({ grid, agent, goal, tileSize, showArrows = false, qTable, label }: CompetitionBoardProps) => (
  <div
    role="img"
    aria-label={label}
    className="inline-grid gap-0 rounded-xl border border-border/50 bg-background/80 p-2 shadow-soft"
    style={{ gridTemplateColumns: `repeat(${grid.length}, ${tileSize}px)` }}
  >
    {grid.map((row, y) =>
      row.map((cell, x) => {
        const isAgent = agent.x === x && agent.y === y;
        const isGoal = goal.x === x && goal.y === y;
        return (
          <Tile
            key={`${x}-${y}`}
            x={x}
            y={y}
            type={isGoal ? "goal" : isAgent ? "empty" : cell.type}
            value={0}
            showValues={false}
            isAgent={isAgent}
            isGoal={isGoal}
            tileSize={tileSize}
            ariaLabel={`${x + 1},${y + 1}`}
            icon={isAgent ? "🤖" : isGoal ? TILE_ICONS.goal : TILE_ICONS[cell.type]}
            showActions={showArrows}
            bestAction={showArrows && qTable ? getBestActionDirection(grid, { x, y }, qTable) : undefined}
          />
        );
      }),
    )}
  </div>
);
