import { useEffect, useMemo, useState } from "react";
import { useTileSize } from "@/components/RL/CompetitionBoard";
import { Tile } from "@/components/RL/Tile";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { worldToState, type CompetitionWorld } from "@/lib/competition/world";
import {
  afterCandyValues,
  greedyDirection,
  greedyPath,
  maxChange,
  sweepValues,
  zeroValues,
  type ValueMap,
} from "@/lib/rl/valueIteration";
import { ARROWS, formatPlanned, valueTint } from "@/components/RL/valueTint";

/** A wall in the middle and a trap on the short way: the goal's value has to travel around both. */
const PLAN_WORLD: CompetitionWorld = {
  size: 7,
  agent: { x: 0, y: 6 },
  goal: { x: 6, y: 0 },
  tiles: [
    { x: 2, y: 1, type: "obstacle" },
    { x: 2, y: 2, type: "obstacle" },
    { x: 2, y: 3, type: "obstacle" },
    { x: 2, y: 4, type: "obstacle" },
    { x: 4, y: 2, type: "obstacle" },
    { x: 4, y: 3, type: "obstacle" },
    { x: 4, y: 4, type: "obstacle" },
    { x: 4, y: 5, type: "obstacle" },
    { x: 3, y: 0, type: "punishment" },
  ],
};

const PLAY_MS = 450;
const SETTLED = 0.01;

const reducedMotion = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface Props {
  translate: (de: string, en: string) => string;
  initialGamma?: number;
  world?: CompetitionWorld;
}

/**
 * Value iteration on a small board: no trial and error, the planner knows the map and sweeps the whole
 * board again and again. Each sweep lets the goal's value travel one tile further, and γ decides how
 * much of it survives the trip.
 */
