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
          {replay.name} · {replay.totalReward} Pkt {replay.reachedGoal ? `· 🎯 ${replay.steps} Schritte` : `· ⏱ Zeitlimit nach ${replay.steps} Schritten`}
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
          <ParamSummary log={replay.paramLog} />
          <ParamTimeline log={replay.paramLog} />
          <p className="text-xs text-muted-foreground">Nur zur Info und fürs Gespräch danach – zählt nicht für die Wertung.</p>
        </div>
      )}
    </div>
  );
};

const PARAM_ROWS = [
  { key: 1, label: "ε Neugier" },
  { key: 2, label: "α Lernrate" },
  { key: 3, label: "γ Weitsicht" },
] as const;

/** Start, end and range of each learning setting, so the settings can be read off without decoding the chart. */
const ParamSummary = ({ log }: { log: NonNullable<Replay["paramLog"]> }) => {
  const fmt = (v: number) => v.toFixed(2).replace(/\.?0+$/, "");
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      {PARAM_ROWS.map(({ key, label }) => {
        const values = log.map((entry) => entry[key]);
        return (
          <div key={key} className="rounded-md bg-secondary/50 p-2">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="font-semibold tabular-nums">
              {fmt(values[0])} → {fmt(values[values.length - 1])}
            </div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {fmt(Math.min(...values))}–{fmt(Math.max(...values))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
