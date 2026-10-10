import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { stepPlayground } from "@/lib/rl/playgroundStep";
import { getBestActionDirection } from "@/lib/rl/qLearning";
import { shortestPathLength } from "@/lib/levelObjectives";
import { worldToState, type CompetitionWorld } from "@/lib/competition/world";
import type { PlaygroundState } from "@/lib/rl/types";

/** A small hand-made world: one wall to get around, a candy worth a detour, a trap next to the goal. */
export const DEMO_WORLD: CompetitionWorld = {
  size: 6,
  agent: { x: 0, y: 5 },
  goal: { x: 5, y: 0 },
  tiles: [
    { x: 2, y: 1, type: "obstacle" },
    { x: 2, y: 2, type: "obstacle" },
    { x: 2, y: 3, type: "obstacle" },
    { x: 4, y: 3, type: "obstacle" },
    { x: 1, y: 3, type: "reward" },
    { x: 3, y: 4, type: "reward" },
    { x: 3, y: 2, type: "punishment" },
    { x: 4, y: 1, type: "punishment" },
  ],
};

const PARAMS = { explorationRate: 0.25, alpha: 0.4, gamma: 0.95, consumeRewards: true, autoRestart: true, directionBias: null } as const;
const ARROW: Record<string, string> = { up: "↑", down: "↓", left: "←", right: "→" };
const TICK_MS = 85;

interface Props {
  translate: (de: string, en: string) => string;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The landing page's hero: the real Q-learning code running on a tiny board, arrows appear as the rover learns. */
export function LiveRover({ translate }: Props) {
  const stateRef = useRef<PlaygroundState>({ ...worldToState(DEMO_WORLD), isRunning: true });
  const [view, setView] = useState<PlaygroundState>(stateRef.current);
  const [running, setRunning] = useState(() => !prefersReducedMotion());

  const shortest = useMemo(
    () => shortestPathLength(worldToState(DEMO_WORLD).grid, DEMO_WORLD.agent, DEMO_WORLD.goal),
    [],
  );

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      stateRef.current = stepPlayground({ ...stateRef.current, isRunning: true }, PARAMS).nextState;
      setView(stateRef.current);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running]);

  const restart = useCallback(() => {
    stateRef.current = { ...worldToState(DEMO_WORLD), isRunning: true };
    setView(stateRef.current);
    setRunning(true);
  }, []);

  const lastRun = view.episodeHistory[view.episodeHistory.length - 1];
  const bestRun = view.episodeHistory.length ? Math.min(...view.episodeHistory.map((h) => h.steps)) : null;
  const recent = view.episodeHistory.slice(-3);
  const settled = recent.length === 3 && recent.every((h) => h.steps <= shortest + 2);

  let caption: string;
  if (view.episode === 0) {
    caption = translate("Der Rover kennt die Welt noch nicht und probiert einfach los.", "The rover knows nothing yet and just tries things.");
  } else if (settled) {
    caption = translate(
      `Seit ein paar Runden fast der kürzeste Weg: ${lastRun?.steps} Schritte statt am Anfang ${view.episodeHistory[0].steps}.`,
      `Close to the shortest path for a few runs now: ${lastRun?.steps} steps instead of ${view.episodeHistory[0].steps} at the start.`,
    );
  } else {
    caption = translate(
      `Runde ${view.episode}: ${lastRun?.steps} Schritte bis zum Ziel. Der kürzeste Weg wären ${shortest}.`,
      `Run ${view.episode}: ${lastRun?.steps} steps to the goal. The shortest path is ${shortest}.`,
    );
  }

  const cell = 52;
  return (
    <figure className="lr-figure">
      <div
        className="lr-board"
        style={{ gridTemplateColumns: `repeat(${DEMO_WORLD.size}, ${cell}px)`, gridTemplateRows: `repeat(${DEMO_WORLD.size}, ${cell}px)` }}
        role="img"
        aria-label={translate(
          "Ein kleines Spielfeld, auf dem ein Rover live lernt, den Weg zum Ziel zu finden.",
          "A small board where a rover learns to find its way to the goal, live.",
        )}
      >
        {view.grid.map((row, y) =>
          row.map((c, x) => {
            const isAgent = view.agent.x === x && view.agent.y === y;
            const isGoal = DEMO_WORLD.goal.x === x && DEMO_WORLD.goal.y === y;
            const tile = DEMO_WORLD.tiles.find((t) => t.x === x && t.y === y);
            const eaten = tile && (tile.type === "reward" || tile.type === "punishment") && c.type === "empty";
            const q = view.qTable[`${x},${y}`];
            const learned = q && c.visits > 0;
            const dir = learned && !isGoal && c.type !== "obstacle" ? getBestActionDirection(view.grid, { x, y }, view.qTable) : undefined;
            return (
              <div key={`${x}-${y}`} className={`lr-cell ${tile?.type === "obstacle" ? "is-wall" : ""}`}>
                {isGoal && <span className="lr-goal" aria-hidden />}
                {tile?.type === "reward" && <span className={`lr-candy ${eaten ? "is-eaten" : ""}`} aria-hidden />}
                {tile?.type === "punishment" && <span className={`lr-trap ${eaten ? "is-eaten" : ""}`} aria-hidden />}
                {dir && !isAgent && (
                  <span className="lr-arrow" style={{ opacity: Math.min(0.85, 0.25 + Math.max(...q) / 30) }} aria-hidden>
                    {ARROW[dir]}
                  </span>
                )}
                {isAgent && <span className="lr-rover" aria-hidden />}
              </div>
            );
          }),
        )}
      </div>
      <figcaption className="lr-caption">
        <p>{caption}</p>
        <div className="lr-controls">
          <button type="button" onClick={() => setRunning((r) => !r)}>
            {running ? translate("Pause", "Pause") : translate("Weiter", "Resume")}
          </button>
          <button type="button" onClick={restart}>
            {translate("Von vorn", "Start over")}
          </button>
          {bestRun !== null && (
            <span className="lr-best">
              {translate(`Bestzeit: ${bestRun}`, `Best: ${bestRun}`)}
            </span>
          )}
        </div>
      </figcaption>
    </figure>
  );
}
