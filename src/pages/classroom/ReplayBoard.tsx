import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CompetitionBoard, useTileSize } from "@/components/RL/CompetitionBoard";
import { worldToState, type CompetitionWorld } from "@/lib/competition/world";
import type { Replay } from "@/lib/competition/api";
import { ParamTimeline } from "./ParamTimeline";

/** Plays a submitted test run step by step; eaten rewards/punishments disappear as the rover passes. */
interface ReplayBoardProps {
  world: CompetitionWorld;
  replay: Replay;
  /** Fixed tile size (beamer tiles); otherwise it follows the screen width. */
  tileSize?: number;
  /** Start over after a short pause instead of stopping at the end. */
  loop?: boolean;
  /** One-line title, no replay button and no parameter chart. */
  compact?: boolean;
}

export const ReplayBoard = ({ world, replay, tileSize: fixedTileSize, loop = false, compact = false }: ReplayBoardProps) => {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const responsiveTileSize = useTileSize(world.size, 44);
  const tileSize = fixedTileSize ?? responsiveTileSize;

  useEffect(() => {
    setIndex(0);
    setPlaying(true);
  }, [replay]);

  useEffect(() => {
    if (!playing) return;
    if (index >= replay.path.length - 1) {
      if (!loop) {
        setPlaying(false);
        return;
      }
      const restart = setTimeout(() => setIndex(0), 1800);
      return () => clearTimeout(restart);
    }
    const id = setTimeout(() => setIndex((i) => i + 1), 280);
    return () => clearTimeout(id);
  }, [playing, index, replay.path.length, loop]);

  const grid = useMemo(() => {
    const g = worldToState(world).grid;
    for (let i = 1; i <= index; i += 1) {
      const p = replay.path[i];
      const cell = g[p.y][p.x];
      if (cell.type === "reward" || cell.type === "punishment") g[p.y][p.x] = { ...cell, type: "empty", value: 0 };
    }
    return g;
  }, [world, replay, index]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className={compact ? "truncate text-xl font-bold" : "text-lg font-bold"}>
          {replay.name} · {replay.totalReward} Pkt {replay.reachedGoal ? `· 🎯 ${replay.steps} Schritte` : "· Ziel nicht erreicht"}
        </h3>
        {!compact && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIndex(0);
              setPlaying(true);
            }}
          >
            ↻ Nochmal
          </Button>
        )}
      </div>
      <CompetitionBoard
        grid={grid}
        agent={replay.path[index]}
        goal={world.goal}
        tileSize={tileSize}
        label={`Replay ${replay.name}`}
      />
      {!compact && replay.paramLog && replay.paramLog.length > 0 && (
        <div className="space-y-1 rounded-lg border border-border/40 bg-card/60 p-3">
          <h4 className="text-sm font-semibold">So hat {replay.name} die Regler benutzt</h4>
          <ParamTimeline log={replay.paramLog} />
          <p className="text-xs text-muted-foreground">Nur zur Info und fürs Gespräch danach – zählt nicht für die Wertung.</p>
        </div>
      )}
    </div>
  );
};
