import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CompetitionBoard, useTileSize } from "@/components/RL/CompetitionBoard";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { stepPlayground } from "@/lib/rl/playgroundStep";
import { shortestPathLength } from "@/lib/levelObjectives";
import { worldToState, type CompetitionWorld } from "@/lib/competition/world";
import type { PlaygroundState } from "@/lib/rl/types";

export type DialName = "epsilon" | "alpha" | "gamma";

export interface DemoSettings {
  epsilon: number;
  alpha: number;
  gamma: number;
}

interface Props {
  world: CompetitionWorld;
  initial: DemoSettings;
  /** Which dials the reader may move in this demo; the others stay fixed. */
  dials?: DialName[];
  /** Rewards vanish when eaten (default) or stay on the board with decaying payout. */
  consumeRewards?: boolean;
  translate: (de: string, en: string) => string;
  /** A pulsing hint bubble that tells the reader what to try; it disappears after the first interaction. */
  nudge?: { de: string; en: string };
  /** One sentence under the board that reacts to what the rover is doing. */
  caption?: (info: { episode: number; lastSteps: number | null; shortest: number; settings: DemoSettings }) => string;
}

const TICK = { normal: 200, fast: 60 } as const;

const DIAL_META: Record<DialName, { symbol: string; de: string; en: string; step: number }> = {
  epsilon: { symbol: "ε", de: "Neugier", en: "Curiosity", step: 0.05 },
  alpha: { symbol: "α", de: "Lernrate", en: "Learning rate", step: 0.05 },
  gamma: { symbol: "γ", de: "Weitsicht", en: "Foresight", step: 0.05 },
};

const reducedMotion = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const Nudge = ({ text }: { text: string }) => (
  <p
    role="note"
    className="tutorial-spotlight relative z-0 rounded-2xl border border-primary/60 bg-primary/10 px-4 py-3 text-base font-semibold leading-6 text-foreground"
  >
    👉 {text}
  </p>
);

/**
 * A live Q-learning rover for the explainer: the real learning step from the game, a few dials,
 * and numbers that show what the dials do. Pauses itself while scrolled out of view.
 */
export function GuideDemo({ world, initial, dials = [], consumeRewards = true, translate: t, nudge, caption }: Props) {
  const [touched, setTouched] = useState(false);
  const fresh = useCallback((): PlaygroundState => ({ ...worldToState(world), isRunning: true }), [world]);
  const stateRef = useRef<PlaygroundState>(fresh());
  const [view, setView] = useState<PlaygroundState>(stateRef.current);
  const [settings, setSettings] = useState<DemoSettings>(initial);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [paused, setPaused] = useState(reducedMotion);
  const [fast, setFast] = useState(false);
  const [visible, setVisible] = useState(true);
  const holder = useRef<HTMLDivElement>(null);
  const tileSize = useTileSize(world.size, 56, (w) => (w < 1024 ? 140 : 96));

  const shortest = useMemo(() => shortestPathLength(worldToState(world).grid, world.agent, world.goal), [world]);

  useEffect(() => {
    const el = holder.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const tick = fast ? TICK.fast : TICK.normal;
  const running = !paused && visible;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const s = settingsRef.current;
      stateRef.current = stepPlayground(
        { ...stateRef.current, isRunning: true },
        {
          explorationRate: s.epsilon,
          alpha: s.alpha,
          gamma: s.gamma,
          consumeRewards,
          rewardDecay: !consumeRewards,
          autoRestart: true,
          directionBias: null,
        },
      ).nextState;
      setView(stateRef.current);
    }, tick);
    return () => window.clearInterval(id);
  }, [running, tick, consumeRewards]);

  const restart = () => {
    stateRef.current = fresh();
    setView(stateRef.current);
    setPaused(false);
  };

  const history = view.episodeHistory;
  const lastSteps = history.length ? history[history.length - 1].steps : null;
  const best = history.length ? Math.min(...history.map((h) => h.steps)) : null;
  const known = Object.keys(view.qTable).length;
  const walkable = view.grid.flat().filter((c) => c.type !== "obstacle").length;

  return (
    <div ref={holder} className="rounded-3xl border border-border bg-card/60 p-4 sm:p-6">
      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start">
        <div className="flex-shrink-0">
          <CompetitionBoard
            grid={view.grid}
            agent={view.agent}
            goal={view.goal}
            tileSize={tileSize}
            showArrows
            qTable={view.qTable}
            label={t("Live-Demo: ein Rover lernt den Weg zum Ziel", "Live demo: a rover learns the way to the goal")}
            glideMs={running ? tick : 0}
          />
        </div>

        <div className="w-full min-w-0 flex-1 space-y-4">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [t("Runde", "Run"), String(view.episode)],
              [t("Letzte Runde", "Last run"), lastSteps === null ? "–" : t(`${lastSteps} Schritte`, `${lastSteps} steps`)],
              [t("Bestwert", "Best"), best === null ? "–" : t(`${best} Schritte`, `${best} steps`)],
              [t("Kürzester Weg", "Shortest path"), t(`${shortest} Schritte`, `${shortest} steps`)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-secondary/50 px-3 py-2">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                <dd className="text-lg font-bold tabular-nums text-foreground">{v}</dd>
              </div>
            ))}
          </dl>

          <p className="min-h-[3.5rem] text-base leading-7 text-foreground/80" aria-live="polite">
            {caption
              ? caption({ episode: view.episode, lastSteps, shortest, settings })
              : t(`Der Rover kennt ${known} von ${walkable} Feldern.`, `The rover knows ${known} of ${walkable} tiles.`)}
          </p>

          {nudge && !touched && dials.length > 0 && <Nudge text={t(nudge.de, nudge.en)} />}

          {dials.map((d) => {
            const meta = DIAL_META[d];
            return (
              <div key={d} className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <label className="text-base font-semibold">
                    <span className="mr-2 text-2xl font-extrabold text-primary">{meta.symbol}</span>
                    {t(meta.de, meta.en)}
                  </label>
                  <span className="text-lg font-bold tabular-nums text-primary">{settings[d].toFixed(2)}</span>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={meta.step}
                  value={[settings[d]]}
                  onValueChange={([v]) => {
                    setTouched(true);
                    setSettings((s) => ({ ...s, [d]: v }));
                  }}
                  aria-label={t(meta.de, meta.en)}
                />
              </div>
            );
          })}

          {nudge && !touched && dials.length === 0 && <Nudge text={t(nudge.de, nudge.en)} />}

          <div className="flex flex-wrap gap-2 pt-1" onClickCapture={() => setTouched(true)}>
            <Button size="sm" variant="outline" onClick={() => setPaused((p) => !p)}>
              {paused ? t("▶ Weiter", "▶ Resume") : t("⏸ Pause", "⏸ Pause")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setFast((f) => !f)} aria-pressed={fast}>
              {fast ? t("Normal", "Normal speed") : t("⏩ Schneller", "⏩ Faster")}
            </Button>
            <Button size="sm" variant="outline" onClick={restart}>
              {t("↺ Von vorn", "↺ Start over")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