export function ValueIterationDemo({ translate: t, initialGamma = 0.9, world = PLAN_WORLD }: Props) {
  const state = useMemo(() => worldToState(world), [world]);
  const grid = state.grid;
  const [gamma, setGamma] = useState(initialGamma);
  const [values, setValues] = useState<ValueMap>(() => zeroValues(world.size));
  const [sweeps, setSweeps] = useState(0);
  const [change, setChange] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [touched, setTouched] = useState(false);
  const tileSize = useTileSize(world.size, 56, (w) => (w < 1024 ? 140 : 96));

  const after = useMemo(() => afterCandyValues(grid, world.goal, gamma), [grid, world.goal, gamma]);
  const settled = change !== null && change < SETTLED;

  const step = () => {
    const next = sweepValues(grid, world.goal, values, gamma, after);
    setChange(maxChange(values, next));
    setValues(next);
    setSweeps((n) => n + 1);
  };

  const reset = (autoplay = false) => {
    setValues(zeroValues(world.size));
    setSweeps(0);
    setChange(null);
    setPlaying(autoplay && !reducedMotion());
  };

  useEffect(() => {
    if (!playing) return;
    if (settled) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(step, PLAY_MS);
    return () => window.clearTimeout(id);
    // step reads the latest state; re-arming on each sweep is what keeps the loop going
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, settled, sweeps]);

  const path = useMemo(
    () => (sweeps > 0 ? greedyPath(grid, world.goal, values, world.agent, gamma, after) : null),
    [grid, world, values, gamma, after, sweeps],
  );
  const onPath = (x: number, y: number) => !!path?.some((p) => p.x === x && p.y === y);

  const start = values[world.agent.y][world.agent.x];
  const caption = (() => {
    if (sweeps === 0) return t("Noch weiß der Planer nichts. Jeder Klick auf „Ein Durchgang“ lässt ihn einmal über das ganze Feld rechnen.", "The planner knows nothing yet. Each click on “One sweep” lets it compute across the whole board once.");
    if (!settled) return t(`Durchgang ${sweeps}: Der Wert des Ziels ist ein Feld weiter nach hinten gewandert.`, `Sweep ${sweeps}: the goal's value has travelled one more tile back.`);
    if (gamma < 0.5)
      return t(
        `Fertig nach ${sweeps} Durchgängen. Bei so kleinem γ ist vom Ziel schon nach wenigen Feldern fast nichts mehr übrig. Am Start sind es nur ${formatPlanned(start)}.`,
        `Done after ${sweeps} sweeps. With such a small γ almost nothing of the goal is left after a few tiles. At the start it is only ${formatPlanned(start)}.`,
      );
    return t(
      `Fertig nach ${sweeps} Durchgängen. Der Wert des Ziels reicht bis zum Start (${formatPlanned(start)}), und die Pfeile zeigen den Weg drumherum.`,
      `Done after ${sweeps} sweeps. The goal's value reaches the start (${formatPlanned(start)}) and the arrows show the way around.`,
    );
  })();

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 sm:p-6">
      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start">
        <div
          role="img"
          aria-label={t("Planer-Demo: Value Iteration auf einem 7×7-Feld", "Planner demo: value iteration on a 7×7 board")}
          className="relative inline-grid flex-shrink-0 gap-0 rounded-xl border border-border/50 bg-background/80 p-2 shadow-soft"
          style={{ gridTemplateColumns: `repeat(${grid.length}, ${tileSize}px)` }}
        >
          {grid.map((row, y) =>
            row.map((cell, x) => {
              const isGoal = world.goal.x === x && world.goal.y === y;
              const isStart = world.agent.x === x && world.agent.y === y;
              const walkable = cell.type !== "obstacle" && !isGoal;
              const v = values[y][x];
              const dir = sweeps > 0 && walkable ? greedyDirection(grid, world.goal, values, { x, y }, gamma, after) : undefined;
              return (
                <div key={`${x}-${y}`} className="relative" style={{ width: tileSize, height: tileSize }}>
                  <Tile
                    x={x}
                    y={y}
                    type={isGoal ? "goal" : cell.type}
                    value={0}
                    showValues={false}
                    isAgent={isStart}
                    isGoal={isGoal}
                    tileSize={tileSize}
                    ariaLabel={`${x + 1},${y + 1}`}
                  />
                  {walkable && (
                    <div
                      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-md transition-colors duration-300"
                      style={{ backgroundColor: valueTint(v), outline: onPath(x, y) ? "2px solid rgba(245,190,40,0.9)" : undefined, outlineOffset: -2 }}
                    >
                      {dir && !isStart && <span className="font-bold leading-none text-foreground/80" style={{ fontSize: tileSize * 0.4 }}>{ARROWS[dir]}</span>}
                      {sweeps > 0 && (
                        <span className="font-semibold tabular-nums leading-none text-foreground/90" style={{ fontSize: Math.max(10, tileSize * 0.22), marginTop: dir && !isStart ? 2 : 0 }}>
                          {formatPlanned(v)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            }),
          )}
        </div>

        <div className="w-full min-w-0 flex-1 space-y-4">
          <dl className="grid grid-cols-2 gap-3">
            {[
              [t("Durchgang", "Sweep"), String(sweeps)],
              [t("Wert am Start", "Value at start"), sweeps === 0 ? "–" : formatPlanned(start)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-secondary/50 px-3 py-2">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                <dd className="text-lg font-bold tabular-nums text-foreground">{v}</dd>
              </div>
            ))}
          </dl>

          <p className="min-h-[5rem] text-base leading-7 text-foreground/80" aria-live="polite">
            {caption}
          </p>

          {!touched && (
            <p role="note" className="tutorial-spotlight relative z-0 rounded-lg border border-primary/60 bg-primary/10 px-4 py-3 text-base font-semibold leading-6 text-foreground">
              {t("Drück auf „Abspielen“. Dann stell γ auf 0,3 und noch einmal auf 0,95: Wie weit leuchtet das Ziel?", "Press “Play”. Then set γ to 0.3 and again to 0.95: how far does the goal shine?")}
            </p>
          )}

          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <label className="text-base font-semibold">
                <span className="mr-2 text-2xl font-extrabold text-primary">γ</span>
                {t("Weitsicht", "Foresight")}
              </label>
              <span className="text-lg font-bold tabular-nums text-primary">{gamma.toFixed(2)}</span>
            </div>
            <Slider
              min={0}
              max={0.99}
              step={0.01}
              value={[gamma]}
              onValueChange={([g]) => {
                setTouched(true);
                setGamma(g);
                reset(true);
              }}
              aria-label={t("Weitsicht γ", "Foresight γ")}
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1" onClickCapture={() => setTouched(true)}>
            <Button size="sm" variant="outline" onClick={() => setPlaying((p) => !p)} disabled={settled}>
              {playing ? t("⏸ Pause", "⏸ Pause") : t("▶ Abspielen", "▶ Play")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setPlaying(false); step(); }} disabled={settled}>
              {t("Ein Durchgang", "One sweep")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => reset()}>
              {t("↺ Von vorn", "↺ Start over")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
