import { useEffect, useRef, useState } from "react";
import { Tile } from "@/components/RL/Tile";
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
  /** Rover glides to the next tile over this many ms; 0 jumps. Jumps of more than one tile (restarts, portals) never glide. */
  glideMs?: number;
}

/** Read-only board used by the classroom competition (training, host preview, replays). */
export const CompetitionBoard = ({ grid, agent, goal, tileSize, showArrows = false, qTable, label, glideMs = 0 }: CompetitionBoardProps) => {
  const prev = useRef(agent);
  const jumped = Math.abs(prev.current.x - agent.x) + Math.abs(prev.current.y - agent.y) > 1;
  useEffect(() => {
    prev.current = agent;
  }, [agent]);
  return (
  <div
    role="img"
    aria-label={label}
    className="relative inline-grid gap-0 rounded-xl border border-border/50 bg-background/80 p-2 shadow-soft"
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
            type={isGoal ? "goal" : cell.type}
            value={0}
            showValues={false}
            isAgent={isAgent}
            isGoal={isGoal}
            tileSize={tileSize}
            ariaLabel={`${x + 1},${y + 1}`}
            showAgent={glideMs <= 0}
            visits={cell.visits}
            showActions={showArrows}
            bestAction={showArrows && qTable ? getBestActionDirection(grid, { x, y }, qTable) : undefined}
          />
        );
      }),
    )}
    {glideMs > 0 && (
      <div
        className="pointer-events-none absolute left-2 top-2 z-[2] flex items-center justify-center will-change-transform motion-reduce:!transition-none"
        style={{
          width: tileSize,
          height: tileSize,
          transform: `translate(${agent.x * tileSize}px, ${agent.y * tileSize}px)`,
          transition: jumped ? "none" : `transform ${glideMs}ms linear`,
        }}
        aria-hidden
      >
        <span className="rr-rover" />
      </div>
    )}
  </div>
  );
};
