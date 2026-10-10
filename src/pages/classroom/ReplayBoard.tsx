import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CompetitionBoard, useTileSize } from "@/components/RL/CompetitionBoard";
import { worldToState, type CompetitionWorld } from "@/lib/competition/world";
import type { Replay } from "@/lib/competition/api";

/** Plays a submitted test run step by step; eaten rewards/punishments disappear as the rover passes. */
export const ReplayBoard = ({ world, replay }: { world: CompetitionWorld; replay: Replay }) => {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const tileSize = useTileSize(world.size, 44);

  useEffect(() => {
    setIndex(0);
    setPlaying(true);
  }, [replay]);

  useEffect(() => {
    if (!playing) return;
    if (index >= replay.path.length - 1) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setIndex((i) => i + 1), 280);
    return () => clearTimeout(id);
  }, [playing, index, replay.path.length]);

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
        <h3 className="text-lg font-bold">
          {replay.name} · {replay.totalReward} Pkt {replay.reachedGoal ? `· 🎯 ${replay.steps} Schritte` : "· Ziel nicht erreicht"}
        </h3>
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
      </div>
      <CompetitionBoard
        grid={grid}
        agent={replay.path[index]}
        goal={world.goal}
        tileSize={tileSize}
        label={`Replay ${replay.name}`}
      />
    </div>
  );
};
