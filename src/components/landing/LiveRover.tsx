import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tile } from "@/components/RL/Tile";
import { useTileSize } from "@/components/RL/CompetitionBoard";
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
const TICK_MS = 170;

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

  // Genau das Spielfeld aus dem Spiel: dieselbe Kachel (Tile), derselbe Rahmen, dieselbe Lücke, derselbe gleitende Rover.
  const tileSize = useTileSize(DEMO_WORLD.size, 52, 64);
  const TILE_GAP = 3;
  // Zwischen Nachbarfeldern gleiten; ein Sprung (neue Runde, Portal) setzt den Rover direkt um.
  const prevAgent = useRef(view.agent);
  const jumped = Math.abs(view.agent.x - prevAgent.current.x) + Math.abs(view.agent.y - prevAgent.current.y) > 1;
  useEffect(() => {
    prevAgent.current = view.agent;
  }, [view.agent]);

  return (
    <figure className="lr-figure">
      <div
        role="img"
        aria-label={translate(
          "Ein kleines Spielfeld, auf dem ein Rover live lernt, den Weg zum Ziel zu finden.",
          "A small board where a rover learns to find its way to the goal, live.",
        )}
        className="rounded-lg border border-border bg-background/80 p-4 shadow-soft select-none"
        style={{ maxWidth: DEMO_WORLD.size * (tileSize + TILE_GAP) + 32 }}
      >
        <div className="relative">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${DEMO_WORLD.size}, ${tileSize}px)`,
              gridTemplateRows: `repeat(${DEMO_WORLD.size}, ${tileSize}px)`,
              gap: TILE_GAP,
            }}
          >
            {view.grid.map((row, y) =>
              row.map((cell, x) => {
                const isAgent = view.agent.x === x && view.agent.y === y;
                const isGoal = DEMO_WORLD.goal.x === x && DEMO_WORLD.goal.y === y;
                const tileType = isGoal ? "goal" : isAgent ? "empty" : cell.type;
                return (
                  <Tile
                    key={`${x}-${y}`}
                    x={x}
                    y={y}
                    type={tileType}
                    value={0}
                    showValues={false}
                    isAgent={isAgent}
                    isGoal={isGoal}
                    tileSize={tileSize}
                    ariaLabel={`${x + 1},${y + 1}`}
                    visits={cell.visits}
                    showActions
                    bestAction={getBestActionDirection(view.grid, { x, y }, view.qTable)}
                  />
                );
              }),
            )}
          </div>
          <div
            className="pointer-events-none absolute flex items-center justify-center"
            style={{
              left: view.agent.x * (tileSize + TILE_GAP),
              top: view.agent.y * (tileSize + TILE_GAP),
              width: tileSize,
              height: tileSize,
              transition: jumped || !running ? "none" : "left 0.3s ease-out, top 0.3s ease-out",
              zIndex: 10,
            }}
            aria-hidden
          >
            <span className="rr-rover" />
          </div>
        </div>
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
